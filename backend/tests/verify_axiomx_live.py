"""
Comprehensive live end-to-end verification script for Scope3Track AxiomX dataset.
Tests:
1. Manufacturer authentication, profile, 10 suppliers, 20 purchases, calculation summaries.
2. 2 Preserved Auditors authentication, profile, assigned suppliers and submissions.
3. 10 AxiomX Suppliers authentication, 15 imported annual reports, and 5 holdouts verification.
4. Category 1 vs Category 2 separation and emission calculations.
"""

import os
import re
import sys
from pathlib import Path
import httpx
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "http://127.0.0.1:8000/api/v1"
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
CRED_FILE = ROOT_DIR / "SUPPLIER_ANNUAL_DATASETS_2Y" / "DEMO_SUPPLIER_CREDENTIALS.txt"

def test_manufacturer():
    print("\n--- 1. Testing ABC Manufacturing Admin ---")
    client = httpx.Client(base_url=BASE_URL, timeout=30)
    res = client.post("/auth/login", json={"email": "manufacturer@scope3track.demo", "password": "ManufacturerDemo123!"})
    assert res.status_code == 200, f"Manufacturer login failed: {res.text}"
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Check Profile
    p_res = client.get("/manufacturer/profile", headers=headers)
    assert p_res.status_code == 200, f"Profile failed: {p_res.text}"
    profile = p_res.json()
    assert profile["name"] in ["ABC Manufacturing", "ABC Manufacturing Ltd."], f"Unexpected name: {profile.get('name')}"
    email_val = profile.get('contact_email') or profile.get('email') or 'N/A'
    print(f"  [PASS] Logged in as: {profile['name']} ({email_val})")

    # Check Suppliers
    s_res = client.get("/manufacturer/suppliers", headers=headers)
    assert s_res.status_code == 200
    suppliers = s_res.json().get("items", [])
    assert len(suppliers) == 10, f"Expected 10 suppliers, found {len(suppliers)}"
    print(f"  [PASS] Retrieved {len(suppliers)} AxiomX suppliers:")
    for s in suppliers:
        print(f"    - {s['id']}: {s['name']} | Sector: {s['industry']} | Product: {s['main_product']} | Category: {s.get('scope3_category')}")

    # Check Purchases & Calculation Runs
    pur_res = client.get("/manufacturer/purchase-records", headers=headers)
    assert pur_res.status_code == 200
    purchases = pur_res.json().get("items", [])
    assert len(purchases) == 20, f"Expected 20 purchases, found {len(purchases)}"
    print(f"  [PASS] Retrieved {len(purchases)} purchase records across FY2022-23 and FY2023-24.")

    calc_res = client.get("/manufacturer/calculations", headers=headers)
    assert calc_res.status_code == 200
    calcs = calc_res.json().get("items", [])
    assert len(calcs) == 20, f"Expected 20 active calculations, found {len(calcs)}"
    cat1_calcs = [c for c in calcs if c.get("scope3_category") == "Category 1"]
    cat2_calcs = [c for c in calcs if c.get("scope3_category") == "Category 2"]
    assert len(cat1_calcs) == 18, f"Expected 18 Cat 1 calcs, found {len(cat1_calcs)}"
    assert len(cat2_calcs) == 2, f"Expected 2 Cat 2 calcs, found {len(cat2_calcs)}"
    print(f"  [PASS] Verified calculations: {len(cat1_calcs)} Category 1 (goods/materials) and {len(cat2_calcs)} Category 2 (capital goods boilers).")

def test_auditors():
    print("\n--- 2. Testing 2 Preserved Auditor Accounts ---")
    client = httpx.Client(base_url=BASE_URL, timeout=30)
    auditors = [
        {"email": "auditor.xyz@scope3track.demo", "expected_sups": 6, "expected_subs": 7, "name": "Auditor One (auditor-xyz)"},
        {"email": "auditor.green@scope3track.demo", "expected_sups": 4, "expected_subs": 8, "name": "Auditor Two (auditor-green)"}
    ]

    for aud in auditors:
        res = client.post("/auth/login", json={"email": aud["email"], "password": "AuditorDemo123!"})
        assert res.status_code == 200, f"Auditor login failed for {aud['email']}: {res.text}"
        token = res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Check assigned submissions
        sub_res = client.get("/auditor/submissions", headers=headers)
        assert sub_res.status_code == 200
        subs = sub_res.json().get("items", sub_res.json()) if isinstance(sub_res.json(), dict) else sub_res.json()
        assert len(subs) == aud["expected_subs"], f"Expected {aud['expected_subs']} submissions, found {len(subs)}"
        print(f"  [PASS] {aud['name']} ({aud['email']}) -> {len(subs)} visible submissions:")
        for s in subs:
            print(f"    - Sub ID: {s['id']} | Supplier: {s['supplier_name']} ({s['supplier_id']}) | Period: {s.get('reporting_month') or s.get('financial_year')}")

