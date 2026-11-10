"""Setup and teardown fixtures for Category 2 E2E Playwright test."""
import sys
import os
import pymongo
from dotenv import load_dotenv

load_dotenv()
client = pymongo.MongoClient(os.environ["MONGODB_URI"])
db = client["scope3track_e2e_test"]

ACTION = sys.argv[1] if len(sys.argv) > 1 else "setup"

PURCHASE_ID = "purchase-cat2-machinery-e2e"
FACTOR_ID = "factor-machinery-demo"

if ACTION == "setup":
    # 1. Ensure factor exists
    db["emission_factors"].update_one(
        {"id": FACTOR_ID},
        {"$set": {
            "id": FACTOR_ID,
            "name": "DEMO capital machinery equipment factor — illustrative",
            "factor_type": "product_factor",
            "factor_value": 12500.0,
            "denominator_unit": "unit",
            "source_name": "DEMO synthetic illustrative data; not an official source",
            "demo": True,
            "version": 1
        }},
        upsert=True
    )
    # 2. Insert purchase record for acquisition month 2026-05
    db["purchase_records"].update_one(
        {"id": PURCHASE_ID},
        {"$set": {
            "id": PURCHASE_ID,
            "supplier_id": "supplier-xyz",
            "product_id": "product-machine",
            "reporting_month": "2026-05",
            "purchased_quantity": 2.0,
            "quantity_unit": "unit",
            "purchase_expenditure": 5000000.0,
            "currency": "INR",
            "fingerprint": "fp-cat2-machinery-e2e",
            "demo": True,
            "calculated": False,
            "created_at": "2026-05-10T10:00:00Z"
        }},
        upsert=True
    )
    # Remove any existing calculation for this purchase
    db["calculation_runs"].delete_many({"purchase_record_id": PURCHASE_ID})
    print("FIXTURE_SETUP_DONE")

elif ACTION == "teardown":
    db["calculation_runs"].delete_many({"purchase_record_id": PURCHASE_ID})
    db["purchase_records"].delete_many({"id": PURCHASE_ID})
    db["emission_factors"].delete_one({"id": FACTOR_ID})
    print("FIXTURE_TEARDOWN_DONE")
