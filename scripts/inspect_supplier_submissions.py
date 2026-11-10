import os
import json
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()
client = MongoClient(os.getenv("MONGODB_URI"))
db = client["scope3track_final_qa"]

suppliers = list(db["suppliers"].find({}).sort("id", 1))
print(f"Total suppliers: {len(suppliers)}")
supplier_map = {s["id"]: s["name"] for s in suppliers}

submissions = list(db["submissions"].find({}).sort([("supplier_id", 1), ("reporting_month", 1)]))
print(f"Total submissions in DB: {len(submissions)}")

for s in submissions:
    sid = s.get("supplier_id")
    sname = supplier_map.get(sid, "Unknown")
    sub_id = s.get("id")
    rm = s.get("reporting_month")
    status = s.get("status")
    activities = s.get("activities", [])
    act_ids = [a.get("activity_id") for a in activities]
    
    # Check electricity, diesel, production
    elec = next((a for a in activities if a.get("activity_id") in ("electricity", "grid_electricity")), None)
    diesel = next((a for a in activities if a.get("activity_id") in ("diesel", "diesel_fuel")), None)
    prod = next((a for a in activities if a.get("activity_id") in ("production", "production_volume")), None)
    
    ev_docs = list(db["evidence_documents"].find({"submission_id": sub_id}))
    ev_ids_in_doc = s.get("evidence_ids", [])
    
    is_synth = s.get("is_synthetic")
    classif = s.get("data_classification")
    source_origin = s.get("source_origin") or s.get("upload_source") or s.get("notes") or s.get("metadata", {})
    
    print("-" * 60)
    print(f"Sub ID: {sub_id} | Sup: {sid} ({sname}) | Period: {rm} | Status: {status}")
    print(f"  Activities ({len(activities)}): {act_ids}")
    print(f"  Elec: {elec['value'] if elec else 'MISSING'} {elec['unit'] if elec else ''} | Diesel: {diesel['value'] if diesel else 'MISSING'} {diesel['unit'] if diesel else ''} | Prod: {prod['value'] if prod else 'MISSING'} {prod['unit'] if prod else ''}")
    print(f"  Evidence Docs: {len(ev_docs)} docs in coll, {len(ev_ids_in_doc)} IDs in sub")
    print(f"  Synthetic: {is_synth} | Classification: {classif}")
    print(f"  Raw Metadata / Origin: {source_origin}")
