# TRACECARBON / SCOPE3TRACK — PHASE 2.2 IMPLEMENTATION REPORT
## QA-Only Multi-Method Calculation Engine & Public Reference Factor Seeding

**Status:** IMPLEMENTED AND VERIFIED (QA ENVIRONMENT ONLY)  
**Date:** 2026-11-09  
**Target QA Database:** `scope3track_final_qa`  
**Primary Database:** `scope3track` (STRICTLY PRESERVED & UNTOUCHED)  
**Verification Suite Status:** 22/22 Automated Tests Passing (100%)

---

## 1. EXECUTIVE SUMMARY & AUTHORIZATION COMPLIANCE

Pursuant to the **Phase 2.2 Authorization**, the Scope3Track calculation architecture has been extended to natively support deterministic **Activity-Based** and **Spend-Based** emission calculations alongside the existing **Product-Factor** method.

All implementation actions were executed strictly within the isolated QA database (`scope3track_final_qa`). The primary production database (`scope3track`), the root `.env` configuration, and OpenRouter AI models were strictly quarantined and remain completely untouched.

### Key Milestones Achieved:
1. **Factor Catalog Seeding:** Seeded exactly 23 verified public reference emission factors (2 Central Electricity Authority grid factors, 1 IPCC stationary diesel factor, and 20 Open CEDA sector factors) into `scope3track_final_qa.emission_factors`. Baseline 20 factors were preserved without overwrite (total factor catalog = 43).
2. **Deterministic Multi-Method Engine:** Implemented in `backend/app/main.py`:
   - **Spend-Based:** Converts INR spend to USD via division by embedded FX rate (`78.186062` for FY22, `82.481132` for FY23) and evaluates emissions using full-precision Open CEDA factors. Enforces `"Producer Price"` valuation, attribution to `"CEDA by Watershed"`, and license `"CC BY-SA 4.0"`.
   - **Activity-Based:** Calculates supplier-specific allocation fraction $\alpha = \text{purchased\_quantity} / \text{annual\_production}$, evaluates facility energy emissions (grid electricity + stationary diesel), and allocates emissions with strict unit compatibility checking. Method description: `"Supplier-specific energy activity allocation estimate — synthetic demonstration data"`.
3. **Ineligibility Protections:** Automated checks return HTTP 422 with clear diagnostic codes for:
   - `PO-2023-009`: Ineligible (`ALLOCATION_EXCEEDS_100_PERCENT`, 104.17% allocation exceeds 100% of supplier annual production).
   - `PO-2022-010` & `PO-2023-010`: Ineligible (`INCOMPATIBLE_ALLOCATION_UNITS`, purchase in `unit` vs supplier production in `tonnes`).
   - `PO-2023-005` (and unsubmitted FY23 suppliers): Ineligible (`MISSING_SUPPLIER_ANNUAL_ACTIVITY`, no submitted annual report).
4. **Method Discovery & Preview Endpoints:** Added `GET /api/v1/manufacturer/purchases/{pid}/method-options` returning eligibility and precomputed emissions across all 3 methods. Added `preview_only: bool = False` to `POST /api/v1/manufacturer/calculations`, allowing lossless pre-calculation without database writes.
5. **ACID Calculation Safety:** Integrated `atomic_create_and_activate_calculation_run` and `atomic_activate_calculation_run` into live calculation routes, guaranteeing at most one active calculation per purchase record with automatic rollback upon concurrency conflicts.
6. **Zero Automatic Activation:** The baseline inventory remains untouched at **2,692.86353 t CO₂e** across 20 active Product-Factor runs. The proposed 12/4/4 demonstration portfolio was **not** automatically activated and is held in readiness pending user review.

---

## 2. EMISSION FACTOR CATALOG AUDIT (43 FACTORS IN QA)

