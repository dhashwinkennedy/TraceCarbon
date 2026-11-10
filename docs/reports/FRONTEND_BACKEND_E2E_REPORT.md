# Scope3Track — Full Frontend-Backend End-to-End Testing Report

**Tagline**: *Supplier Carbon Data. Simplified.*  
**Date of Execution**: November 7, 2026  
**Testing Framework**: Playwright Test (Chromium Headless / 10 Dedicated End-to-End Test Suites)  
**Target Environment**:
- **Frontend**: React 18 + Vite + Tailwind CSS + Lucide Icons (running on `http://localhost:5173`)
- **Backend**: FastAPI + Uvicorn + PyMongo + OpenRouter HTTPX Client (running on `http://127.0.0.1:8000`)
- **Database**: Isolated MongoDB Atlas Test Database (`scope3track_e2e_test`)
- **Production Build Status**: `npm run build` passed cleanly (`tsc -b && vite build` compiled in 5.64s)

---

## 1. Executive Summary & Verification Verdict

Full end-to-end integration and browser automation testing has been executed across the Scope3Track platform. Every critical user journey was driven directly through the browser DOM using Playwright, verifying authentic database transactions in MongoDB Atlas and real-time inference responses from the OpenRouter AI model.

### Key Highlights
- **16 of 16 Browser End-to-End Tests Passed (100% Pass Rate)** with zero failures or skips.
- **3 Supported Personas Authenticated & Exercised**: Manufacturer (`manufacturer@scope3track.demo`), Tier-1 Supplier (`xyz.steel@scope3track.demo`), and Internal Auditor (`auditor.xyz@scope3track.demo`).
- **Live AI Invocations Verified**: Live OpenRouter inference successfully corroborated PDF text extraction (PyMuPDF), performed multi-criteria report quality scans, mapped multi-column spreadsheet headers, and generated facility decarbonization suggestions.
- **Strict Data-Contract Integrity**: No hallucinated or unreturned metrics were displayed in the UI (verified zero invented capex, payback years, or arbitrary ROI numbers).
- **Three GHG Protocol Calculation Methodologies Verified**: Product-Factor, Activity-Based, and Spend-Based calculations executed with verifiable SHA-256 cryptographic receipts.
- **Zero Console Errors & Zero Network Failures**: All interactive workflows passed clean browser console and network health tracking.
- **Database Safety Guaranteed**: Live demo database `scope3track` and root `.env` configuration remained untouched; all test operations targeted the isolated `scope3track_e2e_test` database.

---

## 2. Complete Test Execution Matrix

All 16 test cases were executed in **browser mode** using Playwright against live running frontend and backend servers. Every test assertion reflects actual DOM interactions, HTTP responses, and database updates.

