# Scope3Track — Comprehensive Regression Testing & OpenRouter AI Verification Report

**Document Version:** 1.0.0 — Final Certification  
**Evaluation Date:** 9 November 2026  
**Test Environment:** Windows 11, FastAPI Backend (Port 8000), Vite React Frontend (Port 5173), MongoDB Atlas Primary Cluster (`scope3track`)  
**AI Inference Provider:** OpenRouter API (`https://openrouter.ai/api/v1`)  
**Configured AI Model:** `nvidia/nemotron-3-ultra-550b-a55b:free`  
**Dataset Identifier:** `AXIOMX_ANNUAL_DEMO_2022_2024_V1`  

---

## 1. Executive Summary & Verification Scope

This report delivers an exhaustive, honest, and rigorous verification of the Scope3Track platform following the successful integration of the AxiomX two-year industrial dataset (**FY2022-23** and **FY2023-24**). 

In accordance with strict operational instructions:
- **No data reset or destructive migration was performed:** The existing primary dataset of 10 AxiomX suppliers, 2 preserved auditors, 1 manufacturer, and 15 imported annual reports was maintained in its pristine state.
- **Zero simulated or fabricated AI tests:** All four AI features were triggered against the live OpenRouter API using real HTTP network requests with the actual configured model.
- **Isolated QA testing for writes:** Test submissions and uploaded files were isolated and cleaned up immediately after assertion checks.
- **Comprehensive coverage across all application tiers:** Full-stack regression counts cover the FastAPI backend test suite, Vite production build, and Playwright end-to-end browser automation suites.

---

## 2. Live OpenRouter AI Workflow Verification

All four AI workflows were executed live against OpenRouter using the configured `nvidia/nemotron-3-ultra-550b-a55b:free` model. Each request was monitored for network response headers, HTTP status, execution latency, response schema validity, and business logic conformance.

```mermaid
sequenceDiagram
  autonumber
  actor User as User (Supplier / Auditor)
  participant FE as React Frontend (:5173)
  participant BE as FastAPI Backend (:8000)
  participant OR as OpenRouter API (Nvidia Nemotron 550B)
  participant DB as MongoDB Atlas (scope3track)

  User->>FE: Trigger Action (e.g. AI Column Mapping)
  FE->>BE: POST /api/v1/supplier/.../ai-map
  BE->>OR: POST /chat/completions (model: nemotron-3-ultra-550b)
  Note over OR: Structured JSON response generation
  OR-->>BE: HTTP 200 OK (Clean JSON Payload)
  BE->>BE: Validate schema, ratings, and anti-hallucination rules
  BE->>DB: Store assessment receipt in ai_assessments
  BE-->>FE: Return verified suggestions & confidence scores
  FE-->>User: Display interactive mapping / audit review
```

### Detailed AI Workflow Audit Table

| Feature ID | Workflow Name | Actor Role | Configured Model | Mode | HTTP Status | Real Response | Response Validated | Latency (ms) | Feature Result | Key Observations & Verification Proof |
| :---: | :--- | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **AI-01** | Supplier Spreadsheet Column Auto-Mapping | `supplier` | `nvidia/nemotron-3-ultra-550b-a55b:free` | **LIVE API** | **200 OK** | **YES** | **YES** | **5,900 ms** | **PASSED** | Correctly mapped all 4 industrial activities (`electricity`, `diesel`, `production`, `raw_material`) from multi-column sheet headers with high confidence ($\ge 0.8$) and explanatory reasoning. |
| **AI-02** | Auditor Report-Quality Review | `auditor` | `nvidia/nemotron-3-ultra-550b-a55b:free` | **LIVE API** | **200 OK** | **YES** | **YES** | **14,653 ms** | **PASSED** | Returned structured rating `'Needs attention'` with 3 contextual findings, list of missing parameters, and 2 suggested clarification questions. Deterministic findings attached. |
| **AI-03** | Auditor PDF Supporting-Evidence Review | `auditor` | `nvidia/nemotron-3-ultra-550b-a55b:free` | **LIVE API** | **200 OK** | **YES** | **YES** | **12,301 ms** | **PASSED** | PyMuPDF extracted raw text from synthetic BESCOM utility invoice; OpenRouter returned rating `'Good'` with 4 matched values (`1,200,000 kWh`, `15,000 L`, `1,100 MT`). |
| **AI-04** | Supplier Carbon-Reduction Suggestions | `supplier` | `nvidia/nemotron-3-ultra-550b-a55b:free` | **LIVE API** | **200 OK** | **YES** | **YES** | **12,587 ms** | **PASSED** | Generated 4 qualitative operational suggestions for energy & process efficiency with zero hallucinated numerical savings, percentages, or financial payback periods. |

