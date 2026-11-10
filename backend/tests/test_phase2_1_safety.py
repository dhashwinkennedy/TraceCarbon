"""Phase 2.1 Safety Infrastructure Tests for Scope3Track.

Runs strictly in the isolated QA database ('scope3track_final_qa').
Verifies:
1. Preflight duplicate-active-record check.
2. Safe creation of partial unique index 'uniq_active_calculation_per_purchase'.
3. Idempotency of index creation without modifying or deleting calculation records.
4. Storage-engine level rejection of duplicate active calculations for the same purchase.
5. Preservation of inactive historical receipts.
6. Transaction-based atomic method activation and error recovery.
7. Verification that the primary 'scope3track' database remains completely untouched.
"""
import os
import sys
import uuid
import threading
from pathlib import Path
import pytest
from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING
from pymongo.errors import DuplicateKeyError, PyMongoError

backend_dir = str(Path(__file__).resolve().parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

load_dotenv(Path(backend_dir).parent / ".env")

from app.calculation_safety import (
    preflight_duplicate_active_check,
    create_calculation_safety_indexes,
    atomic_activate_calculation_run,
    atomic_create_and_activate_calculation_run,
    PARTIAL_UNIQUE_INDEX_NAME
)

QA_DB_NAME = "scope3track_final_qa"
PROD_DB_NAME = "scope3track"


@pytest.fixture(scope="module")
def mongo_client():
    uri = os.environ.get("MONGODB_URI")
    client = MongoClient(uri)
    yield client
    client.close()


@pytest.fixture(scope="module")
def qa_db(mongo_client):
    db = mongo_client[QA_DB_NAME]
    assert db.name == QA_DB_NAME, "Safety Violation: Fixture must connect ONLY to QA database!"
    return db


@pytest.fixture(scope="module")
def prod_db(mongo_client):
    return mongo_client[PROD_DB_NAME]


def test_01_qa_preflight_check(qa_db):
    """Test 1: Preflight check detects zero duplicates in QA database."""
    res = preflight_duplicate_active_check(qa_db)
    assert res["status"] == "clean"
    assert res["has_duplicates"] is False
    assert res["duplicate_count"] == 0
    assert res["total_active_runs"] == 20
    assert res["total_runs"] == 20


def test_02_qa_index_creation_and_preservation(qa_db):
    """Test 2: Create partial unique index in QA without altering records."""
    count_before = qa_db.calculation_runs.count_documents({})
    active_before = qa_db.calculation_runs.count_documents({"is_active": True})
    
    # Create safety index
    idx_res = create_calculation_safety_indexes(qa_db, enforce_preflight=True)
    assert idx_res["status"] in ["created", "already_exists"]
    
    # Verify index exists on QA collection
    indexes = {idx["name"]: idx for idx in qa_db.calculation_runs.list_indexes()}
    assert PARTIAL_UNIQUE_INDEX_NAME in indexes
    idx_info = indexes[PARTIAL_UNIQUE_INDEX_NAME]
    assert idx_info.get("unique") is True
    assert idx_info.get("partialFilterExpression") == {"is_active": True}
    
    # Assert records count and active count are strictly preserved
    count_after = qa_db.calculation_runs.count_documents({})
    active_after = qa_db.calculation_runs.count_documents({"is_active": True})
    assert count_after == count_before == 20
    assert active_after == active_before == 20
    
    # Verify idempotency: calling a second time does not fail
    idempotent_res = create_calculation_safety_indexes(qa_db, enforce_preflight=True)
    assert idempotent_res["status"] == "already_exists"
    assert idempotent_res["created"] is False


def test_03_storage_engine_rejection_of_duplicate_active_calc(qa_db):
    """Test 3: Storage engine strictly rejects a second active calculation for the same purchase."""
    existing_run = qa_db.calculation_runs.find_one({"is_active": True})
    assert existing_run is not None
    pid = existing_run["purchase_record_id"]
    
    # Attempt to insert a second active calculation for the same purchase
    duplicate_run = {
        "id": f"test-dup-active-{uuid.uuid4().hex[:8]}",
        "purchase_record_id": pid,
        "supplier_id": existing_run["supplier_id"],
        "product_id": existing_run["product_id"],
        "reporting_month": existing_run["reporting_month"],
        "scope3_category": existing_run.get("scope3_category", "Category 1"),
        "method": "spend_based",
        "factor_id": "test-factor",
        "result_value": 99999.0,
        "result_unit": "kg CO2e",
        "formula": "spend × factor",
        "is_active": True
    }
    
    with pytest.raises(DuplicateKeyError) as exc_info:
        qa_db.calculation_runs.insert_one(duplicate_run)
    
    assert PARTIAL_UNIQUE_INDEX_NAME in str(exc_info.value) or "duplicate key" in str(exc_info.value).lower()
    
    # Verify that the duplicate was NOT inserted
    assert qa_db.calculation_runs.find_one({"id": duplicate_run["id"]}) is None
    # Verify that exactly one active run remains for this purchase
    active_runs = list(qa_db.calculation_runs.find({"purchase_record_id": pid, "is_active": True}))
    assert len(active_runs) == 1


def test_04_historical_receipt_preservation(qa_db):
    """Test 4: Inactive historical calculation receipts CAN coexist indefinitely."""
    existing_run = qa_db.calculation_runs.find_one({"is_active": True})
    pid = existing_run["purchase_record_id"]
    
    # Inactive historical receipt for the same purchase
    historical_receipt = {
        "id": f"test-hist-receipt-{uuid.uuid4().hex[:8]}",
        "purchase_record_id": pid,
        "supplier_id": existing_run["supplier_id"],
        "product_id": existing_run["product_id"],
        "reporting_month": existing_run["reporting_month"],
        "scope3_category": existing_run.get("scope3_category", "Category 1"),
        "method": "activity_based",
        "factor_id": "test-factor-hist",
        "result_value": 12345.0,
        "result_unit": "kg CO2e",
        "formula": "activity × factor",
        "is_active": False  # Historical receipt: inactive
    }
    
    # Should insert without any duplicate key error
    qa_db.calculation_runs.insert_one(historical_receipt)
    
    stored = qa_db.calculation_runs.find_one({"id": historical_receipt["id"]})
    assert stored is not None
    assert stored["is_active"] is False
    
    # Active count for that purchase must remain exactly 1
    active_runs = list(qa_db.calculation_runs.find({"purchase_record_id": pid, "is_active": True}))
    assert len(active_runs) == 1
    
    # Cleanup test historical receipt
    qa_db.calculation_runs.delete_one({"id": historical_receipt["id"]})


def test_05_atomic_activation_and_receipt_preservation(mongo_client, qa_db):
    """Test 5: Transaction-based atomic activation safely switches active calculation."""
    # Pick target purchase
    target_pr = qa_db.purchase_records.find_one({})
    pid = target_pr["id"]
    
    # Current active run
    orig_active = qa_db.calculation_runs.find_one({"purchase_record_id": pid, "is_active": True})
    assert orig_active is not None
    
    # Create an alternative test calculation run (initially inactive)
    alt_id = f"test-alt-run-{uuid.uuid4().hex[:8]}"
    alt_run = {
        "id": alt_id,
        "purchase_record_id": pid,
        "supplier_id": orig_active["supplier_id"],
        "product_id": orig_active["product_id"],
        "reporting_month": orig_active["reporting_month"],
        "scope3_category": orig_active.get("scope3_category", "Category 1"),
        "method": "spend_based",
        "factor_id": "test-factor-spend",
        "result_value": 50000.0,
        "result_unit": "kg CO2e",
        "formula": "spend × factor",
        "is_active": False
    }
    qa_db.calculation_runs.insert_one(alt_run)
    
    # Atomically activate alternative run
    res = atomic_activate_calculation_run(mongo_client, QA_DB_NAME, alt_id, pid)
    assert res["id"] == alt_id
    assert res["is_active"] is True
    
    # Verify in DB: alternative is active, original is now inactive
    curr_active = qa_db.calculation_runs.find_one({"purchase_record_id": pid, "is_active": True})
    assert curr_active["id"] == alt_id
    
    orig_reloaded = qa_db.calculation_runs.find_one({"id": orig_active["id"]})
    assert orig_reloaded["is_active"] is False
    
    # Verify purchase record updated
    pr_updated = qa_db.purchase_records.find_one({"id": pid})
    assert pr_updated["active_calculation_id"] == alt_id
    assert pr_updated["active_method"] == "spend_based"
    
    # Restore original run
    atomic_activate_calculation_run(mongo_client, QA_DB_NAME, orig_active["id"], pid)
    orig_restored = qa_db.calculation_runs.find_one({"id": orig_active["id"]})
    assert orig_restored["is_active"] is True
    
    # Cleanup test alt run
    qa_db.calculation_runs.delete_one({"id": alt_id})


def test_06_concurrent_activation_conflict_handling(mongo_client, qa_db):
    """Test 6: Concurrent activation requests cannot create duplicate active calculations."""
    target_pr = qa_db.purchase_records.find_one({})
    pid = target_pr["id"]
    orig_active = qa_db.calculation_runs.find_one({"purchase_record_id": pid, "is_active": True})
    
    # Create two alternative runs
    alt1_id = f"test-concurrent-1-{uuid.uuid4().hex[:6]}"
    alt2_id = f"test-concurrent-2-{uuid.uuid4().hex[:6]}"
    
    for aid in [alt1_id, alt2_id]:
        qa_db.calculation_runs.insert_one({
            "id": aid,
            "purchase_record_id": pid,
            "supplier_id": orig_active["supplier_id"],
            "product_id": orig_active["product_id"],
            "reporting_month": orig_active["reporting_month"],
            "scope3_category": "Category 1",
            "method": "activity_based",
            "result_value": 75000.0,
            "result_unit": "kg CO2e",
            "is_active": False
        })
    
    results = []
    errors = []
    
    def worker(calc_id):
        try:
            r = atomic_activate_calculation_run(mongo_client, QA_DB_NAME, calc_id, pid)
            results.append(r["id"])
        except Exception as e:
            errors.append(e)
            
    t1 = threading.Thread(target=worker, args=(alt1_id,))
    t2 = threading.Thread(target=worker, args=(alt2_id,))
    
    t1.start()
    t2.start()
    t1.join()
    t2.join()
    
    # Regardless of thread interleaving, exactly ONE calculation run must be active for pid
    active_runs = list(qa_db.calculation_runs.find({"purchase_record_id": pid, "is_active": True}))
    assert len(active_runs) == 1, f"Concurrency violation! Found {len(active_runs)} active runs for {pid}"
    
    # Restore original active calculation
    atomic_activate_calculation_run(mongo_client, QA_DB_NAME, orig_active["id"], pid)
    
    # Cleanup test runs
    qa_db.calculation_runs.delete_many({"id": {"$in": [alt1_id, alt2_id]}})


def test_07_transaction_failure_aborts_cleanly(mongo_client, qa_db):
    """Test 7: A simulated failure during transaction aborts cleanly without leaving purchase orphaned."""
    target_pr = qa_db.purchase_records.find_one({})
    pid = target_pr["id"]
    orig_active = qa_db.calculation_runs.find_one({"purchase_record_id": pid, "is_active": True})
    orig_active_id = orig_active["id"]
    
    # Attempt an atomic transaction that fails deliberately on step 3
    test_id = f"test-fail-{uuid.uuid4().hex[:6]}"
    qa_db.calculation_runs.insert_one({
        "id": test_id,
        "purchase_record_id": pid,
        "is_active": False,
        "result_value": 11111.0
    })
    
    with pytest.raises(Exception):
        with mongo_client.start_session() as session:
            with session.start_transaction():
                # Step 1: Deactivate existing
                qa_db.calculation_runs.update_many(
                    {"purchase_record_id": pid, "is_active": True},
                    {"$set": {"is_active": False}},
                    session=session
                )
                # Step 2: Activate test
                qa_db.calculation_runs.update_one(
                    {"id": test_id},
                    {"$set": {"is_active": True}},
                    session=session
                )
                # Step 3: Deliberately raise simulated network / validation error
                raise RuntimeError("Simulated transaction failure midway through activation")
    
    # Assert that transaction aborted: original active calculation is STILL active
    curr_active = qa_db.calculation_runs.find_one({"purchase_record_id": pid, "is_active": True})
    assert curr_active is not None, "Error: Purchase was left orphaned without an active calculation!"
    assert curr_active["id"] == orig_active_id, "Error: Active calculation changed despite transaction abort!"
    
    # Cleanup test doc
    qa_db.calculation_runs.delete_one({"id": test_id})


def test_08_primary_database_integrity_and_isolation(prod_db):
    """Test 8: Strict verification that primary 'scope3track' database is completely untouched."""
    # Verify primary DB name
    assert prod_db.name == PROD_DB_NAME
    
    # Verify 20 active Product-Factor calculations
    active_calcs = list(prod_db.calculation_runs.find({"is_active": True}))
    assert len(active_calcs) == 20, f"Expected 20 active calculations in primary DB, found {len(active_calcs)}"
    
    # Verify all 20 are product_factor
    for c in active_calcs:
        assert c.get("method") == "product_factor"
        
    # Verify exact emissions baseline: 2,692.86352 tonnes CO2e
    cat1_vals = [c["result_value"] for c in active_calcs if c.get("scope3_category") == "Category 1"]
    cat2_vals = [c["result_value"] for c in active_calcs if c.get("scope3_category") == "Category 2"]
    total_val = sum(c["result_value"] for c in active_calcs)
    
    cat1_t = sum(cat1_vals) / 1000.0
    cat2_t = sum(cat2_vals) / 1000.0
    total_t = total_val / 1000.0
    
    assert abs(cat1_t - 2688.90375) < 0.01, f"Cat 1 baseline altered: {cat1_t}"
    assert abs(cat2_t - 3.95978) < 0.01, f"Cat 2 baseline altered: {cat2_t}"
    assert abs(total_t - 2692.86353) < 0.01, f"Total baseline altered: {total_t}"
    
    # Verify no partial unique index was added to production in Phase 2.1
    prod_indexes = {idx["name"]: idx for idx in prod_db.calculation_runs.list_indexes()}
    assert PARTIAL_UNIQUE_INDEX_NAME not in prod_indexes, "Safety Violation: Partial unique index found in primary production database!"