Seeding script [backend/app/scripts/seed_public_factors_qa.py](file:///c:/dhash/hackathon%20n%20events/INDUSTRIX/backend%20codex/backend/app/scripts/seed_public_factors_qa.py) was executed with idempotent upserts by factor ID.

### 2.1 Seeded Factor Inventory Summary
| Factor Category | Factor IDs | Count | Denominator Unit | Value / Precision | Source & Attribution |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **Grid Electricity** | `FACT-CEA-GRID-FY22`<br>`FACT-CEA-GRID-FY23` | 2 | kWh | FY22: `0.716 kg CO2/kWh`<br>FY23: `0.727 kg CO2/kWh` | Central Electricity Authority (CEA), Baseline Database v19 & v20 |
| **Stationary Diesel** | `FACT-IPCC-DIESEL` | 1 | litres | `2.6853 kg CO2e/L` | IPCC 2006 Guidelines Vol 2 Ch 2 Table 2.3 & BIS IS 1460:2017 |
| **Open CEDA Sectors** | `FACT-CEDA-{NAICS}-FY22`<br>`FACT-CEDA-{NAICS}-FY23` | 20 | INR (eff.) / USD | 10 Sectors x 2 Financial Years<br>FY22 FX: `78.186062`<br>FY23 FX: `82.481132` | Open CEDA v2024 / v2025 (CEDA by Watershed, CC BY-SA 4.0) |
| **Baseline PCF** | `factor-pcf-{code}-fy23` | 12 | tonnes / unit | `58.910` to `1,396.362` | AxiomX Synthetic Product Footprints |
| **Demo Activity/Spend** | `factor-electricity-demo` etc. | 8 | various | Preserved | Existing Prototype Demo Factors |
| **TOTAL QA FACTORS** | — | **43** | — | — | **Verified Clean** |

### 2.2 Open CEDA NAICS Sector Mappings
| Commodity Code | Product Name | NAICS Code | Sector Description | FY22 Factor (kg/USD) | FY23 Factor (kg/USD) |
| :--- | :--- | :---: | :--- | :---: | :---: |
| `ST-HR-001` | Hot-rolled steel coils | `331110` | Iron and steel mills and ferroalloy manufacturing | 5.189019 | 5.976869 |
| `RB-TY-002` | Industrial rubber sheets | `326290` | Other rubber product manufacturing | 1.707897 | 1.575139 |
| `AL-IN-003` | Aluminium ingots | `331313` | Alumina refining and primary aluminum production | 2.710521 | 2.525320 |
| `CM-PC-004` | PPC cement | `327310` | Cement manufacturing | 10.498445 | 9.321503 |
| `CH-SA-005` | Soda ash | `325180` | Other Basic Inorganic Chemical Manufacturing | 1.046134 | 0.994175 |
| `PK-BX-006` | Corrugated packaging | `322210` | Paperboard container manufacturing | 1.189885 | 1.127227 |
| `TX-FC-007` | Industrial fabric | `313200` | Fabric mills | 0.924629 | 0.832374 |
| `GL-SG-008` | Industrial glass sheets | `327200` | Glass and glass product manufacturing | 1.254113 | 1.150881 |
| `PL-PP-009` | HDPE pipes | `326120` | Plastics pipe, pipe fitting, and unlaminated profile shape | 1.067384 | 0.977843 |
| `MC-SG-010` | Industrial boilers | `332410` | Power boiler and heat exchanger manufacturing | 1.311412 | 1.168301 |

---

## 3. ENGINE ARITHMETIC & INELIGIBILITY SPECIFICATION

### 3.1 Spend-Based Arithmetic
$$\text{Spend}_{\text{USD}} = \frac{\text{Purchase Expenditure}_{\text{INR}}}{\text{Embedded FX Rate}_{\text{INR/USD}}}$$
$$\text{Emissions}_{\text{kg CO}_2\text{e}} = \text{Spend}_{\text{USD}} \times \text{Open CEDA Sector Factor}_{\text{kg CO}_2\text{e/USD}}$$
- **Direction of Conversion:** INR spend is strictly divided by embedded FX (never multiplied).
- **Valuation Basis:** Enforces `price_basis: "Producer Price"`.
- **Attribution:** Enforces `attribution: "CEDA by Watershed"`, `license: "CC BY-SA 4.0"`.

### 3.2 Activity-Based Arithmetic & Allocation Rules
$$\alpha = \frac{\text{Purchased Quantity}}{\text{Supplier Annual Production}}$$
$$\text{Facility Emissions} = (\text{Electricity}_{\text{kWh}} \times \text{Grid Factor}) + (\text{Diesel}_{\text{Litres}} \times \text{Diesel Factor})$$
$$\text{Allocated Emissions} = \text{Facility Emissions} \times \alpha$$
- **Unit Compatibility Rule:** If `quantity_unit` (e.g., `unit`) is physically incompatible with supplier production output unit (e.g., `tonnes`), allocation is rejected with `INCOMPATIBLE_ALLOCATION_UNITS`.
- **Physical Allocation Ceiling:** If $\alpha > 1.0$ (or $> 100\%$), allocation is strictly rejected with `ALLOCATION_EXCEEDS_100_PERCENT`. Capping at 100% or denominator fabrication is prohibited.
- **Reporting Period Alignment:** Matches reporting period (`FY2022-23` or `FY2023-24`). If no verified report is submitted, returns `MISSING_SUPPLIER_ANNUAL_ACTIVITY`.
- **Method Description:** Required string `"Supplier-specific energy activity allocation estimate — synthetic demonstration data"` is embedded in all factor metadata and receipts.

### 3.3 Ineligibility Audit Table
| Purchase ID | Supplier / Product | Financial Year | Ineligibility Reason Code | HTTP Status | Root Cause & Domain Diagnostic |
| :--- | :--- | :---: | :--- | :---: | :--- |
| **`PO-2023-009`** | SUP-009 (HDPE pipes) | FY2023-24 | `ALLOCATION_EXCEEDS_100_PERCENT` | 422 | Purchased quantity (250 t) exceeds supplier production denominator (240 t), yielding invalid fraction 1.0417 (> 100%). |
| **`PO-2022-010`** | SUP-010 (Industrial boilers) | FY2022-23 | `INCOMPATIBLE_ALLOCATION_UNITS` | 422 | Purchase measured in piece counts (`2 unit`), while supplier production is recorded in mass (`9,000 tonnes`). |
| **`PO-2023-010`** | SUP-010 (Industrial boilers) | FY2023-24 | `INCOMPATIBLE_ALLOCATION_UNITS` | 422 | Purchase measured in piece counts (`3 unit`), while supplier production is recorded in mass (`9,800 tonnes`). |
| **`PO-2023-001` to `005`** | SUP-001 to SUP-005 | FY2023-24 | `MISSING_SUPPLIER_ANNUAL_ACTIVITY` | 422 | Suppliers have not yet submitted annual ESG reports for FY2023-24 (reserved for live demonstration uploads). |

---

## 4. API SPECIFICATION & INTEGRATION CHANGES

### 4.1 New Endpoint: Method Options Discovery
`GET /api/v1/manufacturer/purchases/{pid}/method-options`  
(also aliased to `GET /api/v1/manufacturer/purchase-records/{pid}/method-options`)
- **Authentication:** Manufacturer role required (`Bearer <token>`).
- **Response Structure:**
```json
{
  "purchase_record_id": "PO-2022-001",
  "financial_year": "FY2022-23",
  "product_id": "ST-HR-001",
  "supplier_id": "SUP-001",
  "purchaser_name": "ABC Manufacturing Ltd",
  "methods": {
    "product_factor": {
      "eligible": true,
      "factor_id": "factor-pcf-st-hr-001-fy23",
      "factor_value": 319.74,
      "denominator_unit": "tonnes",
      "precomputed_emissions_kgco2e": 383688.0,
      "precomputed_emissions_tco2e": 383.688,
      "description": "Product-specific emission factor calculation"
    },
    "spend_based": {
      "eligible": true,
      "factor_id": "FACT-CEDA-331110-FY22",
      "sector_code": "331110",
      "sector_name": "Iron and steel mills and ferroalloy manufacturing",
      "fx_rate": 78.186062,
      "spend_inr": 66000000.0,
      "spend_usd": 844140.22,
      "factor_value_usd": 5.189019,
      "price_basis": "Producer Price",
      "attribution": "CEDA by Watershed",
      "license": "CC BY-SA 4.0",
      "precomputed_emissions_kgco2e": 4380259.81,
      "precomputed_emissions_tco2e": 4380.2598,
      "description": "Open CEDA EEIO sector factor (CY2022 (Proxy))"
    },
    "activity_based": {
      "eligible": true,
      "financial_year": "FY2022-23",
      "supplier_id": "SUP-001",
      "purchased_quantity": 1200.0,
      "quantity_unit": "tonnes",
      "annual_production": 160000.0,
      "production_unit": "tonnes",
      "allocation_fraction": 0.0075,
      "allocation_fraction_pct": 0.75,
      "facility_emissions_kgco2e": 51158275.32,
      "precomputed_emissions_kgco2e": 383687.13,
      "precomputed_emissions_tco2e": 383.6871,
      "grid_factor_value": 0.716,
      "diesel_factor_value": 2.6853,
      "description": "Supplier-specific energy activity allocation estimate — synthetic demonstration data"
    }
  }
}
```

### 4.2 Updated Endpoint: Calculation Execution
`POST /api/v1/manufacturer/calculations`
- **Request Body (`CalculationIn`):**
```json
{
  "purchase_record_id": "PO-2022-007",
  "method": "spend_based",
  "factor_id": null,
  "allocation_basis": null,
  "allocation_value": null,
  "preview_only": false
}
```
- **Preview Behavior (`preview_only: true`):**
  - Evaluates full arithmetic and builds receipt dictionary with verification SHA-256 hash.
  - Zero database writes: does **not** insert into `calculation_runs` and does **not** alter `purchase_records`.
- **Live Execution (`preview_only: false`):**
  - Invokes `atomic_create_and_activate_calculation_run` in `backend/app/calculation_safety.py`.
  - Atomically marks previous runs for `purchase_record_id` as `is_active: false`.
  - Inserts new calculation run with `is_active: true`.
  - Updates `purchase_records` pointers (`calculated: true, active_calculation_id: <id>, active_method: <method>`).
  - Preserves historical receipts in database for full auditability.

### 4.3 Updated Endpoint: Calculation Method Selection
`POST /api/v1/manufacturer/calculations/{cid}/select`
- Invokes `atomic_activate_calculation_run` within an ACID transaction.
- Switches active method without creating duplicate active records.
- Protected by partial unique index `uniq_active_calculation_per_purchase`.

---

## 5. AUTOMATED TEST SUITE & VERIFICATION RESULTS

A comprehensive automated verification suite was executed across all unit, integration, and safety layers.

### 5.1 Test Execution Results
| Test File | Test Scope | Result | Execution Time |
| :--- | :--- | :---: | :---: |
| [`backend/tests/test_phase2_2_multi_method.py`](file:///c:/dhash/hackathon%20n%20events/INDUSTRIX/backend%20codex/backend/tests/test_phase2_2_multi_method.py) | **Phase 2.2 Dedicated Multi-Method Suite (8 tests)**<br>• Public factor catalog verification (43 factors)<br>• Method options discovery & precomputations<br>• Ineligibility classifications (PO-2023-009, PO-2022-010, PO-2023-010, PO-2023-005)<br>• Preview-only idempotency & zero DB mutation<br>• Spend-based live execution & CEDA attribution<br>• Activity-based live execution & HTTP 422 rejections<br>• Single active calculation & receipt preservation<br>• Full baseline restoration & inventory audit | **8 / 8 PASSED** | 18.01s |
| [`backend/tests/test_phase2_1_safety.py`](file:///c:/dhash/hackathon%20n%20events/INDUSTRIX/backend%20codex/backend/tests/test_phase2_1_safety.py) | **Phase 2.1 Safety & Concurrency Suite (8 tests)**<br>• Preflight zero-duplicate check<br>• Partial unique index verification<br>• Storage-engine duplicate active rejection<br>• Historical receipt preservation<br>• Atomic transaction activation<br>• Concurrency conflict handling (HTTP 409)<br>• Transaction rollback on error<br>• Primary DB isolation check | **8 / 8 PASSED** | 10.33s |
| [`backend/tests/test_double_counting_prevention.py`](file:///c:/dhash/hackathon%20n%20events/INDUSTRIX/backend%20codex/backend/tests/test_double_counting_prevention.py) | **End-to-End Double-Counting Suite (1 test)**<br>• Login, purchase fetch, calculation, and active run check | **1 / 1 PASSED** | 10.24s |
| [`backend/tests/test_api.py`](file:///c:/dhash/hackathon%20n%20events/INDUSTRIX/backend%20codex/backend/tests/test_api.py) | **Route-Level API Regression Suite (4 tests)**<br>• Auth, RBAC, submissions, deterministic PCF calculation | **4 / 4 PASSED** | 1.67s |
| [`backend/tests/test_saved_spreadsheet_formats.py`](file:///c:/dhash/hackathon%20n%20events/INDUSTRIX/backend%20codex/backend/tests/test_saved_spreadsheet_formats.py) | **Spreadsheet Format Preference Suite (1 test)**<br>• Upload format save, detect, update lifecycle | **1 / 1 PASSED** | 13.76s |
| [`backend/tests/verify_emission_calculations.py`](file:///c:/dhash/hackathon%20n%20events/INDUSTRIX/backend%20codex/backend/tests/verify_emission_calculations.py) | **Emission Inventory Audit Script**<br>• Mathematical reconciliation of all active runs | **ALL CHECKS PASSED** | 3.50s |
| **TOTAL VERIFIED SUITE** | — | **22 / 22 PASSED** | **100% Success** |

---

## 6. INVENTORY COMPARISON & DATABASE ISOLATION AUDIT

### 6.1 Isolated QA Database (`scope3track_final_qa`)
| Inventory Dimension | Prior to Phase 2.2 | Current Phase 2.2 State | Net Change |
| :--- | :---: | :---: | :---: |
| **Total Emission Factors** | 20 | **43** | +23 seeded public reference factors |
| **Product Carbon Footprint Factors** | 12 | 12 | 0 (Untouched) |
| **Grid Electricity Factors** | 0 | 2 (`FACT-CEA-GRID-FY22`, `FY23`) | +2 seeded |
| **Stationary Diesel Factors** | 0 | 1 (`FACT-IPCC-DIESEL`) | +1 seeded |
| **Open CEDA Sector Factors** | 0 | 20 (10 sectors x 2 years) | +20 seeded |
| **Total Purchase Records** | 20 | 20 | 0 (Untouched) |
| **Active Calculation Runs** | 20 | 20 | 0 (Untouched) |
| **Active Scope 3 Emissions** | 2,692.86353 t CO₂e | **2,692.86353 t CO₂e** | **0.00000 t (Identical)** |
| **Category 1 Active Emissions** | 2,688.90375 t CO₂e | **2,688.90375 t CO₂e** | **0.00000 t (Identical)** |
| **Category 2 Active Emissions** | 3.95978 t CO₂e | **3.95978 t CO₂e** | **0.00000 t (Identical)** |

### 6.2 Primary Production Database (`scope3track`) Quarantined Audit
```
=== DATABASE: scope3track ===
  Total calculation runs:  20
  Active calculation runs: 20
  Emission factors:        20
  Combined Scope 3:        2,692,863.530 kg (2,692.86353 t CO2e)
  Category 1:              2,688,903.750 kg (2,688.90375 t CO2e)
  Category 2:              3,959.780 kg (3.95978 t CO2e)
  Safety Status:           ZERO MUTATIONS DETECTED (100% UNTOUCHED)
```

---

## 7. PROPOSED 12/4/4 DEMONSTRATION PORTFOLIO READINESS

The multi-method calculation engine is fully primed to execute the proposed balanced demonstration portfolio upon user authorization.

### 7.1 Proposed Portfolio Structure
| Method Assigned | Purchase Count | Active Scope 3 Emissions | Portfolio Share | Assigned Purchase IDs |
| :--- | :---: | :---: | :---: | :--- |
| **Product-Factor** | 12 | 1,943.46 t CO₂e | 56.73% | `PO-2022-001` to `005`, `010`; `PO-2023-001` to `004`, `009`, `010` |
| **Activity-Based** | 4 | 415.13 t CO₂e | 12.12% | `PO-2022-008` (87.09 t), `PO-2022-009` (100.21 t), `PO-2023-005` (123.64 t*), `PO-2023-008` (104.18 t) |
| **Spend-Based** | 4 | 1,066.96 t CO₂e | 31.15% | `PO-2022-006` (222.19 t), `PO-2022-007` (303.34 t), `PO-2023-006` (239.44 t), `PO-2023-007` (301.99 t) |
| **TOTAL PROPOSED** | **20** | **3,425.55 t CO₂e** | **100.00%** | Reconciled across all public sources |

*\*Note: `PO-2023-005` Activity-Based calculation is eligible once supplier SUP-005's FY23-24 report is submitted during the live demonstration upload workflow.*

---

## 8. SUMMARY AND NEXT STEPS

- [x] Seeded 23 public reference factors in `scope3track_final_qa.emission_factors`.
- [x] Integrated ACID calculation safety functions into `backend/app/main.py`.
- [x] Implemented deterministic Spend-Based calculation engine with Open CEDA factors.
- [x] Implemented deterministic Activity-Based calculation engine with CEA/IPCC factors and unit validation.
- [x] Implemented ineligibility protections (`PO-2023-009`, `PO-2022-010`, `PO-2023-010`, `PO-2023-005`).
- [x] Implemented `GET /api/v1/manufacturer/purchases/{pid}/method-options` and `preview_only: bool`.
- [x] Preserved single active calculation per purchase invariant and historical receipts.
- [x] Authored and executed automated test suite `test_phase2_2_multi_method.py` (8/8 passed).
- [x] Verified full regression suite (22/22 passed across all test files).
- [x] Verified primary database `scope3track` remains completely untouched.
- [x] Reconciled QA baseline at 2,692.86353 t CO₂e across 20 active runs.

**STOP AND AWAIT USER INSTRUCTION:** Implementation is complete in QA and ready for review. No demonstration portfolio activation or production promotions will occur without explicit authorization.
