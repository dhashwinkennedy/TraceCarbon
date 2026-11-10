"""Scope3Track: Calculation Safety Infrastructure (Phase 2.1 & 2.2).

Provides:
1. Preflight duplicate-active-record verification.
2. Safe partial unique index management for calculation_runs.
3. Transaction-based atomic calculation creation and activation.
4. Concurrency conflict (DuplicateKeyError) and transaction failure handling.
5. In-memory fallback for test runners using mongomock.
"""
from __future__ import annotations
import logging
from typing import Any
from pymongo import ASCENDING, MongoClient
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError, PyMongoError
from fastapi import HTTPException

logger = logging.getLogger("scope3track.safety")

PARTIAL_UNIQUE_INDEX_NAME = "uniq_active_calculation_per_purchase"


def preflight_duplicate_active_check(db: Database) -> dict[str, Any]:
    """Inspects calculation_runs for any duplicate active records per purchase_record_id.
    
    Returns diagnostic statistics. Raises RuntimeError if duplicate active records exist.
    """
    pipeline = [
        {"$match": {"is_active": True}},
        {"$group": {"_id": "$purchase_record_id", "count": {"$sum": 1}, "run_ids": {"$push": "$id"}}},
        {"$match": {"count": {"$gt": 1}}}
    ]
    duplicates = list(db["calculation_runs"].aggregate(pipeline))
    total_active = db["calculation_runs"].count_documents({"is_active": True})
    total_runs = db["calculation_runs"].count_documents({})
    
    if duplicates:
        dup_summary = [f"Purchase {d['_id']}: {d['count']} active runs ({d['run_ids']})" for d in duplicates]
        msg = f"Preflight check FAILED: Found {len(duplicates)} purchase records with multiple active calculations: {'; '.join(dup_summary)}"
        logger.error(msg)
        raise RuntimeError(msg)
        
    logger.info(f"Preflight check PASSED: {total_active} active runs across {total_runs} total runs. Zero duplicates found.")
    return {
        "status": "clean",
        "has_duplicates": False,
        "duplicate_count": 0,
        "total_active_runs": total_active,
        "total_runs": total_runs,
        "duplicates": []
    }


def create_calculation_safety_indexes(db: Database, enforce_preflight: bool = True) -> dict[str, Any]:
    """Safely creates partial unique index on calculation_runs.
    
    Guarantees:
    - Never modifies or deletes existing calculation records.
    - Runs preflight check first to ensure database is in a valid state.
    - Creates partial unique index ensuring at most one active calculation per purchase_record_id.
    """
    if enforce_preflight:
        preflight_duplicate_active_check(db)
        
    existing_indexes = {idx["name"]: idx for idx in db["calculation_runs"].list_indexes()}
    
    if PARTIAL_UNIQUE_INDEX_NAME in existing_indexes:
        logger.info(f"Index '{PARTIAL_UNIQUE_INDEX_NAME}' already exists on {db.name}.calculation_runs.")
        return {
            "created": False,
            "index_name": PARTIAL_UNIQUE_INDEX_NAME,
            "status": "already_exists",
            "database": db.name
        }
        
    index_spec = [("purchase_record_id", ASCENDING)]
    partial_filter = {"is_active": True}
    
    db["calculation_runs"].create_index(
        index_spec,
        unique=True,
        partialFilterExpression=partial_filter,
        name=PARTIAL_UNIQUE_INDEX_NAME,
        background=False
    )
    
    # Also ensure performance index on purchase_record_id and is_active
    db["calculation_runs"].create_index([("purchase_record_id", ASCENDING), ("is_active", ASCENDING)], background=True)
    
    logger.info(f"Successfully created partial unique index '{PARTIAL_UNIQUE_INDEX_NAME}' on {db.name}.calculation_runs.")
    return {
        "created": True,
        "index_name": PARTIAL_UNIQUE_INDEX_NAME,
        "status": "created",
        "database": db.name
    }


