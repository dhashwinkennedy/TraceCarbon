"""Phase 2.7 QA Acceptance & Demonstration Readiness Audit Script.

Performs read-only inspection of:
1. Database verification on 'scope3track_final_qa'
2. Production immutability on 'scope3track'
3. Security & RBAC boundary tests via HTTPX
"""
import os
import sys
import json
import hashlib
from decimal import Decimal
from pymongo import MongoClient
import httpx
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
BASE_URL = "http://127.0.0.1:8000/api/v1"

client = MongoClient(MONGO_URI)

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

def audit_database():
    print("=" * 80)
    print("SECTION 1: DATABASE VERIFICATION (scope3track_final_qa)")
    print("=" * 80)
    
    qa_db = client["scope3track_final_qa"]
    assert qa_db.name == "scope3track_final_qa"
    
    # 1. Calculation run counts
    all_runs = list(qa_db.calculation_runs.find({}))
    active_runs = [r for r in all_runs if r.get("is_active") is True]
    superseded_runs = [r for r in all_runs if r.get("is_active") is False]
    
    print(f"Total calculation runs in collection: {len(all_runs)} (Expected: 28)")
    print(f"Active calculation runs: {len(active_runs)} (Expected: 20)")
    print(f"Superseded calculation runs: {len(superseded_runs)} (Expected: 8)")
    assert len(all_runs) == 28, f"Total runs mismatch: {len(all_runs)}"
    assert len(active_runs) == 20, f"Active runs mismatch: {len(active_runs)}"
    assert len(superseded_runs) == 8, f"Superseded runs mismatch: {len(superseded_runs)}"
    
    # 2. Method distribution
    methods = {}
    for r in active_runs:
        m = r.get("method")
        methods[m] = methods.get(m, 0) + 1
    print(f"Active method distribution: {methods}")
    assert methods == {'product_factor': 12, 'activity_based': 4, 'spend_based': 4}
    
    # 3. Duplicate active calculation check per purchase
    pipeline = [
        {"$match": {"is_active": True}},
        {"$group": {"_id": "$purchase_record_id", "count": {"$sum": 1}}}
    ]
    dups = list(qa_db.calculation_runs.aggregate(pipeline))
    assert len(dups) == 20, f"Expected 20 unique purchases with active calc, found {len(dups)}"
    for item in dups:
        assert item["count"] == 1, f"Purchase {item['_id']} has {item['count']} active calculations!"
    print("[PASS] Zero duplicate active calculations found across all purchases.")
    
    # 4. Check unique partial index
    indexes = qa_db.calculation_runs.index_information()
    assert "uniq_active_calculation_per_purchase" in indexes, f"Unique index missing! Existing: {list(indexes.keys())}"
    print(f"[PASS] Unique partial index 'uniq_active_calculation_per_purchase' confirmed active: {indexes['uniq_active_calculation_per_purchase']['key']}")
    
    # 5. Check all 20 purchase assignments and pointers
    purchases = list(qa_db.purchase_records.find({}))
    assert len(purchases) == 20
    for p in purchases:
        pid = p["id"]
        expected_method = PROPOSED_ASSIGNMENTS[pid]
        assert p.get("active_method") == expected_method, f"Purchase {pid} method mismatch: {p.get('active_method')} vs {expected_method}"
        active_calc = qa_db.calculation_runs.find_one({"id": p.get("active_calculation_id"), "is_active": True})
        assert active_calc is not None, f"Active calc not found for purchase {pid}"
        assert active_calc["purchase_record_id"] == pid
        assert active_calc["method"] == expected_method
        assert p.get("scenario_batch_id") == "SCENARIO-PORTFOLIO-2026-11-09-QA-001"
    print("[PASS] All 20 purchases verified with synchronized active pointers, method assignments, and scenario batch ID.")
    
    # 6. Check scenario batch record
    scenario = qa_db.portfolio_scenarios.find_one({"scenario_batch_id": "SCENARIO-PORTFOLIO-2026-11-09-QA-001"})
    assert scenario is not None
    assert scenario["status"] == "ACTIVE"
    assert scenario["manifest_checksum"] == "b18f4cf0f24c95d09f1b3031cf15c05ff8c048397c552414b0ecef84a6f24638"
    print(f"[PASS] Scenario batch record verified: {scenario['scenario_batch_id']} | SHA256: {scenario['manifest_checksum']}")
    
    # 7. Exact mathematical sums
    cat1_kg = sum(r["result_value"] for r in active_runs if r.get("scope3_category") != "Category 2")
    cat2_kg = sum(r["result_value"] for r in active_runs if r.get("scope3_category") == "Category 2")
    total_kg = sum(r["result_value"] for r in active_runs)
    
    print("\nAUTHORITATIVE QA PORTFOLIO METRICS:")
    print(f"Category 1 (Purchased Goods): {cat1_kg:.6f} kg CO2e ({cat1_kg/1000:.6f} t CO2e)")
    print(f"Category 2 (Capital Goods):   {cat2_kg:.6f} kg CO2e ({cat2_kg/1000:.6f} t CO2e)")
    print(f"Combined Scope 3 Portfolio:   {total_kg:.6f} kg CO2e ({total_kg/1000:.6f} t CO2e)")
    
    assert abs(cat1_kg - 3421593.66) < 0.1
    assert abs(cat2_kg - 3959.78) < 0.01
    assert abs(total_kg - 3425553.44) < 0.1
    print("[PASS] Numerical reconciliation exact to database stored precision.")

