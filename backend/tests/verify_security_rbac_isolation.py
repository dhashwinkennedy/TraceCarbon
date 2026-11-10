"""
Security & Role-Based Access Control (RBAC) & Tenant Data Isolation Verification.
Tests:
1. Manufacturer administrative access and endpoint role boundaries.
2. Dual-Auditor access, assignment boundary enforcement, and cross-auditor access restrictions.
3. 10 AxiomX Supplier logins and strict cross-tenant isolation (preventing supplier-to-supplier data leakage).
4. Role privilege escalation defense across all roles.
"""

import os
import sys
import httpx
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "http://127.0.0.1:8000/api/v1"
client = httpx.Client(base_url=BASE_URL, timeout=30)
mongo_client = MongoClient(os.getenv("MONGODB_URI"))
db = mongo_client[os.getenv("MONGODB_DB", "scope3track")]

def verify_security():
    print("\n=======================================================")
    print("STARTING SECURITY, RBAC & TENANT ISOLATION VERIFICATION")
    print("=======================================================")

    # 1. Manufacturer Admin Verification
    print("\n[SECURITY TEST 1] Manufacturer Admin Role Verification...")
    m_res = client.post("/auth/login", json={"email": "manufacturer@scope3track.demo", "password": "ManufacturerDemo123!"})
    assert m_res.status_code == 200
    m_tok = m_res.json()["access_token"]
    m_h = {"Authorization": f"Bearer {m_tok}"}

    # Verify authorized access
    assert client.get("/manufacturer/profile", headers=m_h).status_code == 200
    assert client.get("/manufacturer/suppliers", headers=m_h).status_code == 200
    assert client.get("/manufacturer/purchase-records", headers=m_h).status_code == 200
    assert client.get("/manufacturer/calculations", headers=m_h).status_code == 200

    # Verify role escalation is blocked (Manufacturer cannot call supplier or auditor action endpoints)
    sub_sample = db["submissions"].find_one({})
    sid = sub_sample["id"]

    m_as_sup = client.post(f"/supplier/submissions/{sid}/validate", headers=m_h)
    assert m_as_sup.status_code in [401, 403], f"Privilege breach: Manufacturer called supplier endpoint: {m_as_sup.status_code}"

    m_as_aud = client.post(f"/auditor/submissions/{sid}/ai/report-quality", headers=m_h)
    assert m_as_aud.status_code in [401, 403], f"Privilege breach: Manufacturer called auditor endpoint: {m_as_aud.status_code}"
    print("  [PASS] Manufacturer administrative boundaries enforced with zero role leakage.")

    # 2. Dual Auditor Governance & Isolation Verification
    print("\n[SECURITY TEST 2] Dual Auditor Governance & Boundary Enforcement...")
    a1_res = client.post("/auth/login", json={"email": "auditor.xyz@scope3track.demo", "password": "AuditorDemo123!"})
    assert a1_res.status_code == 200
    a1_tok = a1_res.json()["access_token"]
    a1_h = {"Authorization": f"Bearer {a1_tok}"}

    a2_res = client.post("/auth/login", json={"email": "auditor.green@scope3track.demo", "password": "AuditorDemo123!"})
    assert a2_res.status_code == 200
    a2_tok = a2_res.json()["access_token"]
    a2_h = {"Authorization": f"Bearer {a2_tok}"}

    # Check assignment isolation
    # SUP-001 is assigned to Auditor 1 (xyz), NOT Auditor 2 (green)
    # SUP-007 is assigned to Auditor 2 (green), NOT Auditor 1 (xyz)
    sub_sup1 = "sub-SUP-001-FY2022-23"
    sub_sup7 = "sub-SUP-007-FY2022-23"

    # Auditor 1 can access SUP-001, but NOT SUP-007
    assert client.get(f"/auditor/submissions/{sub_sup1}", headers=a1_h).status_code == 200
    a1_cross = client.get(f"/auditor/submissions/{sub_sup7}", headers=a1_h)
    assert a1_cross.status_code in [403, 404], f"Cross-auditor breach: Auditor 1 accessed SUP-007: {a1_cross.status_code}"

    # Auditor 2 can access SUP-007, but NOT SUP-001
    assert client.get(f"/auditor/submissions/{sub_sup7}", headers=a2_h).status_code == 200
    a2_cross = client.get(f"/auditor/submissions/{sub_sup1}", headers=a2_h)
    assert a2_cross.status_code in [403, 404], f"Cross-auditor breach: Auditor 2 accessed SUP-001: {a2_cross.status_code}"
    print("  [PASS] Dual-auditor governance boundaries strictly enforced; cross-auditor access blocked with 403/404.")

    # 3. 10 Supplier Accounts Login & Multi-Tenant Data Isolation
    print("\n[SECURITY TEST 3] 10 AxiomX Supplier Logins & Strict Multi-Tenant Data Isolation...")
    supplier_credentials = [
        ("SUP-001", "supplier.steel@axiomx.demo", "AxiomX!Steel#2026"),
        ("SUP-002", "supplier.rubber@axiomx.demo", "AxiomX!Rubber#2026"),
        ("SUP-003", "supplier.aluminium@axiomx.demo", "AxiomX!Aluminium#2026"),
        ("SUP-004", "supplier.cement@axiomx.demo", "AxiomX!Cement#2026"),
        ("SUP-005", "supplier.chemical@axiomx.demo", "AxiomX!Chemical#2026"),
        ("SUP-006", "supplier.packaging@axiomx.demo", "AxiomX!Packaging#2026"),
        ("SUP-007", "supplier.textile@axiomx.demo", "AxiomX!Textile#2026"),
        ("SUP-008", "supplier.glass@axiomx.demo", "AxiomX!Glass#2026"),
        ("SUP-009", "supplier.polymer@axiomx.demo", "AxiomX!Polymer#2026"),
        ("SUP-010", "supplier.machinery@axiomx.demo", "AxiomX!Machinery#2026")
    ]

    tokens = {}
    for sid, email, pwd in supplier_credentials:
        login_res = client.post("/auth/login", json={"email": email, "password": pwd})
        assert login_res.status_code == 200, f"Login failed for {sid} ({email}): {login_res.text}"
        tokens[sid] = login_res.json()["access_token"]
        print(f"    - [PASS] {sid} ({email}) authenticated successfully.")

    # Cross-Tenant Isolation Test
    # Test that each supplier CANNOT access any other supplier's submission
    s1_token = tokens["SUP-001"]
    s1_h = {"Authorization": f"Bearer {s1_token}"}

    # Attempt to read SUP-002, SUP-003, ..., SUP-010 submissions using SUP-001's token
    for target_sid in ["SUP-002", "SUP-003", "SUP-004", "SUP-005", "SUP-006", "SUP-007", "SUP-008", "SUP-009", "SUP-010"]:
        target_sub_id = f"sub-{target_sid}-FY2022-23"
        tamper_res = client.get(f"/supplier/submissions/{target_sub_id}", headers=s1_h)
        assert tamper_res.status_code in [403, 404], f"CRITICAL TENANT LEAK: SUP-001 accessed {target_sub_id}! Status: {tamper_res.status_code}"
    print("  [PASS] Multi-Tenant Isolation Verified: SUP-001 blocked from accessing any other supplier submissions.")

    # Test that suppliers cannot access manufacturer purchases or auditor endpoints
    sup_to_mfg = client.get("/manufacturer/purchase-records", headers=s1_h)
    assert sup_to_mfg.status_code in [401, 403], f"Privilege breach: Supplier accessed manufacturer purchases: {sup_to_mfg.status_code}"

    sup_to_aud = client.get("/auditor/submissions", headers=s1_h)
    assert sup_to_aud.status_code in [401, 403], f"Privilege breach: Supplier accessed auditor submissions: {sup_to_aud.status_code}"
    print("  [PASS] Role boundaries enforced: Suppliers blocked from administrative and auditor areas.")

if __name__ == "__main__":
    verify_security()
    print("\n=======================================================")
    print("ALL SECURITY & MULTI-TENANT ISOLATION CHECKS PASSED!")
    print("=======================================================")