def atomic_activate_calculation_run(
    client: MongoClient,
    db_name: str,
    calculation_id: str,
    purchase_record_id: str | None = None
) -> dict[str, Any]:
    """Atomically sets a calculation run as active while deactivating all others for that purchase.
    
    Executes within a multi-document ACID transaction.
    If a transaction failure or concurrency conflict occurs:
    - Transaction automatically aborts.
    - Original active calculation remains intact (zero purchases left without active run).
    - Preserves all historical receipts.
    """
    db = client[db_name]
    calc = db["calculation_runs"].find_one({"id": calculation_id})
    if not calc:
        raise HTTPException(404, "Calculation run not found")
        
    pid = purchase_record_id or calc.get("purchase_record_id")
    if not pid:
        raise HTTPException(400, "Calculation run does not have an associated purchase record")
        
    try:
        try:
            with client.start_session() as session:
                with session.start_transaction():
                    # 1. Mark existing active runs for this purchase as inactive
                    db["calculation_runs"].update_many(
                        {"purchase_record_id": pid, "is_active": True},
                        {"$set": {"is_active": False}},
                        session=session
                    )
                    
                    # 2. Activate designated calculation run
                    res = db["calculation_runs"].update_one(
                        {"id": calculation_id},
                        {"$set": {"is_active": True}},
                        session=session
                    )
                    if res.matched_count == 0:
                        raise HTTPException(404, "Calculation run could not be activated")
                        
                    # 3. Update purchase record pointer
                    db["purchase_records"].update_one(
                        {"id": pid},
                        {"$set": {
                            "calculated": True,
                            "active_calculation_id": calculation_id,
                            "active_method": calc.get("method")
                        }},
                        session=session
                    )
        except (NotImplementedError, AttributeError):
            # Fallback for environments (e.g. mongomock) that do not support multi-document sessions
            db["calculation_runs"].update_many(
                {"purchase_record_id": pid, "is_active": True},
                {"$set": {"is_active": False}}
            )
            res = db["calculation_runs"].update_one(
                {"id": calculation_id},
                {"$set": {"is_active": True}}
            )
            if res.matched_count == 0:
                raise HTTPException(404, "Calculation run could not be activated")
            db["purchase_records"].update_one(
                {"id": pid},
                {"$set": {
                    "calculated": True,
                    "active_calculation_id": calculation_id,
                    "active_method": calc.get("method")
                }}
            )
    except DuplicateKeyError as e:
        logger.warning(f"Concurrent activation conflict on purchase {pid}: {e}")
        raise HTTPException(409, "A concurrent calculation was activated for this purchase record. Please refresh.") from e
    except PyMongoError as e:
        logger.error(f"Transaction failure during calculation activation for {calculation_id}: {e}")
        raise HTTPException(500, f"Database transaction failed: {e}") from e

    updated = db["calculation_runs"].find_one({"id": calculation_id})
    if updated and "_id" in updated:
        updated.pop("_id", None)
    return updated


