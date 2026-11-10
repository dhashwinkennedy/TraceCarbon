"""Comprehensive Test Runner for Scope3Track Backend API.
Executes live requests against isolated MongoDB Atlas test DB (scope3track_route_test)
and live OpenRouter API, recording detailed results for all 88 registered routes.
"""
import asyncio
import csv
import hashlib
import io
import json
import os
import sys
from pathlib import Path

# Add backend to sys.path
backend_dir = Path(__file__).resolve().parents[1]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Force isolated test DB
os.environ["MONGODB_DB"] = "scope3track_route_test"

import httpx
import fitz
import pandas as pd
from pymongo import MongoClient

from app.main import app, dbx, settings, now, oid, pwd
from app.scripts.seed_test_db import main as seed_isolated_db

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"

# Global results collector
TEST_RESULTS = []
ROUTE_COVERAGE = set()

def record_result(method: str, path: str, role: str, scenario: str, status_code: int,
                  expected: str, actual: str, db_effect: str, status: str):
    ROUTE_COVERAGE.add((method.upper(), path))
    res = {
        "method": method.upper(),
        "path": path,
        "required_role": role,
        "test_scenario": scenario,
        "http_status": status_code,
        "expected_result": expected,
        "actual_result": actual,
        "database_effect": db_effect,
        "status": status
    }
    TEST_RESULTS.append(res)
    print(f"[{status}] {method.upper()} {path} ({scenario}) -> {status_code}")

