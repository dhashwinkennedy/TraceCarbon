import os
from dotenv import load_dotenv
from pymongo import MongoClient
import httpx

load_dotenv()
client = MongoClient(os.getenv("MONGODB_URI"))
db = client["scope3track_final_qa"]

suppliers = list(db["suppliers"].find({}).sort("id", 1))
print("=" * 80)
print("INVENTORY OF ALL SUPPLIERS AND ANNUAL SUBMISSIONS")
print("=" * 80)

# Check all submissions
all_subs = list(db["submissions"].find({}))
print(f"Total submission records in collection: {len(all_subs)}")

# Check if there are any monthly records (e.g. reporting_period_type == 'MONTHLY' or reporting_month matching YYYY-MM)
monthly_records = [s for s in all_subs if s.get("reporting_period_type") == "MONTHLY" or (s.get("reporting_month") and "-" in s.get("reporting_month") and len(s.get("reporting_month")) == 7 and s.get("reporting_month")[:4].isdigit())]
print(f"Monthly records found: {len(monthly_records)}")

# Check drafts
draft_records = [s for s in all_subs if s.get("status") == "draft"]
print(f"Draft records found: {len(draft_records)}")

# Group by supplier
subs_by_sup = {}
for s in all_subs:
    sid = s.get("supplier_id")
    if sid not in subs_by_sup:
        subs_by_sup[sid] = []
    subs_by_sup[sid].append(s)

print("\nSUPPLIER SUBMISSION MATRIX:")
matrix = []
for sup in suppliers:
    sid = sup["id"]
    sname = sup["name"]
    sup_subs = subs_by_sup.get(sid, [])
    
    sub_fy22 = next((s for s in sup_subs if s.get("reporting_month") == "FY2022-23" or s.get("financial_year") == "FY2022-23"), None)
    sub_fy23 = next((s for s in sup_subs if s.get("reporting_month") == "FY2023-24" or s.get("financial_year") == "FY2023-24"), None)
    
    matrix.append({
        "supplier_id": sid,
        "supplier_name": sname,
        "fy22": sub_fy22,
        "fy23": sub_fy23,
    })

print(f"{'Supplier ID':<12} | {'Supplier Name':<30} | {'FY2022-23 ID':<30} | {'FY2023-24 ID':<36} | {'Status FY22/23'}")
print("-" * 125)
for m in matrix:
    fy22_id = m['fy22']['id'] if m['fy22'] else "MISSING"
    fy23_id = m['fy23']['id'] if m['fy23'] else "MISSING"
    fy22_st = m['fy22']['status'] if m['fy22'] else "—"
    fy23_st = m['fy23']['status'] if m['fy23'] else "—"
    print(f"{m['supplier_id']:<12} | {m['supplier_name']:<30} | {fy22_id:<30} | {fy23_id:<36} | {fy22_st} / {fy23_st}")

# Identify 3 manually uploaded reports
manual_uploads = [s for s in all_subs if s.get("submission_method") == "SPREADSHEET_UPLOAD" or len(s.get("id", "")) == 36]
print("\nMANUALLY UPLOADED REPORTS (Phase 2.4):")
for u in manual_uploads:
    print(f"ID: {u['id']} | Sup: {u['supplier_id']} | Period: {u['reporting_month']} | Method: {u.get('submission_method')} | Submitted At: {u.get('submitted_at')}")