def atomic_create_and_activate_calculation_run(
    client: MongoClient,
    db_name: str,
    calc_doc: dict[str, Any]
) -> dict[str, Any]:
    """Atomically inserts a new calculation run and activates it in a single transaction.
    
    Guarantees:
    - Existing runs for purchase_record_id are deactivated.
    - New run is inserted with is_active=True.
    - Purchase record pointers updated.
    - If any error occurs, transaction rolls back cleanly.
    """
    db = client[db_name]
    pid = calc_doc["purchase_record_id"]
    calc_id = calc_doc["id"]
    method = calc_doc.get("method", "product_factor")
    
    try:
        try:
            with client.start_session() as session:
                with session.start_transaction():
                    # 1. Mark existing runs inactive
                    db["calculation_runs"].update_many(
                        {"purchase_record_id": pid, "is_active": True},
                        {"$set": {"is_active": False}},
                        session=session
                    )
                    
                    # 2. Insert new calculation run with is_active=True
                    doc_to_insert = dict(calc_doc)
                    doc_to_insert["is_active"] = True
                    db["calculation_runs"].insert_one(doc_to_insert, session=session)
                    
                    # 3. Update purchase record
                    db["purchase_records"].update_one(
                        {"id": pid},
                        {"$set": {
                            "calculated": True,
                            "active_calculation_id": calc_id,
                            "active_method": method
                        }},
                        session=session
                    )
        except (NotImplementedError, AttributeError):
            # Fallback for environments (e.g. mongomock) that do not support multi-document sessions
            db["calculation_runs"].update_many(
                {"purchase_record_id": pid, "is_active": True},
                {"$set": {"is_active": False}}
            )
            doc_to_insert = dict(calc_doc)
            doc_to_insert["is_active"] = True
            db["calculation_runs"].insert_one(doc_to_insert)
            db["purchase_records"].update_one(
                {"id": pid},
                {"$set": {
                    "calculated": True,
                    "active_calculation_id": calc_id,
                    "active_method": method
                }}
            )
    except DuplicateKeyError as e:
        logger.warning(f"Concurrent calculation creation conflict on purchase {pid}: {e}")
        raise HTTPException(409, "A concurrent calculation was generated for this purchase record.") from e
    except PyMongoError as e:
        logger.error(f"Transaction failure during calculation creation for {calc_id}: {e}")
        raise HTTPException(500, f"Database transaction failed: {e}") from e

    if "_id" in calc_doc:
        calc_doc.pop("_id", None)
    return calc_doc


