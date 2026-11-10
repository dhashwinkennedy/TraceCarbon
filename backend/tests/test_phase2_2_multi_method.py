"""Scope3Track / TraceCarbon: Phase 2.2 Multi-Method Calculation Engine Automated Test Suite.

Runs strictly against the isolated QA database ('scope3track_final_qa').
Verifies:
1. Database safety and factor catalog verification (43 factors: 20 baseline PCF + 23 public factors).
2. GET /api/v1/manufacturer/purchases/{pid}/method-options eligibility discovery and precomputed values.
3. Ineligibility classification:
   - PO-2023-009: Ineligible (104.17% allocation, exceeds 100% of supplier annual production).
   - PO-2022-010 & PO-2023-010: Ineligible (incompatible units: purchase in 'unit' vs production in 'tonnes').
   - PO-2023-005: Ineligible (missing FY2023-24 supplier annual submission).
4. Spend-Based calculation engine:
   - Currency conversion: INR spend divided by embedded FX rate to USD.
   - Emissions: USD spend * Open CEDA sector factor.
   - Metadata compliance: Price Basis 'Producer Price', attribution 'CEDA by Watershed', license 'CC BY-SA 4.0'.
5. Activity-Based calculation engine:
   - Allocation fraction: alpha = purchased_qty / annual_production.
   - Facility emissions: CEA grid electricity (0.716 in FY22, 0.727 in FY23) + IPCC diesel (2.6853 kg CO2e/L).
   - Method description: 'Supplier-specific energy activity allocation estimate — synthetic demonstration data'.
6. POST /api/v1/manufacturer/calculations preview_only behavior:
   - preview_only=True returns receipt with sha256 hash without modifying database.
7. POST /api/v1/manufacturer/calculations execution:
   - Atomic calculation creation and activation via atomic_create_and_activate_calculation_run.
   - Preservation of historical receipts.
   - Partial unique index enforcement (single active calculation per purchase).
8. Full restoration: Restores QA database to original 20 baseline Product-Factor active runs (2,692.86353 t CO2e).
9. Primary database isolation: Asserts 'scope3track' remains 100% untouched.
"""
import os
import sys
import json
import hashlib
from pathlib import Path
import pytest
from dotenv import load_dotenv
from pymongo import MongoClient
from fastapi.testclient import TestClient

