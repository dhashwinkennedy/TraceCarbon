"""Tests low-level transaction abort during MongoDB session."""
from dotenv import load_dotenv
import os, pymongo
from pymongo.errors import PyMongoError
from backend.app.calculation_safety import create_calculation_safety_indexes

load_dotenv()
client = pymongo.MongoClient(os.getenv('MONGODB_URI'))
DB_NAME = 'scope3track_tx_abort_test'

client.drop_database(DB_NAME)
db = client[DB_NAME]

# Clone 20 calculation runs from QA
qa_db = client['scope3track_final_qa']
docs = list(qa_db.calculation_runs.find())
db.calculation_runs.insert_many(docs)
create_calculation_safety_indexes(db)

print(f"Pre-test active runs: {db.calculation_runs.count_documents({'is_active': True})}")
assert db.calculation_runs.count_documents({'is_active': True}) == 20

# Run a transaction that mutates 5 items, then raises an exception on item 6
aborted = False
try:
    with client.start_session() as session:
        with session.start_transaction():
            for i in range(10):
                pid = f"PO-2022-{i+1:03d}"
                # Deactivate
                db.calculation_runs.update_many({"purchase_record_id": pid}, {"$set": {"is_active": False}}, session=session)
                if i == 5:
                    raise RuntimeError("Simulated transient network drop / server crash on item 6!")
except RuntimeError as e:
    aborted = True
    print(f"Caught simulated crash: {e}")

assert aborted is True
# Verify all 20 runs are STILL active
post_active = db.calculation_runs.count_documents({'is_active': True})
print(f"Post-abort active runs: {post_active}")
assert post_active == 20, f"Transaction did not abort cleanly! Found {post_active} active runs"

client.drop_database(DB_NAME)
print("Low-level transaction abort test: PASSED (100% clean rollback).")
