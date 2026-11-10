"""
Comprehensive Verification Suite for Saved Spreadsheet Formats & Submission Methods
Tests:
1. Saved Spreadsheet Formats CRUD operations (List, Create, Get, Update, Delete).
2. Schema & Unit Validation (requires supplier activities, valid expected units, matching columns).
3. Supplier Isolation (Supplier A cannot access or modify Supplier B's saved formats).
4. Format Recognition / Auto-detection (fingerprint matching and mapped columns subset matching).
5. Submissions Method Tracking (MANUAL_ENTRY vs SPREADSHEET_UPLOAD).
6. Auto-saving format during spreadsheet import workflow.
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

# Force isolated test database
os.environ["MONGODB_DB"] = "scope3track_e2e_test"

from app.main import app, settings, dbx, db, pwd, now, clean, Database


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    settings.mongodb_db = "scope3track_e2e_test"
    dbx.connect = Database.connect.__get__(dbx, Database)
    dbx.connect()
    assert dbx.db.name == "scope3track_e2e_test", f"Safety violation: Connected to {dbx.db.name} instead of scope3track_e2e_test"
    
    # Setup test suppliers and requirements
    sup1_id = "test-sup-formats-1"
    sup2_id = "test-sup-formats-2"
    
    db()["suppliers"].update_one(
        {"id": sup1_id},
        {"$set": {
            "id": sup1_id,
            "name": "Format Test Supplier One Ltd",
            "supplier_code": "FMT-SUP-01",
            "country": "India",
            "contact_email": "formats1@test.com",
            "login_email": "formats1@test.com",
            "password_hash": pwd.hash("SupplierPass123!"),
            "status": "active",
            "created_at": now(),
            "updated_at": now()
        }},
        upsert=True
    )
    
    db()["suppliers"].update_one(
        {"id": sup2_id},
        {"$set": {
            "id": sup2_id,
            "name": "Format Test Supplier Two Ltd",
            "supplier_code": "FMT-SUP-02",
            "country": "India",
            "contact_email": "formats2@test.com",
            "login_email": "formats2@test.com",
            "password_hash": pwd.hash("SupplierPass123!"),
            "status": "active",
            "created_at": now(),
            "updated_at": now()
        }},
        upsert=True
    )
    
    # Requirements for Supplier 1: ACT_ELEC (kWh), ACT_DIESEL (litres)
    db()["supplier_requirements"].delete_many({"supplier_id": sup1_id})
    db()["supplier_requirements"].insert_many([
        {
            "id": str(uuid.uuid4()),
            "supplier_id": sup1_id,
            "activity_id": "ACT_ELEC",
            "expected_unit": "kWh",
            "aggregation_rule": "sum",
            "description": "Grid electricity consumption"
        },
        {
            "id": str(uuid.uuid4()),
            "supplier_id": sup1_id,
            "activity_id": "ACT_DIESEL",
            "expected_unit": "litres",
            "aggregation_rule": "sum",
            "description": "Stationary diesel consumption"
        }
    ])
    
    # Requirements for Supplier 2: ACT_STEAM (MJ)
    db()["supplier_requirements"].delete_many({"supplier_id": sup2_id})
    db()["supplier_requirements"].insert_one({
        "id": str(uuid.uuid4()),
        "supplier_id": sup2_id,
        "activity_id": "ACT_STEAM",
        "expected_unit": "MJ",
        "aggregation_rule": "sum",
        "description": "Imported steam"
    })
    
    # Clean test collections
    db()["saved_spreadsheet_formats"].delete_many({"supplier_id": {"$in": [sup1_id, sup2_id]}})
    db()["submissions"].delete_many({"supplier_id": {"$in": [sup1_id, sup2_id]}})
    
    # Ensure users exist in users collection for login
    db()["users"].update_one(
        {"email": "formats1@test.com"},
        {"$set": {
            "id": str(uuid.uuid4()),
            "email": "formats1@test.com",
            "password_hash": pwd.hash("SupplierPass123!"),
            "role": "supplier",
            "profile_id": sup1_id,
            "active": True,
            "created_at": now()
        }},
        upsert=True
    )
    db()["users"].update_one(
        {"email": "formats2@test.com"},
        {"$set": {
            "id": str(uuid.uuid4()),
            "email": "formats2@test.com",
            "password_hash": pwd.hash("SupplierPass123!"),
            "role": "supplier",
            "profile_id": sup2_id,
            "active": True,
            "created_at": now()
        }},
        upsert=True
    )

    yield
    
    # Cleanup after session
    db()["saved_spreadsheet_formats"].delete_many({"supplier_id": {"$in": [sup1_id, sup2_id]}})
    db()["submissions"].delete_many({"supplier_id": {"$in": [sup1_id, sup2_id]}})


def get_token(client: TestClient, email: str, role: str) -> str:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": "SupplierPass123!"})
    assert res.status_code == 200, f"Auth failed: {res.text}"
    return res.json()["access_token"]


def test_saved_spreadsheet_formats_full_lifecycle():
    client = TestClient(app)
    tok1 = get_token(client, "formats1@test.com", "supplier")
    tok2 = get_token(client, "formats2@test.com", "supplier")
    h1 = {"Authorization": f"Bearer {tok1}"}
    h2 = {"Authorization": f"Bearer {tok2}"}
    
    # 1. Initially empty
    res = client.get("/api/v1/supplier/saved-formats", headers=h1)
    assert res.status_code == 200
    assert len(res.json()["items"]) == 0
    
    # 2. Create Saved Format for Supplier 1
    format_payload = {
        "name": "Standard Monthly Facility Log",
        "headers": ["Meter_Date", "Building_ID", "Power_Consumption_kWh", "Fuel_Litres", "Comments"],
        "mappings": {
            "ACT_ELEC": {"column": "Power_Consumption_kWh", "unit": "kWh"},
            "ACT_DIESEL": {"column": "Fuel_Litres", "unit": "litres"}
        }
    }
    create_res = client.post("/api/v1/supplier/saved-formats", json=format_payload, headers=h1)
    assert create_res.status_code == 201, f"Create failed: {create_res.text}"
    fmt_data = create_res.json()
    fmt_id = fmt_data["id"]
    assert fmt_data["name"] == "Standard Monthly Facility Log"
    assert fmt_data["supplier_id"] == "test-sup-formats-1"
    assert fmt_data["version"] == 1
    assert "fingerprint" in fmt_data
    
    # 3. List formats for Supplier 1 shows 1 item
    list_res = client.get("/api/v1/supplier/saved-formats", headers=h1)
    assert list_res.status_code == 200
    items = list_res.json()["items"]
    assert len(items) == 1
    assert items[0]["id"] == fmt_id
    
    # 4. Supplier 2 cannot view Supplier 1's format (supplier isolation)
    sup2_list = client.get("/api/v1/supplier/saved-formats", headers=h2)
    assert sup2_list.status_code == 200
    assert len(sup2_list.json()["items"]) == 0
    
    sup2_get = client.get(f"/api/v1/supplier/saved-formats/{fmt_id}", headers=h2)
    assert sup2_get.status_code == 404
    
    sup2_update = client.put(f"/api/v1/supplier/saved-formats/{fmt_id}", json={"name": "Hacked"}, headers=h2)
    assert sup2_update.status_code == 404
    
    sup2_del = client.delete(f"/api/v1/supplier/saved-formats/{fmt_id}", headers=h2)
    assert sup2_del.status_code == 404
    
    # 5. Format Detection:
    # A) Exact matching headers
    detect_exact = client.post("/api/v1/supplier/saved-formats/detect", json={
        "headers": ["Meter_Date", "Building_ID", "Power_Consumption_kWh", "Fuel_Litres", "Comments"]
    }, headers=h1)
    assert detect_exact.status_code == 200
    det_res = detect_exact.json()
    assert det_res["matched"] is True
    assert det_res["format"]["id"] == fmt_id
    assert det_res["confidence"] == 1.0
    
    # B) Headers containing all mapped columns plus extras
    detect_extra = client.post("/api/v1/supplier/saved-formats/detect", json={
        "headers": ["Facility", "Meter_Date", "Power_Consumption_kWh", "Fuel_Litres", "Extra_Col_1"]
    }, headers=h1)
    assert detect_extra.status_code == 200
    det_extra_res = detect_extra.json()
    assert det_extra_res["matched"] is True
    assert det_extra_res["format"]["id"] == fmt_id
    assert det_extra_res["confidence"] >= 0.8
    
    # C) Unmatched headers
    detect_unmatched = client.post("/api/v1/supplier/saved-formats/detect", json={
        "headers": ["Unknown_Col_A", "Unknown_Col_B"]
    }, headers=h1)
    assert detect_unmatched.status_code == 200
    assert detect_unmatched.json()["matched"] is False
    
    # 6. Update / Rename Format
    update_res = client.put(f"/api/v1/supplier/saved-formats/{fmt_id}", json={
        "name": "Renamed Monthly Facility Log"
    }, headers=h1)
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Renamed Monthly Facility Log"
    assert update_res.json()["version"] == 2
    
    # 7. Submissions Method Tracking (MANUAL_ENTRY vs SPREADSHEET_UPLOAD)
    # Create manual submission
    sub_manual = client.post("/api/v1/supplier/submissions", json={
        "reporting_month": "2026-01",
        "submission_method": "MANUAL_ENTRY"
    }, headers=h1)
    assert sub_manual.status_code == 201
    s_manual_data = sub_manual.json()
    assert s_manual_data["submission_method"] == "MANUAL_ENTRY"
    
    # Create spreadsheet submission
    sub_sheet = client.post("/api/v1/supplier/submissions", json={
        "reporting_month": "2026-02",
        "submission_method": "SPREADSHEET_UPLOAD"
    }, headers=h1)
    assert sub_sheet.status_code == 201
    assert sub_sheet.json()["submission_method"] == "SPREADSHEET_UPLOAD"
    
    # 8. Test validation errors
    # A) Missing/invalid activity
    bad_act = client.post("/api/v1/supplier/saved-formats", json={
        "name": "Bad Activity Format",
        "headers": ["Col1", "Col2"],
        "mappings": {"ACT_NOT_EXIST": {"column": "Col1", "unit": "kWh"}}
    }, headers=h1)
    assert bad_act.status_code == 422
    
    # B) Column not in headers
    bad_col = client.post("/api/v1/supplier/saved-formats", json={
        "name": "Bad Col Format",
        "headers": ["Col1"],
        "mappings": {"ACT_ELEC": {"column": "NonExistentCol", "unit": "kWh"}}
    }, headers=h1)
    assert bad_col.status_code == 422
    
    # C) Unit mismatch
    bad_unit = client.post("/api/v1/supplier/saved-formats", json={
        "name": "Bad Unit Format",
        "headers": ["Col1"],
        "mappings": {"ACT_ELEC": {"column": "Col1", "unit": "MWh"}}
    }, headers=h1)
    assert bad_unit.status_code == 422
    
    # 9. Test Spreadsheet Import with Auto-save format
    # Upload test CSV
    import io
    csv_content = b"Facility,Meter_Date,Power_Consumption_kWh,Fuel_Litres\nPlant A,2026-03-01,1500,250\nPlant B,2026-03-02,3500,750\n"
    sub_3 = client.post("/api/v1/supplier/submissions", json={
        "reporting_month": "2026-03",
        "submission_method": "SPREADSHEET_UPLOAD"
    }, headers=h1).json()
    sub3_id = sub_3["id"]
    
    files = {"file": ("energy_data.csv", io.BytesIO(csv_content), "text/csv")}
    up_res = client.post(f"/api/v1/supplier/submissions/{sub3_id}/spreadsheet-uploads", files=files, headers=h1)
    assert up_res.status_code == 201
    upload_id = up_res.json()["id"]
    
    # Set mapping
    map_res = client.put(f"/api/v1/supplier/submissions/{sub3_id}/spreadsheet-uploads/{upload_id}/mapping", json={
        "mapping": {
            "ACT_ELEC": {"column": "Power_Consumption_kWh", "unit": "kWh"},
            "ACT_DIESEL": {"column": "Fuel_Litres", "unit": "litres"}
        }
    }, headers=h1)
    assert map_res.status_code == 200
    
    # Import with save_format=True
    imp_res = client.post(f"/api/v1/supplier/submissions/{sub3_id}/spreadsheet-uploads/{upload_id}/import", json={
        "save_format": True,
        "format_name": "Energy Import Profile"
    }, headers=h1)
    assert imp_res.status_code == 200
    imported_sub = imp_res.json()
    assert imported_sub["submission_method"] == "SPREADSHEET_UPLOAD"
    
    # Check that format "Energy Import Profile" was created in saved formats
    formats_after_import = client.get("/api/v1/supplier/saved-formats", headers=h1).json()["items"]
    saved_names = [f["name"] for f in formats_after_import]
    assert "Energy Import Profile" in saved_names
    
    # Delete saved format
    del_res = client.delete(f"/api/v1/supplier/saved-formats/{fmt_id}", headers=h1)
    assert del_res.status_code == 204
    
    # Verify deleted
    get_after_del = client.get(f"/api/v1/supplier/saved-formats/{fmt_id}", headers=h1)
    assert get_after_del.status_code == 404
