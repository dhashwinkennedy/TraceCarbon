"""
Automated Verification Suite for Evidence Document Counts
Tests:
1. Submission with 0 evidence documents returns evidence_count == 0 (both single and list).
2. Uploading 1st evidence file dynamically increments evidence_count to 1.
3. Uploading 2nd evidence file dynamically increments evidence_count to 2.
4. Deleting 1 evidence file dynamically decrements evidence_count back to 1.
5. All three roles (Supplier, Manufacturer, Auditor) observe consistent counts across:
   - GET /api/v1/supplier/submissions and GET /api/v1/supplier/submissions/{sid}
   - GET /api/v1/manufacturer/submissions and GET /api/v1/manufacturer/submissions/{sid}
   - GET /api/v1/auditor/submissions and GET /api/v1/auditor/submissions/{sid}
6. Role-based isolation (unauthorized supplier cannot access other supplier's submissions or evidence).
7. Isolated test database (scope3track_e2e_test) preserving primary demo database intact.
"""

import os
import sys
import uuid
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from dotenv import load_dotenv

load_dotenv()

# Ensure backend directory is in sys.path
backend_dir = str(Path(__file__).resolve().parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Force isolation to scope3track_e2e_test
os.environ["MONGODB_DB"] = "scope3track_e2e_test"

from app.main import app, settings, dbx, db, pwd, now, clean, Database


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    settings.mongodb_db = "scope3track_e2e_test"
    # Restore connect if monkeypatched by in-memory mock tests
    dbx.connect = Database.connect.__get__(dbx, Database)
    dbx.connect()
    assert dbx.db.name == "scope3track_e2e_test", f"Safety violation: Connected to {dbx.db.name} instead of scope3track_e2e_test"
    
    # Ensure test users and test supplier exist in test database
    sup_id = "test-sup-evidence-count"
    aud_id = "test-aud-evidence-count"
    
    db()["suppliers"].update_one(
        {"id": sup_id},
        {"$set": {
            "id": sup_id,
            "name": "Acme Clean Energy Ltd",
            "supplier_code": "ACME-CLEAN",
            "contact_email": "contact@acme.clean",
            "active": True,
            "created_at": now(),
            "updated_at": now()
        }},
        upsert=True
    )
    
    db()["auditors"].update_one(
        {"id": aud_id},
        {"$set": {
            "id": aud_id,
            "name": "Audit Officer Sarah",
            "email": "sarah.auditor@scope3track.demo",
            "employee_id": "AUD-009",
            "active": True,
            "created_at": now()
        }},
        upsert=True
    )
    
    # Ensure login credentials for test users
    db()["users"].update_one(
        {"email": "supplier_test_ev@scope3track.demo"},
        {"$set": {
            "id": str(uuid.uuid4()),
            "email": "supplier_test_ev@scope3track.demo",
            "password_hash": pwd.hash("SupplierTest123!"),
            "role": "supplier",
            "profile_id": sup_id,
            "active": True,
            "created_at": now()
        }},
        upsert=True
    )
    
    db()["users"].update_one(
        {"email": "manufacturer_test_ev@scope3track.demo"},
        {"$set": {
            "id": str(uuid.uuid4()),
            "email": "manufacturer_test_ev@scope3track.demo",
            "password_hash": pwd.hash("ManufacturerTest123!"),
            "role": "manufacturer",
            "profile_id": "manufacturer-1",
            "active": True,
            "created_at": now()
        }},
        upsert=True
    )
    
    db()["users"].update_one(
        {"email": "auditor_test_ev@scope3track.demo"},
        {"$set": {
            "id": str(uuid.uuid4()),
            "email": "auditor_test_ev@scope3track.demo",
            "password_hash": pwd.hash("AuditorTest123!"),
            "role": "auditor",
            "profile_id": aud_id,
            "active": True,
            "created_at": now()
        }},
        upsert=True
    )
    
    # Assign auditor to this supplier
    db()["auditor_assignments"].update_one(
        {"auditor_id": aud_id, "supplier_id": sup_id},
        {"$set": {
            "id": str(uuid.uuid4()),
            "auditor_id": aud_id,
            "supplier_id": sup_id,
            "created_at": now()
        }},
        upsert=True
    )


def get_token(client: TestClient, email: str, password: str) -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]


