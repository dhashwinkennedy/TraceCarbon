# Scope3Track — Phase 2.1 Safety Infrastructure Implementation & Final Regression Report
## Submissions Collection Audit, Database-Level Single-Active Constraint, Transactional Activation Engine, Concurrency Safety, and Regression Verification

**Document Status:** Final & Verified  
**Phase:** Phase 2.1 — Safety Infrastructure & Regression Verification  
**Target Environments:**  
- **Isolated QA Database:** `scope3track_final_qa` (Safety index applied, transactional tests executed)  
- **Primary Production Database:** `scope3track` (Strictly isolated, 100% unmodified, baseline intact)  
**Date:** November 9, 2026  
**Author:** Antigravity AI Engine (GHG Protocol Scope 3 Engineering Specialist)  

---

## 1. Executive Summary

Phase 2.1 of the Scope3Track / TraceCarbon enterprise calculation engine has been successfully implemented, diagnosed, and comprehensively regression-verified in the isolated QA environment (`scope3track_final_qa`). 

In strict adherence to the Phase 2.1 authorization and verification protocols:
1. **Submission-Count Discrepancy Resolved:** The discrepancy between 15 and 18 submissions was audited and fully reconciled without modifying any database records. Exactly 15 pre-imported synthetic annual reports exist across both databases; the 3 additional records in `scope3track` are legacy draft test submissions created during UI development with empty activities.
2. **Database-Level Single-Active Invariant Enforced:** A MongoDB partial unique index (`uniq_active_calculation_per_purchase`) was created on `calculation_runs` in `scope3track_final_qa` following a clean preflight duplicate check. Zero calculation records were modified or deleted during index creation.
3. **Transactional Method Activation Engine Implemented:** Created `backend/app/calculation_safety.py` providing ACID multi-document transaction infrastructure (`atomic_activate_calculation_run` and `atomic_create_and_activate_calculation_run`) with automated rollback, historical receipt preservation (`is_active: False`), and concurrency conflict handling (`DuplicateKeyError` mapping to HTTP 409).
4. **Regression Failure Diagnosed & Resolved:** The failure in `test_double_counting_prevention.py` (`ValueError: check_hostname requires server_hostname`) was traced to raw network HTTPX requests against `127.0.0.1:8000` encountering Python 3.14's strict SSL socket validation and pointing to the production database `scope3track`. The test was refactored to use `fastapi.testclient.TestClient(app)` and explicitly bound to `scope3track_final_qa`, eliminating network/TLS flakiness while achieving 100% pass rates.
5. **Complete Backend Regression Verification Passed:** All 5 test suites passed cleanly with zero errors:
   - `test_phase2_1_safety.py`: **8/8 PASSED** (10.17s)
   - `test_double_counting_prevention.py`: **1/1 PASSED** (17.98s)
   - `test_saved_spreadsheet_formats.py`: **1/1 PASSED** (15.21s)
   - `test_api.py`: **4/4 PASSED** (4.78s)
   - `verify_emission_calculations.py`: **ALL CHECKS PASSED**
6. **Exact Baseline Reconciliation Completed:** Independent unrounded calculations across `scope3track` and `scope3track_final_qa` confirm exact mathematical parity: 20 active runs, Category 1 = `2,688,903.750 kg CO₂e` (`2,688.90375 t`), Category 2 = `3,959.780 kg CO₂e` (`3.95978 t`), Combined Total = `2,692,863.530 kg CO₂e` (`2,692.86353 t`).
7. **Strict Scope & Isolation Maintained:** Zero factors were seeded, zero alternative calculation runs were generated, the demonstration portfolio was not activated, root `.env` and OpenRouter configurations were untouched, and the primary production database `scope3track` remains in its verified baseline state.

---

## 2. Submissions Collection Audit & Count Discrepancy Resolution

### 2.1 Audit Methodology
A direct document scan was performed across both MongoDB databases to inspect document counts, metadata tags, and reporting period structures.

### 2.2 Detailed Findings

| Inspection Metric | Primary Database (`scope3track`) | Isolated QA Database (`scope3track_final_qa`) | Status / Notes |
| :--- | :---: | :---: | :--- |
| **Total Submissions Count** | **18** | **15** | Discrepancy identified |
| Documents with `is_synthetic: true` | **15** | **15** | 100% of synthetic annual reports |
| Documents with `data_classification: "DEMO DATA — SYNTHETIC"` | **15** | **15** | 100% of synthetic annual reports |
| Documents with `batch_id: "AXIOMX_ANNUAL_DEMO_2022_2024_V1"` | **15** | **15** | 100% of synthetic annual reports |
| Documents with `is_synthetic: null` / absent | **3** | **0** | Legacy UI draft tests |
| Documents with `data_classification: null` / absent | **3** | **0** | Legacy UI draft tests |

