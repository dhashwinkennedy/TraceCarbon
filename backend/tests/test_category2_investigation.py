"""Automated test suite for Scope 3 Category 2 (Capital Goods) emissions investigation.
Tests:
- Product Catalog Category 2 classification
- Empty Category 2 calculation records
- Category 2 purchase creation without calculation
- Incompatible factor unit rejection (HTTP 422)
- Calculation with compatible DEMO product factor
- Calculation with DEMO spend-based economic factor
- Receipt verification (scope3_category == 'Category 2', result_unit == 'kg CO2e')
- Dashboard Category 2 aggregation & Category 1 isolation
- Combined emissions arithmetic (Cat 1 + Cat 2)
- Reporting-month filtering
- Immediate dashboard update after calculation
- GHG Protocol single-period acquisition accounting vs multi-year depreciation
"""
import os
import uuid
import httpx
import pymongo
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "http://127.0.0.1:8000/api/v1"
MONGODB_URI = os.environ["MONGODB_URI"]
TEST_DB_NAME = os.environ.get("MONGODB_DB", "scope3track_e2e_test")

client = pymongo.MongoClient(MONGODB_URI)
db = client[TEST_DB_NAME]

def get_auth_token():
    r = httpx.post(f"{BASE_URL}/auth/login", json={
        "email": "manufacturer@scope3track.demo",
        "password": "ManufacturerDemo123!"
    })
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["access_token"]