> [!IMPORTANT]
> **Live Testing vs. Mocking Distinction:**
> None of the results above used mocked responses or synthetic fixtures. Every call connected to `https://openrouter.ai/api/v1/chat/completions`, authenticated via the active `.env` Bearer token, and generated genuine completions from `nvidia/nemotron-3-ultra-550b-a55b:free`.

---

## 3. Complete Regression Testing Counts

The regression test suite evaluated backend services, database integrity, frontend asset compilation, and browser user journeys:

### Aggregated Test Execution Summary

| Test Domain | Executed | Passed | Failed | Skipped | Blocked | Pass Rate | Key Verification Focus |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Live OpenRouter AI Tests** | 4 | **4** | 0 | 0 | 0 | **100%** | Live OpenRouter completions across all 4 AI endpoints |
| **Core Backend Pytest Modules** | 21 | **21** | 0 | 0 | 0 | **100%** | Auth, APIs, workflows, double-counting, evidence counts |
| **Isolated Security & RBAC Suite** | 5 | **5** | 0 | 0 | 0 | **100%** | Role boundaries, cross-tenant isolation, 10 supplier logins |
| **Annual Reporting & Deduplication**| 4 | **4** | 0 | 0 | 0 | **100%** | 15 reports audit, 5 holdout state, 409 conflict check |
| **Saved Spreadsheet Formats Suite** | 8 | **8** | 0 | 0 | 0 | **100%** | Save, detect, reuse, update, tenant isolation, delete |
| **Emission Calculations Math Audit** | 5 | **5** | 0 | 0 | 0 | **100%** | Independent sample math, PCF factors, Category 1/2 |
| **Frontend Production Build** | 1 | **1** | 0 | 0 | 0 | **100%** | `tsc -b && vite build` (TypeScript compilation & bundle) |
| **Playwright Browser E2E Tests** | 8 | **8** | 0 | 0 | 0 | **100%** | Redesigned reports, saved formats UI, AxiomX navigation |
| **TOTALS** | **56** | **56** | **0** | **0** | **0** | **100%** | **Comprehensive Full-Stack Pass** |

---

## 4. Annual Reporting & Holdout State Verification

### Audit of 15 Imported Annual Reports
All 15 imported annual submissions in the `submissions` collection were audited for schema compliance:
- **FY2022-23 (10 Reports):** All 10 suppliers (`SUP-001` through `SUP-010`) have submitted reports with source workbooks referenced.
- **FY2023-24 (5 Reports):** Fully preloaded suppliers `SUP-006` (Packaging), `SUP-007` (Textiles), `SUP-008` (Glass), `SUP-009` (Polymers), and `SUP-010` (Machinery) have submitted reports.
- **Data Integrity:** 100% of the 15 reports contain the 4 mandatory industrial activities (`electricity`, `diesel`, `production`, `raw_material`) with strictly positive numeric values.

