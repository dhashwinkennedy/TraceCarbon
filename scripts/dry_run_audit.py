from dotenv import load_dotenv
import os, pymongo, json, hashlib

load_dotenv()
client = pymongo.MongoClient(os.getenv('MONGODB_URI'))
qa_db = client['scope3track_final_qa']
prod_db = client['scope3track']

print("================================================================================")
print("PHASE 2.5 DRY RUN AUDIT: 20-PURCHASE PORTFOLIO VERIFICATION")
print("================================================================================")

# 1. Check all 20 purchases
purchases = list(qa_db.purchase_records.find().sort("id", 1))
print(f"Total purchases in QA database: {len(purchases)}")
assert len(purchases) == 20, f"Expected 20 purchases, found {len(purchases)}"

p_dict = {p["id"]: p for p in purchases}

# Definitions of Proposed Assignments
PROPOSED_ASSIGNMENTS = {
    # Product-Factor (12)
    "PO-2022-001": "product_factor",
    "PO-2022-002": "product_factor",
    "PO-2022-003": "product_factor",
    "PO-2022-004": "product_factor",
    "PO-2022-005": "product_factor",
    "PO-2022-010": "product_factor",
    "PO-2023-001": "product_factor",
    "PO-2023-002": "product_factor",
    "PO-2023-003": "product_factor",
    "PO-2023-004": "product_factor",
    "PO-2023-009": "product_factor",
    "PO-2023-010": "product_factor",
    # Activity-Based (4)
    "PO-2022-008": "activity_based",
    "PO-2022-009": "activity_based",
    "PO-2023-005": "activity_based",
    "PO-2023-008": "activity_based",
    # Spend-Based (4)
    "PO-2022-006": "spend_based",
    "PO-2022-007": "spend_based",
    "PO-2023-006": "spend_based",
    "PO-2023-007": "spend_based",
}

print(f"Total assignments: {len(PROPOSED_ASSIGNMENTS)}")
method_counts = {}
for m in PROPOSED_ASSIGNMENTS.values():
    method_counts[m] = method_counts.get(m, 0) + 1
print(f"Method distribution: {method_counts}")

print("\n--- SECTION 2: ACTIVITY-BASED ELIGIBILITY & CALCULATION ---")
act_results = {}
for pid in ["PO-2022-008", "PO-2022-009", "PO-2023-005", "PO-2023-008"]:
    p = p_dict[pid]
    fy = p.get("financial_year") or p.get("reporting_month")
    sid = p["supplier_id"]
    sub = qa_db.submissions.find_one({
        "supplier_id": sid,
        "reporting_month": fy,
        "status": {"$in": ["submitted", "closed", "response_submitted"]}
    })
    assert sub is not None, f"Submitted report not found for {pid} ({sid}, {fy})"
    
    activities = sub.get("activities", [])
    elec = next(a for a in activities if a.get("activity_id") in ("electricity", "grid_electricity"))
    diesel = next(a for a in activities if a.get("activity_id") in ("diesel", "diesel_fuel"))
    prod = next(a for a in activities if a.get("activity_id") in ("production", "production_volume"))
    
    # Factors
    tag = "FY22" if "2022" in fy else "FY23"
    cea = qa_db.emission_factors.find_one({
        "factor_type": "activity_based",
        "applicable_activity": "electricity",
        "$or": [{"financial_year": fy}, {"id": f"FACT-CEA-GRID-{tag}"}]
    })
    ipcc = qa_db.emission_factors.find_one({
        "factor_type": "activity_based",
        "applicable_activity": "diesel",
        "id": "FACT-IPCC-DIESEL"
    })
    
    # Calculations
    elec_kwh = float(elec["value"])
    diesel_l = float(diesel["value"])
    annual_prod_t = float(prod["value"])
    purchased_qty_t = float(p["purchased_quantity"])
    
    grid_f = float(cea["factor_value"])
    diesel_f = float(ipcc["factor_value"])
    
    em_elec_kg = elec_kwh * grid_f
    em_diesel_kg = diesel_l * diesel_f
    fac_total_kg = em_elec_kg + em_diesel_kg
    fac_total_t = fac_total_kg / 1000.0
    
    alpha = purchased_qty_t / annual_prod_t
    alpha_pct = alpha * 100.0
    
    alloc_em_kg = round(fac_total_kg * alpha, 2)
    alloc_em_t = round(alloc_em_kg / 1000.0, 4)
    
    act_results[pid] = {
        "supplier_id": sid,
        "fy": fy,
        "product_name": p["product_name"],
        "purchased_qty": purchased_qty_t,
        "elec_kwh": elec_kwh,
        "diesel_l": diesel_l,
        "annual_prod_t": annual_prod_t,
        "grid_factor": grid_f,
        "diesel_factor": diesel_f,
        "fac_total_t": fac_total_t,
        "alpha": alpha,
        "alpha_pct": round(alpha_pct, 4),
        "emissions_kg": alloc_em_kg,
        "emissions_t": alloc_em_t,
        "category": p["scope3_category"]
    }
    print(f"[{pid}] {p['product_name']} ({sid}, {fy}):")
    print(f"   Elec: {elec_kwh:,.0f} kWh @ {grid_f} = {em_elec_kg:,.2f} kg CO2e")
    print(f"   Diesel: {diesel_l:,.0f} L @ {diesel_f} = {em_diesel_kg:,.2f} kg CO2e")
    print(f"   Facility Total: {fac_total_t:,.2f} t CO2e")
    print(f"   Allocation: {purchased_qty_t:,.0f} t / {annual_prod_t:,.0f} t = {alpha_pct:.4f}%")
    print(f"   Allocated: {alloc_em_kg:,.2f} kg CO2e = {alloc_em_t:.4f} t CO2e")

