"""Phase 2.6 Activation Safety Gate Test Suite.

Executes comprehensive tests of atomic_activate_portfolio_scenario and
atomic_rollback_portfolio_scenario in an isolated disposable QA database:
'scope3track_disposable_safety_gate_test'.
"""
from dotenv import load_dotenv
import os, pymongo, datetime, hashlib, json
from backend.app.calculation_safety import (
    create_calculation_safety_indexes,
    atomic_activate_portfolio_scenario,
    atomic_rollback_portfolio_scenario,
)

load_dotenv()
client = pymongo.MongoClient(os.getenv('MONGODB_URI'))

SOURCE_QA_DB = 'scope3track_final_qa'
PROD_DB = 'scope3track'
DISPOSABLE_DB = 'scope3track_safety_gate_test'

print("================================================================================")
print("PHASE 2.6 ACTIVATION SAFETY GATE TEST SUITE")
print("================================================================================")

# 1. Verify Source DBs
qa_db = client[SOURCE_QA_DB]
prod_db = client[PROD_DB]
qa_active = list(qa_db.calculation_runs.find({'is_active': True}))
qa_sum = sum(r['result_value'] for r in qa_active)
assert len(qa_active) == 20, f"Expected 20 active runs in QA, found {len(qa_active)}"
assert abs(qa_sum - 2692863.53) < 0.01, f"QA baseline altered: {qa_sum}"

prod_active = list(prod_db.calculation_runs.find({'is_active': True}))
prod_sum = sum(r['result_value'] for r in prod_active)
assert len(prod_active) == 20, f"Expected 20 active runs in Prod, found {len(prod_active)}"
assert abs(prod_sum - 2692863.53) < 0.01, f"Prod baseline altered: {prod_sum}"
print(f"Pre-flight OK: Source QA and Prod both at 20 active runs, {qa_sum/1000:.5f} t CO2e.")

# 2. Setup Disposable DB
client.drop_database(DISPOSABLE_DB)
disp_db = client[DISPOSABLE_DB]
print(f"Created clean disposable database: '{DISPOSABLE_DB}'")

# Clone collections from QA to Disposable
for coll_name in ['purchase_records', 'calculation_runs', 'emission_factors', 'submissions', 'products', 'users']:
    docs = list(qa_db[coll_name].find())
    if docs:
        disp_db[coll_name].insert_many(docs)
    print(f"  Cloned {len(docs)} documents into {coll_name}")

# Create Partial Unique Index
idx_res = create_calculation_safety_indexes(disp_db)
print(f"Created partial unique index: {idx_res['index_name']}")

# 3. Build Proposed Scenario Documents (20 Purchases)
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
now_dt = datetime.datetime.utcnow()

