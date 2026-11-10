"""
Setup and seed the isolated scope3track_final_qa test database.
Clones necessary initial reference collections (products, factors, activity library, baseline demo users, requirements)
from scope3track into scope3track_final_qa without modifying or deleting anything in scope3track.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient
from passlib.context import CryptContext
from datetime import datetime, timezone

load_dotenv()

pwd = CryptContext(schemes=["argon2"], deprecated="auto")

def now():
    return datetime.now(timezone.utc)

def main():
    uri = os.environ.get("MONGODB_URI")
    client = MongoClient(uri)
    
    demo_db = client["scope3track"]
    qa_db = client["scope3track_final_qa"]
    
    print("[SETUP] Wiping prior test data in scope3track_final_qa (test isolation)...")
    qa_db.client.drop_database("scope3track_final_qa")
    
    print("[SETUP] Copying base collections from scope3track into scope3track_final_qa...")
    
    # 1. Manufacturer Profile
    mfg = demo_db["manufacturer"].find_one({"id": "manufacturer-1"})
    if mfg:
        mfg.pop("_id", None)
        qa_db["manufacturer"].insert_one(mfg)
    else:
        qa_db["manufacturer"].insert_one({
            "id": "manufacturer-1",
            "name": "ABC Manufacturing Ltd.",
            "contact_email": "sustainability@abcmfg.demo",
            "address": "12 Industrial Corridor, Pune, India",
            "phone": "+91-20-5550199",
            "created_at": now()
        })

    # 2. Users
    for u in demo_db["users"].find():
        doc = dict(u)
        doc.pop("_id", None)
        qa_db["users"].insert_one(doc)

    # 3. Suppliers
    for s in demo_db["suppliers"].find():
        doc = dict(s)
        doc.pop("_id", None)
        qa_db["suppliers"].insert_one(doc)

    # 4. Auditors
    for a in demo_db["auditors"].find():
        doc = dict(a)
        doc.pop("_id", None)
        qa_db["auditors"].insert_one(doc)

    # 5. Auditor assignments
    for aa in demo_db["auditor_assignments"].find():
        doc = dict(aa)
        doc.pop("_id", None)
        qa_db["auditor_assignments"].insert_one(doc)

    # 6. Products
    for p in demo_db["products"].find():
        doc = dict(p)
        doc.pop("_id", None)
        qa_db["products"].insert_one(doc)

    # 7. Activity library
    for al in demo_db["activity_library"].find():
        doc = dict(al)
        doc.pop("_id", None)
        qa_db["activity_library"].insert_one(doc)

    # 8. Emission Factors
    for ef in demo_db["emission_factors"].find():
        doc = dict(ef)
        doc.pop("_id", None)
        qa_db["emission_factors"].insert_one(doc)

    # Add spend-based factor if not already present
    if not qa_db["emission_factors"].find_one({"factor_type": "spend_based", "currency": "INR"}):
        qa_db["emission_factors"].insert_one({
            "id": "factor-spend-machinery",
            "name": "Industrial Machinery EEIO Spend Factor",
            "factor_type": "spend_based",
            "factor_value": 0.08,
            "denominator_unit": "INR",
            "currency": "INR",
            "source_name": "EXIOBASE Capital Goods EEIO",
            "demo": True,
            "version": 1,
            "created_at": now()
        })

    # 9. Supplier requirements
    for sr in demo_db["supplier_requirements"].find():
        doc = dict(sr)
        doc.pop("_id", None)
        qa_db["supplier_requirements"].insert_one(doc)

    # 10. Baseline purchase records & calculations
    for pr in demo_db["purchase_records"].find():
        doc = dict(pr)
        doc.pop("_id", None)
        qa_db["purchase_records"].insert_one(doc)

    for cr in demo_db["calculation_runs"].find():
        doc = dict(cr)
        doc.pop("_id", None)
        qa_db["calculation_runs"].insert_one(doc)

    # 11. Baseline submissions (seed only 2026-01 from demo)
    for sub in demo_db["submissions"].find({"reporting_month": "2026-01"}):
        doc = dict(sub)
        doc.pop("_id", None)
        qa_db["submissions"].insert_one(doc)

    print(f"[SETUP] Successfully initialized scope3track_final_qa!")
    print(f"  - Users: {qa_db['users'].count_documents({})}")
    print(f"  - Suppliers: {qa_db['suppliers'].count_documents({})}")
    print(f"  - Products: {qa_db['products'].count_documents({})}")
    print(f"  - Factors: {qa_db['emission_factors'].count_documents({})}")
    print(f"  - Purchases: {qa_db['purchase_records'].count_documents({})}")
    print(f"  - Calculations: {qa_db['calculation_runs'].count_documents({})}")
    print(f"  - Submissions: {qa_db['submissions'].count_documents({})}")

if __name__ == "__main__":
    main()
