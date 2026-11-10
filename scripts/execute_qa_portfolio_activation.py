"""TraceCarbon: Phase 2.6 Authorized QA Portfolio Scenario Activation.

Executes atomic_activate_portfolio_scenario on 'scope3track_final_qa'
with scenario batch ID: 'SCENARIO-PORTFOLIO-2026-11-09-QA-001'.
"""
import os, sys
sys.path.insert(0, os.path.abspath("."))
from dotenv import load_dotenv
import pymongo, datetime, hashlib, json
from backend.app.calculation_safety import atomic_activate_portfolio_scenario

load_dotenv()
client = pymongo.MongoClient(os.getenv('MONGODB_URI'))

TARGET_DB_NAME = 'scope3track_final_qa'
PROD_DB_NAME = 'scope3track'

print("================================================================================")
print("PHASE 2.6: EXECUTING AUTHORIZED QA PORTFOLIO SCENARIO ACTIVATION")
print("================================================================================")

# 1. Strict Target Database Boundary Check
qa_db = client[TARGET_DB_NAME]
assert qa_db.name == 'scope3track_final_qa', f"CRITICAL ABORT: Connected to {qa_db.name}, expected scope3track_final_qa"
if qa_db.name != 'scope3track_final_qa':
    print(f"ABORT: Target is {qa_db.name}, not scope3track_final_qa!")
    sys.exit(1)
print(f"Target Database Verified: '{qa_db.name}'")

# 2. Check Pre-Activation Active State
pre_active = list(qa_db.calculation_runs.find({"is_active": True}))
assert len(pre_active) == 20
assert abs(sum(r["result_value"] for r in pre_active) - 2692863.53) < 0.01
print(f"Pre-activation verified: 20 active Product-Factor runs, sum = 2,692.86353 t CO2e.")

# 3. Build Approved 20-Purchase Assignment Documents
COMMODITY_TO_NAICS = {
    'Corrugated packaging': '322210',
    'PK-BX-006': '322210',
    'SUP-006': '322210',
    'Industrial fabric': '313200',
    'TX-FC-007': '313200',
    'SUP-007': '313200',
}

PROPOSED_ASSIGNMENTS = {
    'PO-2022-001': 'product_factor',
    'PO-2022-002': 'product_factor',
    'PO-2022-003': 'product_factor',
    'PO-2022-004': 'product_factor',
    'PO-2022-005': 'product_factor',
    'PO-2022-010': 'product_factor',
    'PO-2023-001': 'product_factor',
    'PO-2023-002': 'product_factor',
    'PO-2023-003': 'product_factor',
    'PO-2023-004': 'product_factor',
    'PO-2023-009': 'product_factor',
    'PO-2023-010': 'product_factor',
    'PO-2022-008': 'activity_based',
    'PO-2022-009': 'activity_based',
    'PO-2023-005': 'activity_based',
    'PO-2023-008': 'activity_based',
    'PO-2022-006': 'spend_based',
    'PO-2022-007': 'spend_based',
    'PO-2023-006': 'spend_based',
    'PO-2023-007': 'spend_based',
}

scenario_docs = []
now_dt = datetime.datetime.now(datetime.timezone.utc)