for pid in sorted(PROPOSED_ASSIGNMENTS.keys()):
    p = disp_db.purchase_records.find_one({'id': pid})
    method = PROPOSED_ASSIGNMENTS[pid]
    cat = p.get('scope3_category')
    fy = p.get('financial_year') or p.get('reporting_month')
    tag = 'FY22' if '2022' in fy else 'FY23'
    
    if method == 'product_factor':
        # Retain existing baseline calculation run
        run = disp_db.calculation_runs.find_one({'purchase_record_id': pid, 'is_active': True})
        scenario_docs.append(dict(run))
    elif method == 'activity_based':
        sub = disp_db.submissions.find_one({'supplier_id': p['supplier_id'], 'reporting_month': fy, 'status': {'$in': ['submitted', 'closed', 'response_submitted']}})
        activities = sub.get('activities', [])
        elec = next(a for a in activities if a.get('activity_id') in ('electricity', 'grid_electricity'))
        diesel = next(a for a in activities if a.get('activity_id') in ('diesel', 'diesel_fuel'))
        prod = next(a for a in activities if a.get('activity_id') in ('production', 'production_volume'))
        cea = disp_db.emission_factors.find_one({'factor_type': 'activity_based', 'applicable_activity': 'electricity', '$or': [{'financial_year': fy}, {'id': f'FACT-CEA-GRID-{tag}'}]})
        ipcc = disp_db.emission_factors.find_one({'factor_type': 'activity_based', 'applicable_activity': 'diesel', 'id': 'FACT-IPCC-DIESEL'})
        
        elec_kwh = float(elec['value'])
        diesel_l = float(diesel['value'])
        annual_prod = float(prod['value'])
        purchased_qty = float(p['purchased_quantity'])
        alpha = purchased_qty / annual_prod
        fac_kg = elec_kwh * float(cea['factor_value']) + diesel_l * float(ipcc['factor_value'])
        alloc_kg = round(fac_kg * alpha, 2)
        
        calc_id = f"calc-scenario-{pid.lower()}-act"
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
                "grid_factor": {"id": cea["id"], "factor_value": cea["factor_value"]},
                "diesel_factor": {"id": ipcc["id"], "factor_value": ipcc["factor_value"]}
            },
            "formula": "(supplier_electricity × grid_factor + supplier_diesel × diesel_factor) × (purchased_qty / annual_production)",
            "result_value": alloc_kg,
            "result_unit": "kg CO2e",
            "is_active": True,
            "created_at": now_dt
        }
        scenario_docs.append(doc)
    elif method == 'spend_based':
        sec = COMMODITY_TO_NAICS.get(p.get('product_name')) or COMMODITY_TO_NAICS.get(p.get('product_id'))
        f = disp_db.emission_factors.find_one({'factor_type': 'spend_based', 'sector_code': sec, 'financial_year': fy}) or disp_db.emission_factors.find_one({'id': f'FACT-CEDA-{sec}-{tag}'})
        spend_inr = float(p['purchase_expenditure'])
        fx = float(f.get('fx_rate', 1.0))
        spend_usd = spend_inr / fx
        f_usd = float(f.get('factor_value_usd', f['factor_value'] * fx))
        em_kg = round(spend_usd * f_usd, 2)
        
        calc_id = f"calc-scenario-{pid.lower()}-spn"
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
            "formula": "(purchase_expenditure_inr / embedded_fx) × ceda_factor_usd",
            "result_value": em_kg,
            "result_unit": "kg CO2e",
            "is_active": True,
            "created_at": now_dt
        }
        scenario_docs.append(doc)

assert len(scenario_docs) == 20
print("Prepared 20 scenario documents (12 Product-Factor, 4 Activity-Based, 4 Spend-Based).")

# ------------------------------------------------------------------------------
# TEST 1: Failure Injected Midway through Transaction
# ------------------------------------------------------------------------------
print("\n--- TEST 1: MIDWAY FAILURE INJECTION & AUTOMATIC ABORT ---")
# Modify item #15 to cause a deliberate schema/type failure or raise inside transaction
bad_scenario_docs = [dict(d) for d in scenario_docs]
# Insert duplicate purchase ID to trigger validation failure
bad_scenario_docs[15]["purchase_record_id"] = bad_scenario_docs[0]["purchase_record_id"]

failure_caught = False
try:
    atomic_activate_portfolio_scenario(
        client=client,
        db_name=DISPOSABLE_DB,
        scenario_batch_id="SCENARIO-FAILURE-INJECTION-TEST",
        scenario_name="Failure Injection Test",
        scenario_docs=bad_scenario_docs
    )
except Exception as e:
    failure_caught = True
    print(f"  Successfully caught injected validation error: {e}")

assert failure_caught, "Failure injection was not caught!"

# Verify that DB state was untouched
active_runs_after_fail = list(disp_db.calculation_runs.find({'is_active': True}))
sum_after_fail = sum(r['result_value'] for r in active_runs_after_fail)
assert len(active_runs_after_fail) == 20
assert abs(sum_after_fail - 2692863.53) < 0.01
all_pf = all(r['method'] == 'product_factor' for r in active_runs_after_fail)
assert all_pf, "Method altered after transaction failure!"
print(f"  VERIFIED: After aborted transaction, active runs = {len(active_runs_after_fail)}, 100% Product-Factor, baseline intact ({sum_after_fail/1000:.5f} t CO2e).")

# ------------------------------------------------------------------------------
# TEST 2: Successful Activation of Proposed Scenario
# ------------------------------------------------------------------------------
print("\n--- TEST 2: SUCCESSFUL SCENARIO ACTIVATION ---")
act_res = atomic_activate_portfolio_scenario(
    client=client,
    db_name=DISPOSABLE_DB,
    scenario_batch_id="SCENARIO-PORTFOLIO-2026-11-09-001",
    scenario_name="Proposed Multi-Method Demonstration Portfolio (12/4/4)",
    scenario_docs=scenario_docs
)
print(f"  Activation returned: {act_res['status']}, checksum: {act_res['manifest_checksum'][:16]}...")