async def run_tests():
    print("=" * 80)
    print("STARTING COMPREHENSIVE BACKEND API TEST SUITE")
    print(f"Database: {settings.mongodb_db} (Atlas)")
    print(f"OpenRouter Model: {settings.openrouter_model}")
    print("=" * 80)

    # 1. Connect and re-seed isolated test DB
    print("\n--- Initializing Isolated Test Database ---")
    seed_isolated_db()
    dbx.connect()
    raw_client = MongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=5000)
    test_db = raw_client[settings.mongodb_db]

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver", timeout=45.0) as client:
        
        # -------------------------------------------------------------
        # Section 4: Public & Health Endpoints
        # -------------------------------------------------------------
        print("\n--- Testing Public & Health Endpoints ---")
        
        # GET /health
        r = await client.get("/health")
        passed = r.status_code == 200 and r.json().get("status") == "ok"
        record_result("GET", "/health", "public", "Health check probe", r.status_code,
                      "HTTP 200 with status ok", str(r.json()), "Read-only", "PASS" if passed else "FAIL")

        # GET /ready
        r = await client.get("/ready")
        passed = r.status_code == 200 and r.json().get("status") == "ready"
        record_result("GET", "/ready", "public", "Readiness check probe", r.status_code,
                      "HTTP 200 with status ready", str(r.json()), "Verified DB ping and user query", "PASS" if passed else "FAIL")

        # GET /openapi.json
        r = await client.get("/openapi.json")
        passed = r.status_code == 200 and "paths" in r.json()
        record_result("GET", "/openapi.json", "public", "OpenAPI schema retrieval", r.status_code,
                      "HTTP 200 with JSON schema", f"{len(r.json().get('paths', {}))} paths found", "Read-only", "PASS" if passed else "FAIL")

        # GET /docs
        r = await client.get("/docs")
        passed = r.status_code == 200 and "html" in r.headers.get("content-type", "")
        record_result("GET", "/docs", "public", "Swagger UI HTML page", r.status_code,
                      "HTTP 200 with HTML content", "Swagger HTML served", "Read-only", "PASS" if passed else "FAIL")

        # GET /docs/oauth2-redirect
        r = await client.get("/docs/oauth2-redirect")
        passed = r.status_code == 200
        record_result("GET", "/docs/oauth2-redirect", "public", "Swagger OAuth2 redirect handler", r.status_code,
                      "HTTP 200", f"HTTP {r.status_code}", "Read-only", "PASS" if passed else "FAIL")

        # GET /redoc
        r = await client.get("/redoc")
        passed = r.status_code == 200 and "html" in r.headers.get("content-type", "")
        record_result("GET", "/redoc", "public", "ReDoc HTML documentation", r.status_code,
                      "HTTP 200 with HTML", "ReDoc HTML served", "Read-only", "PASS" if passed else "FAIL")

        # -------------------------------------------------------------
        # Section 6: Authentication and Role Testing
        # -------------------------------------------------------------
        print("\n--- Testing Authentication & Role Enforcements ---")

        # 6.1 Valid logins for all roles
        login_creds = {
            "mfg": ("manufacturer@scope3track.demo", "ManufacturerDemo123!", "manufacturer"),
            "sup1": ("xyz.steel@scope3track.demo", "SupplierDemo123!", "supplier"),
            "sup2": ("green.aluminium@scope3track.demo", "SupplierDemo123!", "supplier"),
            "aud1": ("auditor.xyz@scope3track.demo", "AuditorDemo123!", "auditor"),
            "aud2": ("auditor.green@scope3track.demo", "AuditorDemo123!", "auditor")
        }
        tokens = {}
        for key, (email, pwd_val, expected_role) in login_creds.items():
            r = await client.post("/api/v1/auth/login", json={"email": email, "password": pwd_val})
            if r.status_code == 200 and "access_token" in r.json():
                tokens[key] = r.json()["access_token"]
                user_info = r.json().get("user", {})
                passed = user_info.get("role") == expected_role and "password_hash" not in user_info
                record_result("POST", "/api/v1/auth/login", "public", f"Valid login for {expected_role} ({key})", r.status_code,
                              f"HTTP 200 with JWT and role {expected_role}", f"Token generated, role={user_info.get('role')}", "User verified in DB", "PASS" if passed else "FAIL")
            else:
                record_result("POST", "/api/v1/auth/login", "public", f"Valid login for {expected_role} ({key})", r.status_code,
                              "HTTP 200 with JWT", str(r.text), "None", "FAIL")

        headers = {k: {"Authorization": f"Bearer {v}"} for k, v in tokens.items()}

        # 6.2 Invalid password
        r = await client.post("/api/v1/auth/login", json={"email": "manufacturer@scope3track.demo", "password": "WrongPassword123!"})
        passed = r.status_code == 401
        record_result("POST", "/api/v1/auth/login", "public", "Invalid password rejection", r.status_code,
                      "HTTP 401 Unauthorized", str(r.json()), "Read-only", "PASS" if passed else "FAIL")

        # 6.3 Unknown email
        r = await client.post("/api/v1/auth/login", json={"email": "nonexistent@scope3track.demo", "password": "AnyPassword123!"})
        passed = r.status_code == 401
        record_result("POST", "/api/v1/auth/login", "public", "Unknown email rejection", r.status_code,
                      "HTTP 401 Unauthorized", str(r.json()), "Read-only", "PASS" if passed else "FAIL")

        # 6.4 GET /auth/me for each role
        for key, role_name in [("mfg", "manufacturer"), ("sup1", "supplier"), ("aud1", "auditor")]:
            r = await client.get("/api/v1/auth/me", headers=headers[key])
            passed = r.status_code == 200 and r.json().get("role") == role_name and "password_hash" not in r.json()
            record_result("GET", "/api/v1/auth/me", role_name, f"Get current user profile for {role_name}", r.status_code,
                          f"HTTP 200 with user profile role {role_name}", f"Role={r.json().get('role')}", "Read user document", "PASS" if passed else "FAIL")

        # 6.5 Missing authentication token
        r = await client.get("/api/v1/auth/me")
        passed = r.status_code == 401
        record_result("GET", "/api/v1/auth/me", "authenticated", "Missing auth header rejection", r.status_code,
                      "HTTP 401 Unauthorized", str(r.json()), "Read-only", "PASS" if passed else "FAIL")

        # 6.6 Invalid / Malformed JWT
        r = await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid.jwt.token"})
        passed = r.status_code == 401
        record_result("GET", "/api/v1/auth/me", "authenticated", "Malformed JWT token rejection", r.status_code,
                      "HTTP 401 Unauthorized", str(r.json()), "Read-only", "PASS" if passed else "FAIL")

        # 6.7 POST /auth/change-password
        # Change password for a dedicated synthetic test user so we don't break main test users
        test_user_email = "pwd.test@scope3track.demo"
        test_user_id = oid()
        test_db["users"].update_one(
            {"email": test_user_email},
            {"$set": {"id": test_user_id, "email": test_user_email, "password_hash": pwd.hash("InitialPwd123!"), "role": "supplier", "profile_id": "supplier-xyz", "active": True, "created_at": now()}},
            upsert=True
        )
        r_login = await client.post("/api/v1/auth/login", json={"email": test_user_email, "password": "InitialPwd123!"})
        pwd_test_token = r_login.json()["access_token"]
        pwd_test_headers = {"Authorization": f"Bearer {pwd_test_token}"}

        # Change password successfully
        r = await client.post("/api/v1/auth/change-password", headers=pwd_test_headers, json={"current_password": "InitialPwd123!", "new_password": "NewSecretPassword123!"})
        passed = r.status_code == 200 and "Password changed" in r.text
        # Verify DB effect
        updated_user = test_db["users"].find_one({"email": test_user_email})
        db_verified = updated_user and pwd.verify("NewSecretPassword123!", updated_user["password_hash"])
        record_result("POST", "/api/v1/auth/change-password", "authenticated", "Change password successfully", r.status_code,
                      "HTTP 200 Password changed", str(r.json()), "Updated password_hash in DB verified", "PASS" if (passed and db_verified) else "FAIL")

        # Try changing with incorrect current password
        r = await client.post("/api/v1/auth/change-password", headers=pwd_test_headers, json={"current_password": "WrongInitialPwd!", "new_password": "AnotherPassword123!"})
        passed = r.status_code == 400
        record_result("POST", "/api/v1/auth/change-password", "authenticated", "Incorrect current password rejected", r.status_code,
                      "HTTP 400 Current password incorrect", str(r.json()), "Password remains unchanged", "PASS" if passed else "FAIL")

        # -------------------------------------------------------------
        # Section 7: Supplier Access Control & Isolation
        # -------------------------------------------------------------
        print("\n--- Testing Supplier Access Control & Isolation ---")

        # 7.1 Supplier 1 retrieves own profile
        r = await client.get("/api/v1/supplier/profile", headers=headers["sup1"])
        passed = r.status_code == 200 and r.json().get("id") == "supplier-xyz"
        record_result("GET", "/api/v1/supplier/profile", "supplier", "Supplier 1 views own profile", r.status_code,
                      "HTTP 200 with supplier-xyz", f"Profile ID={r.json().get('id')}", "Read supplier-xyz doc", "PASS" if passed else "FAIL")

        # 7.2 Supplier 1 retrieves own submissions
        r = await client.get("/api/v1/supplier/submissions", headers=headers["sup1"])
        passed = r.status_code == 200 and all(s["supplier_id"] == "supplier-xyz" for s in r.json().get("items", []))
        record_result("GET", "/api/v1/supplier/submissions", "supplier", "Supplier 1 lists own submissions", r.status_code,
                      "HTTP 200 with supplier-xyz items", f"{len(r.json().get('items', []))} submissions found", "Read submissions for supplier-xyz", "PASS" if passed else "FAIL")

        # 7.3 Supplier 1 accesses own submission details
        r = await client.get("/api/v1/supplier/submissions/submission-xyz-2026-01", headers=headers["sup1"])
        passed = r.status_code == 200 and r.json().get("id") == "submission-xyz-2026-01"
        record_result("GET", "/api/v1/supplier/submissions/{sid}", "supplier", "Supplier 1 gets own submission", r.status_code,
                      "HTTP 200 with submission-xyz-2026-01", str(r.json().get("id")), "Read submission doc", "PASS" if passed else "FAIL")

        # 7.4 Supplier 1 CANNOT access Supplier 2's submission (403 forbidden)
        r = await client.get("/api/v1/supplier/submissions/submission-green-2026-01", headers=headers["sup1"])
        passed = r.status_code == 403
        record_result("GET", "/api/v1/supplier/submissions/{sid}", "supplier", "Supplier 1 denied access to Supplier 2 submission", r.status_code,
                      "HTTP 403 Forbidden", str(r.json()), "Access blocked", "PASS" if passed else "FAIL")

        # 7.5 Supplier 1 CANNOT modify Supplier 2's submission notes (403 forbidden)
        r = await client.patch("/api/v1/supplier/submissions/submission-green-2026-01", headers=headers["sup1"], json={"notes": "Hacked"})
        passed = r.status_code == 403
        record_result("PATCH", "/api/v1/supplier/submissions/{sid}", "supplier", "Supplier 1 denied modifying Supplier 2 submission", r.status_code,
                      "HTTP 403 Forbidden", str(r.json()), "No DB change", "PASS" if passed else "FAIL")

        # 7.6 Supplier 1 CANNOT call manufacturer-only endpoints (403 forbidden)
        r = await client.get("/api/v1/manufacturer/profile", headers=headers["sup1"])
        passed = r.status_code == 403
        record_result("GET", "/api/v1/manufacturer/profile", "manufacturer", "Supplier denied manufacturer profile", r.status_code,
                      "HTTP 403 Forbidden", str(r.json()), "Access blocked", "PASS" if passed else "FAIL")

        # 7.7 Supplier 1 CANNOT call auditor-only endpoints (403 forbidden)
        r = await client.get("/api/v1/auditor/assignments", headers=headers["sup1"])
        passed = r.status_code == 403
        record_result("GET", "/api/v1/auditor/assignments", "auditor", "Supplier denied auditor assignments", r.status_code,
                      "HTTP 403 Forbidden", str(r.json()), "Access blocked", "PASS" if passed else "FAIL")

        # -------------------------------------------------------------
        # Section 8: Auditor Access Control & Assignments
        # -------------------------------------------------------------
        print("\n--- Testing Auditor Access Control & Assignments ---")

        # 8.1 Auditor 1 gets assignments
        r = await client.get("/api/v1/auditor/assignments", headers=headers["aud1"])
        passed = r.status_code == 200 and any(a["supplier_id"] == "supplier-xyz" for a in r.json().get("items", []))
        record_result("GET", "/api/v1/auditor/assignments", "auditor", "Auditor 1 lists assigned suppliers", r.status_code,
                      "HTTP 200 with supplier-xyz assigned", f"Assignments: {len(r.json().get('items', []))}", "Read auditor_assignments", "PASS" if passed else "FAIL")

        # 8.2 Auditor 1 lists submissions for assigned suppliers
        r = await client.get("/api/v1/auditor/submissions", headers=headers["aud1"])
        passed = r.status_code == 200 and any(s["id"] == "submission-xyz-2026-01" for s in r.json().get("items", []))
        record_result("GET", "/api/v1/auditor/submissions", "auditor", "Auditor 1 lists assigned submissions", r.status_code,
                      "HTTP 200 including submission-xyz", f"Submissions: {len(r.json().get('items', []))}", "Filtered by assigned supplier", "PASS" if passed else "FAIL")

        # 8.3 Auditor 1 gets assigned submission details
        r = await client.get("/api/v1/auditor/submissions/submission-xyz-2026-01", headers=headers["aud1"])
        passed = r.status_code == 200 and r.json().get("id") == "submission-xyz-2026-01"
        record_result("GET", "/api/v1/auditor/submissions/{sid}", "auditor", "Auditor 1 views assigned submission", r.status_code,
                      "HTTP 200 with submission-xyz", str(r.json().get("id")), "Read submission doc", "PASS" if passed else "FAIL")

        # 8.4 Auditor 1 CANNOT view unassigned submission (Supplier 2 / submission-green) (403 forbidden)
        r = await client.get("/api/v1/auditor/submissions/submission-green-2026-01", headers=headers["aud1"])
        passed = r.status_code == 403
        record_result("GET", "/api/v1/auditor/submissions/{sid}", "auditor", "Auditor 1 denied unassigned submission", r.status_code,
                      "HTTP 403 Forbidden", str(r.json()), "Access blocked", "PASS" if passed else "FAIL")

        # 8.5 Auditor 1 CANNOT access manufacturer purchase records (403 forbidden)
        r = await client.get("/api/v1/manufacturer/purchase-records", headers=headers["aud1"])
        passed = r.status_code == 403
        record_result("GET", "/api/v1/manufacturer/purchase-records", "manufacturer", "Auditor denied purchase records", r.status_code,
                      "HTTP 403 Forbidden", str(r.json()), "Access blocked", "PASS" if passed else "FAIL")

        # 8.6 Auditor 1 CANNOT trigger supplier reduction suggestions (403 forbidden)
        r = await client.post("/api/v1/supplier/submissions/submission-xyz-2026-01/reduction-suggestions", headers=headers["aud1"])
        passed = r.status_code == 403
        record_result("POST", "/api/v1/supplier/submissions/{sid}/reduction-suggestions", "supplier", "Auditor denied reduction suggestions", r.status_code,
                      "HTTP 403 Forbidden", str(r.json()), "Access blocked", "PASS" if passed else "FAIL")

        # 8.7 Auditor 1 adds comment to assigned submission
        r = await client.post("/api/v1/auditor/submissions/submission-xyz-2026-01/comments", headers=headers["aud1"], json={"text": "Reviewing fuel entries for January 2026."})
        passed = r.status_code == 201 and "id" in r.json()
        comment_id = r.json().get("id") if passed else None
        record_result("POST", "/api/v1/auditor/submissions/{sid}/comments", "auditor", "Auditor adds comment to assigned submission", r.status_code,
                      "HTTP 201 with created comment", str(r.json().get("id")), "Inserted into comments collection", "PASS" if passed else "FAIL")

        # 8.8 Auditor 1 lists comments
        r = await client.get("/api/v1/auditor/submissions/submission-xyz-2026-01/comments", headers=headers["aud1"])
        passed = r.status_code == 200 and any(c.get("id") == comment_id for c in r.json().get("items", []))
        record_result("GET", "/api/v1/auditor/submissions/{sid}/comments", "auditor", "Auditor lists comments on submission", r.status_code,
                      "HTTP 200 with comments list", f"{len(r.json().get('items', []))} comments", "Read from comments collection", "PASS" if passed else "FAIL")

        # 8.9 Auditor requests clarification
        r = await client.post("/api/v1/auditor/submissions/submission-xyz-2026-01/clarifications", headers=headers["aud1"], json={"question": "Please clarify diesel consumption breakdown."})
        passed = r.status_code == 201 and "id" in r.json()
        clarification_id = r.json().get("id") if passed else None
        # Check DB status of submission
        sub_stat = test_db["submissions"].find_one({"id": "submission-xyz-2026-01"})
        stat_updated = sub_stat and sub_stat.get("status") == "clarification_requested"
        record_result("POST", "/api/v1/auditor/submissions/{sid}/clarifications", "auditor", "Auditor requests clarification", r.status_code,
                      "HTTP 201 and submission status=clarification_requested", f"ID={clarification_id}, status={sub_stat.get('status')}", "Inserted clarification, updated submission status", "PASS" if (passed and stat_updated) else "FAIL")

        # 8.10 Auditor updates clarification status (PATCH /auditor/clarifications/{cid})
        if clarification_id:
            r = await client.patch(f"/api/v1/auditor/clarifications/{clarification_id}", headers=headers["aud1"], json={"status": "resolved"})
            passed = r.status_code == 200 and r.json().get("status") == "resolved"
            record_result("PATCH", "/api/v1/auditor/clarifications/{cid}", "auditor", "Auditor marks clarification resolved", r.status_code,
                          "HTTP 200 with status=resolved", str(r.json().get("status")), "Updated status in clarifications", "PASS" if passed else "FAIL")
            # Set back to open for supplier respond testing
            test_db["clarifications"].update_one({"id": clarification_id}, {"$set": {"status": "open"}})
            test_db["submissions"].update_one({"id": "submission-xyz-2026-01"}, {"$set": {"status": "clarification_requested"}})

        # -------------------------------------------------------------
        # Section 9: Complete Manufacturer Workflow (32 Steps)
        # -------------------------------------------------------------
        print("\n--- Testing Manufacturer 32-Step Workflow ---")

        # 9.1 Manufacturer Profile GET
        r = await client.get("/api/v1/manufacturer/profile", headers=headers["mfg"])
        passed = r.status_code == 200 and r.json().get("name") == "ABC Manufacturing"
        record_result("GET", "/api/v1/manufacturer/profile", "manufacturer", "Get manufacturer profile", r.status_code,
                      "HTTP 200 with ABC Manufacturing", r.json().get("name"), "Read manufacturer-1 doc", "PASS" if passed else "FAIL")

        # 9.2 Manufacturer Profile PATCH
        r = await client.patch("/api/v1/manufacturer/profile", headers=headers["mfg"], json={"phone": "+1-555-9999", "address": "200 Green Tech Blvd"})
        passed = r.status_code == 200 and r.json().get("phone") == "+1-555-9999"
        record_result("PATCH", "/api/v1/manufacturer/profile", "manufacturer", "Update manufacturer profile", r.status_code,
                      "HTTP 200 with updated fields", r.json().get("phone"), "Updated manufacturer doc in DB", "PASS" if passed else "FAIL")

        # 9.3 Create Supplier
        sup_code = f"SUP-TEST-{oid()[:6].upper()}"
        r = await client.post("/api/v1/manufacturer/suppliers", headers=headers["mfg"], json={
            "name": "Omega Casting",
            "supplier_code": sup_code,
            "contact_email": f"contact.{sup_code.lower()}@demo.com",
            "login_email": f"login.{sup_code.lower()}@demo.com",
            "initial_password": "InitialSupplierPwd123!",
            "contact_details": "Casting Division",
            "requirements": [{"activity_id": "electricity", "expected_unit": "kWh"}]
        })
        passed = r.status_code == 201 and "id" in r.json()
        new_sup_id = r.json().get("id") if passed else None
        record_result("POST", "/api/v1/manufacturer/suppliers", "manufacturer", "Create new supplier account", r.status_code,
                      "HTTP 201 with new supplier ID", str(new_sup_id), "Inserted supplier, user, and requirements docs", "PASS" if passed else "FAIL")

        # 9.4 List Suppliers
        r = await client.get("/api/v1/manufacturer/suppliers", headers=headers["mfg"])
        passed = r.status_code == 200 and len(r.json().get("items", [])) >= 3
        record_result("GET", "/api/v1/manufacturer/suppliers", "manufacturer", "List suppliers", r.status_code,
                      "HTTP 200 with supplier list", f"{len(r.json().get('items', []))} suppliers", "Read suppliers collection", "PASS" if passed else "FAIL")

        # 9.5 Get Supplier Details
        target_sid = new_sup_id or "supplier-xyz"
        r = await client.get(f"/api/v1/manufacturer/suppliers/{target_sid}", headers=headers["mfg"])
        passed = r.status_code == 200 and r.json().get("id") == target_sid
        record_result("GET", "/api/v1/manufacturer/suppliers/{sid}", "manufacturer", "Get single supplier details", r.status_code,
                      f"HTTP 200 with ID {target_sid}", str(r.json().get("id")), "Read supplier doc", "PASS" if passed else "FAIL")

        # 9.6 Update Supplier Details
        r = await client.patch(f"/api/v1/manufacturer/suppliers/{target_sid}", headers=headers["mfg"], json={"contact_details": "Updated phone and plant location"})
        passed = r.status_code == 200 and r.json().get("contact_details") == "Updated phone and plant location"
        record_result("PATCH", "/api/v1/manufacturer/suppliers/{sid}", "manufacturer", "Update supplier contact details", r.status_code,
                      "HTTP 200 with updated details", str(r.json().get("contact_details")), "Updated supplier doc in DB", "PASS" if passed else "FAIL")

        # 9.7 Update Supplier Status (Activate/Deactivate)
        r = await client.patch(f"/api/v1/manufacturer/suppliers/{target_sid}/status", headers=headers["mfg"], json={"active": True})
        passed = r.status_code == 200 and r.json().get("active") is True
        record_result("PATCH", "/api/v1/manufacturer/suppliers/{sid}/status", "manufacturer", "Toggle supplier active status", r.status_code,
                      "HTTP 200 with active=True", str(r.json().get("active")), "Updated active in supplier and user docs", "PASS" if passed else "FAIL")

        # 9.8 Configure Requirements (PUT)
        r = await client.put(f"/api/v1/manufacturer/suppliers/{target_sid}/requirements", headers=headers["mfg"], json={
            "requirements": [
                {"activity_id": "electricity", "expected_unit": "kWh", "aggregation_rule": "sum"},
                {"activity_id": "diesel", "expected_unit": "litres", "aggregation_rule": "sum"}
            ]
        })
        passed = r.status_code == 200 and len(r.json().get("items", [])) == 2
        record_result("PUT", "/api/v1/manufacturer/suppliers/{sid}/requirements", "manufacturer", "Configure supplier reporting requirements", r.status_code,
                      "HTTP 200 with 2 requirements", f"{len(r.json().get('items', []))} requirements", "Replaced supplier_requirements in DB", "PASS" if passed else "FAIL")

        # 9.9 Retrieve Requirements (GET)
        r = await client.get(f"/api/v1/manufacturer/suppliers/{target_sid}/requirements", headers=headers["mfg"])
        passed = r.status_code == 200 and len(r.json().get("items", [])) == 2
        record_result("GET", "/api/v1/manufacturer/suppliers/{sid}/requirements", "manufacturer", "Retrieve supplier requirements", r.status_code,
                      "HTTP 200 with requirements list", f"{len(r.json().get('items', []))} items", "Read supplier_requirements", "PASS" if passed else "FAIL")

        # 9.10 Create Auditor
        aud_code = f"AUD-{oid()[:6].upper()}"
        r = await client.post("/api/v1/manufacturer/auditors", headers=headers["mfg"], json={
            "name": "Audit Partner Three",
            "email": f"{aud_code.lower()}@auditors.demo",
            "login_email": f"login.{aud_code.lower()}@auditors.demo",
            "initial_password": "InitialAuditorPwd123!",
            "employee_id": aud_code
        })
        passed = r.status_code == 201 and "id" in r.json()
        new_aud_id = r.json().get("id") if passed else None
        record_result("POST", "/api/v1/manufacturer/auditors", "manufacturer", "Create new auditor account", r.status_code,
                      "HTTP 201 with new auditor ID", str(new_aud_id), "Inserted auditor and user docs", "PASS" if passed else "FAIL")

        # 9.11 List Auditors
        r = await client.get("/api/v1/manufacturer/auditors", headers=headers["mfg"])
        passed = r.status_code == 200 and len(r.json().get("items", [])) >= 2
        record_result("GET", "/api/v1/manufacturer/auditors", "manufacturer", "List auditors", r.status_code,
                      "HTTP 200 with auditors list", f"{len(r.json().get('items', []))} auditors", "Read auditors collection", "PASS" if passed else "FAIL")

        # 9.12 Get Auditor Details
        target_aid = new_aud_id or "auditor-xyz"
        r = await client.get(f"/api/v1/manufacturer/auditors/{target_aid}", headers=headers["mfg"])
        passed = r.status_code == 200 and r.json().get("id") == target_aid
        record_result("GET", "/api/v1/manufacturer/auditors/{aid}", "manufacturer", "Get auditor details", r.status_code,
                      f"HTTP 200 with ID {target_aid}", str(r.json().get("id")), "Read auditor doc", "PASS" if passed else "FAIL")

        # 9.13 Update Auditor Details (PATCH)
        r = await client.patch(f"/api/v1/manufacturer/auditors/{target_aid}", headers=headers["mfg"], json={"name": "Auditor Senior Lead"})
        passed = r.status_code == 200 and r.json().get("name") == "Auditor Senior Lead"
        record_result("PATCH", "/api/v1/manufacturer/auditors/{aid}", "manufacturer", "Update auditor name", r.status_code,
                      "HTTP 200 with updated name", str(r.json().get("name")), "Updated auditor doc in DB", "PASS" if passed else "FAIL")

        # 9.14 Update Auditor Status
        r = await client.patch(f"/api/v1/manufacturer/auditors/{target_aid}/status", headers=headers["mfg"], json={"active": True})
        passed = r.status_code == 200 and r.json().get("active") is True
        record_result("PATCH", "/api/v1/manufacturer/auditors/{aid}/status", "manufacturer", "Toggle auditor active status", r.status_code,
                      "HTTP 200 with active=True", str(r.json().get("active")), "Updated active in auditor and user docs", "PASS" if passed else "FAIL")

        # 9.15 Create Auditor Assignment
        r = await client.post(f"/api/v1/manufacturer/auditors/{target_aid}/assignments", headers=headers["mfg"], json={"supplier_id": target_sid})
        passed = r.status_code == 201 and "id" in r.json()
        new_assignment_id = r.json().get("id") if passed else None
        record_result("POST", "/api/v1/manufacturer/auditors/{aid}/assignments", "manufacturer", "Assign auditor to supplier", r.status_code,
                      "HTTP 201 with assignment ID", str(new_assignment_id), "Inserted auditor_assignments doc", "PASS" if passed else "FAIL")

        # 9.16 Retrieve Auditor Assignments
        r = await client.get(f"/api/v1/manufacturer/auditors/{target_aid}/assignments", headers=headers["mfg"])
        passed = r.status_code == 200 and any(a["id"] == new_assignment_id for a in r.json().get("items", []))
        record_result("GET", "/api/v1/manufacturer/auditors/{aid}/assignments", "manufacturer", "Retrieve assignments for auditor", r.status_code,
                      "HTTP 200 with assignments list", f"{len(r.json().get('items', []))} assignments", "Read auditor_assignments", "PASS" if passed else "FAIL")

        # 9.17 Delete Auditor Assignment
        if new_assignment_id:
            r = await client.delete(f"/api/v1/manufacturer/auditors/{target_aid}/assignments/{new_assignment_id}", headers=headers["mfg"])
            passed = r.status_code == 204
            # Verify removed from DB
            db_deleted = test_db["auditor_assignments"].find_one({"id": new_assignment_id}) is None
            record_result("DELETE", "/api/v1/manufacturer/auditors/{aid}/assignments/{assignment_id}", "manufacturer", "Remove auditor assignment", r.status_code,
                          "HTTP 204 No Content", "Deleted", "Deleted from auditor_assignments", "PASS" if (passed and db_deleted) else "FAIL")

        # 9.18 Create Product
        prod_code = f"PRD-{oid()[:6].upper()}"
        r = await client.post("/api/v1/manufacturer/products", headers=headers["mfg"], json={
            "product_name": f"Heavy Casting {prod_code}",
            "product_code": prod_code,
            "scope3_category": "Category 1",
            "relevant_unit": "tonnes",
            "active": True
        })
        passed = r.status_code == 201 and "id" in r.json()
        new_prod_id = r.json().get("id") if passed else None
        record_result("POST", "/api/v1/manufacturer/products", "manufacturer", "Create new product", r.status_code,
                      "HTTP 201 with product ID", str(new_prod_id), "Inserted product doc in DB", "PASS" if passed else "FAIL")

        # 9.19 List Products
        r = await client.get("/api/v1/manufacturer/products", headers=headers["mfg"])
        passed = r.status_code == 200 and len(r.json().get("items", [])) >= 3
        record_result("GET", "/api/v1/manufacturer/products", "manufacturer", "List products", r.status_code,
                      "HTTP 200 with product items", f"{len(r.json().get('items', []))} products", "Read products collection", "PASS" if passed else "FAIL")

        # 9.20 Get Product Details
        target_pid = new_prod_id or "product-steel"
        r = await client.get(f"/api/v1/manufacturer/products/{target_pid}", headers=headers["mfg"])
        passed = r.status_code == 200 and r.json().get("id") == target_pid
        record_result("GET", "/api/v1/manufacturer/products/{pid}", "manufacturer", "Get single product details", r.status_code,
                      f"HTTP 200 with ID {target_pid}", str(r.json().get("id")), "Read product doc", "PASS" if passed else "FAIL")

        # 9.21 Update Product Details
        r = await client.patch(f"/api/v1/manufacturer/products/{target_pid}", headers=headers["mfg"], json={"relevant_unit": "tonnes"})
        passed = r.status_code == 200 and r.json().get("relevant_unit") == "tonnes"
        record_result("PATCH", "/api/v1/manufacturer/products/{pid}", "manufacturer", "Update product details", r.status_code,
                      "HTTP 200 with updated unit", str(r.json().get("relevant_unit")), "Updated product doc in DB", "PASS" if passed else "FAIL")

        # 9.22 Update Product Status
        r = await client.patch(f"/api/v1/manufacturer/products/{target_pid}/status", headers=headers["mfg"], json={"active": True})
        passed = r.status_code == 200 and r.json().get("active") is True
        record_result("PATCH", "/api/v1/manufacturer/products/{pid}/status", "manufacturer", "Update product active status", r.status_code,
                      "HTTP 200 with active=True", str(r.json().get("active")), "Updated active in products", "PASS" if passed else "FAIL")

        # 9.23 Activity Library GET
        r = await client.get("/api/v1/manufacturer/activity-library", headers=headers["mfg"])
        passed = r.status_code == 200 and len(r.json().get("items", [])) >= 5
        record_result("GET", "/api/v1/manufacturer/activity-library", "manufacturer", "Retrieve activity library", r.status_code,
                      "HTTP 200 with activity list", f"{len(r.json().get('items', []))} activities", "Read activity_library", "PASS" if passed else "FAIL")

        # 9.24 Emission Factors GET
        r = await client.get("/api/v1/manufacturer/emission-factors", headers=headers["mfg"])
        passed = r.status_code == 200 and len(r.json().get("items", [])) >= 4
        record_result("GET", "/api/v1/manufacturer/emission-factors", "manufacturer", "Retrieve emission factors list", r.status_code,
                      "HTTP 200 with factors list", f"{len(r.json().get('items', []))} factors", "Read emission_factors", "PASS" if passed else "FAIL")

        # 9.25 Emission Factor by ID GET
        r = await client.get("/api/v1/manufacturer/emission-factors/factor-steel", headers=headers["mfg"])
        passed = r.status_code == 200 and r.json().get("id") == "factor-steel"
        record_result("GET", "/api/v1/manufacturer/emission-factors/{fid}", "manufacturer", "Get emission factor by ID", r.status_code,
                      "HTTP 200 with factor-steel", str(r.json().get("id")), "Read emission_factors doc", "PASS" if passed else "FAIL")

        # 9.26 Submissions List GET (Manufacturer)
        r = await client.get("/api/v1/manufacturer/submissions", headers=headers["mfg"])
        passed = r.status_code == 200 and len(r.json().get("items", [])) >= 2
        record_result("GET", "/api/v1/manufacturer/submissions", "manufacturer", "Manufacturer lists all submissions", r.status_code,
                      "HTTP 200 with submissions list", f"{len(r.json().get('items', []))} submissions", "Read submissions collection", "PASS" if passed else "FAIL")

        # 9.27 Submission by ID GET (Manufacturer)
        r = await client.get("/api/v1/manufacturer/submissions/submission-xyz-2026-01", headers=headers["mfg"])
        passed = r.status_code == 200 and r.json().get("id") == "submission-xyz-2026-01"
        record_result("GET", "/api/v1/manufacturer/submissions/{sid}", "manufacturer", "Manufacturer views submission details", r.status_code,
                      "HTTP 200 with submission-xyz-2026-01", str(r.json().get("id")), "Read submission doc", "PASS" if passed else "FAIL")

        # 9.28 Submission Validation GET (Manufacturer)
        r = await client.get("/api/v1/manufacturer/submissions/submission-xyz-2026-01/validation", headers=headers["mfg"])
        passed = r.status_code == 200 and "valid" in r.json()
        record_result("GET", "/api/v1/manufacturer/submissions/{sid}/validation", "manufacturer", "Manufacturer gets submission validation info", r.status_code,
                      "HTTP 200 with validation result", f"valid={r.json().get('valid')}", "Recomputed validation rules", "PASS" if passed else "FAIL")

        # 9.29 Submission Evidence GET (Manufacturer)
        r = await client.get("/api/v1/manufacturer/submissions/submission-xyz-2026-01/evidence", headers=headers["mfg"])
        passed = r.status_code == 200 and "items" in r.json()
        record_result("GET", "/api/v1/manufacturer/submissions/{sid}/evidence", "manufacturer", "Manufacturer lists submission evidence", r.status_code,
                      "HTTP 200 with evidence items", f"{len(r.json().get('items', []))} items", "Read evidence_documents", "PASS" if passed else "FAIL")

        # -------------------------------------------------------------
        # Section 12: Manufacturer Fixed Purchase Excel Tests
        # -------------------------------------------------------------
        print("\n--- Testing Manufacturer Purchase Excel Workflow ---")

        # 12.1 Download Template
        r = await client.get("/api/v1/manufacturer/purchase-records/template", headers=headers["mfg"])
        passed = r.status_code == 200 and "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in r.headers.get("content-type", "")
        # Verify columns in downloaded template
        if passed:
            temp_df = pd.read_excel(io.BytesIO(r.content), sheet_name="Purchase Records")
            expected_cols = ["supplier_id","product_name","reporting_month","purchased_quantity","quantity_unit","purchase_expenditure","currency"]
            cols_match = list(temp_df.columns) == expected_cols
            passed = passed and cols_match
        record_result("GET", "/api/v1/manufacturer/purchase-records/template", "manufacturer", "Download fixed purchase Excel template", r.status_code,
                      "HTTP 200 with exact 7 template columns", f"Columns: {list(temp_df.columns) if passed else 'Error'}", "StreamingResponse generated", "PASS" if passed else "FAIL")

        # 12.2 Upload Valid Purchase File
        valid_purchase_bytes = (FIXTURES_DIR / "purchase_valid.xlsx").read_bytes()
        r = await client.post("/api/v1/manufacturer/purchase-records/uploads", headers=headers["mfg"],
                              files={"file": ("purchase_valid.xlsx", valid_purchase_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")})
        passed = r.status_code == 201 and r.json().get("confirmed") is False and len(r.json().get("valid_rows", [])) == 1
        purchase_upload_id = r.json().get("id") if passed else None
        record_result("POST", "/api/v1/manufacturer/purchase-records/uploads", "manufacturer", "Upload valid purchase Excel", r.status_code,
                      "HTTP 201 with 1 valid row and 0 invalid rows", f"Valid={len(r.json().get('valid_rows', []))}, Invalid={len(r.json().get('invalid_rows', []))}", "Stored in purchase_uploads", "PASS" if passed else "FAIL")

        # 12.3 Preview Upload (GET /purchase-records/uploads/{uid})
        if purchase_upload_id:
            r = await client.get(f"/api/v1/manufacturer/purchase-records/uploads/{purchase_upload_id}", headers=headers["mfg"])
            passed = r.status_code == 200 and r.json().get("id") == purchase_upload_id
            record_result("GET", "/api/v1/manufacturer/purchase-records/uploads/{uid}", "manufacturer", "Preview purchase upload details", r.status_code,
                          f"HTTP 200 with ID {purchase_upload_id}", str(r.json().get("id")), "Read purchase_uploads", "PASS" if passed else "FAIL")

        # 12.4 Confirm Upload (POST /purchase-records/uploads/{uid}/confirm)
        if purchase_upload_id:
            r = await client.post(f"/api/v1/manufacturer/purchase-records/uploads/{purchase_upload_id}/confirm", headers=headers["mfg"])
            passed = r.status_code == 200 and r.json().get("imported") == 1
            record_result("POST", "/api/v1/manufacturer/purchase-records/uploads/{uid}/confirm", "manufacturer", "Confirm purchase upload", r.status_code,
                          "HTTP 200 with imported=1", str(r.json()), "Inserted purchase record and confirmed upload", "PASS" if passed else "FAIL")

        # 12.5 List Purchase Records (GET /manufacturer/purchase-records)
        r = await client.get("/api/v1/manufacturer/purchase-records", headers=headers["mfg"])
        passed = r.status_code == 200 and len(r.json().get("items", [])) >= 1
        sample_purchase_id = r.json().get("items", [])[0]["id"] if passed and r.json().get("items") else None
        record_result("GET", "/api/v1/manufacturer/purchase-records", "manufacturer", "List saved purchase records", r.status_code,
                      "HTTP 200 with purchase records", f"{len(r.json().get('items', []))} records", "Read purchase_records", "PASS" if passed else "FAIL")

        # 12.6 Get Purchase Record by ID (GET /manufacturer/purchase-records/{rid})
        target_rid = sample_purchase_id or "purchase-xyz-steel-2026-01"
        r = await client.get(f"/api/v1/manufacturer/purchase-records/{target_rid}", headers=headers["mfg"])
        passed = r.status_code == 200 and r.json().get("id") == target_rid
        record_result("GET", "/api/v1/manufacturer/purchase-records/{rid}", "manufacturer", "Get single purchase record", r.status_code,
                      f"HTTP 200 with ID {target_rid}", str(r.json().get("id")), "Read purchase_records doc", "PASS" if passed else "FAIL")

        # 12.7 Test all purchase invalid file variants:
        purchase_test_cases = [
            ("purchase_missing_column.xlsx", 422, "Missing required column rejection"),
            ("purchase_incorrect_header.xlsx", 422, "Incorrect header rejection"),
            ("purchase_invalid_supplier.xlsx", 201, "Invalid supplier ID flagged in invalid_rows"),
            ("purchase_invalid_month.xlsx", 201, "Invalid month flagged in invalid_rows"),
            ("purchase_invalid_qty.xlsx", 201, "Invalid quantity flagged in invalid_rows"),
            ("purchase_negative_expenditure.xlsx", 201, "Negative expenditure flagged in invalid_rows"),
            ("purchase_missing_currency.xlsx", 201, "Missing currency flagged in invalid_rows"),
            ("purchase_multiple_legitimate.xlsx", 201, "Multiple legitimate purchases accepted"),
        ]
        for fname, exp_status, desc in purchase_test_cases:
            fbytes = (FIXTURES_DIR / fname).read_bytes()
            r = await client.post("/api/v1/manufacturer/purchase-records/uploads", headers=headers["mfg"],
                                  files={"file": (fname, fbytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")})
            passed = r.status_code == exp_status
            if fname in ["purchase_missing_column.xlsx", "purchase_incorrect_header.xlsx"]:
                res_detail = "Template header validation failed as expected"
            elif fname == "purchase_multiple_legitimate.xlsx":
                res_detail = f"Accepted {len(r.json().get('valid_rows', []))} rows"
            else:
                res_detail = f"Invalid rows count: {len(r.json().get('invalid_rows', []))}"
            record_result("POST", "/api/v1/manufacturer/purchase-records/uploads", "manufacturer", f"Purchase test variant: {desc}", r.status_code,
                          f"HTTP {exp_status}", res_detail, "Verified validation logic", "PASS" if passed else "FAIL")

        # -------------------------------------------------------------
        # Section 10: Monthly Supplier Reporting Tests
        # -------------------------------------------------------------
        print("\n--- Testing Monthly Supplier Reporting Workflow ---")

        # 10.1 Reporting Periods GET
        r = await client.get("/api/v1/supplier/reporting-periods", headers=headers["sup1"])
        passed = r.status_code == 200 and r.json().get("frequency") == "monthly"
        record_result("GET", "/api/v1/supplier/reporting-periods", "supplier", "Get supplier reporting periods info", r.status_code,
                      "HTTP 200 with monthly frequency", str(r.json()), "Read configuration", "PASS" if passed else "FAIL")

        # 10.2 Reporting Requirements GET
        r = await client.get("/api/v1/supplier/reporting-requirements", headers=headers["sup1"])
        passed = r.status_code == 200 and len(r.json().get("items", [])) >= 4
        record_result("GET", "/api/v1/supplier/reporting-requirements", "supplier", "Supplier views own reporting requirements", r.status_code,
                      "HTTP 200 with 4 requirements", f"{len(r.json().get('items', []))} items", "Read supplier_requirements for sup1", "PASS" if passed else "FAIL")

        # 10.3 Create Monthly Draft for a new month (2026-02)
        r = await client.post("/api/v1/supplier/submissions", headers=headers["sup1"], json={"reporting_month": "2026-02"})
        passed = r.status_code == 201 and r.json().get("status") == "draft"
        sub_2026_02_id = r.json().get("id") if passed else None
        record_result("POST", "/api/v1/supplier/submissions", "supplier", "Create monthly reporting draft (2026-02)", r.status_code,
                      "HTTP 201 draft created", str(sub_2026_02_id), "Inserted draft submission in DB", "PASS" if passed else "FAIL")

        # 10.4 Duplicate month protection (try creating 2026-02 again -> 409 Conflict)
        r = await client.post("/api/v1/supplier/submissions", headers=headers["sup1"], json={"reporting_month": "2026-02"})
        passed = r.status_code == 409
        record_result("POST", "/api/v1/supplier/submissions", "supplier", "Duplicate reporting period protection", r.status_code,
                      "HTTP 409 Conflict", str(r.json()), "Prevented duplicate active report", "PASS" if passed else "FAIL")

        # 10.5 Update submission notes (PATCH)
        if sub_2026_02_id:
            r = await client.patch(f"/api/v1/supplier/submissions/{sub_2026_02_id}", headers=headers["sup1"], json={"notes": "Draft under active entry"})
            passed = r.status_code == 200 and r.json().get("notes") == "Draft under active entry"
            record_result("PATCH", "/api/v1/supplier/submissions/{sid}", "supplier", "Update submission notes", r.status_code,
                          "HTTP 200 with updated notes", str(r.json().get("notes")), "Updated notes in DB", "PASS" if passed else "FAIL")

        # 10.6 Enter activities manually (PUT /activities/{activity_id})
        # Enter electricity, diesel, production, raw_material
        activities_to_enter = [
            ("electricity", 100000.0, "kWh"),
            ("diesel", 2000.0, "litres"),
            ("production", 500.0, "tonnes"),
            ("raw_material", 600.0, "tonnes")
        ]
        if sub_2026_02_id:
            for aid, val, unit in activities_to_enter:
                r = await client.put(f"/api/v1/supplier/submissions/{sub_2026_02_id}/activities/{aid}", headers=headers["sup1"],
                                     json={"value": val, "unit": unit, "notes": f"Verified {aid} meter"})
                passed = r.status_code == 200 and r.json().get("activity_id") == aid
                record_result("PUT", "/api/v1/supplier/submissions/{sid}/activities/{activity_id}", "supplier", f"Enter activity {aid}", r.status_code,
                              f"HTTP 200 with {aid}", str(r.json().get("value")), "Pushed into submission activities array", "PASS" if passed else "FAIL")

        # 10.7 List activities (GET /activities)
        if sub_2026_02_id:
            r = await client.get(f"/api/v1/supplier/submissions/{sub_2026_02_id}/activities", headers=headers["sup1"])
            passed = r.status_code == 200 and len(r.json().get("items", [])) == 4
            record_result("GET", "/api/v1/supplier/submissions/{sid}/activities", "supplier", "List submission activities", r.status_code,
                          "HTTP 200 with 4 activities", f"{len(r.json().get('items', []))} activities", "Read activities from submission", "PASS" if passed else "FAIL")

        # 10.8 Delete single activity (DELETE /activities/{activity_id}) then re-add
        if sub_2026_02_id:
            r = await client.delete(f"/api/v1/supplier/submissions/{sub_2026_02_id}/activities/raw_material", headers=headers["sup1"])
            passed = r.status_code == 204
            record_result("DELETE", "/api/v1/supplier/submissions/{sid}/activities/{activity_id}", "supplier", "Delete activity from draft", r.status_code,
                          "HTTP 204 No Content", "Deleted", "Pulled raw_material from activities array", "PASS" if passed else "FAIL")

            # 10.9 Incomplete submission validation and rejection
            # Validate incomplete (GET /validation)
            r = await client.get(f"/api/v1/supplier/submissions/{sub_2026_02_id}/validation", headers=headers["sup1"])
            passed = r.status_code == 200 and r.json().get("valid") is False
            record_result("GET", "/api/v1/supplier/submissions/{sid}/validation", "supplier", "Validation reports incomplete draft", r.status_code,
                          "HTTP 200 valid=False", str(r.json()), "Computed missing raw_material", "PASS" if passed else "FAIL")

            # Validate incomplete (POST /validate)
            r = await client.post(f"/api/v1/supplier/submissions/{sub_2026_02_id}/validate", headers=headers["sup1"])
            passed = r.status_code == 200 and r.json().get("valid") is False
            record_result("POST", "/api/v1/supplier/submissions/{sid}/validate", "supplier", "Validate endpoint reports incomplete", r.status_code,
                          "HTTP 200 valid=False", str(r.json()), "Computed missing raw_material", "PASS" if passed else "FAIL")

            # Attempt to submit incomplete draft -> 422 Unprocessable Entity
            r = await client.post(f"/api/v1/supplier/submissions/{sub_2026_02_id}/submit", headers=headers["sup1"])
            passed = r.status_code == 422
            record_result("POST", "/api/v1/supplier/submissions/{sid}/submit", "supplier", "Reject incomplete draft submission", r.status_code,
                          "HTTP 422 Unprocessable Entity", str(r.json()), "Prevented submission of incomplete report", "PASS" if passed else "FAIL")

            # Re-add raw_material to make complete
            await client.put(f"/api/v1/supplier/submissions/{sub_2026_02_id}/activities/raw_material", headers=headers["sup1"],
                             json={"value": 600.0, "unit": "tonnes"})

            # Validate complete draft
            r = await client.get(f"/api/v1/supplier/submissions/{sub_2026_02_id}/validation", headers=headers["sup1"])
            passed = r.status_code == 200 and r.json().get("valid") is True

            # Submit complete draft -> 200 OK
            r = await client.post(f"/api/v1/supplier/submissions/{sub_2026_02_id}/submit", headers=headers["sup1"])
            passed = r.status_code == 200 and r.json().get("status") == "submitted"
            record_result("POST", "/api/v1/supplier/submissions/{sid}/submit", "supplier", "Submit complete monthly report", r.status_code,
                          "HTTP 200 status=submitted", str(r.json().get("status")), "Updated status to submitted in DB", "PASS" if passed else "FAIL")

        # 10.10 Clarification Cycle (Auditor requests -> Supplier views -> Supplier responds)
        # Use existing clarification on submission-xyz-2026-01
        r_clars = await client.get("/api/v1/supplier/submissions/submission-xyz-2026-01/clarifications", headers=headers["sup1"])
        passed = r_clars.status_code == 200 and len(r_clars.json().get("items", [])) >= 1
        active_cid = r_clars.json().get("items", [])[0]["id"] if passed else None
        record_result("GET", "/api/v1/supplier/submissions/{sid}/clarifications", "supplier", "Supplier views clarification requests", r_clars.status_code,
                      "HTTP 200 with clarification items", f"{len(r_clars.json().get('items', []))} items", "Read clarifications collection", "PASS" if passed else "FAIL")

        if active_cid:
            r = await client.post(f"/api/v1/supplier/submissions/submission-xyz-2026-01/clarifications/{active_cid}/respond",
                                  headers=headers["sup1"], json={"response": "Diesel was consumed exclusively in facility backup generators."})
            passed = r.status_code == 200 and r.json().get("response") is not None
            sub_after = test_db["submissions"].find_one({"id": "submission-xyz-2026-01"})
            stat_ok = sub_after and sub_after.get("status") == "response_submitted"
            record_result("POST", "/api/v1/supplier/submissions/{sid}/clarifications/{cid}/respond", "supplier", "Supplier responds to clarification", r.status_code,
                          "HTTP 200 response stored & status=response_submitted", f"Status={sub_after.get('status')}", "Updated clarification and submission status", "PASS" if (passed and stat_ok) else "FAIL")

        # -------------------------------------------------------------
        # Section 11: Supplier Spreadsheet Testing (11 variants)
        # -------------------------------------------------------------
        print("\n--- Testing Supplier Spreadsheet Uploads & Mapping ---")
        # Create a new draft submission for spreadsheet testing (2026-03)
        r = await client.post("/api/v1/supplier/submissions", headers=headers["sup1"], json={"reporting_month": "2026-03"})
        sub_2026_03_id = r.json().get("id")

        # Test upload of valid single-row spreadsheet
        single_bytes = (FIXTURES_DIR / "supplier_valid_single.xlsx").read_bytes()
        r = await client.post(f"/api/v1/supplier/submissions/{sub_2026_03_id}/spreadsheet-uploads", headers=headers["sup1"],
                              files={"file": ("supplier_valid_single.xlsx", single_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")})
        passed = r.status_code == 201 and "headers" in r.json()
        sup_sheet_uid = r.json().get("id") if passed else None
        record_result("POST", "/api/v1/supplier/submissions/{sid}/spreadsheet-uploads", "supplier", "Upload valid spreadsheet (.xlsx)", r.status_code,
                      "HTTP 201 with extracted headers and sample", f"Headers: {r.json().get('headers')}", "Stored in supplier_spreadsheet_uploads", "PASS" if passed else "FAIL")

        # Retrieve parsed spreadsheet info (GET)
        if sup_sheet_uid:
            r = await client.get(f"/api/v1/supplier/submissions/{sub_2026_03_id}/spreadsheet-uploads/{sup_sheet_uid}", headers=headers["sup1"])
            passed = r.status_code == 200 and r.json().get("id") == sup_sheet_uid
            record_result("GET", "/api/v1/supplier/submissions/{sid}/spreadsheet-uploads/{uid}", "supplier", "Get parsed spreadsheet info", r.status_code,
                          f"HTTP 200 with ID {sup_sheet_uid}", str(r.json().get("id")), "Read supplier_spreadsheet_uploads doc", "PASS" if passed else "FAIL")

        # Test AI Mapping Endpoint (POST .../ai-map) with configured model
        if sup_sheet_uid:
            r = await client.post(f"/api/v1/supplier/submissions/{sub_2026_03_id}/spreadsheet-uploads/{sup_sheet_uid}/ai-map", headers=headers["sup1"])
            # In unmodified code, let's see if it passes or fails
            passed = r.status_code == 200 and "suggestions" in r.json() and r.json().get("requires_supplier_confirmation") is True
            record_result("POST", "/api/v1/supplier/submissions/{sid}/spreadsheet-uploads/{uid}/ai-map", "supplier", "Live AI spreadsheet column mapping", r.status_code,
                          "HTTP 200 with suggestions and requires_supplier_confirmation=True", str(r.json().get("suggestions") if passed else r.text[:120]), "Advisory only; no DB writes to submission", "PASS" if passed else "FAIL")

        # Confirm Mapping (PUT .../mapping)
        if sup_sheet_uid:
            mapping_payload = {
                "mapping": {
                    "electricity": {"column": "electricity_kwh", "unit": "kWh"},
                    "diesel": {"column": "diesel_litres", "unit": "litres"},
                    "production": {"column": "production_tonnes", "unit": "tonnes"},
                    "raw_material": {"column": "raw_material_tonnes", "unit": "tonnes"}
                }
            }
            r = await client.put(f"/api/v1/supplier/submissions/{sub_2026_03_id}/spreadsheet-uploads/{sup_sheet_uid}/mapping", headers=headers["sup1"], json=mapping_payload)
            passed = r.status_code == 200 and "mapping" in r.json()
            record_result("PUT", "/api/v1/supplier/submissions/{sid}/spreadsheet-uploads/{uid}/mapping", "supplier", "Supplier confirms column mappings", r.status_code,
                          "HTTP 200 with confirmed mapping", str(r.json().get("mapping")), "Saved mapping in supplier_spreadsheet_uploads", "PASS" if passed else "FAIL")

        # Validate Mapped Data (POST .../validate)
        if sup_sheet_uid:
            r = await client.post(f"/api/v1/supplier/submissions/{sub_2026_03_id}/spreadsheet-uploads/{sup_sheet_uid}/validate", headers=headers["sup1"])
            passed = r.status_code == 200 and r.json().get("valid") is True
            record_result("POST", "/api/v1/supplier/submissions/{sid}/spreadsheet-uploads/{uid}/validate", "supplier", "Validate mapped spreadsheet data", r.status_code,
                          "HTTP 200 with valid=True and preview", str(r.json().get("valid")), "Preview computed", "PASS" if passed else "FAIL")

        # Import Mapped Data (POST .../import)
        if sup_sheet_uid:
            r = await client.post(f"/api/v1/supplier/submissions/{sub_2026_03_id}/spreadsheet-uploads/{sup_sheet_uid}/import", headers=headers["sup1"])
            passed = r.status_code == 200 and len(r.json().get("activities", [])) == 4
            record_result("POST", "/api/v1/supplier/submissions/{sid}/spreadsheet-uploads/{uid}/import", "supplier", "Import mapped spreadsheet values into draft", r.status_code,
                          "HTTP 200 with 4 imported activities", f"{len(r.json().get('activities', []))} activities imported", "Updated activities in submission", "PASS" if passed else "FAIL")

        # Test spreadsheet edge case variants:
        sheet_variants = [
            ("supplier_multi_sheets.xlsx", 201, "Multiple worksheets parsed"),
            ("supplier_missing_columns.xlsx", 201, "Missing columns uploaded"),
            ("supplier_invalid_numeric.xlsx", 201, "Invalid numeric uploaded"),
            ("supplier_empty.xlsx", 422, "Empty file rejected"),
            ("supplier_invalid_ext.txt", 415, "Unsupported extension rejected")
        ]
        for fname, exp_status, desc in sheet_variants:
            fbytes = (FIXTURES_DIR / fname).read_bytes()
            r = await client.post(f"/api/v1/supplier/submissions/{sub_2026_03_id}/spreadsheet-uploads", headers=headers["sup1"],
                                  files={"file": (fname, fbytes, "application/octet-stream")})
            passed = r.status_code == exp_status
            record_result("POST", "/api/v1/supplier/submissions/{sid}/spreadsheet-uploads", "supplier", f"Spreadsheet variant: {desc}", r.status_code,
                          f"HTTP {exp_status}", f"Status {r.status_code}", "Verified upload validation", "PASS" if passed else "FAIL")

        # -------------------------------------------------------------
        # Section 16: Evidence Upload & Review End-to-End
        # -------------------------------------------------------------
        print("\n--- Testing Evidence Upload & PyMuPDF Review ---")

        # Supplier uploads synthetic PDF evidence
        pdf_bytes = (FIXTURES_DIR / "evidence_xyz_steel_2026_01.pdf").read_bytes()
        r = await client.post("/api/v1/supplier/submissions/submission-xyz-2026-01/evidence", headers=headers["sup1"],
                              files={"file": ("evidence_xyz_steel_2026_01.pdf", pdf_bytes, "application/pdf")})
        passed = r.status_code == 201 and "id" in r.json()
        evidence_id = r.json().get("id") if passed else None
        record_result("POST", "/api/v1/supplier/submissions/{sid}/evidence", "supplier", "Upload PDF evidence document", r.status_code,
                      "HTTP 201 with stored evidence metadata", str(evidence_id), "Saved file to disk and record in evidence_documents", "PASS" if passed else "FAIL")

        # List Evidence (Supplier)
        r = await client.get("/api/v1/supplier/submissions/submission-xyz-2026-01/evidence", headers=headers["sup1"])
        passed = r.status_code == 200 and any(e["id"] == evidence_id for e in r.json().get("items", []))
        record_result("GET", "/api/v1/supplier/submissions/{sid}/evidence", "supplier", "Supplier lists evidence documents", r.status_code,
                      "HTTP 200 with evidence list", f"{len(r.json().get('items', []))} items", "Read evidence_documents", "PASS" if passed else "FAIL")

        # List Evidence (Auditor)
        r = await client.get("/api/v1/auditor/submissions/submission-xyz-2026-01/evidence", headers=headers["aud1"])
        passed = r.status_code == 200 and any(e["id"] == evidence_id for e in r.json().get("items", []))
        record_result("GET", "/api/v1/auditor/submissions/{sid}/evidence", "auditor", "Auditor lists evidence for assigned submission", r.status_code,
                      "HTTP 200 with evidence list", f"{len(r.json().get('items', []))} items", "Read evidence_documents", "PASS" if passed else "FAIL")

        # Auditor Evidence Review (POST .../ai/evidence-review)
        r = await client.post("/api/v1/auditor/submissions/submission-xyz-2026-01/ai/evidence-review", headers=headers["aud1"])
        passed = r.status_code == 200 and "result" in r.json() and r.json().get("result", {}).get("rating") in ["Weak", "Medium", "Good"]
        record_result("POST", "/api/v1/auditor/submissions/{sid}/ai/evidence-review", "auditor", "Auditor runs AI evidence review on PDF", r.status_code,
                      "HTTP 200 with structured assessment and rating in Weak/Medium/Good", str(r.json().get("result", {}).get("rating") if passed else r.text[:120]), "PyMuPDF extracted text, assessment stored in ai_assessments", "PASS" if passed else "FAIL")

        # Auditor Report Quality Assessment (POST .../ai/report-quality)
        r = await client.post("/api/v1/auditor/submissions/submission-xyz-2026-01/ai/report-quality", headers=headers["aud1"])
        passed = r.status_code == 200 and "result" in r.json() and r.json().get("result", {}).get("rating") in ["Good", "Needs attention", "Poor"]
        record_result("POST", "/api/v1/auditor/submissions/{sid}/ai/report-quality", "auditor", "Auditor runs AI report quality assessment", r.status_code,
                      "HTTP 200 with rating in Good/Needs attention/Poor", str(r.json().get("result", {}).get("rating") if passed else r.text[:120]), "Assessment stored in ai_assessments", "PASS" if passed else "FAIL")

        # Retrieve AI Assessments (GET .../ai-assessments)
        r = await client.get("/api/v1/auditor/submissions/submission-xyz-2026-01/ai-assessments", headers=headers["aud1"])
        passed = r.status_code == 200 and len(r.json().get("items", [])) >= 1
        record_result("GET", "/api/v1/auditor/submissions/{sid}/ai-assessments", "auditor", "Auditor retrieves stored AI assessments", r.status_code,
                      "HTTP 200 with assessment items", f"{len(r.json().get('items', []))} assessments", "Read ai_assessments", "PASS" if passed else "FAIL")

        # Test DELETE evidence from draft submission
        # Upload temp evidence to draft submission-green-2026-01 then delete it
        r = await client.post("/api/v1/supplier/submissions/submission-green-2026-01/evidence", headers=headers["sup2"],
                              files={"file": ("temp_evidence.csv", b"sample,data", "text/csv")})
        if r.status_code == 201:
            temp_eid = r.json()["id"]
            r_del = await client.delete(f"/api/v1/supplier/submissions/submission-green-2026-01/evidence/{temp_eid}", headers=headers["sup2"])
            passed = r_del.status_code == 204
            record_result("DELETE", "/api/v1/supplier/submissions/{sid}/evidence/{eid}", "supplier", "Delete evidence from draft submission", r_del.status_code,
                          "HTTP 204 No Content", "Deleted", "Removed file and DB record", "PASS" if passed else "FAIL")

        # -------------------------------------------------------------
        # Section 14: Emissions Calculations Testing
        # -------------------------------------------------------------
        print("\n--- Testing Emissions Calculations Engine ---")

        # 14.1 Product-Factor Calculation
        # Factor 2.1 tonnes CO2e/tonne on 100 tonnes -> Expected: 210.0 kg CO2e
        r = await client.post("/api/v1/manufacturer/calculations", headers=headers["mfg"], json={
            "purchase_record_id": "purchase-xyz-steel-2026-01",
            "factor_id": "factor-steel",
            "method": "product_factor"
        })
        passed = r.status_code == 201 and abs(r.json().get("result_value", 0) - 210.0) < 1e-4
        calc_pf_id = r.json().get("id") if passed else None
        record_result("POST", "/api/v1/manufacturer/calculations", "manufacturer", "Calculate product-factor emissions", r.status_code,
                      "HTTP 201 with result_value=210.0", str(r.json().get("result_value")), "Inserted calculation_runs doc", "PASS" if passed else "FAIL")

        # Synthetic product-factor test with factor 1.2: 100 * 1.2 = 120.0
        r_12 = await client.post("/api/v1/manufacturer/calculations", headers=headers["mfg"], json={
            "purchase_record_id": "purchase-xyz-steel-2026-01",
            "factor_id": "factor-steel-12",
            "method": "product_factor"
        })
        passed_12 = r_12.status_code == 201 and abs(r_12.json().get("result_value", 0) - 120.0) < 1e-4
        record_result("POST", "/api/v1/manufacturer/calculations", "manufacturer", "Calculate product-factor emissions (1.2 factor -> 120.0)", r_12.status_code,
                      "HTTP 201 with result_value=120.0", str(r_12.json().get("result_value")), "Inserted calculation_runs doc", "PASS" if passed_12 else "FAIL")

        # 14.2 Activity-Based Calculation
        # Electricity 100,000 * 0.4 = 40,000; Diesel 2,000 * 2.68 = 5,360; Total = 45,360; Allocation 10% (0.10) -> 4,536.0 kg CO2e
        r = await client.post("/api/v1/manufacturer/calculations", headers=headers["mfg"], json={
            "purchase_record_id": "purchase-xyz-steel-2026-01",
            "factor_id": "factor-electricity",
            "method": "activity_based",
            "allocation_basis": "Documented purchased production share",
            "allocation_value": 0.10
        })
        passed = r.status_code == 201 and abs(r.json().get("result_value", 0) - 4536.0) < 1e-4
        calc_act_id = r.json().get("id") if passed else None
        record_result("POST", "/api/v1/manufacturer/calculations", "manufacturer", "Calculate activity-based emissions (10% allocation -> 4536.0)", r.status_code,
                      "HTTP 201 with result_value=4536.0", str(r.json().get("result_value")), "Inserted calculation_runs doc", "PASS" if passed else "FAIL")

        # 14.3 Spend-Based Calculation
        # Expenditure 1,000,000 INR * 0.2 factor -> 200,000.0 kg CO2e
        r = await client.post("/api/v1/manufacturer/calculations", headers=headers["mfg"], json={
            "purchase_record_id": "purchase-xyz-steel-2026-01",
            "factor_id": "factor-spend",
            "method": "spend_based"
        })
        passed = r.status_code == 201 and abs(r.json().get("result_value", 0) - 200000.0) < 1e-4
        calc_spend_id = r.json().get("id") if passed else None
        record_result("POST", "/api/v1/manufacturer/calculations", "manufacturer", "Calculate spend-based emissions (1,000,000 * 0.2 -> 200000.0)", r.status_code,
                      "HTTP 201 with result_value=200000.0", str(r.json().get("result_value")), "Inserted calculation_runs doc", "PASS" if passed else "FAIL")

        # 14.4 List Calculations (GET /manufacturer/calculations)
        r = await client.get("/api/v1/manufacturer/calculations", headers=headers["mfg"])
        passed = r.status_code == 200 and len(r.json().get("items", [])) >= 3
        record_result("GET", "/api/v1/manufacturer/calculations", "manufacturer", "List calculation runs", r.status_code,
                      "HTTP 200 with calculation runs list", f"{len(r.json().get('items', []))} runs", "Read calculation_runs", "PASS" if passed else "FAIL")

        # 14.5 Get Calculation Run Details (GET /manufacturer/calculations/{cid})
        target_cid = calc_pf_id or "some-id"
        r = await client.get(f"/api/v1/manufacturer/calculations/{target_cid}", headers=headers["mfg"])
        passed = r.status_code == 200 and r.json().get("id") == target_cid
        record_result("GET", "/api/v1/manufacturer/calculations/{cid}", "manufacturer", "Get single calculation run details", r.status_code,
                      f"HTTP 200 with ID {target_cid}", str(r.json().get("id")), "Read calculation_runs doc", "PASS" if passed else "FAIL")

        # 14.6 Get Calculation Receipt (GET /manufacturer/calculations/{cid}/receipt)
        r = await client.get(f"/api/v1/manufacturer/calculations/{target_cid}/receipt", headers=headers["mfg"])
        passed = r.status_code == 200 and r.json().get("formula") is not None
        record_result("GET", "/api/v1/manufacturer/calculations/{cid}/receipt", "manufacturer", "Get calculation receipt with audit formula", r.status_code,
                      "HTTP 200 with calculation receipt", f"Formula: {r.json().get('formula')}", "Read calculation_runs audit metadata", "PASS" if passed else "FAIL")

        # 14.7 Calculation Error Cases:
        # Mismatched method vs factor_type -> 422
        r = await client.post("/api/v1/manufacturer/calculations", headers=headers["mfg"], json={
            "purchase_record_id": "purchase-xyz-steel-2026-01",
            "factor_id": "factor-steel",
            "method": "activity_based",
            "allocation_basis": "test",
            "allocation_value": 0.5
        })
        passed = r.status_code == 422
        record_result("POST", "/api/v1/manufacturer/calculations", "manufacturer", "Reject method mismatch with factor_type", r.status_code,
                      "HTTP 422 Selected method does not match factor type", str(r.json()), "Prevented invalid calculation", "PASS" if passed else "FAIL")

        # Missing allocation_value in activity_based -> 422
        r = await client.post("/api/v1/manufacturer/calculations", headers=headers["mfg"], json={
            "purchase_record_id": "purchase-xyz-steel-2026-01",
            "factor_id": "factor-electricity",
            "method": "activity_based"
        })
        passed = r.status_code == 422
        record_result("POST", "/api/v1/manufacturer/calculations", "manufacturer", "Reject activity_based without allocation", r.status_code,
                      "HTTP 422 Missing allocation basis/value", str(r.json()), "Prevented unallocated calculation", "PASS" if passed else "FAIL")

        # -------------------------------------------------------------
        # Section 15: Supplier Carbon Reduction Suggestions
        # -------------------------------------------------------------
        print("\n--- Testing Supplier Carbon Reduction Suggestions ---")

        # Supplier calls reduction suggestions (requires calculated results for reporting month)
        r = await client.post("/api/v1/supplier/submissions/submission-xyz-2026-01/reduction-suggestions", headers=headers["sup1"])
        passed = r.status_code in [200, 201] and "result" in r.json() and "suggestions" in r.json().get("result", {})
        record_result("POST", "/api/v1/supplier/submissions/{sid}/reduction-suggestions", "supplier", "Live AI reduction suggestions request", r.status_code,
                      "HTTP 200 with structured suggestions array", str(len(r.json().get("result", {}).get("suggestions", [])) if passed else r.text[:120]), "Stored assessment in ai_assessments", "PASS" if passed else "FAIL")

        # Retrieve reduction suggestions (GET)
        r = await client.get("/api/v1/supplier/submissions/submission-xyz-2026-01/reduction-suggestions", headers=headers["sup1"])
        passed = r.status_code == 200 and "items" in r.json()
        record_result("GET", "/api/v1/supplier/submissions/{sid}/reduction-suggestions", "supplier", "Retrieve reduction suggestions", r.status_code,
                      "HTTP 200 with items list", f"{len(r.json().get('items', []))} suggestions stored", "Read ai_assessments", "PASS" if passed else "FAIL")

        # -------------------------------------------------------------
        # Section 17: Dashboard and Reporting Aggregates Verification
        # -------------------------------------------------------------
        print("\n--- Testing Dashboard & Reporting Aggregates ---")

        # 17.1 Dashboard Summary GET
        r = await client.get("/api/v1/manufacturer/dashboard/summary", headers=headers["mfg"])
        passed = r.status_code == 200 and "emissions_kgco2e" in r.json() and "combined_kgco2e" in r.json()
        # Verify aggregates against database
        runs_in_db = list(test_db["calculation_runs"].find())
        expected_combined = sum(run.get("result_value", 0) for run in runs_in_db)
        actual_combined = r.json().get("combined_kgco2e", 0)
        combined_matched = abs(expected_combined - actual_combined) < 1e-3
        record_result("GET", "/api/v1/manufacturer/dashboard/summary", "manufacturer", "Get dashboard summary aggregates", r.status_code,
                      f"HTTP 200 with combined_kgco2e={expected_combined}", f"Combined: {actual_combined}", "Aggregated directly from calculation_runs & submissions", "PASS" if (passed and combined_matched) else "FAIL")

        # 17.2 Emissions Report GET
        r = await client.get("/api/v1/manufacturer/reports/emissions", headers=headers["mfg"])
        passed = r.status_code == 200 and len(r.json().get("items", [])) == len(runs_in_db)
        record_result("GET", "/api/v1/manufacturer/reports/emissions", "manufacturer", "Get emissions report", r.status_code,
                      f"HTTP 200 with {len(runs_in_db)} runs", f"{len(r.json().get('items', []))} runs", "Read calculation_runs", "PASS" if passed else "FAIL")

        # 17.3 Supplier Emissions Report GET
        r = await client.get("/api/v1/manufacturer/reports/suppliers", headers=headers["mfg"])
        passed = r.status_code == 200 and "items" in r.json()
        record_result("GET", "/api/v1/manufacturer/reports/suppliers", "manufacturer", "Get supplier-level emissions report", r.status_code,
                      "HTTP 200 with supplier emissions list", f"{len(r.json().get('items', []))} suppliers reported", "Aggregated emissions per supplier", "PASS" if passed else "FAIL")

        # -------------------------------------------------------------
        # Section 13: Unit Conversion Testing
        # -------------------------------------------------------------
        print("\n--- Testing Unit Conversion Logic ---")

        # Test: 100 MWh = 100,000 kWh
        # Create a draft for testing unit conversion (2026-04)
        r = await client.post("/api/v1/supplier/submissions", headers=headers["sup1"], json={"reporting_month": "2026-04"})
        sub_2026_04_id = r.json().get("id")

        # Enter electricity with value=100 and unit="MWh"
        r = await client.put(f"/api/v1/supplier/submissions/{sub_2026_04_id}/activities/electricity", headers=headers["sup1"],
                             json={"value": 100.0, "unit": "MWh", "notes": "Tested unit conversion from MWh"})
        # Let's inspect what happens in existing backend
        resp_data = r.json() if r.status_code == 200 else {}
        val_is_100k = resp_data.get("value") == 100000.0 or resp_data.get("normalised_value") == 100000.0
        passed = r.status_code == 200 and val_is_100k
        record_result("PUT", "/api/v1/supplier/submissions/{sid}/activities/{activity_id}", "supplier", "Unit conversion: 100 MWh = 100,000 kWh", r.status_code,
                      "HTTP 200 with normalised_value=100000.0 and original_value=100.0", str(resp_data), "Normalized value and conversion metadata stored in DB", "PASS" if passed else "FAIL")

        # Test unsupported unit conversion (litres to kg without density) -> should flag error (422)
        r_unsupp = await client.put(f"/api/v1/supplier/submissions/{sub_2026_04_id}/activities/production", headers=headers["sup1"],
                                    json={"value": 500.0, "unit": "litres", "notes": "Unsupported litres to tonnes without density"})
        passed = r_unsupp.status_code == 422
        record_result("PUT", "/api/v1/supplier/submissions/{sid}/activities/{activity_id}", "supplier", "Unsupported unit conversion (litres to tonnes) rejected", r_unsupp.status_code,
                      "HTTP 422 Unsupported conversion", str(r_unsupp.json()), "Prevented ungrounded unit conversion", "PASS" if passed else "FAIL")

    print("\n" + "=" * 80)
    print("TEST SUITE EXECUTION COMPLETED")
    print(f"Total Test Cases Recorded: {len(TEST_RESULTS)}")
    print(f"Total Unique Route Operations Covered: {len(ROUTE_COVERAGE)}")
    print("=" * 80)

    # Export to CSV
    csv_path = Path("route_test_results.csv")
    fieldnames = ["method", "path", "required_role", "test_scenario", "http_status", "expected_result", "actual_result", "database_effect", "status"]
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in TEST_RESULTS:
            writer.writerow(row)
    print(f"Exported test results to {csv_path.resolve()}")

if __name__ == "__main__":
    asyncio.run(run_tests())