print("\n--- SECTION 3: SPEND-BASED VERIFICATION ---")
COMMODITY_TO_NAICS = {
    "Corrugated packaging": "322210",
    "TX-FC-006": "322210",
    "SUP-006": "322210",
    "Industrial fabric": "313200",
    "TX-FC-007": "313200",
    "SUP-007": "313200",
}
spend_results = {}
for pid in ["PO-2022-006", "PO-2022-007", "PO-2023-006", "PO-2023-007"]:
    p = p_dict[pid]
    fy = p.get("financial_year") or p.get("reporting_month")
    sec = COMMODITY_TO_NAICS.get(p["product_name"]) or COMMODITY_TO_NAICS.get(p["product_id"])
    
    f = qa_db.emission_factors.find_one({
        "factor_type": "spend_based",
        "sector_code": sec,
        "financial_year": fy
    })
    assert f is not None, f"Spend factor not found for {pid} ({sec}, {fy})"
    
    spend_inr = float(p["purchase_expenditure"])
    fx = float(f.get("fx_rate", 1.0))
    spend_usd = spend_inr / fx
    factor_val = float(f.get("factor_value_usd", f["factor_value"] * fx))
    
    em_kg = round(spend_usd * factor_val, 2)
    em_t = round(em_kg / 1000.0, 4)
    
    spend_results[pid] = {
        "product_name": p["product_name"],
        "sector_code": sec,
        "sector_name": f["sector_name"],
        "fy": fy,
        "spend_inr": spend_inr,
        "fx": fx,
        "spend_usd": round(spend_usd, 2),
        "factor_val": factor_val,
        "emissions_kg": em_kg,
        "emissions_t": em_t,
        "attribution": f.get("source_name", "Open CEDA / Watershed"),
        "license": f.get("license", "CC BY-SA 4.0"),
        "category": p["scope3_category"]
    }
    print(f"[{pid}] {p['product_name']} ({sec}, {fy}):")
    print(f"   Spend: INR {spend_inr:,.2f} / {fx:.6f} = USD {spend_usd:,.2f}")
    print(f"   Factor: {factor_val:.6f} kg CO2e / USD (Producer Price)")
    print(f"   Emissions: {em_kg:,.2f} kg CO2e = {em_t:.4f} t CO2e")
    print(f"   Attribution: {f.get('source_name')} • {f.get('license')}")