# Verify active runs
active_runs = list(disp_db.calculation_runs.find({'is_active': True}))
assert len(active_runs) == 20, f"Expected 20 active runs, found {len(active_runs)}"

# Verify method counts
method_counts = {}
for r in active_runs:
    method_counts[r['method']] = method_counts.get(r['method'], 0) + 1
assert method_counts == {'product_factor': 12, 'activity_based': 4, 'spend_based': 4}, f"Unexpected counts: {method_counts}"
print(f"  Method distribution: {method_counts}")

# Verify Category Breakdown
cat1_sum = sum(r['result_value'] for r in active_runs if r.get('scope3_category') != 'Category 2')
cat2_sum = sum(r['result_value'] for r in active_runs if r.get('scope3_category') == 'Category 2')
comb_sum = sum(r['result_value'] for r in active_runs)

print(f"  Category 1 Active Sum: {cat1_sum/1000:.4f} t CO2e (Target: 3421.5937 t CO2e, Delta: {cat1_sum/1000 - 3421.5937:.4f})")
print(f"  Category 2 Active Sum: {cat2_sum/1000:.4f} t CO2e (Target:    3.9598 t CO2e, Delta: {cat2_sum/1000 - 3.9598:.4f})")
print(f"  Combined Active Sum  : {comb_sum/1000:.4f} t CO2e (Target: 3425.5534 t CO2e, Delta: {comb_sum/1000 - 3425.5534:.4f})")

assert abs(cat1_sum - 3421593.66) < 1.0
assert abs(cat2_sum - 3959.78) < 0.1
assert abs(comb_sum - 3425553.44) < 1.0

# Verify total runs in collection (20 baseline + 8 new alternative = 28)
total_runs = disp_db.calculation_runs.count_documents({})
assert total_runs == 28, f"Expected 28 total runs, found {total_runs}"
print(f"  Receipt preservation: {total_runs} total receipts in database (20 original + 8 alternative).")

# Verify purchase records pointers
for r in active_runs:
    p_rec = disp_db.purchase_records.find_one({'id': r['purchase_record_id']})
    assert p_rec['active_calculation_id'] == r['id'], f"Pointer mismatch for {r['purchase_record_id']}"
    assert p_rec['active_method'] == r['method'], f"Method mismatch for {r['purchase_record_id']}"
print("  All 20 purchase record active pointers verified in perfect sync.")

# ------------------------------------------------------------------------------
# TEST 3: Idempotency Verification
# ------------------------------------------------------------------------------
print("\n--- TEST 3: IDEMPOTENT RE-ACTIVATION ---")
act_res2 = atomic_activate_portfolio_scenario(
    client=client,
    db_name=DISPOSABLE_DB,
    scenario_batch_id="SCENARIO-PORTFOLIO-2026-11-09-001",
    scenario_name="Proposed Multi-Method Demonstration Portfolio (12/4/4)",
    scenario_docs=scenario_docs
)
assert disp_db.calculation_runs.count_documents({'is_active': True}) == 20
assert disp_db.calculation_runs.count_documents({}) == 28
assert abs(sum(r['result_value'] for r in disp_db.calculation_runs.find({'is_active': True})) - 3425553.44) < 1.0
print("  Re-activation is 100% idempotent: zero duplicate calculations created, active inventory stable.")

# ------------------------------------------------------------------------------
# TEST 4: Successful Rollback to Original 20 Product-Factor Baseline
# ------------------------------------------------------------------------------
print("\n--- TEST 4: ATOMIC ROLLBACK VERIFICATION ---")
rb_res = atomic_rollback_portfolio_scenario(
    client=client,
    db_name=DISPOSABLE_DB,
    target_baseline_prefix="calc-po-"
)
print(f"  Rollback returned: {rb_res['status']}, active={rb_res['active_calculations']}, total={rb_res['total_emissions_tco2e']} t CO2e")

assert rb_res['status'] == 'ROLLED_BACK'
assert rb_res['active_calculations'] == 20
assert abs(rb_res['total_emissions_tco2e'] - 2692.86353) < 0.0001

# Verify all 20 active runs are Product-Factor
active_after_rb = list(disp_db.calculation_runs.find({'is_active': True}))
assert len(active_after_rb) == 20
assert all(r['method'] == 'product_factor' for r in active_after_rb)