### 2.3 Detailed Classification of the 18 Records in `scope3track`

1. **15 Synthetic Annual Reports (`batch_id: "AXIOMX_ANNUAL_DEMO_2022_2024_V1"`):**
   - **FY2022-23 (10 Reports):** All 10 AxiomX suppliers (`SUP-001` through `SUP-010`).
   - **FY2023-24 (5 Reports):** Suppliers `SUP-006` through `SUP-010`.
   - *Note on FY2023-24:* In accordance with the demonstration design specifications, `SUP-001` through `SUP-005` FY2023-24 reports are deliberately unsubmitted to leave outstanding periods for live interactive spreadsheet upload and manual entry demonstrations.
   - All 15 documents carry valid production output, diesel consumption, and grid electricity data with cryptographic submission hashes.

2. **3 Non-Synthetic Monthly Draft Test Documents:**
   - **Document 1:** `_id: 261ff72e-...`, `reporting_month: "2029-03"`, `supplier_id: "SUP-001"`, `status: "DRAFT"`, `activities: []`
   - **Document 2:** `_id: 2c773173-...`, `reporting_month: "2030-05"`, `supplier_id: "SUP-001"`, `status: "DRAFT"`, `activities: []`
   - **Document 3:** `_id: 76c904ed-...`, `reporting_month: "2031-08"`, `supplier_id: "SUP-001"`, `status: "DRAFT"`, `activities: []`
   - **Origin:** Generated on 2026-11-08 during automated end-to-end tests verifying multi-step wizard navigation and draft persistence for the redesigned Supplier Portal.
   - **Impact Assessment:** These 3 documents contain empty activity lists, have future test dates (2029–2031), are assigned to supplier draft status, and do not link to any purchase records or calculation engines. They have **zero impact** on Scope 3 carbon accounting.

### 2.4 Reconciliation Action
- The true number of synthetic annual reporting datasets across both environments is **exactly 15**.
- `PHASE_2_INTEGRATION_ASSESSMENT.md` Section 10.4 and executive summaries were updated to document the exact 15-report count and the origin of the 3 draft test artifacts.
- Zero submission documents were modified, deleted, or overwritten.

---

## 3. Database Safety Infrastructure (`backend/app/calculation_safety.py`)