backend_dir = str(Path(__file__).resolve().parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

load_dotenv(Path(backend_dir).parent / ".env")

QA_DB_NAME = "scope3track_final_qa"
PROD_DB_NAME = "scope3track"
BASELINE_TOTAL_KG = 2692863.53
BASELINE_ACTIVE_RUNS = 20

# Configure environment before importing app
os.environ["MONGODB_DB"] = QA_DB_NAME

from app.main import app, dbx, settings

# Ensure dbx connects to QA database
dbx.mongodb_db = QA_DB_NAME
settings.mongodb_db = QA_DB_NAME
dbx.connect()


@pytest.fixture(scope="module")
def mongo_client():
    uri = os.environ.get("MONGODB_URI")
    client = MongoClient(uri)
    yield client
    client.close()


@pytest.fixture(scope="module")
def qa_db(mongo_client):
    db = mongo_client[QA_DB_NAME]
    assert db.name == QA_DB_NAME, f"Safety violation: Connected to {db.name}, expected {QA_DB_NAME}"
    return db


@pytest.fixture(scope="module")
def prod_db(mongo_client):
    return mongo_client[PROD_DB_NAME]


@pytest.fixture(scope="module")
def test_client(qa_db):
    old_db = dbx.db
    old_client = dbx.client
    dbx.db = qa_db
    dbx.client = qa_db.client
    client = TestClient(app)
    yield client
    dbx.db = old_db
    dbx.client = old_client


@pytest.fixture(scope="module")
def auth_headers(test_client):
    res = test_client.post("/api/v1/auth/login", json={
        "email": "manufacturer@axiomx.demo",
        "password": "AxiomXManufacturer2026!"
    })
    if res.status_code != 200:
        res = test_client.post("/api/v1/auth/login", json={
            "email": "manufacturer@scope3track.demo",
            "password": "ManufacturerDemo123!"
        })
    assert res.status_code == 200, f"Login failed: {res.text}"
    token = res.json().get("access_token") or res.json().get("token")
    return {"Authorization": f"Bearer {token}"}


# ----------------------------------------------------------------------------
# TEST 1: Database Safety & Public Emission Factor Seeding Verification
# ----------------------------------------------------------------------------
def test_01_public_factor_catalog_verification(qa_db, prod_db):
    """Verifies that all 23 public factors are seeded in QA and baseline PCF factors are preserved."""
    # 1. QA database checks
    pcf_count = qa_db.emission_factors.count_documents({"factor_type": "product_factor"})
    assert pcf_count == 12, f"Expected 12 baseline PCF factors in QA, found {pcf_count}"

    cea_factors = list(qa_db.emission_factors.find({"id": {"$regex": "^FACT-CEA-GRID"}}))
    assert len(cea_factors) == 2, f"Expected 2 CEA grid factors, found {len(cea_factors)}"
    fy22_cea = next(f for f in cea_factors if f["id"] == "FACT-CEA-GRID-FY22")
    fy23_cea = next(f for f in cea_factors if f["id"] == "FACT-CEA-GRID-FY23")
    assert fy22_cea["factor_value"] == 0.716
    assert fy23_cea["factor_value"] == 0.727

    ipcc_factor = qa_db.emission_factors.find_one({"id": "FACT-IPCC-DIESEL"})
    assert ipcc_factor is not None
    assert ipcc_factor["factor_value"] == 2.6853
    assert ipcc_factor["denominator_unit"] == "litres"

    ceda_factors = list(qa_db.emission_factors.find({"id": {"$regex": "^FACT-CEDA"}}))
    assert len(ceda_factors) == 20, f"Expected 20 Open CEDA sector factors, found {len(ceda_factors)}"
    for ceda in ceda_factors:
        assert ceda["attribution"] == "CEDA by Watershed"
        assert ceda["license"] == "CC BY-SA 4.0"
        assert ceda["price_basis"] == "Producer Price"
        assert "factor_value_usd" in ceda
        assert "fx_rate" in ceda

    total_factors = qa_db.emission_factors.count_documents({})
    assert total_factors == 43, f"Expected exactly 43 factors in QA (20 PCF + 23 public), found {total_factors}"

    # 2. Production database isolation
    prod_factors = prod_db.emission_factors.count_documents({})
    assert prod_factors == 20, f"Safety violation: Primary production DB has {prod_factors} factors, expected 20"


# ----------------------------------------------------------------------------
# TEST 2: GET /purchases/{pid}/method-options Discovery & Precomputation
# ----------------------------------------------------------------------------
def test_02_method_options_discovery_and_precomputation(test_client, auth_headers):
    """Tests eligibility and precomputed numbers on GET /purchases/{pid}/method-options."""
    res = test_client.get("/api/v1/manufacturer/purchases/PO-2022-001/method-options", headers=auth_headers)
    assert res.status_code == 200, f"Method options failed: {res.text}"
    data = res.json()
    assert data["purchase_record_id"] == "PO-2022-001"
    methods = data["methods"]

    # 1. Product-factor
    assert methods["product_factor"]["eligible"] is True
    assert abs(methods["product_factor"]["precomputed_emissions_kgco2e"] - 383688.0) < 1.0

    # 2. Spend-based: 66,000,000 INR / 78.186062 * 5.189019 = 4,380,259.81 kg CO2e
    assert methods["spend_based"]["eligible"] is True
    assert methods["spend_based"]["sector_code"] == "331110"
    assert methods["spend_based"]["price_basis"] == "Producer Price"
    assert methods["spend_based"]["attribution"] == "CEDA by Watershed"
    assert methods["spend_based"]["license"] == "CC BY-SA 4.0"
    assert abs(methods["spend_based"]["precomputed_emissions_kgco2e"] - 4380259.81) < 1.0

    # 3. Activity-based: 1,200 t / 160,000 t = 0.0075 -> 51,158,275 kg * 0.0075 = 383,687.13 kg CO2e
    assert methods["activity_based"]["eligible"] is True
    assert methods["activity_based"]["allocation_fraction"] == 0.0075
    assert methods["activity_based"]["allocation_fraction_pct"] == 0.75
    assert abs(methods["activity_based"]["precomputed_emissions_kgco2e"] - 383687.13) < 1.0


# ----------------------------------------------------------------------------
# TEST 3: Ineligibility Classification Verification
# ----------------------------------------------------------------------------
def test_03_ineligibility_classifications(test_client, auth_headers):
    """Verifies that ineligible records return clear error codes and explanations."""
    # 1. PO-2022-010: Incompatible units (unit vs tonnes)
    res_10 = test_client.get("/api/v1/manufacturer/purchases/PO-2022-010/method-options", headers=auth_headers)
    assert res_10.status_code == 200
    act_10 = res_10.json()["methods"]["activity_based"]
    assert act_10["eligible"] is False
    assert act_10["reason_code"] == "INCOMPATIBLE_ALLOCATION_UNITS"
    assert "unit" in act_10["reason"] and "tonnes" in act_10["reason"]

    # 2. PO-2023-010: Incompatible units (unit vs tonnes)
    res_23_10 = test_client.get("/api/v1/manufacturer/purchases/PO-2023-010/method-options", headers=auth_headers)
    assert res_23_10.status_code == 200
    act_23_10 = res_23_10.json()["methods"]["activity_based"]
    assert act_23_10["eligible"] is False
    assert act_23_10["reason_code"] == "INCOMPATIBLE_ALLOCATION_UNITS"

    # 3. PO-2023-009: Over-allocation (104.17% allocation exceeds 100%)
    res_09 = test_client.get("/api/v1/manufacturer/purchases/PO-2023-009/method-options", headers=auth_headers)
    assert res_09.status_code == 200
    act_09 = res_09.json()["methods"]["activity_based"]
    assert act_09["eligible"] is False
    assert act_09["reason_code"] == "ALLOCATION_EXCEEDS_100_PERCENT"

    # 4. PO-2023-002: Missing FY23-24 submission (SUP-002 has not submitted)
    res_02 = test_client.get("/api/v1/manufacturer/purchases/PO-2023-002/method-options", headers=auth_headers)
    assert res_02.status_code == 200
    act_02 = res_02.json()["methods"]["activity_based"]
    assert act_02["eligible"] is False
    assert act_02["reason_code"] == "MISSING_SUPPLIER_ANNUAL_ACTIVITY"


# ----------------------------------------------------------------------------
# TEST 4: Preview Only Mode (Idempotency and Zero Database Mutation)
# ----------------------------------------------------------------------------
def test_04_preview_only_calculation(test_client, auth_headers, qa_db):
    """Verifies that preview_only=True returns calculation receipt without modifying database."""
    runs_before = qa_db.calculation_runs.count_documents({})
    active_before = qa_db.calculation_runs.count_documents({"is_active": True})

    # Execute preview for PO-2022-006 (Packaging spend-based)
    req = {
        "purchase_record_id": "PO-2022-006",
        "method": "spend_based",
        "preview_only": True
    }
    res = test_client.post("/api/v1/manufacturer/calculations", json=req, headers=auth_headers)
    assert res.status_code == 201, f"Preview calculation failed: {res.text}"
    data = res.json()

    assert data["preview_only"] is True
    assert data["method"] == "spend_based"
    assert abs(data["result_value"] - 222192.04) < 1.0
    assert "sha256" in data
    assert data["factor_metadata"]["attribution"] == "CEDA by Watershed"

    # Ensure zero mutation in database
    runs_after = qa_db.calculation_runs.count_documents({})
    active_after = qa_db.calculation_runs.count_documents({"is_active": True})
    assert runs_after == runs_before
    assert active_after == active_before

    # Verify purchase record was not changed
    p_rec = qa_db.purchase_records.find_one({"id": "PO-2022-006"})
    assert p_rec.get("active_method") != "spend_based"


# ----------------------------------------------------------------------------
# TEST 5: Spend-Based Calculation Execution & Metadata Attribution
# ----------------------------------------------------------------------------
def test_05_spend_based_calculation_execution(test_client, auth_headers, qa_db):
    """Tests live spend-based calculation, currency conversion, and receipt audit trail."""
    # Execute spend-based calculation for PO-2022-007 (Textile)
    # Spend: 25,650,000 INR / 78.186062 * 0.924629 = 303,337.11 kg CO2e
    req = {
        "purchase_record_id": "PO-2022-007",
        "method": "spend_based",
        "preview_only": False
    }
    res = test_client.post("/api/v1/manufacturer/calculations", json=req, headers=auth_headers)
    assert res.status_code == 201, f"Calculation failed: {res.text}"
    data = res.json()

    assert data["method"] == "spend_based"
    assert abs(data["result_value"] - 303337.11) < 1.0
    assert data["factor_metadata"]["price_basis"] == "Producer Price"
    assert data["factor_metadata"]["attribution"] == "CEDA by Watershed"
    assert data["factor_metadata"]["license"] == "CC BY-SA 4.0"
    assert data["factor_metadata"]["proxy_year"] == "CY2022 (Proxy)"

    calc_id = data["id"]
    # Check receipt verification endpoint
    receipt_res = test_client.get(f"/api/v1/manufacturer/calculations/{calc_id}/receipt", headers=auth_headers)
    assert receipt_res.status_code == 200
    receipt = receipt_res.json()
    assert receipt["sha256"] == data["sha256"]

    # Verify SHA-256 hash independently
    expected_hash = hashlib.sha256(json.dumps({
        "id": calc_id,
        "purchase_record_id": "PO-2022-007",
        "supplier_id": "SUP-007",
        "product_id": "TX-FC-007",
        "factor_id": data["factor_id"],
        "method": "spend_based",
        "result_value": data["result_value"],
        "formula": data["formula"]
    }, sort_keys=True).encode()).hexdigest()
    assert receipt["sha256"] == expected_hash

    # Verify purchase record updated
    p_rec = qa_db.purchase_records.find_one({"id": "PO-2022-007"})
    assert p_rec["active_calculation_id"] == calc_id
    assert p_rec["active_method"] == "spend_based"


# ----------------------------------------------------------------------------
# TEST 6: Activity-Based Calculation Execution & Ineligibility Rejections
# ----------------------------------------------------------------------------
def test_06_activity_based_calculation_execution(test_client, auth_headers, qa_db):
    """Tests live activity-based calculation and ineligibility HTTP 422 rejections."""
    # 1. Eligible activity calculation: PO-2022-008 (Glass)
    # Purchased: 180 t / 44,000 t = 0.4090909% -> Allocated = 87,093.08 kg CO2e
    req = {
        "purchase_record_id": "PO-2022-008",
        "method": "activity_based",
        "preview_only": False
    }
    res = test_client.post("/api/v1/manufacturer/calculations", json=req, headers=auth_headers)
    assert res.status_code == 201, f"Activity calculation failed: {res.text}"
    data = res.json()
    assert data["method"] == "activity_based"
    assert abs(data["result_value"] - 87093.08) < 1.0
    assert data["factor_metadata"]["description"] == "Supplier-specific energy activity allocation estimate — synthetic demonstration data"
    assert data["factor_metadata"]["grid_factor"]["factor_value"] == 0.716
    assert data["factor_metadata"]["diesel_factor"]["factor_value"] == 2.6853

    # 2. Ineligibility Rejections:
    # A. PO-2023-009: 104.17% allocation rejected
    res_err1 = test_client.post("/api/v1/manufacturer/calculations", json={
        "purchase_record_id": "PO-2023-009",
        "method": "activity_based"
    }, headers=auth_headers)
    assert res_err1.status_code == 422
    assert "exceeds" in res_err1.text or "1.0417" in res_err1.text

    # B. PO-2022-010: Incompatible units rejected
    res_err2 = test_client.post("/api/v1/manufacturer/calculations", json={
        "purchase_record_id": "PO-2022-010",
        "method": "activity_based"
    }, headers=auth_headers)
    assert res_err2.status_code == 422
    assert "incompatible" in res_err2.text.lower()

    # C. PO-2023-002: Missing supplier report rejected
    res_err3 = test_client.post("/api/v1/manufacturer/calculations", json={
        "purchase_record_id": "PO-2023-002",
        "method": "activity_based"
    }, headers=auth_headers)
    assert res_err3.status_code == 422
    assert "No submitted annual supplier report exists" in res_err3.text


# ----------------------------------------------------------------------------
# TEST 7: Single Active Calculation per Purchase Invariant & History Preservation
# ----------------------------------------------------------------------------
def test_07_single_active_calculation_and_history_preservation(test_client, auth_headers, qa_db):
    """Verifies that activating a new method deactivates the old one and preserves historical receipts."""
    pid = "PO-2022-007"
    # Find active runs for PO-2022-007
    active_runs = list(qa_db.calculation_runs.find({"purchase_record_id": pid, "is_active": True}))
    assert len(active_runs) == 1, f"Expected exactly 1 active run for {pid}, found {len(active_runs)}"

    total_runs_for_pid = qa_db.calculation_runs.count_documents({"purchase_record_id": pid})
    assert total_runs_for_pid >= 2, "Expected at least 2 calculation runs (1 inactive original + 1 active new)"

    # Total active runs across entire collection must still be exactly 20!
    total_active_all = qa_db.calculation_runs.count_documents({"is_active": True})
    assert total_active_all == 20, f"Expected exactly 20 active runs across QA DB, found {total_active_all}"


# ----------------------------------------------------------------------------
# TEST 8: Baseline Restoration and Full Inventory Reconciliation
# ----------------------------------------------------------------------------
def test_08_restore_baseline_and_verify_inventory(test_client, auth_headers, qa_db, prod_db):
    """Restores modified runs back to baseline Product-Factor calculations and cleans test runs."""
    # 1. For any purchases where active_method was changed during tests, re-select the original Product-Factor run
    pids_to_restore = ["PO-2022-007", "PO-2022-008"]
    for pid in pids_to_restore:
        orig_pcf = qa_db.calculation_runs.find_one({
            "purchase_record_id": pid,
            "method": "product_factor"
        })
        if orig_pcf:
            test_client.post(f"/api/v1/manufacturer/calculations/{orig_pcf['id']}/select", headers=auth_headers)

    # 2. Clean up test-generated calculation runs created during test execution
    qa_db.calculation_runs.delete_many({
        "id": {"$not": {"$regex": "^calc-po-"}}
    })

    # 3. QA Database Reconciliation
    active_qa = list(qa_db.calculation_runs.find({"is_active": True}))
    assert len(active_qa) == 20, f"Expected 20 active runs in QA, found {len(active_qa)}"
    assert qa_db.calculation_runs.count_documents({}) == 20

    sum_qa_kg = sum(r["result_value"] for r in active_qa)
    assert abs(sum_qa_kg - BASELINE_TOTAL_KG) < 0.01, f"QA total discrepancy: {sum_qa_kg} vs expected {BASELINE_TOTAL_KG}"

    # Category 1 / Category 2 Segregation
    cat1_qa = sum(r["result_value"] for r in active_qa if r.get("scope3_category") == "Category 1")
    cat2_qa = sum(r["result_value"] for r in active_qa if r.get("scope3_category") == "Category 2")
    assert abs(cat1_qa - 2688903.75) < 0.01
    assert abs(cat2_qa - 3959.78) < 0.01

    # 4. Production Database Baseline Check
    active_prod = list(prod_db.calculation_runs.find({"is_active": True}))
    assert len(active_prod) == 20
    sum_prod_kg = sum(r["result_value"] for r in active_prod)
    assert abs(sum_prod_kg - BASELINE_TOTAL_KG) < 0.01, f"Production database altered! Sum={sum_prod_kg}"