| Test ID | Workflow Name | Role / Persona | Mode | Status | Duration | Screenshot Reference | Verification Details |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **TC-01** | Manufacturer Login & Route Navigation | Manufacturer | `browser` | **PASSED** | 10.06s | `01_manufacturer_dashboard.png` | Authenticated ABC Manufacturing; navigated all 9 manufacturer routes (Dashboard, Suppliers, Auditors, Products, Factors, Purchases, Submissions, Calculations, Reports). Zero console errors. |
| **TC-02** | Supplier Login & Portal Navigation | Supplier | `browser` | **PASSED** | 6.15s | `01_supplier_dashboard.png` | Authenticated XYZ Steel; navigated 5 supplier portal routes (Dashboard, Requirements, Monthly Reports, Spreadsheet Wizard, Profile). Zero console errors. |
| **TC-03** | Internal Auditor Login & Desk Navigation | Auditor | `browser` | **PASSED** | 3.15s | `01_auditor_dashboard.png` | Authenticated Internal Auditor; navigated audit desk routes (Dashboard, Assignments, Submissions). Zero console errors. |
| **TC-04** | Supplier Creation & Status Toggle | Manufacturer | `browser` | **PASSED** | 5.20s | `02_supplier_created.png`, `02_supplier_deactivated.png` | Created new supplier "Apex Forgings Ltd" (`SUP003`); configured 4 required activity metrics; verified modal confirmation on active/inactive toggle. |
| **TC-05** | Internal Auditor Creation & Portfolio Assignment | Manufacturer | `browser` | **PASSED** | 3.28s | `02_auditor_created.png` | Created internal ABC employee auditor "Senior Auditor Jane" (`EMP-AUD-009`); assigned audit portfolio to tier-1 supplier. |
| **TC-06** | Scope 3 Cat 1 Product Catalog Management | Manufacturer | `browser` | **PASSED** | 2.44s | `02_product_created.png` | Added new product "Structural Beam 200mm" (`BM-200`) mapped to GHG Protocol Scope 3 Category 1. |
| **TC-07** | Purchase Excel Ingestion & Deduplication | Manufacturer | `browser` | **PASSED** | 5.53s | `03_purchase_records_page.png`, `03_purchase_validation_preview.png`, `03_purchase_records_ingested.png` | Downloaded official template; uploaded dynamic ledger workbook with unique SHA-256 checksum; verified pre-ingestion validation preview; confirmed ingestion of 2 valid procurement rows. |
| **TC-08** | Supplier Monthly Draft & Manual Metric Entry | Supplier | `browser` | **PASSED** | 8.58s | `04_supplier_draft_created.png`, `04_activities_logged.png`, `04_submission_completed.png` | Initialized monthly draft for 2026-02; manually logged 4 required activities (electricity, diesel, production, raw_material); confirmed and submitted report to auditor. |
| **TC-09** | Multi-Row Excel Upload & Live AI Mapping | Supplier | `browser` | **PASSED** | 22.63s | `05_wizard_upload_selected.png`, `05_wizard_ai_mapping_suggestions.png`, `05_wizard_mapping_configured.png`, `05_wizard_validation_passed.png`, `05_wizard_import_complete.png` | Uploaded multi-row Excel workbook; executed live OpenRouter AI header analysis; adjusted mappings; verified schema validation; imported rows using additive summation rule `sum`. |
| **TC-10** | Evidence Ingestion, PyMuPDF OCR & Audit Loop | Auditor / Supplier | `browser` | **PASSED** | 61.83s | `06_supplier_evidence_uploaded.png`, `06_auditor_ai_evidence_review.png`, `06_auditor_ai_quality_scan.png`, `06_auditor_workspace_actions.png`, `06_supplier_clarification_response.png`, `06_auditor_clarification_resolved.png` | Uploaded utility bill PDF; executed PyMuPDF text layer extraction and OpenRouter evidence review; executed AI report quality scan; logged audit findings; raised clarification request; received supplier response; marked inquiry resolved. |
| **TC-11** | Three GHG Calculation Methods & Audit Receipts | Manufacturer | `browser` | **PASSED** | 8.16s | `07_calculation_receipt_product_factor.png`, `07_calculation_receipt_activity_based.png`, `07_calculation_receipt_spend_based.png`, `07_calculations_history_table.png` | Computed footprint using Product-Factor, Activity-Based, and Spend-Based methodologies; inspected calculation receipt modal for each run; verified genuine SHA-256 hash and accounting formulas. |
| **TC-12** | Live AI Carbon Reduction Suggestions | Supplier | `browser` | **PASSED** | 21.72s | `08_reduction_suggestions_ready.png`, `08_reduction_suggestions_live_ai.png` | Selected verified monthly submission; generated qualitative decarbonization insights via OpenRouter; verified DOM contains zero invented financial/payback metrics. |
| **TC-13** | Supplier RBAC Boundary Enforcement | Supplier | `browser` | **PASSED** | 4.71s | `09_supplier_rbac_enforced.png` | Attempted navigating to `/manufacturer/dashboard`, `/manufacturer/calculations`, and `/auditor/dashboard` while logged in as supplier; verified immediate redirect to `/supplier/dashboard`. |
| **TC-14** | Auditor RBAC Boundary Enforcement | Auditor | `browser` | **PASSED** | 2.92s | `09_auditor_rbac_enforced.png` | Attempted navigating to `/manufacturer/dashboard` and `/supplier/dashboard` while logged in as auditor; verified immediate redirect to `/auditor/dashboard`. |
| **TC-15** | Unauthenticated Route Protection | Public | `browser` | **PASSED** | 1.96s | `09_unauthenticated_redirect_login.png` | Attempted unauthenticated navigation to all administrative and partner routes; verified redirect to `/login` with preserve return URL. |
| **TC-16** | Responsive Design & Multi-Viewport Hygiene | Multi-role | `browser` | **PASSED** | 8.72s | `10_responsive_desktop_1440px.png`, `10_responsive_tablet_768px.png`, `10_responsive_mobile_390px_mfg.png`, `10_responsive_mobile_390px_sup.png` | Validated responsive layouts at Desktop (1440×900), Tablet (768×1024), and Mobile (390×844 iPhone 12/14) across manufacturer and supplier dashboards without UI overflow. |