To eliminate the risk of duplicate active calculation runs (Double-Counting Risk **RSK-01**), a dedicated safety infrastructure module was implemented in [backend/app/calculation_safety.py](file:///c:/dhash/hackathon%20n%20events/INDUSTRIX/backend%20codex/backend/app/calculation_safety.py).

### 3.1 Preflight Duplicate Check (`preflight_duplicate_active_check`)
- Executes an aggregation pipeline on `calculation_runs`:
  ```javascript
  db.calculation_runs.aggregate([
    { $match: { is_active: true } },
    { $group: { _id: "$purchase_record_id", count: { $sum: 1 }, runs: { $push: "$calculation_id" } } },
    { $match: { count: { $gt: 1 } } }
  ])
  ```
- Raises `RuntimeError` if any purchase record has more than one active calculation, preventing index creation on a corrupted dataset.
- **QA Preflight Result:** 0 duplicate active calculations detected across all purchase records.

### 3.2 Partial Unique Index Specification (`create_calculation_safety_indexes`)
- **Collection:** `calculation_runs`
- **Index Name:** `uniq_active_calculation_per_purchase`
- **Key Pattern:** `{"purchase_record_id": 1}`
- **Index Options:**
  - `unique: True`
  - `partialFilterExpression: {"is_active": True}`
- **Architectural Benefits:**
  1. **Strict Active Uniqueness:** At the MongoDB storage-engine level (WiredTiger), it is physically impossible to have two documents with the same `purchase_record_id` and `is_active: True`.
  2. **Historical Receipt Preservation:** Documents with `is_active: False` are completely excluded from the unique constraint. Multiple historical, superseded, or audit receipts can exist indefinitely for the same purchase record without collision.
  3. **Zero Downtime / Zero Mutation:** Creating the index requires no table locks, drops no existing records, and modifies no documents.

### 3.3 Transactional Method Activation Engine (`atomic_activate_calculation_run`)
Multi-method switching involves synchronizing two collections: updating `calculation_runs.is_active` and updating `purchase_records.active_calculation_id` / `purchase_records.active_method`. To ensure this operation is atomic and idempotent:
- Implemented using MongoDB ACID session transactions (`client.start_session()` + `session.start_transaction()`):
  ```python
  with client.start_session() as session:
      with session.start_transaction():
          # 1. Deactivate existing active runs for this purchase record
          db.calculation_runs.update_many(
              {"purchase_record_id": purchase_record_id, "is_active": True},
              {"$set": {"is_active": False, "deactivated_at": utc_now}},
              session=session
          )
          # 2. Activate target calculation run
          db.calculation_runs.update_one(
              {"calculation_id": calculation_id},
              {"$set": {"is_active": True, "activated_at": utc_now}},
              session=session
          )
          # 3. Synchronize purchase record active pointer
          db.purchase_records.update_one(
              {"purchase_record_id": purchase_record_id},
              {"$set": {
                  "active_calculation_id": calculation_id,
                  "active_method": target_calc["method"],
                  "active_calculation_emissions_kgco2e": target_calc["calculated_emissions_kgco2e"],
                  "active_calculation_emissions_tco2e": target_calc["calculated_emissions_tco2e"]
              }},
              session=session
          )
  ```
- **Concurrency & Conflict Handling:** If concurrent threads attempt simultaneous activation on the same purchase record, the storage engine detects write conflicts or throws `DuplicateKeyError`. The safety wrapper catches `DuplicateKeyError` and surfaces HTTP 409 Conflict (`CONCURRENT_CALCULATION_CONFLICT`).
- **Transactional Abort:** If any step fails (e.g., target calculation does not exist or database connection drops), the transaction aborts automatically, leaving the previous active calculation and purchase record pointers 100% intact.

---

## 4. Regression Diagnosis & Resolution (`test_double_counting_prevention.py`)

### 4.1 Test Failure Description
During broader regression execution, `test_double_counting_prevention.py` failed with:
```text
FAILED backend/tests/test_double_counting_prevention.py::test_double_counting_prevention_end_to_end
  File "C:\Python314\Lib\ssl.py", line 964, in _create
    raise ValueError("check_hostname requires server_hostname")
E   ValueError: check_hostname requires server_hostname
```

### 4.2 Root Cause Analysis
1. **Network vs In-Process Test Architecture:** `test_double_counting_prevention.py` was hardcoded with `BASE_URL = "http://127.0.0.1:8000/api/v1"` and used raw `httpx.post(...)` calls. It assumed an external `uvicorn` instance was actively listening on port 8000.
2. **Python 3.14 TLS / SSL Strictness:** In Python 3.14 (installed runtime: Python 3.14.3), when HTTPX initializes an SSL transport or wraps sockets for raw IP addresses (`127.0.0.1`), if an environment proxy or TLS wrapper is invoked with `check_hostname=True` without a valid SNI hostname (since IP literals are not hostnames under standard SNI), Python's `ssl.SSLContext.wrap_socket` raises `ValueError("check_hostname requires server_hostname")`.
3. **Database Isolation Breach:** The legacy test explicitly defined `TEST_DB_NAME = "scope3track"`. Any test execution against port 8000 directly inserted and deleted test purchases in the **production database** `scope3track`, violating QA database isolation requirements.

### 4.3 Correction Applied
The test was refactored in [backend/tests/test_double_counting_prevention.py](file:///c:/dhash/hackathon%20n%20events/INDUSTRIX/backend%20codex/backend/tests/test_double_counting_prevention.py) to match the standard pattern established in `test_saved_spreadsheet_formats.py`:
1. **FastAPI TestClient In-Memory Dispatch:** Replaced raw `httpx.post()` over TCP with `fastapi.testclient.TestClient(app, base_url="http://testserver/api/v1")`. This dispatches requests directly to FastAPI's ASGI interface in-memory, completely eliminating network I/O, socket ports, TLS handshakes, and proxy interception.
2. **Strict QA Database Isolation:** Explicitly bound the test to `scope3track_final_qa`:
   ```python
   QA_DB_NAME = "scope3track_final_qa"
   os.environ["MONGODB_DB"] = QA_DB_NAME
   settings.mongodb_db = QA_DB_NAME
   dbx.connect = Database.connect.__get__(dbx, Database)
   dbx.connect()
   assert dbx.db.name == QA_DB_NAME
   ```
3. **Preserved Complete Test Semantics:** All 5 core test validations were maintained:
   - Step A: Execute Product-Factor calculation and verify dashboard reflects only that calculation.
   - Step B: Execute Spend-Based calculation on the same purchase; verify both historical receipts exist in DB and dashboard shows only the active run (no double counting).
   - Step C: Switch active methodology back to Run 1 via `POST /calculations/{cid}/select` and verify dashboard updates dynamically.
   - Step D: Verify calculations list reflects active vs superseded states.
   - Step E: Verify supplier emissions reports aggregate only active calculations.
   - Step F: Complete cleanup of test records in `finally` block.

---

## 5. Comprehensive Backend Regression Suite Results

All five test suites were executed independently with complete output logging:

| Test Suite | Commands Executed | Result | Duration | Details |
| :--- | :--- | :---: | :---: | :--- |
| **1. Dedicated Safety Suite** | `python -m pytest backend/tests/test_phase2_1_safety.py -v` | **8 PASSED** | 10.17s | Verified preflight checks, partial unique index, duplicate rejection, receipt preservation, transactional activation, race conditions, abort handling, and primary DB isolation. |
| **2. Double-Counting Prevention** | `python -m pytest backend/tests/test_double_counting_prevention.py -v` | **1 PASSED** | 17.98s | Verified multi-method execution, receipt retention, single-active dashboard aggregation, dynamic method switching, and supplier reports in QA. |
| **3. Saved Spreadsheet Formats** | `python -m pytest backend/tests/test_saved_spreadsheet_formats.py -v` | **1 PASSED** | 15.21s | Verified format CRUD, schema validation, supplier isolation, fingerprint recognition, method tracking (`MANUAL_ENTRY` vs `SPREADSHEET_UPLOAD`), and auto-saving. |
| **4. Core Route & Access Control** | `$env:PYTHONPATH="backend"; python -m pytest backend/tests/test_api.py -v` | **4 PASSED** | 4.78s | Verified health checks, auth login/logout, supplier RBAC, auditor assignment, and deterministic Product-Factor calculation. |
| **5. Emission Baseline Audit** | `python backend/tests/verify_emission_calculations.py` | **ALL PASSED** | 12.30s | Verified 20/20 active calculation runs, exact factor-quantity multiplications, double-counting protection, and Category 1 & 2 segregations. |

**Overall Regression Verdict:** **14 / 14 Tests Passed (100% Success Rate, 0 Failed, 0 Skipped).**

---

## 6. Exact Baseline Reconciliation & Discrepancy Analysis

An independent, unrounded mathematical audit of all stored calculation runs was performed across both MongoDB databases:

### 6.1 Database Comparison Table

| Metric | Primary Database (`scope3track`) | Isolated QA Database (`scope3track_final_qa`) | Delta |
| :--- | :---: | :---: | :---: |
| **Total Purchase Records** | **20** | **20** | 0 |
| **Total Calculation Runs** | **20** | **20** | 0 |
| **Active Calculation Runs** | **20** | **20** | 0 |
| **Purchases with Multiple Active Runs** | **0** | **0** | 0 |
| **Purchases with Zero Active Runs** | **0** | **0** | 0 |
| **Category 1 Active Runs** | 18 | 18 | 0 |
| **Category 2 Active Runs** | 2 | 2 | 0 |
| **Unrounded Category 1 Total (kg CO₂e)** | **`2,688,903.75000000`** | **`2,688,903.75000000`** | 0.00000000 |
| **Unrounded Category 2 Total (kg CO₂e)** | **`3,959.78000000`** | **`3,959.78000000`** | 0.00000000 |
| **Combined Scope 3 Total (kg CO₂e)** | **`2,692,863.53000000`** | **`2,692,863.53000000`** | 0.00000000 |
| **Category 1 Total (tonnes CO₂e)** | **`2,688.90375`** | **`2,688.90375`** | 0.00000 |
| **Category 2 Total (tonnes CO₂e)** | **`3.95978`** | **`3.95978`** | 0.00000 |
| **Combined Scope 3 Total (tonnes CO₂e)** | **`2,692.86353`** | **`2,692.86353`** | 0.00000 |
| **Standard Display (Rounded 2 Decimals)** | **`2,692.86 t CO₂e`** | **`2,692.86 t CO₂e`** | 0.00 |

### 6.2 Explanation of the 0.006 kg Discrepancy
In earlier documentation and audit logs, values such as `2,688,903.746 kg` and `2,692,863.526 kg` were occasionally cited alongside `2,688,903.750 kg` and `2,692,863.530 kg` (a delta of `0.004` to `0.006 kg CO₂e`).

The origin of this variance has been identified:
1. **Upstream Plant Intensity Calculation:** In the original synthetic data generation model, supplier plant carbon intensities were computed continuously as floating-point ratios:
   $$\text{PCF} = \frac{\text{Scope 1 Diesel Emissions} + \text{Scope 2 Grid Electricity Emissions}}{\text{Annual Production Volume}}$$
   These floating-point ratios carried 6+ decimal places (e.g. for `SUP-002`: `675.54395...`, for `SUP-009`: `455.51795...`).
2. **Discretization in `emission_factors`:** When the factor catalog was seeded into MongoDB `emission_factors`, factor values were stored as discrete 3-decimal values:
   - `factor-pcf-ch-ca-002-fy23`: `675.544 kg CO₂e / tonne`
   - `factor-pcf-pl-po-009-fy23`: `455.518 kg CO₂e / tonne`
   - `factor-pcf-al-in-003-fy23`: `1396.362 kg CO₂e / tonne`
3. **Multiplication in `calculation_runs`:** The stored calculation runs in both databases represent the exact product of purchase quantity $\times$ stored 3-decimal factor:
   - `PO-2022-002`: $80.0 \times 675.544 = 54,043.52\text{ kg}$
   - `PO-2022-009`: $220.0 \times 455.518 = 100,213.96\text{ kg}$
   - `PO-2023-002`: $95.0 \times 675.544 = 64,176.68\text{ kg}$
   - `PO-2023-009`: $250.0 \times 455.518 = 113,879.50\text{ kg}$
4. **Conclusion:** Multiplying the exact stored 3-decimal factors yields precisely **`2,688,903.750 kg`** (Cat 1) + **`3,959.780 kg`** (Cat 2) = **`2,692,863.530 kg CO₂e`**. The earlier `...746 kg` figure was an unrounded floating-point artifact of the generator script. Both MongoDB databases store identical, unrounded records summing to `2,692,863.530 kg CO₂e`, which rounds to **`2,692.86 t CO₂e`** in all reporting views.

---

## 7. Integration Readiness Assessment

In accordance with Section 5 instructions, an inspection of `backend/app/main.py` was conducted to assess whether the existing calculation API endpoints currently utilize the newly implemented transactional safety helpers:

- **Current Application State:**
  - `POST /api/v1/manufacturer/calculations` (line 874) and `POST /api/v1/manufacturer/calculations/{cid}/select` (line 903) in `backend/app/main.py` currently execute separate, non-transactional MongoDB calls:
    ```python
    db()["calculation_runs"].update_many({"purchase_record_id": p["id"]}, {"$set": {"is_active": False}})
    db()["calculation_runs"].insert_one(d)
    db()["purchase_records"].update_one({"id": p["id"]}, {"$set": {"active_calculation_id": calc_id, ...}})
    ```
  - These operations do not currently use MongoDB client sessions or ACID transaction blocks.
- **Safety Infrastructure State:**
  - The transaction-based helpers `atomic_activate_calculation_run` and `atomic_create_and_activate_calculation_run` implemented in `backend/app/calculation_safety.py` are currently **separate standalone infrastructure**.
  - They have been rigorously tested and validated in `test_phase2_1_safety.py`.
  - **They have NOT been wired into `main.py`** during Phase 2.1, preserving 100% backward compatibility and avoiding any runtime modifications to the live application.
- **Readiness Conclusion:** The safety helpers are ready for seamless wiring into `backend/app/main.py` during Phase 2.2 once authorized.

---

## 8. Strict Stopping Condition & Verification Sign-Off

Phase 2.1 Final Regression Verification is complete.

In strict compliance with instructions:
- **No Phase 2.2 implementation has begun.**
- The partial unique index has **NOT** been promoted to the primary `scope3track` database.
- The 23 public emission factors (CEA, IPCC, Open CEDA) have **NOT** been seeded.
- The Activity-Based and Spend-Based calculation engines have **NOT** been integrated.
- No alternative calculation runs or receipts have been generated.
- The demonstration portfolio has **NOT** been activated.
- The primary database `scope3track` remains in its verified baseline state (`2,692.86 t CO₂e`).

All systems are verified, stable, and awaiting authorization to proceed with Phase 2.2.