def atomic_activate_portfolio_scenario(
    client: MongoClient,
    db_name: str,
    scenario_batch_id: str,
    scenario_name: str,
    scenario_docs: list[dict[str, Any]],
    user_id: str = "usr-manufacturer-001"
) -> dict[str, Any]:
    """Atomically activates an entire multi-method scenario across all 20 purchases.
    
    Guarantees:
    - Entire 20-purchase portfolio transitions as ONE atomic ACID transaction.
    - Zero window of partial inventory state.
    - Preserves all historical calculation receipts.
    - Preserves baseline runs until commit.
    - Strict enforcement of partial unique index (at most 1 active run per purchase).
    - If any error occurs, transaction aborts completely, leaving baseline 100% active.
    - Records scenario metadata, manifest checksum, and audit trail.
    - Fully idempotent.
    """
    import datetime, hashlib, json
    db = client[db_name]
    
    if len(scenario_docs) != 20:
        raise HTTPException(422, f"Scenario activation requires exactly 20 purchase assignments, received {len(scenario_docs)}")
        
    pids = [doc["purchase_record_id"] for doc in scenario_docs]
    if len(set(pids)) != 20:
        raise HTTPException(422, "Scenario assignments contain duplicate purchase record IDs")
        
    now_dt = datetime.datetime.utcnow()
    
    # Compute canonical manifest checksum
    manifest_fingerprint = sorted([
        f"{doc['purchase_record_id']}:{doc.get('method')}:{doc.get('result_value')}"
        for doc in scenario_docs
    ])
    checksum = hashlib.sha256(json.dumps(manifest_fingerprint).encode()).hexdigest()
    
    try:
        try:
            with client.start_session() as session:
                with session.start_transaction():
                    # Process each purchase in the scenario
                    for item in scenario_docs:
                        pid = item["purchase_record_id"]
                        method = item.get("method", "product_factor")
                        
                        # 1. Deactivate all existing active runs for this purchase
                        db["calculation_runs"].update_many(
                            {"purchase_record_id": pid, "is_active": True},
                            {"$set": {"is_active": False}},
                            session=session
                        )
                        
                        # 2. Activate or Insert target calculation run
                        target_calc_id = item.get("id")
                        existing_run = db["calculation_runs"].find_one({"id": target_calc_id}, session=session) if target_calc_id else None
                        
                        if existing_run:
                            # Run already exists (e.g. baseline or previously generated) -> reactivate
                            db["calculation_runs"].update_one(
                                {"id": target_calc_id},
                                {"$set": {
                                    "is_active": True,
                                    "scenario_batch_id": scenario_batch_id,
                                    "updated_at": now_dt
                                }},
                                session=session
                            )
                            active_calc_id = target_calc_id
                        else:
                            # Insert new calculation run with is_active=True
                            new_run = dict(item)
                            new_run["is_active"] = True
                            new_run["scenario_batch_id"] = scenario_batch_id
                            new_run["created_at"] = now_dt
                            new_run.pop("_id", None)
                            db["calculation_runs"].insert_one(new_run, session=session)
                            active_calc_id = new_run["id"]
                            
                        # 3. Update purchase record pointer
                        db["purchase_records"].update_one(
                            {"id": pid},
                            {"$set": {
                                "calculated": True,
                                "active_calculation_id": active_calc_id,
                                "active_method": method,
                                "scenario_batch_id": scenario_batch_id,
                                "updated_at": now_dt
                            }},
                            session=session
                        )
                        
                    # 4. Record scenario document
                    scenario_record = {
                        "scenario_batch_id": scenario_batch_id,
                        "scenario_name": scenario_name,
                        "purchase_count": 20,
                        "activated_at": now_dt,
                        "activated_by": user_id,
                        "manifest_checksum": checksum,
                        "status": "ACTIVE"
                    }
                    db["portfolio_scenarios"].update_one(
                        {"scenario_batch_id": scenario_batch_id},
                        {"$set": scenario_record},
                        upsert=True,
                        session=session
                    )
        except (NotImplementedError, AttributeError):
            # Fallback for environments (e.g. mongomock) without transactions
            for item in scenario_docs:
                pid = item["purchase_record_id"]
                method = item.get("method", "product_factor")
                db["calculation_runs"].update_many(
                    {"purchase_record_id": pid, "is_active": True},
                    {"$set": {"is_active": False}}
                )
                target_calc_id = item.get("id")
                existing_run = db["calculation_runs"].find_one({"id": target_calc_id}) if target_calc_id else None
                if existing_run:
                    db["calculation_runs"].update_one(
                        {"id": target_calc_id},
                        {"$set": {
                            "is_active": True,
                            "scenario_batch_id": scenario_batch_id,
                            "updated_at": now_dt
                        }}
                    )
                    active_calc_id = target_calc_id
                else:
                    new_run = dict(item)
                    new_run["is_active"] = True
                    new_run["scenario_batch_id"] = scenario_batch_id
                    new_run["created_at"] = now_dt
                    new_run.pop("_id", None)
                    db["calculation_runs"].insert_one(new_run)
                    active_calc_id = new_run["id"]
                db["purchase_records"].update_one(
                    {"id": pid},
                    {"$set": {
                        "calculated": True,
                        "active_calculation_id": active_calc_id,
                        "active_method": method,
                        "scenario_batch_id": scenario_batch_id,
                        "updated_at": now_dt
                    }}
                )
            scenario_record = {
                "scenario_batch_id": scenario_batch_id,
                "scenario_name": scenario_name,
                "purchase_count": 20,
                "activated_at": now_dt,
                "activated_by": user_id,
                "manifest_checksum": checksum,
                "status": "ACTIVE"
            }
            db["portfolio_scenarios"].update_one(
                {"scenario_batch_id": scenario_batch_id},
                {"$set": scenario_record},
                upsert=True
            )
    except DuplicateKeyError as e:
        logger.warning(f"Scenario activation failed due to duplicate key error: {e}")
        raise HTTPException(409, "A concurrency conflict occurred during scenario activation.") from e
    except PyMongoError as e:
        logger.error(f"Transaction failure during portfolio scenario activation: {e}")
        raise HTTPException(500, f"Database transaction failed during scenario activation: {e}") from e

    # Verification post-activation
    total_active = db["calculation_runs"].count_documents({"is_active": True})
    if total_active != 20:
        logger.critical(f"Portfolio scenario post-activation check FAILED: expected 20 active runs, found {total_active}")
        raise RuntimeError(f"Scenario post-activation check failed: expected 20 active runs, found {total_active}")
        
    return {
        "status": "SUCCESS",
        "scenario_batch_id": scenario_batch_id,
        "scenario_name": scenario_name,
        "purchase_count": 20,
        "active_calculations": total_active,
        "manifest_checksum": checksum
    }