def run_tests():
    print("=" * 80)
    print("STARTING CATEGORY 2 EMISSIONS INVESTIGATION & VERIFICATION SUITE")
    print("=" * 80)

    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # ------------------------------------------------------------------------
    # STEP 1: Verify Product Catalog Classification
    # ------------------------------------------------------------------------
    print("\n[TEST 1] Verifying Category 2 Product in Database...")
    machine_prod = db["products"].find_one({"id": "product-machine"})
    assert machine_prod is not None, "product-machine not found in products"
    assert machine_prod.get("scope3_category") == "Category 2", f"Expected 'Category 2', got {machine_prod.get('scope3_category')}"
    assert machine_prod.get("relevant_unit") == "unit", f"Expected 'unit', got {machine_prod.get('relevant_unit')}"
    assert machine_prod.get("active") is True, "Product should be active"
    print(f"  OK: Product 'Production machinery' (MAC-001) correctly classified as Category 2 (unit: {machine_prod['relevant_unit']})")

    # ------------------------------------------------------------------------
    # STEP 2: Baseline Dashboard Check (Empty Category 2 Calculations)
    # ------------------------------------------------------------------------
    print("\n[TEST 2] Verifying Baseline Dashboard Aggregation (Empty Category 2)...")
    r = httpx.get(f"{BASE_URL}/manufacturer/dashboard/summary", headers=headers)
    assert r.status_code == 200, f"Dashboard failed: {r.text}"
    baseline = r.json()
    cat1_before = baseline["emissions_kgco2e"].get("Category 1", 0.0)
    cat2_before = baseline["emissions_kgco2e"].get("Category 2", 0.0)
    combined_before = baseline["combined_kgco2e"]
    
    print(f"  Baseline Cat 1: {cat1_before:,.2f} kg CO2e")
    print(f"  Baseline Cat 2: {cat2_before:,.2f} kg CO2e")
    print(f"  Baseline Combined: {combined_before:,.2f} kg CO2e")
    assert cat2_before == 0.0, f"Expected Category 2 baseline to be 0.0, got {cat2_before}"
    assert abs(combined_before - (cat1_before + cat2_before)) < 0.001, "Combined total must equal Cat 1 + Cat 2"
    print("  OK: Category 2 baseline is 0.00 kg CO2e and matches combined total sum.")

    # ------------------------------------------------------------------------
    # STEP 3: Category 2 Purchase Record without Calculation
    # ------------------------------------------------------------------------
    print("\n[TEST 3] Creating Synthetic Category 2 Purchase Record without Calculation...")
    cat2_purchase_id = f"purchase-cat2-machinery-{uuid.uuid4().hex[:8]}"
    acquisition_month = "2026-05"
    purchase_doc = {
        "id": cat2_purchase_id,
        "supplier_id": "supplier-xyz",
        "product_id": "product-machine",
        "reporting_month": acquisition_month,
        "purchased_quantity": 2.0,
        "quantity_unit": "unit",
        "purchase_expenditure": 5000000.0,
        "currency": "INR",
        "fingerprint": f"fp-cat2-{uuid.uuid4().hex}",
        "demo": True,
        "calculated": False,
        "created_at": "2026-05-15T10:00:00Z"
    }
    db["purchase_records"].insert_one(purchase_doc)

    # Re-check dashboard summary
    r = httpx.get(f"{BASE_URL}/manufacturer/dashboard/summary", headers=headers)
    assert r.status_code == 200
    midway = r.json()
    assert midway["emissions_kgco2e"].get("Category 2", 0.0) == 0.0, "Category 2 emissions must remain 0.0 before calculation is executed"
    print("  OK: Uncalculated Category 2 purchase does NOT inflate emissions prematurely.")

    # ------------------------------------------------------------------------
    # STEP 4: Attempt Calculation with Incompatible Factor Unit (Negative Test)
    # ------------------------------------------------------------------------
    print("\n[TEST 4] Testing Unit Incompatibility Rejection (HTTP 422)...")
    # factor-steel has denominator_unit = 'tonnes', purchase has quantity_unit = 'unit'
    r = httpx.post(f"{BASE_URL}/manufacturer/calculations", headers=headers, json={
        "purchase_record_id": cat2_purchase_id,
        "factor_id": "factor-steel",
        "method": "product_factor"
    })
    assert r.status_code == 422, f"Expected 422 for unit mismatch, got {r.status_code}: {r.text}"
    assert "incompatible" in r.text.lower(), f"Expected incompatibility message, got {r.text}"
    print(f"  OK: Incompatible unit correctly rejected: {r.json()['detail']}")

    # ------------------------------------------------------------------------
    # STEP 5: Create Compatible Synthetic DEMO Factor & Execute Product-Factor Calculation
    # ------------------------------------------------------------------------
    print("\n[TEST 5] Inserting Synthetic DEMO Product Factor and Executing Calculation...")
    demo_factor_id = "factor-machinery-demo"
    factor_doc = {
        "id": demo_factor_id,
        "name": "DEMO capital machinery equipment factor — illustrative",
        "factor_type": "product_factor",
        "factor_value": 12500.0,  # 12,500 kg CO2e per unit of machinery
        "denominator_unit": "unit",
        "source_name": "DEMO synthetic illustrative data; not an official source",
        "demo": True,
        "version": 1
    }
    db["emission_factors"].update_one({"id": demo_factor_id}, {"$set": factor_doc}, upsert=True)

    calc_res = httpx.post(f"{BASE_URL}/manufacturer/calculations", headers=headers, json={
        "purchase_record_id": cat2_purchase_id,
        "factor_id": demo_factor_id,
        "method": "product_factor"
    })
    assert calc_res.status_code == 201, f"Calculation failed: {calc_res.text}"
    run = calc_res.json()

    expected_kgco2e = 2.0 * 12500.0  # 25,000 kg CO2e
    print(f"  Calculated emissions: {run['result_value']} {run['result_unit']}")
    assert run["scope3_category"] == "Category 2", f"Receipt scope3_category mismatch: {run.get('scope3_category')}"
    assert run["result_value"] == expected_kgco2e, f"Expected {expected_kgco2e}, got {run['result_value']}"
    assert run["result_unit"] == "kg CO2e", f"Expected 'kg CO2e', got {run['result_unit']}"
    assert run["reporting_month"] == acquisition_month, f"Expected month {acquisition_month}, got {run['reporting_month']}"
    print("  OK: Calculation receipt correctly records Category 2, expected formula, and 25,000.00 kg CO2e.")

    # ------------------------------------------------------------------------
    # STEP 6: Verify Dashboard Total Update & Category 1 Isolation
    # ------------------------------------------------------------------------
    print("\n[TEST 6] Verifying Dashboard Summary Aggregation...")
    r = httpx.get(f"{BASE_URL}/manufacturer/dashboard/summary", headers=headers)
    assert r.status_code == 200
    updated = r.json()
    cat1_after = updated["emissions_kgco2e"].get("Category 1", 0.0)
    cat2_after = updated["emissions_kgco2e"].get("Category 2", 0.0)
    combined_after = updated["combined_kgco2e"]

    print(f"  Updated Cat 1: {cat1_after:,.2f} kg CO2e (was {cat1_before:,.2f})")
    print(f"  Updated Cat 2: {cat2_after:,.2f} kg CO2e (was {cat2_before:,.2f})")
    print(f"  Updated Combined: {combined_after:,.2f} kg CO2e")

    # Category 1 must remain identical
    assert abs(cat1_after - cat1_before) < 0.001, "Category 1 emissions must not change"
    # Category 2 must increase by exactly 25,000 kg CO2e
    assert abs((cat2_after - cat2_before) - expected_kgco2e) < 0.001, f"Cat 2 increase mismatch: {cat2_after - cat2_before} != {expected_kgco2e}"
    # Combined must equal Cat 1 + Cat 2
    assert abs(combined_after - (cat1_after + cat2_after)) < 0.001, "Combined total must equal Cat 1 + Cat 2"
    print("  OK: Category 2 increased by exactly 25,000 kg CO2e; Category 1 remained strictly isolated.")

    # ------------------------------------------------------------------------
    # STEP 7: Reporting Month Filter Verification
    # ------------------------------------------------------------------------
    print("\n[TEST 7] Verifying Month-Filtered Aggregations...")
    # Filter by acquisition month (2026-05)
    r_acq = httpx.get(f"{BASE_URL}/manufacturer/dashboard/summary?reporting_month={acquisition_month}", headers=headers)
    assert r_acq.status_code == 200
    acq_data = r_acq.json()
    assert acq_data["emissions_kgco2e"].get("Category 2") == expected_kgco2e, "Acquisition month must contain the 25,000 kg CO2e"
    assert acq_data["emissions_kgco2e"].get("Category 1") == 0.0, "Acquisition month 2026-05 has no Cat 1 purchases"
    assert acq_data["combined_kgco2e"] == expected_kgco2e

    # Filter by earlier month (2026-01)
    r_jan = httpx.get(f"{BASE_URL}/manufacturer/dashboard/summary?reporting_month=2026-01", headers=headers)
    assert r_jan.status_code == 200
    jan_data = r_jan.json()
    assert jan_data["emissions_kgco2e"].get("Category 2") == 0.0, "January 2026 has no Category 2 calculations"
    assert jan_data["emissions_kgco2e"].get("Category 1") > 0.0, "January 2026 should contain Category 1 calculations"
    print(f"  OK: Month filters correctly isolate 2026-05 ({acq_data['combined_kgco2e']:,.2f} kg CO2e) and 2026-01 ({jan_data['combined_kgco2e']:,.2f} kg CO2e).")

    # ------------------------------------------------------------------------
    # STEP 8: Spend-Based Method for Category 2
    # ------------------------------------------------------------------------
    print("\n[TEST 8] Testing Spend-Based Calculation for Category 2...")
    cat2_spend_purchase_id = f"purchase-cat2-spend-{uuid.uuid4().hex[:8]}"
    db["purchase_records"].insert_one({
        "id": cat2_spend_purchase_id,
        "supplier_id": "supplier-xyz",
        "product_id": "product-machine",
        "reporting_month": "2026-05",
        "purchased_quantity": 1.0,
        "quantity_unit": "unit",
        "purchase_expenditure": 2000000.0,  # 2,000,000 INR
        "currency": "INR",
        "fingerprint": f"fp-spend-{uuid.uuid4().hex}",
        "demo": True,
        "created_at": "2026-05-20T10:00:00Z"
    })
    spend_calc = httpx.post(f"{BASE_URL}/manufacturer/calculations", headers=headers, json={
        "purchase_record_id": cat2_spend_purchase_id,
        "factor_id": "factor-spend",  # 0.2 kg CO2e / INR
        "method": "spend_based"
    })
    assert spend_calc.status_code == 201, f"Spend calc failed: {spend_calc.text}"
    spend_run = spend_calc.json()
    expected_spend_kgco2e = 2000000.0 * 0.2  # 400,000 kg CO2e
    assert spend_run["result_value"] == expected_spend_kgco2e
    assert spend_run["scope3_category"] == "Category 2"
    print(f"  OK: Spend-based calculation generated {spend_run['result_value']:,.2f} kg CO2e under Category 2.")

    # Check updated dashboard
    r_acq2 = httpx.get(f"{BASE_URL}/manufacturer/dashboard/summary?reporting_month={acquisition_month}", headers=headers)
    acq2_data = r_acq2.json()
    assert acq2_data["emissions_kgco2e"]["Category 2"] == expected_kgco2e + expected_spend_kgco2e
    print(f"  OK: Total Category 2 in {acquisition_month} now: {acq2_data['emissions_kgco2e']['Category 2']:,.2f} kg CO2e.")

    # ------------------------------------------------------------------------
    # STEP 9: Clean Up Test Records from Isolated Test DB
    # ------------------------------------------------------------------------
    print("\n[TEST 9] Cleaning up synthetic test records...")
    db["calculation_runs"].delete_many({"purchase_record_id": {"$in": [cat2_purchase_id, cat2_spend_purchase_id]}})
    db["purchase_records"].delete_many({"id": {"$in": [cat2_purchase_id, cat2_spend_purchase_id]}})
    db["emission_factors"].delete_one({"id": demo_factor_id})
    print("  OK: Isolated test database cleaned successfully.")

    print("\n" + "=" * 80)
    print("ALL CATEGORY 2 VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 80)

if __name__ == "__main__":
    run_tests()
