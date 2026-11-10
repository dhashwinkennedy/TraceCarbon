import os
import json
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()
client = MongoClient(os.getenv("MONGODB_URI"))
db = client["scope3track_final_qa"]

suppliers = list(db["suppliers"].find({}).sort("id", 1))

reports = []
for sup in suppliers:
    sid = sup["id"]
    sname = sup["name"]
    
    for fy in ["FY2022-23", "FY2023-24"]:
        sub = db["submissions"].find_one({"supplier_id": sid, "$or": [{"reporting_month": fy}, {"financial_year": fy}]})
        if sub:
            activities = sub.get("activities", [])
            elec = next((a for a in activities if a.get("activity_id") in ("electricity", "grid_electricity")), None)
            diesel = next((a for a in activities if a.get("activity_id") in ("diesel", "diesel_fuel")), None)
            prod = next((a for a in activities if a.get("activity_id") in ("production", "production_volume")), None)
            raw = next((a for a in activities if a.get("activity_id") in ("raw_material", "raw_material_consumption")), None)
            
            ev_count = sub.get("evidence_count", 0)
            is_synth = sub.get("is_synthetic", False) or sub.get("demo", False)
            data_class = sub.get("data_classification", "Unclassified")
            method = sub.get("submission_method", "PRELOADED_DEMO" if "sub-SUP" in sub["id"] else "SPREADSHEET_UPLOAD")
            
            reports.append({
                "supplier_id": sid,
                "supplier_name": sname,
                "financial_year": fy,
                "exists": True,
                "id": sub["id"],
                "status": sub.get("status"),
                "method": method,
                "elec_val": f"{elec['value']:,.0f} {elec['unit']}" if elec else "None",
                "diesel_val": f"{diesel['value']:,.0f} {diesel['unit']}" if diesel else "None",
                "prod_val": f"{prod['value']:,.0f} {prod['unit']}" if prod else "None",
                "raw_val": f"{raw['value']:,.0f} {raw['unit']}" if raw else "None",
                "evidence_attached": ev_count > 0,
                "evidence_count": ev_count,
                "is_synthetic": is_synth,
                "data_classification": data_class,
                "source_workbook": sub.get("source_workbook", "Spreadsheet Upload"),
            })
        else:
            reports.append({
                "supplier_id": sid,
                "supplier_name": sname,
                "financial_year": fy,
                "exists": False,
                "id": "NOT_IN_DATABASE",
                "status": "NOT_SUBMITTED (Holdout)",
                "method": "None",
                "elec_val": "None",
                "diesel_val": "None",
                "prod_val": "None",
                "raw_val": "None",
                "evidence_attached": False,
                "evidence_count": 0,
                "is_synthetic": True,
                "data_classification": "HOLD_OUT",
                "source_workbook": f"AxiomX_{sname.split()[1]}_{fy}.xlsx (in HOLDOUT_5)",
            })

with open("inventory_audit_data.json", "w") as f:
    json.dump(reports, f, indent=2, default=str)

print(f"Exported audit data for {len(reports)} supplier/year combinations.")