print("\n--- SECTION 4: PRODUCT-FACTOR VERIFICATION (12 PURCHASES) ---")
pcf_results = {}
for pid, method in PROPOSED_ASSIGNMENTS.items():
    if method != "product_factor":
        continue
    p = p_dict[pid]
    # Check baseline calculation run
    run = qa_db.calculation_runs.find_one({"purchase_record_id": pid, "is_active": True})
    assert run is not None, f"Baseline run not found for {pid}"
    assert run["method"] == "product_factor"
    
    f = qa_db.emission_factors.find_one({"id": run["factor_id"]})
    assert f is not None, f"Factor not found: {run['factor_id']}"
    
    qty = float(p["purchased_quantity"])
    f_val = float(f["factor_value"])
    calc_kg = round(qty * f_val, 2)
    
    pcf_results[pid] = {
        "product_name": p["product_name"],
        "supplier_id": p["supplier_id"],
        "fy": p.get("reporting_month"),
        "quantity": qty,
        "unit": p["quantity_unit"],
        "factor_id": f["id"],
        "factor_val": f_val,
        "factor_unit": f["denominator_unit"],
        "emissions_kg": run["result_value"],
        "emissions_t": round(run["result_value"] / 1000.0, 4),
        "category": p["scope3_category"]
    }
    print(f"[{pid}] {p['product_name']} ({p.get('reporting_month')}): {qty} {p['quantity_unit']} @ {f_val} = {run['result_value']} kg CO2e ({run['result_value']/1000:.4f} t CO2e) [Scope 3 {p['scope3_category']}]")

print("\n--- SECTION 5: TOTALS RECONCILIATION ---")
pcf_total_kg = sum(r["emissions_kg"] for r in pcf_results.values())
act_total_kg = sum(r["emissions_kg"] for r in act_results.values())
spend_total_kg = sum(r["emissions_kg"] for r in spend_results.values())
combined_total_kg = pcf_total_kg + act_total_kg + spend_total_kg

pcf_total_t = pcf_total_kg / 1000.0
act_total_t = act_total_kg / 1000.0
spend_total_t = spend_total_kg / 1000.0
combined_total_t = combined_total_kg / 1000.0

print(f"Product-Factor (12): {pcf_total_t:.4f} t CO2e (Target: 1943.4599 t CO2e, Delta: {pcf_total_t - 1943.4599:.4f})")
print(f"Activity-Based  (4): {act_total_t:.4f} t CO2e (Target:  415.1336 t CO2e, Delta: {act_total_t - 415.1336:.4f})")
print(f"Spend-Based     (4): {spend_total_t:.4f} t CO2e (Target: 1066.9598 t CO2e, Delta: {spend_total_t - 1066.9598:.4f})")
print(f"Combined Portfolio : {combined_total_t:.4f} t CO2e (Target: 3425.5534 t CO2e, Delta: {combined_total_t - 3425.5534:.4f})")

# Category segregation
cat1_total_kg = (
    sum(r["emissions_kg"] for r in pcf_results.values() if r["category"] == "Category 1") +
    sum(r["emissions_kg"] for r in act_results.values() if r["category"] == "Category 1") +
    sum(r["emissions_kg"] for r in spend_results.values() if r["category"] == "Category 1")
)
cat2_total_kg = (
    sum(r["emissions_kg"] for r in pcf_results.values() if r["category"] == "Category 2") +
    sum(r["emissions_kg"] for r in act_results.values() if r["category"] == "Category 2") +
    sum(r["emissions_kg"] for r in spend_results.values() if r["category"] == "Category 2")
)

print(f"\nCategory 1 (Purchased Goods & Services): {cat1_total_kg/1000:.4f} t CO2e")
print(f"Category 2 (Capital Goods - Boilers):   {cat2_total_kg/1000:.4f} t CO2e")
print(f"Sum of Categories: {(cat1_total_kg + cat2_total_kg)/1000:.4f} t CO2e")

print("\n--- BASELINE RECONCILIATION ---")
current_active = list(qa_db.calculation_runs.find({"is_active": True}))
current_sum_kg = sum(r["result_value"] for r in current_active)
print(f"Current QA active calculations: {len(current_active)}")
print(f"Current QA active sum: {current_sum_kg:.2f} kg CO2e ({current_sum_kg/1000:.5f} t CO2e)")
print(f"Prod active sum: {sum(r['result_value'] for r in prod_db.calculation_runs.find({'is_active': True}))/1000:.5f} t CO2e")