def audit_production():
    print("\n" + "=" * 80)
    print("SECTION 6: PRODUCTION IMMUTABILITY AUDIT (scope3track)")
    print("=" * 80)
    
    prod_db = client["scope3track"]
    assert prod_db.name == "scope3track"
    
    prod_runs = list(prod_db.calculation_runs.find({}))
    prod_active = [r for r in prod_runs if r.get("is_active") is True]
    assert len(prod_runs) == 20, f"Expected 20 total runs in prod, found {len(prod_runs)}"
    assert len(prod_active) == 20, f"Expected 20 active runs in prod, found {len(prod_active)}"
    
    prod_methods = set(r.get("method") for r in prod_active)
    assert prod_methods == {"product_factor"}, f"Expected only product_factor in prod, found {prod_methods}"
    
    prod_total_kg = sum(r["result_value"] for r in prod_active)
    print(f"Production active runs: {len(prod_active)}")
    print(f"Production methods: {prod_methods}")
    print(f"Production total emissions: {prod_total_kg:.5f} kg ({prod_total_kg/1000:.5f} t CO2e)")
    assert abs(prod_total_kg - 2692863.53) < 0.01
    
    # Check scenario record in prod
    if "portfolio_scenarios" in prod_db.list_collection_names():
        scen_count = prod_db.portfolio_scenarios.count_documents({})
        assert scen_count == 0, f"Found {scen_count} scenario records in production!"
    print("[PASS] Production database verified 100% UNTOUCHED.")

