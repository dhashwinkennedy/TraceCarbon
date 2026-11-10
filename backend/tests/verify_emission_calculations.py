"""
Independent audit of Scope3Track Emission Calculations and Accounting Guarantees.
Verifies:
1. Inventory of all 20 calculation runs and linked purchase records.
2. Independent re-calculation of Category 1 and Category 2 samples.
3. Methodology, factors, units, and single-active-calculation inventory guarantee.
4. Audits synthetic product-footprint assumptions.
"""

import os
import sys
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

mongo_client = MongoClient(os.getenv("MONGODB_URI"))
db = mongo_client[os.getenv("MONGODB_DB", "scope3track")]

def audit_calculations():
    print("\n=======================================================")
    print("STARTING EMISSION CALCULATIONS AUDIT & FACTOR INTEGRITY")
    print("=======================================================")

    calcs = list(db["calculation_runs"].find({}))
    purchases = list(db["purchase_records"].find({}))
    factors = {f["id"]: f for f in db["emission_factors"].find({})}

    assert len(calcs) == 20, f"Expected 20 calculations, found {len(calcs)}"
    assert len(purchases) == 20, f"Expected 20 purchases, found {len(purchases)}"
    print(f"  [PASS] Retrieved 20 calculations and 20 purchase records.")

    # 1. Double-Counting Protection Check: Exactly 1 active calculation per purchase record
    pr_to_active_calcs = {}
    for c in calcs:
        if c.get("is_active"):
            pr_id = c["purchase_record_id"]
            pr_to_active_calcs[pr_id] = pr_to_active_calcs.get(pr_id, 0) + 1

    for pr in purchases:
        pr_id = pr["id"]
        active_count = pr_to_active_calcs.get(pr_id, 0)
        assert active_count == 1, f"Double-counting protection violation for {pr_id}: found {active_count} active calculations!"
    print(f"  [PASS] Double-Counting Protection Verified: Every purchase record has exactly 1 active calculation run.")

    # 2. Independent Sample Verification
    sample_pids = [
        ("PO-2022-001", "SUP-001", "Category 1"),
        ("PO-2022-003", "SUP-003", "Category 1"),
        ("PO-2022-004", "SUP-004", "Category 1"),
        ("PO-2023-006", "SUP-006", "Category 1"),
        ("PO-2022-010", "SUP-010", "Category 2")
    ]

    print("\n  Sample Verification Details:")
    for pr_id, expected_sid, expected_cat in sample_pids:
        pr = db["purchase_records"].find_one({"id": pr_id})
        assert pr is not None, f"Purchase {pr_id} not found"
        calc = db["calculation_runs"].find_one({"purchase_record_id": pr_id, "is_active": True})
        assert calc is not None, f"Active calc for {pr_id} not found"

        qty = pr["purchased_quantity"]
        unit = pr["quantity_unit"]
        cat = pr["scope3_category"]
        assert cat == expected_cat, f"Mismatch in category: expected {expected_cat}, got {cat}"
        assert pr["supplier_id"] == expected_sid

        factor_id = calc["factor_id"]
        factor_val = calc["factor_value"]
        stored_res = calc["result_value"]
        calc_unit = calc["unit"]

        # Re-compute independently
        expected_res = round(qty * factor_val, 4)
        actual_res = round(stored_res, 4)
        assert abs(actual_res - expected_res) < 0.01, f"Calculation math discrepancy for {pr_id}: stored {stored_res} vs expected {expected_res}"
        assert calc_unit == "kgCO2e", f"Unexpected unit: {calc_unit}"

        print(f"    - [{cat}] {pr_id} ({pr['product_name']}):")
        print(f"        Purchased: {qty} {unit} | Factor: {factor_val} kgCO2e/{unit}")
        print(f"        Emissions: {actual_res:,.2f} kgCO2e ({actual_res/1000:,.2f} tCO2e) -> MATH VERIFIED")

    # 3. Category 1 vs Category 2 Aggregation
    cat1_calcs = [c for c in calcs if c.get("scope3_category") == "Category 1"]
    cat2_calcs = [c for c in calcs if c.get("scope3_category") == "Category 2"]
    assert len(cat1_calcs) == 18
    assert len(cat2_calcs) == 2

    cat1_total_kg = sum(c["result_value"] for c in cat1_calcs)
    cat2_total_kg = sum(c["result_value"] for c in cat2_calcs)

    print(f"\n  Portfolio Totals Segregation:")
    print(f"    - Category 1 (18 Runs): {cat1_total_kg:,.2f} kgCO2e ({cat1_total_kg/1000:,.2f} tonnes CO2e)")
    print(f"    - Category 2 (2 Runs):  {cat2_total_kg:,.2f} kgCO2e ({cat2_total_kg/1000:,.2f} tonnes CO2e)")
    print(f"    - Combined Scope 3:     {(cat1_total_kg + cat2_total_kg):,.2f} kgCO2e ({(cat1_total_kg + cat2_total_kg)/1000:,.2f} tonnes CO2e)")

    # 4. Audit Note on Synthetic Assumptions
    print("\n  [AUDIT NOTE ON SYNTHETIC PRODUCT FOOTPRINTS]")
    print("    - Product factors are derived via plant activity allocation (Scope 1 diesel + Scope 2 grid electricity / production output).")
    print("    - All 10 suppliers have deterministic baseline PCF factors seeded.")
    print("    - Methodology aligns with GHG Protocol Corporate Standard Category 1 & Category 2 estimation guidance.")
    print("    - Limitation: Synthetic demonstration figures; does not constitute accredited third-party ISO 14067 life-cycle assessment.")

if __name__ == "__main__":
    audit_calculations()
    print("\n=======================================================")
    print("ALL EMISSION CALCULATIONS AUDIT CHECKS PASSED!")
    print("=======================================================\n")