# Verify Category Breakdown restored
cat1_rb = sum(r['result_value'] for r in active_after_rb if r.get('scope3_category') != 'Category 2')
cat2_rb = sum(r['result_value'] for r in active_after_rb if r.get('scope3_category') == 'Category 2')
print(f"  Restored Cat 1: {cat1_rb/1000:.5f} t CO2e (Baseline: 2688.90375 t CO2e)")
print(f"  Restored Cat 2: {cat2_rb/1000:.5f} t CO2e (Baseline: 3.95978 t CO2e)")
print(f"  Restored Total: {(cat1_rb + cat2_rb)/1000:.5f} t CO2e (Baseline: 2692.86353 t CO2e)")

assert abs(cat1_rb - 2688903.75) < 0.01
assert abs(cat2_rb - 3959.78) < 0.01

# Verify historical receipts preserved (still 28 runs in collection)
assert disp_db.calculation_runs.count_documents({}) == 28
print("  Historical receipts preserved after rollback: 28 total receipts retained.")

# Verify purchase records pointers restored to calc-po-*
for r in active_after_rb:
    p_rec = disp_db.purchase_records.find_one({'id': r['purchase_record_id']})
    assert p_rec['active_calculation_id'] == r['id']
    assert p_rec['active_method'] == 'product_factor'
    assert p_rec['active_calculation_id'].startswith('calc-po-')
print("  All 20 purchase record pointers restored to original baseline.")

# ------------------------------------------------------------------------------
# TEST 5: Repeated Activation & Rollback Cycle
# ------------------------------------------------------------------------------
print("\n--- TEST 5: REPEATED ACTIVATION & ROLLBACK CYCLE ---")
# Cycle 2: Reactivate
atomic_activate_portfolio_scenario(client, DISPOSABLE_DB, "SCENARIO-CYCLE-2", "Cycle 2 Activation", scenario_docs)
assert disp_db.calculation_runs.count_documents({'is_active': True}) == 20
assert abs(sum(r['result_value'] for r in disp_db.calculation_runs.find({'is_active': True})) - 3425553.44) < 1.0

# Cycle 2: Rollback
atomic_rollback_portfolio_scenario(client, DISPOSABLE_DB, "calc-po-")
assert disp_db.calculation_runs.count_documents({'is_active': True}) == 20
assert abs(sum(r['result_value'] for r in disp_db.calculation_runs.find({'is_active': True})) - 2692863.53) < 0.01
print("  Cycle 2 completed cleanly. Activation and Rollback are 100% repeatable and reversible.")

# ------------------------------------------------------------------------------
# CLEANUP DISPOSABLE DB
# ------------------------------------------------------------------------------
client.drop_database(DISPOSABLE_DB)
print(f"\nDropped disposable test database: '{DISPOSABLE_DB}'")

# ------------------------------------------------------------------------------
# FINAL VERIFICATION OF PRODUCTION AND QA DATABASES
# ------------------------------------------------------------------------------
print("\n--- FINAL VERIFICATION: PRODUCTION & QA IMMUTABILITY ---")
qa_active_final = list(qa_db.calculation_runs.find({'is_active': True}))
qa_sum_final = sum(r['result_value'] for r in qa_active_final)
assert len(qa_active_final) == 20
assert abs(qa_sum_final - 2692863.53) < 0.01
assert all(r['method'] == 'product_factor' for r in qa_active_final)
assert qa_db.portfolio_scenarios.count_documents({}) == 0, "QA portfolio_scenarios must be empty before Phase 2.6!"

prod_active_final = list(prod_db.calculation_runs.find({'is_active': True}))
prod_sum_final = sum(r['result_value'] for r in prod_active_final)
assert len(prod_active_final) == 20
assert abs(prod_sum_final - 2692863.53) < 0.01
assert all(r['method'] == 'product_factor' for r in prod_active_final)

print(f"QA DB '{SOURCE_QA_DB}': 20 active runs, 100% Product-Factor, {qa_sum_final/1000:.5f} t CO2e, zero mutations.")
print(f"Prod DB '{PROD_DB}': 20 active runs, 100% Product-Factor, {prod_sum_final/1000:.5f} t CO2e, zero mutations.")
print("\nALL 5 PHASE 2.6 ACTIVATION SAFETY GATE TESTS PASSED!")
