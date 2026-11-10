"""
Test suite for Scope 3 emissions double-counting prevention and calculation method selection.
Verifies:
1. Multiple calculation runs can exist for the same purchase record (audit receipts preserved).
2. The dashboard aggregates ONLY the selected/active calculation run per purchase record.
3. Recalculating a purchase with another method (e.g. spend-based vs product-factor) does NOT inflate inventory.
4. Combined emissions do NOT double-count repeated or alternative calculation methods.
5. All historical calculation runs and SHA-256 receipts are preserved indefinitely.
6. Method switching via POST /api/v1/manufacturer/calculations/{cid}/select dynamically updates inventory.
7. Reporting month filters continue to work accurately.
8. Database isolation: Strictly uses the isolated QA database ('scope3track_final_qa').
"""
import os
import sys
import uuid
from pathlib import Path
import pytest
from dotenv import load_dotenv
from pymongo import MongoClient
from fastapi.testclient import TestClient

# Ensure backend directory is in sys.path
backend_dir = str(Path(__file__).resolve().parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Load root .env
root_env = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(root_env if root_env.exists() else None)

# Force isolated QA database for tests
QA_DB_NAME = "scope3track_final_qa"
os.environ["MONGODB_DB"] = QA_DB_NAME

from app.main import app, settings, dbx, Database

# Configure app database connection to isolated QA database
settings.mongodb_db = QA_DB_NAME
dbx.connect = Database.connect.__get__(dbx, Database)
dbx.connect()

assert dbx.db.name == QA_DB_NAME, f"Safety violation: Connected to {dbx.db.name} instead of {QA_DB_NAME}"

# Use in-memory FastAPI TestClient to eliminate network/TLS/proxy flakiness
client = TestClient(app, base_url="http://testserver/api/v1")


def get_db():
    try:
        if dbx.client is not None:
            dbx.client.admin.command("ping")
        else:
            dbx.connect()
    except Exception:
        dbx.connect()
    assert dbx.db.name == QA_DB_NAME, f"Safety violation: get_db returned {dbx.db.name}"
    return dbx.db


def get_manufacturer_token():
    get_db()
    res = client.post("/auth/login", json={
        "email": "manufacturer@scope3track.demo",
        "password": "ManufacturerDemo123!"
    })
    assert res.status_code == 200, f"Login failed: {res.text}"
    return res.json()["access_token"]


def test_double_counting_prevention_end_to_end():
    db = get_db()
    assert db.name == QA_DB_NAME, f"Target database is {db.name}, expected {QA_DB_NAME}"

    token = get_manufacturer_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Inspect existing state on PO-2022-001
    existing_pr = db.purchase_records.find_one({})
    pid = existing_pr["id"] if existing_pr else "PO-2022-001"
    existing_runs = list(db.calculation_runs.find({"purchase_record_id": pid}))
    print(f"\n[TEST] Found {len(existing_runs)} existing historical runs for purchase {pid} in {db.name}")
    assert len(existing_runs) > 0, f"Expected existing test runs for {pid}"

    # 2. Query Dashboard summary and verify NO double counting
    res = client.get("/manufacturer/dashboard/summary?reporting_month=FY2022-23", headers=headers)
    assert res.status_code == 200, f"Dashboard summary failed: {res.text}"
    summary = res.json()
    cat1 = summary["emissions_kgco2e"].get("Category 1", 0.0)
    cat2 = summary["emissions_kgco2e"].get("Category 2", 0.0)
    combined = summary["combined_kgco2e"]

    print(f"[TEST] Month FY2022-23 Dashboard: Cat1={cat1}, Cat2={cat2}, Combined={combined}")
    assert combined > 0 and combined < 5000000.0, f"Unexpected combined emissions {combined}"

    # 3. Create a brand-new isolated test purchase record for Category 2 machinery
    unique_suffix = uuid.uuid4().hex[:8]
    test_pid = f"test-machinery-purchase-{unique_suffix}"
    test_month = f"2027-01"
    
    # Ensure Category 2 product exists
    prod = db.products.find_one({"product_name": {"$regex": "Machinery|CNC|Lathe", "$options": "i"}})
    if not prod:
        prod = {
            "id": f"prod-machinery-{unique_suffix}",
            "product_name": "Precision 5-Axis CNC Milling Center",
            "product_code": f"CNC-M-{unique_suffix}",
            "scope3_category": "Category 2",
            "relevant_unit": "units",
            "active": True
        }
        db.products.insert_one(prod)

    # Insert test purchase
    purchase_doc = {
        "id": test_pid,
        "supplier_id": "SUP-010",
        "product_id": prod["id"],
        "product_name": prod.get("name") or prod.get("product_name"),
        "reporting_month": test_month,
        "purchased_quantity": 2.0,
        "quantity_unit": prod.get("relevant_unit", "units"),
        "purchase_expenditure": 5000000.0,
        "currency": "INR",
        "calculated": False,
        "demo": True
    }
    db.purchase_records.insert_one(purchase_doc)

    # Get factor for product_factor and spend_based
    # Factor 1: Product Factor (Category 2 machinery, e.g. 15,000 kg CO2e per unit)
    pf_factor = db.emission_factors.find_one({"factor_type": "product_factor", "id": "factor-machinery-demo"})
    if not pf_factor:
        pf_factor = db.emission_factors.find_one({"factor_type": "product_factor", "denominator_unit": "units"})
    if not pf_factor:
        pf_factor = {
            "id": f"factor-cnc-{unique_suffix}",
            "name": "Industrial CNC Machinery Embodied Factor",
            "factor_type": "product_factor",
            "factor_value": 15000.0,
            "denominator_unit": "units",
            "source_name": "DEFRA Capital Goods Standard",
            "demo": True,
            "version": 1
        }
        db.emission_factors.insert_one(pf_factor)

    # Factor 2: Spend-based economic factor (e.g. 0.08 kg CO2e per INR)
    spend_factor = db.emission_factors.find_one({"factor_type": "spend_based", "currency": "INR"})
    if not spend_factor:
        spend_factor = {
            "id": f"factor-spend-{unique_suffix}",
            "name": "General Industrial Machinery EEIO Spend Factor",
            "factor_type": "spend_based",
            "factor_value": 0.08,
            "denominator_unit": "INR",
            "currency": "INR",
            "source_name": "EXIOBASE EEIO Capital Goods",
            "demo": True,
            "version": 1
        }
        db.emission_factors.insert_one(spend_factor)

    try:
        # Step A: Execute Product-Factor Calculation
        expected_pf_emissions = purchase_doc["purchased_quantity"] * pf_factor["factor_value"]
        calc1_res = client.post("/manufacturer/calculations", headers=headers, json={
            "purchase_record_id": test_pid,
            "factor_id": pf_factor["id"],
            "method": "product_factor"
        })
        assert calc1_res.status_code == 201, f"Calc 1 failed: {calc1_res.text}"
        calc1 = calc1_res.json()
        calc1_id = calc1["id"]
        assert calc1["result_value"] == expected_pf_emissions
        assert calc1["is_active"] is True
        assert calc1.get("sha256") is not None
        print(f"\n[TEST] Run 1 (Product-Factor) executed: {calc1['result_value']} kg CO2e, ID={calc1_id}")

        # Check Dashboard for this test month: should be EXACTLY expected_pf_emissions
        dash_res = client.get(f"/manufacturer/dashboard/summary?reporting_month={test_month}", headers=headers)
        assert dash_res.status_code == 200
        dash_data = dash_res.json()
        assert dash_data["emissions_kgco2e"]["Category 2"] == expected_pf_emissions, f"Expected Cat2 {expected_pf_emissions}, got {dash_data['emissions_kgco2e']['Category 2']}"
        assert dash_data["combined_kgco2e"] == expected_pf_emissions

        # Step B: Execute Spend-Based Calculation on the SAME purchase record
        expected_spend_emissions = purchase_doc["purchase_expenditure"] * spend_factor["factor_value"]
        calc2_res = client.post("/manufacturer/calculations", headers=headers, json={
            "purchase_record_id": test_pid,
            "factor_id": spend_factor["id"],
            "method": "spend_based"
        })
        assert calc2_res.status_code == 201, f"Calc 2 failed: {calc2_res.text}"
        calc2 = calc2_res.json()
        calc2_id = calc2["id"]
        assert calc2["result_value"] == expected_spend_emissions
        assert calc2["is_active"] is True
        assert calc2.get("sha256") is not None
        print(f"[TEST] Run 2 (Spend-Based) executed: {calc2['result_value']} kg CO2e, ID={calc2_id}")

        # Verify BOTH historical calculation receipts exist in DB
        all_runs_for_pid = list(db.calculation_runs.find({"purchase_record_id": test_pid}))
        assert len(all_runs_for_pid) == 2, f"Expected 2 runs, found {len(all_runs_for_pid)}"
        # Verify Run 1 is now is_active == False, and Run 2 is is_active == True
        run1_db = db.calculation_runs.find_one({"id": calc1_id})
        run2_db = db.calculation_runs.find_one({"id": calc2_id})
        assert run1_db["is_active"] is False, "Run 1 should be deactivated in inventory"
        assert run2_db["is_active"] is True, "Run 2 should be active in inventory"

        # Check Dashboard for this test month: MUST BE EXACTLY expected_spend_emissions (NOT the sum of both!)
        dash_res2 = client.get(f"/manufacturer/dashboard/summary?reporting_month={test_month}", headers=headers)
        assert dash_res2.status_code == 200
        dash_data2 = dash_res2.json()
        cat2_val = dash_data2["emissions_kgco2e"]["Category 2"]
        combined_val = dash_data2["combined_kgco2e"]
        print(f"[TEST] Dashboard after Run 2: Cat2={cat2_val}, Combined={combined_val}")
        assert cat2_val == expected_spend_emissions, f"Double counting failure! Expected {expected_spend_emissions} kg CO2e, got {cat2_val}"
        assert combined_val == expected_spend_emissions, f"Double counting failure! Combined is {combined_val}, not {expected_spend_emissions}"

        # Step C: Switch Active Methodology back to Run 1 (Product-Factor)
        switch_res = client.post(f"/manufacturer/calculations/{calc1_id}/select", headers=headers)
        assert switch_res.status_code == 200, f"Switch failed: {switch_res.text}"
        switched_calc = switch_res.json()
        assert switched_calc["is_active"] is True
        print(f"[TEST] Switched active calculation back to Run 1 ({calc1_id})")

        # Verify DB states after switch
        run1_db_switched = db.calculation_runs.find_one({"id": calc1_id})
        run2_db_switched = db.calculation_runs.find_one({"id": calc2_id})
        assert run1_db_switched["is_active"] is True
        assert run2_db_switched["is_active"] is False

        # Check Dashboard after switch: MUST SWITCH BACK TO EXACTLY expected_pf_emissions
        dash_res3 = client.get(f"/manufacturer/dashboard/summary?reporting_month={test_month}", headers=headers)
        assert dash_res3.status_code == 200
        dash_data3 = dash_res3.json()
        cat2_val3 = dash_data3["emissions_kgco2e"]["Category 2"]
        combined_val3 = dash_data3["combined_kgco2e"]
        print(f"[TEST] Dashboard after switch back: Cat2={cat2_val3}, Combined={combined_val3}")
        assert cat2_val3 == expected_pf_emissions, f"Method switch failure! Expected {expected_pf_emissions} kg CO2e, got {cat2_val3}"
        assert combined_val3 == expected_pf_emissions

        # Step D: Verify Calculations List endpoint
        calcs_res = client.get("/manufacturer/calculations", headers=headers)
        assert calcs_res.status_code == 200
        items = calcs_res.json()["items"]
        item1 = next((x for x in items if x["id"] == calc1_id), None)
        item2 = next((x for x in items if x["id"] == calc2_id), None)
        assert item1 is not None and item1["is_active"] is True
        assert item2 is not None and item2["is_active"] is False

        # Step E: Verify Supplier Report sums only the active calculation
        sup_rep_res = client.get(f"/manufacturer/reports/suppliers?reporting_month={test_month}", headers=headers)
        assert sup_rep_res.status_code == 200
        sup_items = sup_rep_res.json()["items"]
        test_sup_row = next((x for x in sup_items if x["supplier"]["id"] == "SUP-010"), None)
        assert test_sup_row is not None
        assert test_sup_row["emissions_kgco2e"] == expected_pf_emissions, f"Expected supplier emissions {expected_pf_emissions}, got {test_sup_row['emissions_kgco2e']}"

        print("\n[ALL TESTS PASSED] Double-counting prevention, receipt preservation, and method selection verified in isolated QA DB!")

    finally:
        # Clean up test purchase and test calculations from QA test database
        db.purchase_records.delete_many({"id": test_pid})
        db.calculation_runs.delete_many({"purchase_record_id": test_pid})
        if "prod-machinery-" in prod.get("id", ""):
            db.products.delete_many({"id": prod["id"]})
        if "factor-cnc-" in pf_factor.get("id", ""):
            db.emission_factors.delete_many({"id": pf_factor["id"]})
        if "factor-spend-" in spend_factor.get("id", ""):
            db.emission_factors.delete_many({"id": spend_factor["id"]})


if __name__ == "__main__":
    test_double_counting_prevention_end_to_end()