for pid in sorted(PROPOSED_ASSIGNMENTS.keys()):
    p = qa_db.purchase_records.find_one({'id': pid})
    method = PROPOSED_ASSIGNMENTS[pid]
    cat = p.get('scope3_category')
    fy = p.get('financial_year') or p.get('reporting_month')
    tag = 'FY22' if '2022' in fy else 'FY23'
    
    if method == 'product_factor':
        # Retain existing baseline calculation run
        run = qa_db.calculation_runs.find_one({'purchase_record_id': pid, 'id': f"calc-{pid.lower()}"})
        if not run:
            run = qa_db.calculation_runs.find_one({'purchase_record_id': pid, 'method': 'product_factor'})
        scenario_docs.append(dict(run))
    elif method == 'activity_based':
        sub = qa_db.submissions.find_one({'supplier_id': p['supplier_id'], 'reporting_month': fy, 'status': {'$in': ['submitted', 'closed', 'response_submitted']}})
        activities = sub.get('activities', [])
        elec = next(a for a in activities if a.get('activity_id') in ('electricity', 'grid_electricity'))
        diesel = next(a for a in activities if a.get('activity_id') in ('diesel', 'diesel_fuel'))
        prod = next(a for a in activities if a.get('activity_id') in ('production', 'production_volume'))
        cea = qa_db.emission_factors.find_one({'factor_type': 'activity_based', 'applicable_activity': 'electricity', '$or': [{'financial_year': fy}, {'id': f'FACT-CEA-GRID-{tag}'}]})
        ipcc = qa_db.emission_factors.find_one({'factor_type': 'activity_based', 'applicable_activity': 'diesel', 'id': 'FACT-IPCC-DIESEL'})
        
        elec_kwh = float(elec['value'])
        diesel_l = float(diesel['value'])
        annual_prod = float(prod['value'])
        purchased_qty = float(p['purchased_quantity'])
        alpha = purchased_qty / annual_prod
        fac_kg = elec_kwh * float(cea['factor_value']) + diesel_l * float(ipcc['factor_value'])
        alloc_kg = round(fac_kg * alpha, 2)
        
        calc_id = f"calc-scenario-{pid.lower()}-act"
        formula = "(supplier_electricity × grid_factor + supplier_diesel × diesel_factor) × (purchased_qty / annual_production)"
        sha256_hash = hashlib.sha256(json.dumps({
            "id": calc_id,
            "purchase_record_id": pid,
            "supplier_id": p["supplier_id"],
            "product_id": p["product_id"],
            "factor_id": cea["id"],
            "method": "activity_based",
            "result_value": alloc_kg,
            "formula": formula
        }, sort_keys=True).encode()).hexdigest()
        
        doc = {
            "id": calc_id,
            "purchase_record_id": pid,
            "supplier_id": p["supplier_id"],
            "product_id": p["product_id"],
            "product_name": p["product_name"],
            "reporting_month": p["reporting_month"],
            "financial_year": fy,
            "scope3_category": cat,
            "method": "activity_based",
            "factor_id": cea["id"],
            "factor_version": 1,
            "factor_metadata": {
                "source_name": "CEA / IPCC Public Emission Factors",
                "grid_factor": {"id": cea["id"], "factor_value": cea["factor_value"], "source": cea.get("source_name")},
                "diesel_factor": {"id": ipcc["id"], "factor_value": ipcc["factor_value"], "source": ipcc.get("source_name")},
                "description": "Supplier-specific energy activity allocation estimate — synthetic demonstration data"
            },
            "formula": formula,
            "result_value": alloc_kg,
            "result_unit": "kg CO2e",
            "components": [
                {"activity_id": "electricity", "value": elec_kwh, "unit": "kWh", "factor_id": cea["id"], "factor_value": cea["factor_value"], "emissions_kgco2e": round(elec_kwh * float(cea["factor_value"]), 2)},
                {"activity_id": "diesel", "value": diesel_l, "unit": "litres", "factor_id": ipcc["id"], "factor_value": ipcc["factor_value"], "emissions_kgco2e": round(diesel_l * float(ipcc["factor_value"]), 2)},
                {"activity_id": "facility_total", "emissions_kgco2e": round(fac_kg, 2)},
                {"activity_id": "allocation", "allocation_basis": "physical_production_mass", "purchased_qty": purchased_qty, "annual_production": annual_prod, "allocation_fraction": alpha}
            ],
            "sha256": sha256_hash,
            "verification_hash": sha256_hash,
            "is_active": True,
            "is_synthetic": True,
            "data_classification": "DEMO DATA — SYNTHETIC",
            "created_at": now_dt
        }
        scenario_docs.append(doc)
    elif method == 'spend_based':
        sec = COMMODITY_TO_NAICS.get(p.get('product_name')) or COMMODITY_TO_NAICS.get(p.get('product_id'))
        f = qa_db.emission_factors.find_one({'factor_type': 'spend_based', 'sector_code': sec, 'financial_year': fy}) or qa_db.emission_factors.find_one({'id': f'FACT-CEDA-{sec}-{tag}'})
        spend_inr = float(p['purchase_expenditure'])
        fx = float(f.get('fx_rate', 1.0))
        spend_usd = spend_inr / fx
        f_usd = float(f.get('factor_value_usd', f['factor_value'] * fx))
        em_kg = round(spend_usd * f_usd, 2)
        
        calc_id = f"calc-scenario-{pid.lower()}-spn"
        formula = "(purchase_expenditure_inr / embedded_fx) × ceda_factor_usd"
        sha256_hash = hashlib.sha256(json.dumps({
            "id": calc_id,
            "purchase_record_id": pid,
            "supplier_id": p["supplier_id"],
            "product_id": p["product_id"],
            "factor_id": f["id"],
            "method": "spend_based",
            "result_value": em_kg,
            "formula": formula
        }, sort_keys=True).encode()).hexdigest()
        
        doc = {
            "id": calc_id,
            "purchase_record_id": pid,
            "supplier_id": p["supplier_id"],
            "product_id": p["product_id"],
            "product_name": p["product_name"],
            "reporting_month": p["reporting_month"],
            "financial_year": fy,
            "scope3_category": cat,
            "method": "spend_based",
            "factor_id": f["id"],
            "factor_version": 1,
            "factor_metadata": {
                "source_name": f.get("source_name", "Open CEDA"),
                "attribution": f.get("attribution", "CEDA by Watershed"),
                "license": f.get("license", "CC BY-SA 4.0"),
                "price_basis": f.get("price_basis", "Producer Price"),
                "proxy_year": f.get("proxy_year"),
                "fx_rate": fx,
                "factor_value_usd": f_usd
            },
            "formula": formula,
            "result_value": em_kg,
            "result_unit": "kg CO2e",
            "components": [
                {
                    "sector_code": f.get("sector_code", sec),
                    "sector_name": f.get("sector_name"),
                    "spend_inr": spend_inr,
                    "fx_rate": fx,
                    "spend_usd": round(spend_usd, 2),
                    "factor_value_usd": f_usd,
                    "emissions_kgco2e": em_kg
                }
            ],
            "sha256": sha256_hash,
            "verification_hash": sha256_hash,
            "is_active": True,
            "is_synthetic": True,
            "data_classification": "DEMO DATA — SYNTHETIC",
            "created_at": now_dt
        }
        scenario_docs.append(doc)