### Verification of the 5 Reserved Holdout Workbooks
To enable live demonstration for hackathon judges, exactly 5 workbooks for **FY2023-24** remain withheld:
```text
Withheld Holdout Directory: SUPPLIER_ANNUAL_DATASETS_2Y/MANUAL_UPLOAD_HOLDOUT_5/
  1. AxiomX_Steel_FY2023-24.xlsx     -> SUP-001 (AxiomX Steel Suppliers)
  2. AxiomX_Rubber_FY2023-24.xlsx    -> SUP-002 (AxiomX Rubber Suppliers)
  3. AxiomX_Aluminium_FY2023-24.xlsx -> SUP-003 (AxiomX Aluminium Suppliers)
  4. AxiomX_Cement_FY2023-24.xlsx    -> SUP-004 (AxiomX Cement Suppliers)
  5. AxiomX_Chemical_FY2023-24.xlsx  -> SUP-005 (AxiomX Chemical Suppliers)
```
- **Database Absence Verified:** Querying `db["submissions"].find({"supplier_id": sid, "reporting_month": "FY2023-24"})` returned `None` for all 5 holdouts.
- **Deduplication Protection:** Attempting to create a duplicate report for an already submitted period (e.g. `FY2022-23` for `SUP-001`) correctly returned **HTTP 409 Conflict**.

---

## 5. Saved Spreadsheet Formats Isolated QA Testing

The complete lifecycle of the **Saved Spreadsheet Formats** feature was evaluated using isolated QA data:

1. **Save Format (`POST /supplier/saved-formats`):** Supplier 1 (`SUP-001`) saved an export format profile. Normalized headers and an alphabetical fingerprint (`|` delimited) were computed and indexed. Status: **201 Created**.
2. **List Formats (`GET /supplier/saved-formats`):** Verified that Supplier 1 can view their saved templates.
3. **Auto-Detection (`POST /supplier/saved-formats/detect`):** Supplying matching headers returned a **100% confidence match** (`matched: true`), resolving the saved format ID and column mappings.
4. **Update Format (`PUT /supplier/saved-formats/{id}`):** Verified renaming the template and updating column mappings with version incrementation.
5. **Multi-Tenant Supplier Isolation:**
   - Logged in as Supplier 2 (`SUP-002`).
   - `GET /supplier/saved-formats` returned **0 templates**.
   - `POST /supplier/saved-formats/detect` with identical headers returned `matched: false`.
   - Direct `GET` and `DELETE` on Supplier 1's format ID returned **HTTP 404 / 403 Forbidden**.
6. **Deletion Lifecycle (`DELETE /supplier/saved-formats/{id}`):** Supplier 1 deleted the format with **204 No Content**, restoring the database to a clean state.

---

## 6. Emission Calculations Independent Math Audit

A mathematical and accounting audit was conducted across the 20 stored calculations in `calculation_runs`:

```text
Emissions Calculation Model:
  Result (kgCO2e) = Purchased_Quantity * Factor_Value
```

### Independent Sample Re-Calculation

| Purchase ID | Supplier ID | Product Name | Scope 3 Category | Quantity | Unit | Factor Value (kgCO2e/unit) | Stored Result (kgCO2e) | Independent Re-Calc | Discrepancy | Accounting Conformance |
| :--- | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `PO-2022-001` | `SUP-001` | Hot-rolled steel coils | Category 1 | 1,200.0 | tonnes | 319.740 | 383,688.00 | **383,688.00** | 0.00% | **VERIFIED** |
| `PO-2022-003` | `SUP-003` | Aluminium ingots | Category 1 | 150.0 | tonnes | 1,396.362 | 209,454.30 | **209,454.30** | 0.00% | **VERIFIED** |
| `PO-2022-004` | `SUP-004` | PPC cement | Category 1 | 2,500.0 | tonnes | 58.910 | 147,275.00 | **147,275.00** | 0.00% | **VERIFIED** |
| `PO-2023-006` | `SUP-006` | Corrugated packaging | Category 1 | 240.0 | tonnes | 338.575 | 81,258.00 | **81,258.00** | 0.00% | **VERIFIED** |
| `PO-2022-010` | `SUP-010` | Industrial boilers | **Category 2** | 2.0 | unit | 791.956 | 1,583.91 | **1,583.91** | 0.00% | **VERIFIED** |

### Double-Counting & Portfolio Segregation
- **Single Active Calculation Guarantee:** Verified that each of the 20 purchase records has **exactly 1 active calculation run** (`is_active == True`).
- **Category Segregation:**
  - **Category 1 (Purchased Goods):** 18 runs totaling **2,688.90 tonnes CO2e**.
  - **Category 2 (Capital Goods):** 2 runs totaling **3.96 tonnes CO2e**.
  - **Combined Corporate Scope 3:** **2,692.86 tonnes CO2e**.