def test_evidence_count_complete_lifecycle():
    client = TestClient(app)
    
    sup_token = get_token(client, "supplier_test_ev@scope3track.demo", "SupplierTest123!")
    mfg_token = get_token(client, "manufacturer_test_ev@scope3track.demo", "ManufacturerTest123!")
    aud_token = get_token(client, "auditor_test_ev@scope3track.demo", "AuditorTest123!")
    
    sup_headers = {"Authorization": f"Bearer {sup_token}"}
    mfg_headers = {"Authorization": f"Bearer {mfg_token}"}
    aud_headers = {"Authorization": f"Bearer {aud_token}"}
    
    # Use a unique reporting month for test isolation
    test_month = "2028-09"
    # Clean up prior test runs for this month in test db
    db()["submissions"].delete_many({"reporting_month": test_month})
    
    # Step 1: Create a draft submission as supplier
    create_res = client.post("/api/v1/supplier/submissions", json={"reporting_month": test_month}, headers=sup_headers)
    assert create_res.status_code == 201, f"Failed to create submission: {create_res.text}"
    sub = create_res.json()
    sub_id = sub["id"]
    assert sub.get("evidence_count") == 0, f"Expected evidence_count == 0 on creation, got {sub.get('evidence_count')}"
    
    # Step 2: Check GET /supplier/submissions/{sid}
    get_res = client.get(f"/api/v1/supplier/submissions/{sub_id}", headers=sup_headers)
    assert get_res.status_code == 200
    assert get_res.json().get("evidence_count") == 0, "Supplier detail must have evidence_count == 0"
    
    # Step 3: Check GET /supplier/submissions (list)
    list_res = client.get("/api/v1/supplier/submissions", headers=sup_headers)
    assert list_res.status_code == 200
    items = list_res.json()["items"]
    matched = [s for s in items if s["id"] == sub_id]
    assert len(matched) == 1
    assert matched[0].get("evidence_count") == 0, "Supplier list must have evidence_count == 0"
    
    # Step 4: Check Manufacturer endpoints
    mfg_get = client.get(f"/api/v1/manufacturer/submissions/{sub_id}", headers=mfg_headers)
    assert mfg_get.status_code == 200
    assert mfg_get.json().get("evidence_count") == 0, "Manufacturer detail must have evidence_count == 0"
    
    mfg_list = client.get("/api/v1/manufacturer/submissions", headers=mfg_headers)
    assert mfg_list.status_code == 200
    mfg_matched = [s for s in mfg_list.json()["items"] if s["id"] == sub_id]
    assert len(mfg_matched) == 1
    assert mfg_matched[0].get("evidence_count") == 0, "Manufacturer list must have evidence_count == 0"
    
    # Step 5: Check Auditor endpoints
    aud_get = client.get(f"/api/v1/auditor/submissions/{sub_id}", headers=aud_headers)
    assert aud_get.status_code == 200
    assert aud_get.json().get("evidence_count") == 0, "Auditor detail must have evidence_count == 0"
    
    aud_list = client.get("/api/v1/auditor/submissions", headers=aud_headers)
    assert aud_list.status_code == 200
    aud_matched = [s for s in aud_list.json()["items"] if s["id"] == sub_id]
    assert len(aud_matched) == 1
    assert aud_matched[0].get("evidence_count") == 0, "Auditor list must have evidence_count == 0"
    
    # Step 6: Upload 1st evidence document (PDF)
    pdf_content = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< >>\n%%EOF"
    upload1 = client.post(
        f"/api/v1/supplier/submissions/{sub_id}/evidence",
        files={"file": ("utility_bill_jan2028.pdf", pdf_content, "application/pdf")},
        headers=sup_headers
    )
    assert upload1.status_code == 201, f"Failed to upload PDF: {upload1.text}"
    doc1 = upload1.json()
    doc1_id = doc1["id"]
    assert doc1["filename"] == "utility_bill_jan2028.pdf"
    
    # Step 7: Verify evidence_count == 1 across all 3 roles
    for role_name, headers, path_prefix in [
        ("Supplier", sup_headers, "/api/v1/supplier"),
        ("Manufacturer", mfg_headers, "/api/v1/manufacturer"),
        ("Auditor", aud_headers, "/api/v1/auditor")
    ]:
        single = client.get(f"{path_prefix}/submissions/{sub_id}", headers=headers)
        assert single.status_code == 200
        assert single.json().get("evidence_count") == 1, f"{role_name} single get expected evidence_count == 1, got {single.json().get('evidence_count')}"
        
        listing = client.get(f"{path_prefix}/submissions", headers=headers)
        assert listing.status_code == 200
        match = [s for s in listing.json()["items"] if s["id"] == sub_id][0]
        assert match.get("evidence_count") == 1, f"{role_name} list expected evidence_count == 1, got {match.get('evidence_count')}"
        
        evidence_items = client.get(f"{path_prefix}/submissions/{sub_id}/evidence", headers=headers).json()["items"]
        assert len(evidence_items) == 1, f"{role_name} evidence list length must match evidence_count"
        assert evidence_items[0]["id"] == doc1_id
    
    # Step 8: Upload 2nd evidence document (CSV)
    csv_content = b"MeterID,Reading,Unit\nM-101,45000,kWh\n"
    upload2 = client.post(
        f"/api/v1/supplier/submissions/{sub_id}/evidence",
        files={"file": ("meter_readings_2028.csv", csv_content, "text/csv")},
        headers=sup_headers
    )
    assert upload2.status_code == 201, f"Failed to upload CSV: {upload2.text}"
    doc2 = upload2.json()
    doc2_id = doc2["id"]
    
    # Step 9: Verify evidence_count == 2 across all 3 roles
    for role_name, headers, path_prefix in [
        ("Supplier", sup_headers, "/api/v1/supplier"),
        ("Manufacturer", mfg_headers, "/api/v1/manufacturer"),
        ("Auditor", aud_headers, "/api/v1/auditor")
    ]:
        single = client.get(f"{path_prefix}/submissions/{sub_id}", headers=headers)
        assert single.json().get("evidence_count") == 2, f"{role_name} single get expected evidence_count == 2"
        
        listing = client.get(f"{path_prefix}/submissions", headers=headers)
        match = [s for s in listing.json()["items"] if s["id"] == sub_id][0]
        assert match.get("evidence_count") == 2, f"{role_name} list expected evidence_count == 2"
        
        evidence_items = client.get(f"{path_prefix}/submissions/{sub_id}/evidence", headers=headers).json()["items"]
        assert len(evidence_items) == 2, f"{role_name} evidence list length must match evidence_count"
    
    # Step 10: Delete 1st document
    del_res = client.delete(f"/api/v1/supplier/submissions/{sub_id}/evidence/{doc1_id}", headers=sup_headers)
    assert del_res.status_code == 204
    
    # Step 11: Verify evidence_count decrements dynamically back to 1
    for role_name, headers, path_prefix in [
        ("Supplier", sup_headers, "/api/v1/supplier"),
        ("Manufacturer", mfg_headers, "/api/v1/manufacturer"),
        ("Auditor", aud_headers, "/api/v1/auditor")
    ]:
        single = client.get(f"{path_prefix}/submissions/{sub_id}", headers=headers)
        assert single.json().get("evidence_count") == 1, f"{role_name} single get expected evidence_count == 1 after delete"
        
        listing = client.get(f"{path_prefix}/submissions", headers=headers)
        match = [s for s in listing.json()["items"] if s["id"] == sub_id][0]
        assert match.get("evidence_count") == 1, f"{role_name} list expected evidence_count == 1 after delete"
        
        evidence_items = client.get(f"{path_prefix}/submissions/{sub_id}/evidence", headers=headers).json()["items"]
        assert len(evidence_items) == 1
        assert evidence_items[0]["id"] == doc2_id, "Remaining evidence document must be doc2"
    
    # Step 12: Delete 2nd document
    del_res2 = client.delete(f"/api/v1/supplier/submissions/{sub_id}/evidence/{doc2_id}", headers=sup_headers)
    assert del_res2.status_code == 204
    
    # Step 13: Verify count returns to 0
    single = client.get(f"/api/v1/supplier/submissions/{sub_id}", headers=sup_headers)
    assert single.json().get("evidence_count") == 0
    listing = client.get("/api/v1/supplier/submissions", headers=sup_headers)
    match = [s for s in listing.json()["items"] if s["id"] == sub_id][0]
    assert match.get("evidence_count") == 0
    
    # Cleanup test data
    db()["submissions"].delete_many({"reporting_month": test_month})
    db()["evidence_documents"].delete_many({"submission_id": sub_id})
    print("\n[SUCCESS] All 13 lifecycle evidence count assertions passed across all roles!")


