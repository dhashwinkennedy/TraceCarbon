import os
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient

root_dir = Path(__file__).resolve().parents[2]
load_dotenv(root_dir / ".env")

uri = os.environ.get("MONGODB_URI")
client = MongoClient(uri)
db = client["scope3track_final_qa"]
subs = list(db["submissions"].find({"reporting_month": {"$in": ["2026-08", "2026-10", "2027-01", "2027-06"]}}))
sub_ids = [s["id"] for s in subs]
db["evidence_documents"].delete_many({"submission_id": {"$in": sub_ids}})
res = db["submissions"].delete_many({"reporting_month": {"$in": ["2026-08", "2026-10", "2027-01", "2027-06"]}})
print(f"Cleaned {res.deleted_count} submissions and related evidence from scope3track_final_qa")