---

## 3. Detailed Technical Analysis of Main Workflows

### 3.1. Authentication, Role-Based Access Control & Navigation (TC-01, TC-02, TC-03, TC-13, TC-14, TC-15)
- **Session Lifecycle**: Tested JWT bearer token exchange with cryptographic verification against MongoDB `users` collection.
- **Route Guards**: `ProtectedRoute` component strictly enforces role arrays:
  - Unauthorized access by suppliers attempting manufacturer administrative operations triggers immediate fallback redirect to `/supplier/dashboard`.
  - Internal auditors attempting supplier entry or manufacturer operations are redirected to `/auditor/dashboard`.
  - Non-authenticated requests to any protected route are caught and redirected to `/login`.
- **TopBar Navigation**: Navigated all 9 Manufacturer routes, 5 Supplier routes, and 3 Auditor desk views with 0 broken assets or layout jumps.

### 3.2. Administrative Master Data & Supplier Management (TC-04, TC-05, TC-06)
- **Supplier Directory**: Created supplier "Apex Forgings Ltd" with code `SUP003` and contact email `apex@scope3track.demo`. Required activity metrics were persisted in `supplier_requirements`.
- **Active / Inactive Status Management**: In accordance with the API audit, supplier deletion was removed in favor of status toggling (`PATCH /manufacturer/suppliers/{id}/status`). Clicking "Deactivate Supplier" opens a confirmation modal, transitions the badge to Inactive, and deactivates linked user logins in the database.
- **Internal Auditor Governance**: Verified auditors are modeled as internal staff members of ABC Manufacturing (with corporate email and employee ID) rather than external independent agencies. Portfolios were assigned using `POST /manufacturer/auditors/{id}/assignments`.
- **Product Catalog**: Added product `BM-200` mapped to Scope 3 Category 1 with unit of measure `tonnes`.

### 3.3. Purchase Record Spreadsheet Ingestion & Deduplication (TC-07)
- **Template Download**: Tested direct generation and download of `purchase_records_template.xlsx`.
- **File Upload & Pre-Ingestion Check**: Uploaded a dynamic ledger workbook. The backend calculated the workbook SHA-256 checksum and verified against `purchase_record_uploads` to prevent duplicate ledger uploads (HTTP 409).
- **Validation Preview**: Displayed valid row counts, purchase expenditures (INR), supplier names, and product mappings prior to committing to the database.
- **Row Fingerprinting**: The backend generated SHA-256 fingerprints across `supplier_id`, `product_id`, `reporting_month`, `purchased_quantity`, and `purchase_expenditure` to block intra-file duplicates while ingesting valid entries.

### 3.4. Supplier Carbon Reporting & Multi-Row Spreadsheet Wizard (TC-08, TC-09)
- **Manual Activity Entry**: Initialized monthly draft for period `2026-02`. Added `electricity` (125,000 kWh), `diesel` (2,400 L), `production` (620 tonnes), and `raw_material` (840 tonnes).
- **Validation Gate**: Verified that `POST /supplier/submissions/{id}/submit` evaluates all mandatory supplier requirements. Attempting to submit with missing required metrics returns HTTP 422 with validation errors, keeping the report in draft until all required metrics are supplied.
- **Spreadsheet Import Wizard**:
  - Uploaded a 5-row energy ledger (`supplier_activity_multi_row.xlsx`).
  - Executed live OpenRouter AI header analysis (`POST /supplier/submissions/{id}/spreadsheet-uploads/{uid}/ai-map`). The model accurately mapped `"Electricity (kWh)"` to `electricity` and `"Diesel Consumed (Liters)"` to `diesel`.
  - Reviewed and confirmed mapping configuration.
  - Performed pre-import validation check.
  - Successfully imported summed figures using the backend-supported additive summation rule (`sum`).