def test_evidence_security_and_isolation():
    client = TestClient(app)
    
    # Create another supplier user
    other_sup_id = "test-other-sup-unauth"
    db()["suppliers"].update_one(
        {"id": other_sup_id},
        {"$set": {"id": other_sup_id, "name": "Unauthorized Supplier", "supplier_code": "UNAUTH-SUP", "contact_email": "unauth@sup.demo", "active": True, "created_at": now()}},
        upsert=True
    )
    db()["users"].update_one(
        {"email": "unauth_sup@scope3track.demo"},
        {"$set": {"id": str(uuid.uuid4()), "email": "unauth_sup@scope3track.demo", "password_hash": pwd.hash("UnauthPass123!"), "role": "supplier", "profile_id": other_sup_id, "active": True, "created_at": now()}},
        upsert=True
    )
    
    unauth_token = get_token(client, "unauth_sup@scope3track.demo", "UnauthPass123!")
    unauth_headers = {"Authorization": f"Bearer {unauth_token}"}
    
    # Authorized supplier creates a submission
    sup_token = get_token(client, "supplier_test_ev@scope3track.demo", "SupplierTest123!")
    sup_headers = {"Authorization": f"Bearer {sup_token}"}
    
    test_month = "2028-10"
    db()["submissions"].delete_many({"reporting_month": test_month})
    sub_res = client.post("/api/v1/supplier/submissions", json={"reporting_month": test_month}, headers=sup_headers)
    sub_id = sub_res.json()["id"]
    
    # Unauthorized supplier attempts to access
    get_res = client.get(f"/api/v1/supplier/submissions/{sub_id}", headers=unauth_headers)
    assert get_res.status_code == 403, "Cross-supplier access must return 403 Forbidden"
    
    evidence_res = client.get(f"/api/v1/supplier/submissions/{sub_id}/evidence", headers=unauth_headers)
    assert evidence_res.status_code == 403, "Cross-supplier evidence listing must return 403 Forbidden"
    
    upload_res = client.post(
        f"/api/v1/supplier/submissions/{sub_id}/evidence",
        files={"file": ("malicious.pdf", b"%PDF-dummy", "application/pdf")},
        headers=unauth_headers
    )
    assert upload_res.status_code == 403, "Cross-supplier evidence upload must return 403 Forbidden"
    
    # Cleanup
    db()["submissions"].delete_many({"reporting_month": test_month})
    print("\n[SUCCESS] Role-based isolation and cross-supplier protection verified!")