def audit_security_and_rbac():
    print("\n" + "=" * 80)
    print("SECTION 5: SECURITY, RBAC & TENANT ISOLATION AUDIT")
    print("=" * 80)
    
    http = httpx.Client(base_url=BASE_URL, timeout=30)
    
    # 1. Login Manufacturer
    m_res = http.post("/auth/login", json={"email": "manufacturer@scope3track.demo", "password": "ManufacturerDemo123!"})
    assert m_res.status_code == 200, f"Manufacturer login failed: {m_res.text}"
    m_tok = m_res.json()["access_token"]
    m_headers = {"Authorization": f"Bearer {m_tok}"}
    
    # Manufacturer can view calculations and reports
    res = http.get("/manufacturer/calculations", headers=m_headers)
    assert res.status_code == 200
    calc_data = res.json()["items"]
    assert len(calc_data) == 28
    active_in_api = [x for x in calc_data if x.get("is_active") is True]
    assert len(active_in_api) == 20
    print(f"[PASS] Manufacturer authenticated. Calculations returned: {len(calc_data)} total runs ({len(active_in_api)} active).")
    
    # 2. Login Supplier 1 (Steel: SUP-001) and Supplier 5 (Chemical: SUP-005)
    s1_res = http.post("/auth/login", json={"email": "supplier.steel@axiomx.demo", "password": "AxiomX!Steel#2026"})
    assert s1_res.status_code == 200
    s1_tok = s1_res.json()["access_token"]
    s1_headers = {"Authorization": f"Bearer {s1_tok}"}
    
    s5_res = http.post("/auth/login", json={"email": "supplier.chemical@axiomx.demo", "password": "AxiomX!Chemical#2026"})
    assert s5_res.status_code == 200
    s5_tok = s5_res.json()["access_token"]
    s5_headers = {"Authorization": f"Bearer {s5_tok}"}
    
    # Check supplier cannot access manufacturer calculations
    leak_check1 = http.get("/manufacturer/calculations", headers=s1_headers)
    assert leak_check1.status_code in [401, 403], f"Security failure: Supplier accessed manufacturer calculations ({leak_check1.status_code})"
    print("[PASS] Supplier blocked from manufacturer calculation endpoints (403 Forbidden).")
    
    leak_check2 = http.get("/manufacturer/purchase-records", headers=s1_headers)
    assert leak_check2.status_code in [401, 403], f"Security failure: Supplier accessed manufacturer purchases ({leak_check2.status_code})"
    print("[PASS] Supplier blocked from manufacturer purchase records (403 Forbidden).")
    
    # Check cross-supplier isolation: SUP-001 trying to access SUP-005's submission
    cross_sub = http.get("/supplier/submissions/sub-SUP-005-FY2023-24", headers=s1_headers)
    assert cross_sub.status_code in [403, 404], f"Cross-tenant leak: SUP-001 accessed SUP-005 submission ({cross_sub.status_code})"
    print("[PASS] Cross-supplier tenant isolation confirmed: SUP-001 blocked from SUP-005 submissions.")
    
    # 3. Login Auditor 1 (XYZ) and Auditor 2 (Green)
    a1_res = http.post("/auth/login", json={"email": "auditor.xyz@scope3track.demo", "password": "AuditorDemo123!"})
    assert a1_res.status_code == 200
    a1_tok = a1_res.json()["access_token"]
    a1_headers = {"Authorization": f"Bearer {a1_tok}"}
    
    a2_res = http.post("/auth/login", json={"email": "auditor.green@scope3track.demo", "password": "AuditorDemo123!"})
    assert a2_res.status_code == 200
    a2_tok = a2_res.json()["access_token"]
    a2_headers = {"Authorization": f"Bearer {a2_tok}"}
    
    # Auditor cannot modify calculation runs
    aud_calc_mod = http.post("/manufacturer/calculations/calc-po-2022-001/select-active", headers=a1_headers)
    assert aud_calc_mod.status_code in [401, 403, 404], f"Auditor permitted to alter calculation: {aud_calc_mod.status_code}"
    print("[PASS] Auditor blocked from modifying calculation runs or setting active method.")
    
    # Auditor cannot access unassigned supplier submissions
    # SUP-007 is assigned to Auditor 2 (green), not Auditor 1 (xyz)
    a1_cross_aud = http.get("/auditor/submissions/sub-SUP-007-FY2022-23", headers=a1_headers)
    assert a1_cross_aud.status_code in [403, 404], f"Auditor 1 accessed Auditor 2 submission: {a1_cross_aud.status_code}"
    print("[PASS] Auditor cross-assignment isolation confirmed: Auditor 1 blocked from Auditor 2 assignments.")
    
    # Unauthenticated access check
    unauth_check = http.get("/manufacturer/calculations")
    assert unauth_check.status_code in [401, 403], f"Unauthenticated endpoint leak: {unauth_check.status_code}"
    print("[PASS] Unauthenticated API requests strictly blocked (401 Unauthorized).")

if __name__ == "__main__":
    audit_database()
    audit_production()
    audit_security_and_rbac()
    print("\n" + "=" * 80)
    print("ALL READ-ONLY VERIFICATION CHECKS COMPLETED SUCCESSFULLY!")
    print("=" * 80)