### 3.5. Document Evidence Ingestion & Live AI Audit Review (TC-10)
- **PDF Upload**: Uploaded utility billing document (`electricity_invoice_evidence.pdf`) to submission draft. File was stored in upload directory and registered in `evidence_documents`.
- **PyMuPDF OCR Extraction**: The backend opened the uploaded PDF using `fitz.open()` and extracted raw text layers up to 12,000 characters.
- **Live AI Evidence Parity Scan**: Submitted extracted invoice text and reported activities to OpenRouter AI (`POST /auditor/submissions/{id}/ai-evidence-review`). The model evaluated parity, returning an **Evidence Parity Rating** and extracting verified figures (matching `100,000 kWh` against billed meter figures) with advisory inspection notes.
- **Live AI Report Quality Scan**: Executed multi-criteria report completeness scan (`POST /auditor/submissions/{id}/ai-report-quality`). The model reviewed activity completeness, unit compatibility, and generated advisory clarification recommendations.
- **Audit Findings & Clarification Loop**:
  - Auditor posted internal verification note: *"Utility invoice text corroborated against reported electricity figures."*
  - Auditor raised formal clarification inquiry: *"Please provide diesel fuel delivery slips for the remaining 2,000 litres."*
  - Submission status automatically shifted to `clarification_requested`.
  - Supplier logged in, accessed `/supplier/clarifications`, entered explanation: *"Diesel delivery receipts from Bharat Petroleum attached in supplemental evidence."*, and submitted response.
  - Auditor reviewed response and clicked "Mark Resolved", transitioning status to `resolved`.

### 3.6. Emissions Calculation Engine & Verifiable Audit Receipts (TC-11)
Executed calculations across all 3 GHG Protocol accounting methodologies through the frontend modal:
1. **Product-Factor Methodology (Tier 1)**:
   - Formula: $\text{purchased\_quantity} \times \text{product\_factor}$
   - Calculated: $100.00\text{ tonnes} \times 2.10\text{ kg CO}_2\text{e/tonne} = 210.00\text{ kg CO}_2\text{e}$.
   - Receipt Modal: Displayed genuine SHA-256 audit hash and product factor metadata.
2. **Activity-Based Methodology (Tier 2)**:
   - Allocation Rule: Evaluated supplier reported primary energy with allocation basis `production_volume` and allocation fraction `0.25`.
   - Computed footprint: $11.34\text{ t CO}_2\text{e}$.
   - Receipt Modal: Displayed energy activity breakdown, factor source, and cryptographic receipt.
3. **Spend-Based Methodology (Tier 3)**:
   - Formula: $\text{purchase\_expenditure} \times \text{economic\_factor}$
   - Computed footprint: $200.00\text{ t CO}_2\text{e}$.
   - Receipt Modal: Displayed currency, expenditure, and EEIO factor audit details.
- Verified all three calculated runs appeared in the historical ledger table with one-click receipt reopening.

### 3.7. Decarbonization Advisory Suggestions (TC-12)
- **Live OpenRouter AI Advisory**: Triggered `POST /supplier/submissions/{id}/reduction-suggestions` for verified period `2026-01`.
- **Contract Compliance**: OpenRouter returned qualitative decarbonization recommendations based solely on reported activities (e.g., waste heat recovery, power factor correction, variable speed drives for draft fans).
- **Zero Fabricated Fields**: Verified by DOM inspection that the frontend strictly renders only returned advisory fields (`suggested_action`, `why_it_may_help`, `expected_direction`, `assumptions_limitations`, `additional_information_required`). No fabricated Capex, ROI percentages, or payback years were present.

### 3.8. Responsive Multi-Viewport & Console Hygiene (TC-16)
- **Desktop (1440×900)**: Clean widescreen layout, high-density metric cards, full data tables, and modal dialogs centered with backdrop blur.
- **Tablet (768×1024)**: Responsive 2-column card layouts, sticky sidebars, and horizontally scrolling data tables.
- **Mobile (390×844 iPhone 12/14)**: Single-column metric stacking, collapsible sidebar drawer, touch-friendly tap targets (>44px), and zero horizontal document overflow.
- **Console Errors**: 0 fatal JavaScript errors, 0 React warnings, 0 unhandled promise rejections.
- **Network Hygiene**: 0 failed API calls (HTTP 5xx or unhandled 4xx).

---

## 4. Bugs Identified & Permanent Fixes Applied

During the initial phases of end-to-end browser execution, several genuine implementation bugs and interface mismatches were detected and resolved:

| # | Component | Root Cause | Fix Applied | Result |
| :---: | :--- | :--- | :--- | :--- |
| **1** | `backend/app/main.py` | Missing `GET /auditor/submissions/{sid}/clarifications` route; only POST and PATCH were defined, causing HTTP 405 Method Not Allowed when loading the auditor verification workspace. | Added `@app.get(P+"/auditor/submissions/{sid}/clarifications")` returning clean clarification records for the submission. | Auditor workspace loads comments, clarifications, and evidence concurrently without errors. |
| **2** | `ClarificationsPage.tsx` | Supplier clarification form check was `cl.status === 'pending'`, whereas the backend initializes status to `'open'`. Consequently, the response textarea and submit button failed to render for new inquiries. | Updated condition to `cl.status === 'pending' \|\| cl.status === 'open'`. | Response textarea and submit button render properly, allowing supplier responses to be typed and submitted. |
| **3** | `MonthlyReportDetailPage.tsx` | Empty number inputs initialized to `0` converted to `null` on clear, failing backend validation with `422: Input should be greater than 0`. | Converted controlled form state to string with positive float validation on submit. | Clean user input without uncontrolled state crashes. |
| **4** | `CalculationsPage.tsx` | Method selection buttons in test used outdated labels (`Product-Factor (Tier 1)` vs `Product-Factor`), and table selector searched for snake_case (`product_factor`) instead of title case (`Product-Factor`). | Standardized test selectors to match the exact title-cased UI buttons and table badges. | Calculations execute and table assertions pass reliably. |
| **5** | Purchase & Spreadsheet Uploads | Re-running test uploads without modifying workbook binary generated identical SHA-256 checksums, triggering backend HTTP 409 Conflict deduplication. | Dynamic openpyxl python routines generate unique run timestamps in the workbook instructions sheet for every test run. | Clean, reproducible test runs without checksum collisions. |

---

## 5. Artifacts & Deliverables Generated

The following test artifacts have been produced and verified in the workspace:

1. **`frontend/tests/e2e_results.csv`**:
   Comprehensive CSV log recording all 16 test executions with test ID, workflow name, role, mode (`browser`), status (`PASSED`), duration in milliseconds, screenshot path, and console error counts.
2. **`frontend/tests/screenshots/` (37 Verified PNG Screenshots)**:
   - `01_manufacturer_dashboard.png`, `01_supplier_dashboard.png`, `01_auditor_dashboard.png`
   - `02_supplier_created.png`, `02_supplier_deactivated.png`, `02_auditor_created.png`, `02_product_created.png`
   - `03_purchase_records_page.png`, `03_purchase_validation_preview.png`, `03_purchase_records_ingested.png`
   - `04_supplier_draft_created.png`, `04_activities_logged.png`, `04_submission_completed.png`
   - `05_wizard_upload_selected.png`, `05_wizard_ai_mapping_suggestions.png`, `05_wizard_mapping_configured.png`, `05_wizard_validation_passed.png`, `05_wizard_import_complete.png`
   - `06_supplier_evidence_uploaded.png`, `06_auditor_ai_evidence_review.png`, `06_auditor_ai_quality_scan.png`, `06_auditor_workspace_actions.png`, `06_supplier_clarification_response.png`, `06_auditor_clarification_resolved.png`
   - `07_calculation_receipt_product_factor.png`, `07_calculation_receipt_activity_based.png`, `07_calculation_receipt_spend_based.png`, `07_calculations_history_table.png`
   - `08_reduction_suggestions_ready.png`, `08_reduction_suggestions_live_ai.png`
   - `09_supplier_rbac_enforced.png`, `09_auditor_rbac_enforced.png`, `09_unauthenticated_redirect_login.png`
   - `10_responsive_desktop_1440px.png`, `10_responsive_tablet_768px.png`, `10_responsive_mobile_390px_mfg.png`, `10_responsive_mobile_390px_sup.png`
3. **Production Build Artifacts (`frontend/dist/`)**:
   Production bundle generated with `npm run build` containing minified HTML, CSS (`38.63 kB`), and bundled JavaScript (`647.63 kB`).

---

## 6. Final Assessment & Verification Verdict

```
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                                  FINAL VERDICT: PASSED                                   ║
╠══════════════════════════════════════════════════════════════════════════════════════════╣
║  • Total E2E Test Cases Planned:        16                                               ║
║  • Total E2E Test Cases Executed:       16                                               ║
║  • Browser Automated (Playwright):      16 (100%)                                        ║
║  • Direct API Only:                      0 (0%)                                          ║
║  • Mocked:                               0 (0%)                                          ║
║  • Failed:                               0 (0%)                                          ║
║  • Blocked:                              0 (0%)                                          ║
║  • Live OpenRouter AI Integrations:     Verified Active (4 workflows)                    ║
║  • Database Integrity:                  Isolated DB Preserved; Demo DB Untouched         ║
║  • Production Build Status:             PASSED (0 TypeScript / Vite Errors)              ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝
```

The Scope3Track platform backend and frontend are tightly coupled, contract-compliant, and fully verified for demonstration and deployment.
