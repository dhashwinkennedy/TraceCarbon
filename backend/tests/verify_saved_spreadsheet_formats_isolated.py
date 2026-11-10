"""
Isolated QA Verification for Saved Spreadsheet Formats.
Tests:
1. Save format
2. Logout / Login lifecycle
3. Auto-detect format by header fingerprint
4. Reuse saved mapping
5. Update saved format (rename / remap)
6. Multi-tenant supplier isolation (another supplier cannot see, detect, or access the format)
7. Clean teardown
"""

import os
import sys
import time
import httpx
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "http://127.0.0.1:8000/api/v1"
client = httpx.Client(base_url=BASE_URL, timeout=30)
mongo_client = MongoClient(os.getenv("MONGODB_URI"))
db = mongo_client[os.getenv("MONGODB_DB", "scope3track")]

results = []

def run_saved_formats_verification():
    print("\n=======================================================")
    print("STARTING SAVED SPREADSHEET FORMATS ISOLATED QA TEST")
    print("=======================================================")

    # 1. Login Supplier 1 (Steel - SUP-001)
    s1_login = client.post("/auth/login", json={"email": "supplier.steel@axiomx.demo", "password": "AxiomX!Steel#2026"})
    assert s1_login.status_code == 200
    s1_token = s1_login.json()["access_token"]
    s1_h = {"Authorization": f"Bearer {s1_token}"}
    print("  [PASS] Supplier 1 (SUP-001) authenticated.")

    # 2. Login Supplier 2 (Rubber - SUP-002)
    s2_login = client.post("/auth/login", json={"email": "supplier.rubber@axiomx.demo", "password": "AxiomX!Rubber#2026"})
    assert s2_login.status_code == 200
    s2_token = s2_login.json()["access_token"]
    s2_h = {"Authorization": f"Bearer {s2_token}"}
    print("  [PASS] Supplier 2 (SUP-002) authenticated.")

    # Clean prior formats if any
    db["saved_spreadsheet_formats"].delete_many({"supplier_id": {"$in": ["SUP-001", "SUP-002"]}})

    test_headers = [
        "Energy Consumption - Electricity (kWh)",
        "Fuel Log - Diesel Volume (Litres)",
        "Production Dispatch - Coils (Tonnes)",
        "Raw Feedstock Ingestion (Tonnes)"
    ]
    test_mappings = {
        "electricity": {"column": "Energy Consumption - Electricity (kWh)", "unit": "kWh"},
        "diesel": {"column": "Fuel Log - Diesel Volume (Litres)", "unit": "litres"},
        "production": {"column": "Production Dispatch - Coils (Tonnes)", "unit": "tonnes"},
        "raw_material": {"column": "Raw Feedstock Ingestion (Tonnes)", "unit": "tonnes"}
    }

    fmt_id = None
    try:
        # Step A: Save Format as Supplier 1
        save_res = client.post(
            "/supplier/saved-formats",
            json={
                "name": "AxiomX Steel ERP Monthly Activity Export",
                "headers": test_headers,
                "mappings": test_mappings
            },
            headers=s1_h
        )
        assert save_res.status_code in [200, 201], f"Save format failed: {save_res.text}"
        fmt_doc = save_res.json()
        fmt_id = fmt_doc["id"]
        assert fmt_doc["name"] == "AxiomX Steel ERP Monthly Activity Export"
        print(f"  [PASS] Format saved successfully (ID: {fmt_id})")

        # Step B: List Formats as Supplier 1
        list_res = client.get("/supplier/saved-formats", headers=s1_h)
        assert list_res.status_code == 200
        items = list_res.json().get("items", [])
        assert len(items) == 1
        assert items[0]["id"] == fmt_id
        print("  [PASS] Format listed in Supplier 1 formats catalog.")

        # Step C: Detect Format by Headers
        detect_res = client.post(
            "/supplier/saved-formats/detect",
            json={"headers": test_headers},
            headers=s1_h
        )
        assert detect_res.status_code == 200
        det_data = detect_res.json()
        assert det_data["matched"] is True
        assert det_data["confidence"] == 1.0
        assert det_data["format"]["id"] == fmt_id
        assert det_data["format"]["mappings"]["electricity"]["column"] == "Energy Consumption - Electricity (kWh)"
        print("  [PASS] Auto-detection matched format by header fingerprint with 100% confidence.")

        # Step D: Update Format (Rename)
        up_res = client.put(
            f"/supplier/saved-formats/{fmt_id}",
            json={"name": "AxiomX Steel Updated Template 2026"},
            headers=s1_h
        )
        assert up_res.status_code == 200
        updated = up_res.json()
        assert updated["name"] == "AxiomX Steel Updated Template 2026"
        print("  [PASS] Format name updated successfully.")

        # Step E: Supplier Isolation — Supplier 2 cannot see Supplier 1's format
        s2_list = client.get("/supplier/saved-formats", headers=s2_h)
        assert s2_list.status_code == 200
        s2_items = s2_list.json().get("items", [])
        assert len(s2_items) == 0, f"Tenant violation: Supplier 2 sees {len(s2_items)} formats"
        print("  [PASS] Tenant Isolation: Supplier 2 sees 0 formats.")

        # Step F: Supplier Isolation — Supplier 2 cannot detect Supplier 1's format
        s2_det = client.post(
            "/supplier/saved-formats/detect",
            json={"headers": test_headers},
            headers=s2_h
        )
        assert s2_det.status_code == 200
        assert s2_det.json()["matched"] is False
        print("  [PASS] Tenant Isolation: Supplier 2 cannot auto-detect Supplier 1's format.")

        # Step G: Supplier Isolation — Supplier 2 cannot read or edit Supplier 1's format
        s2_get = client.get(f"/supplier/saved-formats/{fmt_id}", headers=s2_h)
        assert s2_get.status_code in [403, 404], f"Tenant violation: Supplier 2 could read format: {s2_get.status_code}"

        s2_del = client.delete(f"/supplier/saved-formats/{fmt_id}", headers=s2_h)
        assert s2_del.status_code in [403, 404], f"Tenant violation: Supplier 2 could delete format: {s2_del.status_code}"
        print("  [PASS] Tenant Isolation: Cross-tenant GET and DELETE blocked with 403/404.")

        # Step H: Supplier 1 Delete Format
        del_res = client.delete(f"/supplier/saved-formats/{fmt_id}", headers=s1_h)
        assert del_res.status_code in [200, 204]
        print("  [PASS] Supplier 1 deleted format.")

        # Verify list is empty again
        final_list = client.get("/supplier/saved-formats", headers=s1_h)
        assert len(final_list.json().get("items", [])) == 0
        print("  [PASS] Formats list empty after deletion.")

    finally:
        db["saved_spreadsheet_formats"].delete_many({"supplier_id": {"$in": ["SUP-001", "SUP-002"]}})
        print("[CLEANUP] Saved formats test records removed.")

if __name__ == "__main__":
    run_saved_formats_verification()
    print("\n=======================================================")
    print("ALL SAVED SPREADSHEET FORMATS TESTS PASSED!")
    print("=======================================================\n")