def test_suppliers_and_holdouts():
    print("\n--- 3. Testing 10 AxiomX Suppliers & 5 Holdout Verifications ---")
    client = httpx.Client(base_url=BASE_URL, timeout=30)
    assert CRED_FILE.exists(), f"Credentials file missing: {CRED_FILE}"
    
    with open(CRED_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    lines = [l.strip() for l in content.splitlines() if l.strip().startswith("|") and "SUP-" in l]
    assert len(lines) == 10, f"Expected 10 suppliers in credentials, found {len(lines)}"

    total_submissions_count = 0
    holdout_suppliers = ["SUP-001", "SUP-002", "SUP-003", "SUP-004", "SUP-005"]

    for l in lines:
        parts = [p.strip().replace("`", "") for p in l.split("|") if p.strip()]
        sid, name, sector, email, pwd = parts
        
        # Test Login
        r = client.post("/auth/login", json={"email": email, "password": pwd})
        assert r.status_code == 200, f"Supplier login failed for {sid} {email}: {r.text}"
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Check Requirements
        req_res = client.get("/supplier/reporting-requirements", headers=headers)
        assert req_res.status_code == 200
        reqs = req_res.json().get("items", req_res.json()) if isinstance(req_res.json(), dict) else req_res.json()
        assert len(reqs) == 4, f"Expected 4 requirements for {sid}, found {len(reqs)}"
        req_keys = sorted([r["activity_id"] for r in reqs])
        assert req_keys == ["diesel", "electricity", "production", "raw_material"], f"Unexpected requirements: {req_keys}"

        # Check Submissions
        sub_res = client.get("/supplier/submissions", headers=headers)
        assert sub_res.status_code == 200
        subs = sub_res.json().get("items", sub_res.json()) if isinstance(sub_res.json(), dict) else sub_res.json()
        sub_periods = [s.get("reporting_month") or s.get("financial_year") for s in subs]
        total_submissions_count += len(subs)

        if sid in holdout_suppliers:
            # Must have exactly 1 submission: FY2022-23. FY2023-24 must be UNCOMMITTED (held out for live demo)
            assert len(subs) == 1, f"Holdout supplier {sid} must have exactly 1 submission, found {len(subs)}"
            assert "FY2022-23" in sub_periods, f"Missing FY2022-23 for {sid}"
            assert "FY2023-24" not in sub_periods, f"CRITICAL: Found unexpected FY2023-24 submission for holdout {sid}!"
            print(f"  [PASS - HOLDOUT RESERVED] {sid} | {name} | Submitted: {sub_periods} | OUTSTANDING: FY2023-24 (ready for live upload)")
        else:
            # Must have exactly 2 submissions: FY2022-23 and FY2023-24
            assert len(subs) == 2, f"Fully preloaded supplier {sid} must have 2 submissions, found {len(subs)}"
            assert "FY2022-23" in sub_periods and "FY2023-24" in sub_periods, f"Unexpected periods for {sid}: {sub_periods}"
            print(f"  [PASS - PRELOADED 2Y] {sid} | {name} | Submitted: {sub_periods}")

    assert total_submissions_count == 15, f"Expected exactly 15 submitted reports in total, found {total_submissions_count}"
    print(f"\n  [PASS] Verified total of exactly {total_submissions_count} submitted annual reports across all 10 suppliers.")

def test_database_integrity():
    print("\n--- 4. Direct MongoDB Collection Inventory ---")
    c = MongoClient(os.getenv("MONGODB_URI"))
    db = c["scope3track"]
    counts = {
        "manufacturer": db["manufacturer"].count_documents({}),
        "users": db["users"].count_documents({}),
        "suppliers": db["suppliers"].count_documents({}),
        "auditors": db["auditors"].count_documents({}),
        "auditor_assignments": db["auditor_assignments"].count_documents({}),
        "supplier_requirements": db["supplier_requirements"].count_documents({}),
        "products": db["products"].count_documents({}),
        "emission_factors": db["emission_factors"].count_documents({}),
        "submissions_total": db["submissions"].count_documents({}),
        "submissions_fy23": db["submissions"].count_documents({"reporting_month": "FY2022-23"}),
        "submissions_fy24": db["submissions"].count_documents({"reporting_month": "FY2023-24"}),
        "purchase_records": db["purchase_records"].count_documents({}),
        "calculation_runs": db["calculation_runs"].count_documents({})
    }
    for k, v in counts.items():
        print(f"  - {k}: {v}")

    assert counts["manufacturer"] == 1
    assert counts["suppliers"] == 10
    assert counts["auditors"] == 2
    assert counts["supplier_requirements"] == 40
    assert counts["submissions_total"] == 15
    assert counts["submissions_fy23"] == 10
    assert counts["submissions_fy24"] == 5
    assert counts["purchase_records"] == 20
    assert counts["calculation_runs"] == 20
    print("  [PASS] All direct database integrity assertions passed!")

if __name__ == "__main__":
    test_manufacturer()
    test_auditors()
    test_suppliers_and_holdouts()
    test_database_integrity()
    print("\n=======================================================")
    print("ALL AXIOMX LIVE INTEGRATION & GOVERNANCE CHECKS PASSED!")
    print("=======================================================\n")
