# Scope3Track — Category 2 Capital Goods Demonstration Setup & Audit Report

**System**: Scope3Track — Supply Chain Carbon Accounting  
**Tagline**: *Supplier Carbon Data. Simplified.*  
**Target Database**: `scope3track` (Main Demo MongoDB Atlas Database)  
**Reporting Period**: `2026-05` (May 2026)  
**User Role**: Manufacturer (`manufacturer@scope3track.demo`)  
**Status**: **PARTIALLY COMPLETED / BLOCKED AT STEP 6 AS INSTRUCTED**

---

## Executive Summary

As instructed, an end-to-end setup and verification was conducted to create and verify a Scope 3 Category 2 (Capital Goods) demonstration record in the main production demo database (`scope3track`). 

The setup was executed using the actual running FastAPI backend and React frontend via Playwright browser automation, strictly adhering to the prompt's integrity directives:
> *"Do not invent or modify an emission factor to make the calculation work. If the existing factor is missing or incompatible, stop and report the blocker rather than fabricating a successful result."*  
> *"Clearly distinguish between successfully executed steps and steps that were blocked. Do not claim success without actually completing and verifying the workflow."*

### Key Results & Execution Status:
1. **Product Verification**: **SUCCESSFUL** — Product `product-machine` ("Production machinery", code `MAC-001`) was verified in `scope3track` as `Category 2`, relevant unit `unit`, and `active: true`.
2. **Supplier Verification**: **SUCCESSFUL** — Supplier `supplier-xyz` (code `SUP001`, "XYZ Steel") was verified as active and compatible.
3. **Excel Ledger Workflow**: **SUCCESSFUL** — Downloaded the official Excel template (`Purchase Records` worksheet), populated the synthetic May 2026 machinery acquisition row ($2\text{ units}$, $\text{INR } 5,000,000$), uploaded through the frontend UI, passed validation preview ($1\text{ Valid Row}$, $0\text{ Invalid Rows}$), and confirmed ingestion.
4. **Database Persistence**: **SUCCESSFUL** — Purchase record was persisted in MongoDB `scope3track.purchase_records` with ID `6a32f3c6-7b6f-4075-add4-67400f739be7`.
5. **Emission Factor Audit**: **BLOCKED** — Factor `factor-machinery-demo` ($12,500\text{ kg CO}_2\text{e}/\text{unit}$) is **ABSENT** from the main demo database `scope3track`. It previously existed only as an isolated test fixture in `scope3track_e2e_test`.
6. **Calculation Execution**: **BLOCKED BY DESIGN** — Attempting calculation with the only available product factor (`factor-steel`, tonnes) returned **HTTP 422: `Purchase quantity unit is incompatible with factor`**. In strict compliance with instructions, we **did not invent or inject an unauthorized emission factor** into `scope3track`. Execution was halted at Step 6, and the blocker is reported below.

---

## 1. Step-by-Step Execution & Blocker Matrix

| Step | Operation | Target Entity / Endpoint | Expected Result | Actual Result | Status |
|:---:|---|---|---|---|:---:|
| **1** | Database Selection | `scope3track` MongoDB Atlas | Connect server to `scope3track` | Connected live server on port 8000 | **PASSED** |
| **2** | Product Catalog Verification | `GET /api/v1/manufacturer/products` | MAC-001, Category 2, unit, active | Found `product-machine`, Category 2, unit, active | **PASSED** |
| **3** | Supplier Verification | `GET /api/v1/manufacturer/suppliers` | SUP001 active supplier | Found `supplier-xyz`, code `SUP001`, active | **PASSED** |
| **4** | Emission Factor Audit | `GET /api/v1/manufacturer/emission-factors` | `factor-machinery-demo` present in db | **MISSING** from `scope3track` (only 4 factors exist) | **BLOCKED** |
| **5** | Excel Template Ingestion | Frontend `/manufacturer/purchases` | Valid preview & confirmation | Uploaded & confirmed 1 valid row (2 units, ₹50L) | **PASSED** |
| **6** | Purchase Record Storage | `db['purchase_records']` | Persisted in `scope3track` | Stored as ID `6a32f3c6-7b6f-4075-add4-67400f739be7` | **PASSED** |
| **7** | Product-Factor Selection | Modal `/manufacturer/calculations` | Select `factor-machinery-demo` | Factor absent from dropdown; only `factor-steel` present | **BLOCKED** |
| **8** | Calculation Execution | `POST /manufacturer/calculations` | $2 \times 12,500 = 25,000\text{ kg CO}_2\text{e}$ | Cannot execute without factor (HTTP 422 unit mismatch) | **BLOCKED** |
| **9** | Receipt Verification | Calculation Receipt Modal | 25 tonnes CO₂e receipt | Blocked due to Step 8 | **BLOCKED** |
| **10** | Dashboard Verification | `/manufacturer/dashboard` (2026-05) | Cat 2 = 25,000 kg CO₂e | Cat 2 = 0.00 kg CO₂e ("No calculated Cat 2 emissions") | **BLOCKED** |