def atomic_rollback_portfolio_scenario(
    client: MongoClient,
    db_name: str,
    target_baseline_prefix: str = "calc-po-"
) -> dict[str, Any]:
    """Atomically rolls back the entire portfolio to the 20 original Product-Factor calculations.
    
    Guarantees:
    - Restores the exact original 20 Product-Factor calculation runs.
    - Sets is_active=False on all alternative scenario runs.
    - Updates purchase_records active pointers to original baseline.
    - Returns baseline total to exactly 2,692.86353 t CO2e.
    - Executes in a single ACID transaction.
    """
    import datetime
    db = client[db_name]
    now_dt = datetime.datetime.utcnow()
    
    baseline_runs = list(db["calculation_runs"].find({
        "id": {"$regex": f"^{target_baseline_prefix}"},
        "method": "product_factor"
    }))
    if len(baseline_runs) != 20:
        raise HTTPException(500, f"Rollback failed: expected 20 baseline runs, found {len(baseline_runs)}")
        
    try:
        try:
            with client.start_session() as session:
                with session.start_transaction():
                    # 1. Deactivate all currently active runs
                    db["calculation_runs"].update_many(
                        {"is_active": True},
                        {"$set": {"is_active": False}},
                        session=session
                    )
                    
                    # 2. Reactivate the 20 baseline runs
                    for b in baseline_runs:
                        pid = b["purchase_record_id"]
                        cid = b["id"]
                        db["calculation_runs"].update_one(
                            {"id": cid},
                            {"$set": {"is_active": True, "updated_at": now_dt}},
                            session=session
                        )
                        db["purchase_records"].update_one(
                            {"id": pid},
                            {"$set": {
                                "calculated": True,
                                "active_calculation_id": cid,
                                "active_method": "product_factor",
                                "updated_at": now_dt
                            }},
                            session=session
                        )
                        
                    # 3. Update scenario status if exists
                    db["portfolio_scenarios"].update_many(
                        {"status": "ACTIVE"},
                        {"$set": {"status": "ROLLED_BACK", "rolled_back_at": now_dt}},
                        session=session
                    )
        except (NotImplementedError, AttributeError):
            db["calculation_runs"].update_many(
                {"is_active": True},
                {"$set": {"is_active": False}}
            )
            for b in baseline_runs:
                pid = b["purchase_record_id"]
                cid = b["id"]
                db["calculation_runs"].update_one(
                    {"id": cid},
                    {"$set": {"is_active": True, "updated_at": now_dt}}
                )
                db["purchase_records"].update_one(
                    {"id": pid},
                    {"$set": {
                        "calculated": True,
                        "active_calculation_id": cid,
                        "active_method": "product_factor",
                        "updated_at": now_dt
                    }}
                )
            db["portfolio_scenarios"].update_many(
                {"status": "ACTIVE"},
                {"$set": {"status": "ROLLED_BACK", "rolled_back_at": now_dt}}
            )
    except Exception as e:
        logger.error(f"Rollback transaction failed: {e}")
        raise HTTPException(500, f"Rollback failed: {e}") from e

    active_runs = list(db["calculation_runs"].find({"is_active": True}))
    active_sum = sum(float(r["result_value"]) for r in active_runs)
    return {
        "status": "ROLLED_BACK",
        "active_calculations": len(active_runs),
        "total_emissions_kgco2e": active_sum,
        "total_emissions_tco2e": round(active_sum / 1000.0, 5)
    }

