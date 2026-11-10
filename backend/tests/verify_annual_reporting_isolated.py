"""
Independent verification for Scope3Track Annual Reporting integrity.
Tests:
1. Audits all 15 imported annual reports (10 FY22-23, 5 FY23-24).
2. Verifies 5 outstanding FY2023-24 reporting periods (Holdout suppliers).
3. Verifies deduplication and 409 Conflict protection against duplicate period creation.
4. Preserves database state with zero mutations.
"""

import os
import sys
import httpx
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "http://127.0.0.1:8000/api/v1"
client = httpx.Client(base_url=BASE_URL, timeout=30)
mongo_client = MongoClient(os.getenv("MONGODB_URI"))
db = mongo_client[os.getenv("MONGODB_DB", "scope3track")]

def verify_annual_reports():
    print("\n=======================================================")
    print("STARTING ANNUAL REPORTING AUDIT & DEDUPLICATION VERIFICATION")
    print("=======================================================")

    # 1. Direct MongoDB Query
    subs = list(db["submissions"].find({"reporting_period_type": "ANNUAL"}))
    assert len(subs) == 15, f"Expected 15 annual submissions, found {len(subs)}"
    print(f"  [PASS] Retrieved exactly 15 annual submissions from database.")

    fy23_subs = [s for s in subs if s.get("financial_year") == "FY2022-23" or s.get("reporting_month") == "FY2022-23"]
    fy24_subs = [s for s in subs if s.get("financial_year") == "FY2023-24" or s.get("reporting_month") == "FY2023-24"]
    assert len(fy23_subs) == 10, f"Expected 10 FY23 reports, found {len(fy23_subs)}"
    assert len(fy24_subs) == 5, f"Expected 5 FY24 reports, found {len(fy24_subs)}"
    print(f"  [PASS] Distribution: 10 in FY2022-23 and 5 in FY2023-24.")

    # 2. Activity Data Integrity
    for s in subs:
        sid = s["id"]
        sup_id = s["supplier_id"]
        fy = s.get("financial_year") or s.get("reporting_month")
        acts = s.get("activities", [])
        assert len(acts) == 4, f"Submission {sid} has {len(acts)} activities, expected 4"
        act_ids = sorted([a["activity_id"] for a in acts])
        assert act_ids == ["diesel", "electricity", "production", "raw_material"], f"Missing activities in {sid}: {act_ids}"
        for a in acts:
            assert isinstance(a["value"], (int, float)) and a["value"] > 0, f"Invalid value in {sid} {a['activity_id']}: {a['value']}"
        assert s.get("status") == "submitted", f"Submission {sid} status is {s.get('status')}"
        assert s.get("is_synthetic") is True
        assert s.get("source_workbook") is not None
    print(f"  [PASS] All 15 submissions contain 4 valid positive activities and workbook source lineage.")

    # 3. Verify the 5 Holdout Suppliers have NO FY2023-24 Submission
    holdout_suppliers = ["SUP-001", "SUP-002", "SUP-003", "SUP-004", "SUP-005"]
    for hid in holdout_suppliers:
        sub_fy24 = db["submissions"].find_one({
            "supplier_id": hid,
            "$or": [{"financial_year": "FY2023-24"}, {"reporting_month": "FY2023-24"}]
        })
        assert sub_fy24 is None, f"VIOLATION: Holdout supplier {hid} has unexpected FY2023-24 submission!"
        print(f"  [PASS - OUTSTANDING] {hid} FY2023-24 is uncommitted and available for live upload demo.")

    # 4. Deduplication & Conflict Protection
    # Attempt to create duplicate FY2022-23 report for SUP-001 (already submitted)
    sup_login = client.post("/auth/login", json={"email": "supplier.steel@axiomx.demo", "password": "AxiomX!Steel#2026"})
    assert sup_login.status_code == 200
    token = sup_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    dup_res = client.post(
        "/supplier/submissions",
        json={"reporting_month": "FY2022-23", "reporting_period_type": "ANNUAL", "financial_year": "FY2022-23"},
        headers=headers
    )
    assert dup_res.status_code == 409, f"Expected 409 Conflict on duplicate annual period, got {dup_res.status_code}: {dup_res.text}"
    print(f"  [PASS] Deduplication Protection: Attempt to recreate existing annual report returned HTTP 409 Conflict.")

if __name__ == "__main__":
    verify_annual_reports()
    print("\n=======================================================")
    print("ALL ANNUAL REPORTING INTEGRITY CHECKS PASSED!")
    print("=======================================================\n")