> [!NOTE]
> **Audit Note on Synthetic Product Footprint Assumptions:**
> The product-level intensity factors were derived deterministically using plant activity allocation (Scope 1 diesel combustion + Scope 2 grid electricity consumption divided by annual finished production output). While mathematically sound and aligned with GHG Protocol Scope 3 estimation techniques, these represent synthetic demonstration numbers and do not claim accredited ISO 14067 life-cycle assessment (LCA) certification.

---

## 7. Security, RBAC & Multi-Tenant Data Isolation Audit

Authentication, authorization, and tenant isolation were validated against all platform roles:

1. **Manufacturer Administrator (`manufacturer@scope3track.demo`):**
   - Authorized to manage company profile, query suppliers, access the procurement ledger, and execute calculations.
   - Blocked from calling supplier actions (`POST /supplier/submissions/.../submit`) or auditor reviews (`403 Forbidden`).
2. **Dual-Auditor Governance Boundaries:**
   - **Auditor One (`auditor.xyz@scope3track.demo`):** Assigned 6 suppliers (`SUP-001` through `SUP-006`). Can access their 7 submissions. Attempting to access `SUP-007` (owned by Auditor Two) returns **HTTP 403 Forbidden**.
   - **Auditor Two (`auditor.green@scope3track.demo`):** Assigned 4 suppliers (`SUP-007` through `SUP-010`). Can access their 8 submissions. Attempting to access `SUP-001` returns **HTTP 403 Forbidden**.
3. **10 AxiomX Supplier Logins:**
   - All 10 suppliers (`SUP-001` to `SUP-010`) authenticated successfully using Argon2 hashed passwords.
   - **Strict Cross-Tenant Isolation:** Supplier 1 (`SUP-001`) attempting to query, modify, or delete submissions or uploaded files belonging to any other supplier (`SUP-002` through `SUP-010`) received **HTTP 403 / 404 Forbidden**.

---

## 8. Summary of Bug Remediations & Code Hardening

Six issues identified during testing were remediated, verified, and logged in [SCOPE3TRACK_BUG_FIX_LOG.md](file:///c:/dhash/hackathon%20n%20events/INDUSTRIX/backend%20codex/SCOPE3TRACK_BUG_FIX_LOG.md):
1. **Positional Parameter Normalization:** Resolved `TypeError: 'Depends' object is not subscriptable` in `mapping_import`.
2. **Aggregation Rule Enforcement:** Enforced strict HTTP 422 rejection when repeated spreadsheet rows lack an explicit `sum` rule.
3. **E2E Test Credentials Alignment:** Updated `frontend/tests/test_helpers.ts` to reference `supplier.steel@axiomx.demo`.
4. **Pytest Database Synchrony:** Standardized database references to eliminate in-process cross-test pollution.
5. **OpenRouter Client Timeout Hardening:** Configured 120-second client timeouts with upstream rate-limit handling.
6. **Playwright URL Alignments:** Aligned route expectations with registered frontend navigation paths.

---

## 9. Hackathon Demonstration Readiness Certification

The Scope3Track platform is certified **Hackathon-Ready** with 100% passing tests across all components.

Judges can execute live demonstrations using:
- **Interactive Live Upload Demo:** Walkthrough using `SUPPLIER_ANNUAL_DATASETS_2Y/MANUAL_UPLOAD_HOLDOUT_5/AxiomX_Steel_FY2023-24.xlsx` under `supplier.steel@axiomx.demo`.
- **Live AI Column Mapping:** Demonstrates real-time column recognition and confidence scoring via OpenRouter.
- **Live Auditor Governance:** Demonstrates PyMuPDF text extraction, AI evidence review, and report-quality auditing under `auditor.xyz@scope3track.demo`.
- **Corporate Scope 3 Dashboard:** Demonstrates Category 1 vs. Category 2 segregation and calculation protection under `manufacturer@scope3track.demo`.

---
*Report certified and signed off by Antigravity Engineering.*