---

## 2. Product & Supplier Verification

### Product Record (`scope3track.products`)
- **Product ID**: `product-machine`
- **Product Name**: `Production machinery`
- **Product Code**: `MAC-001`
- **Scope 3 Category**: `Category 2`
- **Relevant Unit**: `unit`
- **Active Status**: `True`
- **Demo Marker**: `True`
- **Backend Verification**: Confirmed via `GET /api/v1/manufacturer/products`
- **Browser Screenshot**: [01_product_catalog_category2.png](file:///c:/dhash/hackathon%20n%20events/INDUSTRIX/backend%20codex/frontend/tests/screenshots/category2-demo/01_product_catalog_category2.png)

### Supplier Record (`scope3track.suppliers`)
- **Supplier ID**: `supplier-xyz`
- **Supplier Name**: `XYZ Steel`
- **Supplier Code**: `SUP001`
- **Contact Email**: `xyz.steel@scope3track.demo`
- **Active Status**: `True`
- **Demo Marker**: `True`

---

## 3. Purchase Record Creation via Fixed Excel Template

The purchase record was ingested strictly through the Manufacturer Dashboard UI using the official Excel spreadsheet template.

### Ingested Purchase Specification:
- **Supplier Code**: `SUP001`
- **Product Name**: `Production machinery`
- **Reporting Month**: `2026-05`
- **Purchased Quantity**: `2`
- **Quantity Unit**: `unit`
- **Purchase Expenditure**: `5,000,000.00`
- **Currency**: `INR`

### Excel Workflow Steps Completed:
1. **Template Download**: Downloaded official backend template `scope3track_purchase_records.xlsx` containing sheet `Purchase Records` with headers:
   `['supplier_id', 'product_name', 'reporting_month', 'purchased_quantity', 'quantity_unit', 'purchase_expenditure', 'currency']`
2. **File Population**: Appended the synthetic May 2026 machinery acquisition row and saved to `frontend/tests/fixtures/category2_machinery_upload.xlsx`.
3. **Frontend Upload**: Uploaded via `<input type="file">` on `/manufacturer/purchases`.
4. **Validation Preview**:
   - Total Rows Scanned: `1`
   - Valid Rows: `1`
   - Invalid Rows: `0`
   - SHA-256 Checksum: Verified and stored in `purchase_uploads`.
   - **Browser Screenshot**: [02_purchase_excel_validation_preview.png](file:///c:/dhash/hackathon%20n%20events/INDUSTRIX/backend%20codex/frontend/tests/screenshots/category2-demo/02_purchase_excel_validation_preview.png)
5. **Confirmation & Ingestion**:
   - Clicked `"Confirm & Ingest (1 Valid Rows)"`.
   - Backend converted `SUP001` $\rightarrow$ `supplier-xyz` and `Production machinery` $\rightarrow$ `product-machine`.
   - Computed row fingerprint: `ef034c451bc05fbc2013b8e8de008f06007421654fb8befc0d37f7b1a4d7decd`.
   - Displayed confirmation banner: `"Successfully ingested 1 purchase records into system!"`.
   - Ledger table updated showing row: `XYZ Steel`, `product-machine`, `2026-05`, `2 unit`, `INR 5,000,000.00`.
   - **Browser Screenshot**: [03_confirmed_category2_purchase.png](file:///c:/dhash/hackathon%20n%20events/INDUSTRIX/backend%20codex/frontend/tests/screenshots/category2-demo/03_confirmed_category2_purchase.png)

### Persisted MongoDB Document (`scope3track.purchase_records`):
```json
{
  "_id": "6aef81597348b4d2d4410016",
  "id": "6a32f3c6-7b6f-4075-add4-67400f739be7",
  "supplier_id": "supplier-xyz",
  "product_id": "product-machine",
  "reporting_month": "2026-05",
  "purchased_quantity": 2.0,
  "quantity_unit": "unit",
  "purchase_expenditure": 5000000.0,
  "currency": "INR",
  "fingerprint": "ef034c451bc05fbc2013b8e8de008f06007421654fb8befc0d37f7b1a4d7decd",
  "upload_id": "ee44c19b-44a4-478e-ba7d-0418d6f5cf7b",
  "created_at": "2026-11-07T19:51:53.242Z"
}
```

---

## 4. Blocker Investigation: Missing Emission Factor

### Existing Emission Factors in `scope3track`:
A direct query across `scope3track.emission_factors` via `GET /api/v1/manufacturer/emission-factors` revealed exactly four seeded factors:

| Factor ID | Name | Factor Type | Value | Denominator Unit | Currency | Applicable Activity | Demo Flag |
|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| `factor-steel` | DEMO illustrative factor | `product_factor` | 2.1 | `tonnes` | — | — | `True` |
| `factor-electricity` | DEMO illustrative factor | `activity_based` | 0.4 | `kWh` | — | `electricity` | `True` |
| `factor-diesel` | DEMO illustrative factor | `activity_based` | 2.68 | `litres` | — | `diesel` | `True` |
| `factor-spend` | DEMO illustrative factor | `spend_based` | 0.2 | `INR` | `INR` | — | `True` |

**Browser Screenshot**: [06_emission_factors_audit.png](file:///c:/dhash/hackathon%20n%20events/INDUSTRIX/backend%20codex/frontend/tests/screenshots/category2-demo/06_emission_factors_audit.png)

### Why is `factor-machinery-demo` Missing?
1. The synthetic seed script `backend/app/scripts/seed_mock_data.py` only seeded the four factors above.
2. In the prior investigation, `factor-machinery-demo` was created dynamically as a temporary fixture inside the isolated test database `scope3track_e2e_test` via `setup_cat2_fixture.py`, and was never inserted into the production/demo database `scope3track`.
3. In `scope3track`, **zero emission factors exist with denominator unit `unit`**.

### What Happens in the Calculation UI?
1. On `/manufacturer/calculations`, clicking **Run Calculation** opens the modal.
2. Selecting target purchase `product-machine (2026-05) — 2 unit / INR 5,000,000` and method `Product-Factor` filters the factor dropdown to only `factor_type == "product_factor"`.
3. The only available option in the dropdown is:  
   `DEMO illustrative factor — not for real reporting — 2.1 tonnes (factor-steel)`
4. `factor-machinery-demo` is absent from the dropdown.
5. **Browser Screenshots**:
   - [04_calculation_form_product_factor.png](file:///c:/dhash/hackathon%20n%20events/INDUSTRIX/backend%20codex/frontend/tests/screenshots/category2-demo/04_calculation_form_product_factor.png)
   - [05_factor_dropdown_and_incompatibility.png](file:///c:/dhash/hackathon%20n%20events/INDUSTRIX/backend%20codex/frontend/tests/screenshots/category2-demo/05_factor_dropdown_and_incompatibility.png)

### API Unit Incompatibility Rejection:
Executing the calculation with the available `factor-steel` returns:
```json
HTTP 422 Unprocessable Entity
{
  "detail": "Purchase quantity unit is incompatible with factor"
}
```
Executing directly with the ID `factor-machinery-demo` returns:
```json
HTTP 404 Not Found
{
  "detail": "Emission_Factor not found"
}
```

In accordance with Section 3 of your instructions:
> *"Do not invent or modify an emission factor to make the calculation work. If the existing factor is missing or incompatible, stop and report the blocker rather than fabricating a successful result."*

We halted execution at this step without fabricating or modifying any emission factor.

---

## 5. Dashboard State Before and After

### Baseline State (`scope3track`):
- **Category 1 Emissions**: `0.00 kg CO₂e` (seeded 2026-01 steel purchase uncalculated)
- **Category 2 Emissions**: `0.00 kg CO₂e`
- **Combined Emissions**: `0.00 kg CO₂e`
- **Category 2 Card Subtitle**: `"No calculated Category 2 emissions available for this period"`

### Current State (After Purchase Ingestion, Pre-Calculation):
- **Category 1 Emissions**: `0.00 kg CO₂e` (Unchanged)
- **Category 2 Emissions**: `0.00 kg CO₂e` (Unchanged)
- **Combined Emissions**: `0.00 kg CO₂e` (Unchanged)
- **Month Filter `2026-05`**: Category 1 = `0.00 kg CO₂e`, Category 2 = `0.00 kg CO₂e`, Combined = `0.00 kg CO₂e`
- **Finding**: **Uncalculated purchase records do NOT prematurely inflate inventory emissions**. The dashboard reflects strictly verified calculation runs.
- **Browser Screenshot**: [07_manufacturer_dashboard_cat2_status.png](file:///c:/dhash/hackathon%20n%20events/INDUSTRIX/backend%20codex/frontend/tests/screenshots/category2-demo/07_manufacturer_dashboard_cat2_status.png)

---

## 6. How to Unblock the Calculation for Live Demonstration

To complete the calculation of $2\text{ units} \times 12,500\text{ kg CO}_2\text{e}/\text{unit} = 25,000\text{ kg CO}_2\text{e}$ ($25\text{ tonnes CO}_2\text{e}$) during your live hackathon demo, the synthetic demonstration factor must be explicitly authorized and added to `scope3track.emission_factors`.

### Authorized Factor Document:
```json
{
  "id": "factor-machinery-demo",
  "name": "DEMO capital machinery equipment factor — illustrative",
  "factor_type": "product_factor",
  "factor_value": 12500.0,
  "denominator_unit": "unit",
  "source_name": "DEMO synthetic illustrative data; not an official source",
  "demo": true,
  "version": 1,
  "created_at": "2026-11-08T00:00:00Z"
}
```

Once this factor is seeded:
1. Open **Emissions Calculations** (`/manufacturer/calculations`).
2. Select target purchase: `product-machine (2026-05) — 2 unit / INR 5,000,000`.
3. Select methodology: `Product-Factor`.
4. Select factor: `DEMO capital machinery equipment factor — illustrative (12500 unit)`.
5. Click **Execute Calculation** $\rightarrow$ generates audit receipt for **$25,000\text{ kg CO}_2\text{e}$ ($25.00\text{ t CO}_2\text{e}$)** under **Category 2**.
6. The Manufacturer Dashboard for `2026-05` will immediately update:
   - **Category 2: Capital Goods**: `25.00 t CO₂e` (Subtitle: `Machinery & capitalized assets`).
   - **Category 1: Purchased Goods**: `0.00 kg CO₂e`.
   - **Combined Total**: `25.00 t CO₂e`.

---

## 7. Captured Demonstration Screenshots Index

All screenshots were captured live using headless Chromium via Playwright and saved in `frontend/tests/screenshots/category2-demo/`:

| Screenshot File | Description | Checkpoint Verified |
|---|---|---|
| [01_product_catalog_category2.png](file:///c:/dhash/hackathon%20n%20events/INDUSTRIX/backend%20codex/frontend/tests/screenshots/category2-demo/01_product_catalog_category2.png) | Product Catalog table | `Production machinery` (MAC-001) verified as Category 2, unit, active |
| [02_purchase_excel_validation_preview.png](file:///c:/dhash/hackathon%20n%20events/INDUSTRIX/backend%20codex/frontend/tests/screenshots/category2-demo/02_purchase_excel_validation_preview.png) | Pre-Ingestion Validation Summary | Validated 1 row ($2\text{ units}$, $\text{INR } 5\text{M}$), 0 invalid rows |
| [03_confirmed_category2_purchase.png](file:///c:/dhash/hackathon%20n%20events/INDUSTRIX/backend%20codex/frontend/tests/screenshots/category2-demo/03_confirmed_category2_purchase.png) | Purchase Records ledger | Confirmed ingestion of May 2026 machinery purchase row |
| [04_calculation_form_product_factor.png](file:///c:/dhash/hackathon%20n%20events/INDUSTRIX/backend%20codex/frontend/tests/screenshots/category2-demo/04_calculation_form_product_factor.png) | Emissions Calculation Modal | Purchase record selected with Product-Factor method |
| [05_factor_dropdown_and_incompatibility.png](file:///c:/dhash/hackathon%20n%20events/INDUSTRIX/backend%20codex/frontend/tests/screenshots/category2-demo/05_factor_dropdown_and_incompatibility.png) | Factor Dropdown Inspection | Shows absence of `factor-machinery-demo` in `scope3track` |
| [06_emission_factors_audit.png](file:///c:/dhash/hackathon%20n%20events/INDUSTRIX/backend%20codex/frontend/tests/screenshots/category2-demo/06_emission_factors_audit.png) | Emission Factors Library | Full audit of the 4 seeded factors in the main demo DB |
| [07_manufacturer_dashboard_cat2_status.png](file:///c:/dhash/hackathon%20n%20events/INDUSTRIX/backend%20codex/frontend/tests/screenshots/category2-demo/07_manufacturer_dashboard_cat2_status.png) | Manufacturer Dashboard | Shows Category 2 card state ($0.00\text{ kg CO}_2\text{e}$) for May 2026 |

---

*Report certified by Scope3Track Engineering Team.*  
*Scope3Track — Supplier Carbon Data. Simplified.*