assert len(scenario_docs) == 20
print("Prepared all 20 scenario documents.")

# 4. Execute Atomic Scenario Activation inside MongoDB transaction
SCENARIO_BATCH_ID = "SCENARIO-PORTFOLIO-2026-11-09-QA-001"
SCENARIO_NAME = "Approved Multi-Method Portfolio (12 PF / 4 Act / 4 Spn)"

print(f"\nExecuting atomic_activate_portfolio_scenario on {TARGET_DB_NAME}...")
res = atomic_activate_portfolio_scenario(
    client=client,
    db_name=TARGET_DB_NAME,
    scenario_batch_id=SCENARIO_BATCH_ID,
    scenario_name=SCENARIO_NAME,
    scenario_docs=scenario_docs,
    user_id="usr-manufacturer-001"
)
print("Activation Result:", res)

# 5. Post-Activation Verification Queries
post_active = list(qa_db.calculation_runs.find({"is_active": True}))
assert len(post_active) == 20, f"Expected 20 active runs, found {len(post_active)}"

# Method distribution check
method_counts = {}
for r in post_active:
    method_counts[r["method"]] = method_counts.get(r["method"], 0) + 1
assert method_counts == {'product_factor': 12, 'activity_based': 4, 'spend_based': 4}, f"Unexpected counts: {method_counts}"
print(f"Verified Method Distribution: {method_counts}")

# Category sums check
cat1_active_kg = sum(r["result_value"] for r in post_active if r.get("scope3_category") != "Category 2")
cat2_active_kg = sum(r["result_value"] for r in post_active if r.get("scope3_category") == "Category 2")
comb_active_kg = sum(r["result_value"] for r in post_active)

print(f"Category 1 Active: {cat1_active_kg:.2f} kg ({cat1_active_kg/1000:.4f} t CO2e)")
print(f"Category 2 Active: {cat2_active_kg:.2f} kg ({cat2_active_kg/1000:.4f} t CO2e)")
print(f"Combined Portfolio: {comb_active_kg:.2f} kg ({comb_active_kg/1000:.4f} t CO2e)")

assert abs(cat1_active_kg - 3421593.66) < 1.0
assert abs(cat2_active_kg - 3959.78) < 0.1
assert abs(comb_active_kg - 3425553.44) < 1.0

# Total calculation runs check (28 runs = 20 baseline + 8 alternative)
total_runs = qa_db.calculation_runs.count_documents({})
assert total_runs == 28, f"Expected 28 total runs, found {total_runs}"
print(f"Historical Receipts Preserved: exactly {total_runs} receipts in QA database.")

# Check purchase record pointers
for r in post_active:
    p_rec = qa_db.purchase_records.find_one({"id": r["purchase_record_id"]})
    assert p_rec["active_calculation_id"] == r["id"]
    assert p_rec["active_method"] == r["method"]
    assert p_rec["scenario_batch_id"] == SCENARIO_BATCH_ID
print("All 20 purchase records verified with active pointers and scenario batch ID.")

# Check scenario record
scen_rec = qa_db.portfolio_scenarios.find_one({"scenario_batch_id": SCENARIO_BATCH_ID})
assert scen_rec is not None
assert scen_rec["status"] == "ACTIVE"
assert scen_rec["manifest_checksum"] == res["manifest_checksum"]
print(f"Scenario Record verified in QA: batch={SCENARIO_BATCH_ID}, checksum={scen_rec['manifest_checksum'][:16]}...")

# 6. Verify Production Database is 100% UNTOUCHED
prod_db = client[PROD_DB_NAME]
prod_active = list(prod_db.calculation_runs.find({"is_active": True}))
prod_sum = sum(r["result_value"] for r in prod_active)
assert len(prod_active) == 20
assert abs(prod_sum - 2692863.53) < 0.01
assert all(r["method"] == "product_factor" for r in prod_active)
assert prod_db.portfolio_scenarios.count_documents({}) == 0 if "portfolio_scenarios" in prod_db.list_collection_names() else True
print(f"PRODUCTION DATABASE VERIFIED UNTOUCHED: 20 active Product-Factor runs, {prod_sum/1000:.5f} t CO2e.")

print("\n================================================================================")
print("PHASE 2.6 QA PORTFOLIO SCENARIO ACTIVATION COMPLETED SUCCESSFULLY!")
print("================================================================================")
