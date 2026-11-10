# TraceCarbon — Phase 2.9: Dashboard Cleanup, Auditor Evidence Viewer & Branding Report

**Reporting Date:** November 9, 2026  
**Active Database:** `scope3track_final_qa` (MongoDB Atlas)  
**Primary Database:** `scope3track` (STRICTLY READ-ONLY / UNTOUCHED)  
**Status:** **ACCEPTED & FULLY VERIFIED**

---

## Executive Summary

Phase 2.9 has completed three key frontend and full-stack enhancements for the TraceCarbon platform ahead of hackathon presentation:

1. **Dashboard Layout Cleanup**:
   - The redundant **GHG Scope 3 Breakdown** section (`CategoryDoughnut` distribution) inside `grid grid-cols-1 lg:grid-cols-12 gap-6` was completely excised from `ManufacturerDashboard.tsx`.
   - The **Emissions by Supplier** bar chart (`SupplierEmissionsBar`) was restructured into a clean, full-width card with responsive layout.
   - The unrounded sum precision disclosure footnote was preserved and elegantly relocated immediately adjacent to the KPI metric cards.
   - Unused imports (`CategoryDoughnut`, `TrendingUp`) were cleaned up with zero changes to arithmetic or portfolio runs.

2. **Auditor Interactive Evidence Viewing & Retrieval Capability**:
   - Backend file retrieval routes were created under `/api/v1/auditor/submissions/{sid}/evidence/{eid}/file` (along with supplier, manufacturer, and unified aliases) utilizing FastAPI `FileResponse`.
   - Supported file types were expanded in `evidence_upload` to accept image formats (`.png`, `.jpg`, `.jpeg`) alongside `.pdf`, `.xlsx`, and `.csv`.
   - Strict RBAC and multi-tenant security were enforced via `supplier_owned(sid, u)`: cross-auditor access is strictly blocked (`403 Forbidden`), unauthenticated access is rejected (`401 Unauthorized`), and directory traversal attacks are neutralized.
   - An interactive modal viewer was integrated into `AuditorSubmissionReviewPage.tsx`, enabling auditors to open and view embedded PDFs and high-resolution images inline with smooth loading states, graceful error fallbacks, and single-click downloads.

3. **Complete Platform Rebranding to TraceCarbon**:
   - Product Name: **TraceCarbon**
   - Tagline: **Trace. Measure. Improve.**
   - Official Brand Asset: `frontend/public/TraceCarbon Eco-Tech Logo.png` rendered with pristine pixel fidelity and zero distortion.
   - Applied across all user touchpoints: Browser document title (`TraceCarbon — Trace. Measure. Improve.`), browser favicon, Login portal, navigation sidebars across all 3 roles (Manufacturer, Supplier, Auditor), topbar header (`TraceCarbon Sustainability Portal`), export filenames, and user-facing copy.
   - Critical technical configurations (`scope3track` MongoDB names, `.env` settings, API paths, and `scope3track_token` session storage keys) were preserved intact.

---

## 1. Dashboard Cleanup: Removal of GHG Scope 3 Breakdown

### 1.1 Structural Refactoring

In `frontend/src/pages/manufacturer/ManufacturerDashboard.tsx`, the two-column container:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
  {/* Category Doughnut (lg:col-span-5) */}
  {/* Supplier Breakdown Bar (lg:col-span-7) */}
</div>
```

was restructured. The doughnut chart card was eliminated, allowing the supplier emissions bar chart to occupy the full container width:

```tsx
{/* Unrounded Sum Precision Footnote */}
<div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
  <span>
    * Total Scope 3 is computed from unrounded sums ({formatKgCO2e(totalEmissions)}). Category 1 ({formatKgCO2e(cat1Emissions)}) & Category 2 ({formatKgCO2e(cat2Emissions)}) figures reflect independent display rounding.
  </span>
</div>

{/* Supplier Breakdown Bar - Full Width */}
<div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
  <div>
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="font-semibold text-slate-900 text-sm">Emissions by Supplier</h3>
        <p className="text-xs text-slate-500">Calculated footprint per supplier partner</p>
      </div>
      <Link
        to="/manufacturer/suppliers"
        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
      >
        Manage
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
    <SupplierEmissionsBar suppliers={supplierChartData} />
  </div>
  <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
    <span>{supplierChartData.length} suppliers reporting</span>
    <span>Sorted by impact</span>
  </div>
</div>
```

### 1.2 Layout & Data Integrity Checks

| Component / Metric | Status | Value / Behavior | Verification Method |
|---|---|---|---|
| **CategoryDoughnut Chart** | **Removed** | Excised completely from DOM and bundle | Playwright check (`toHaveCount(0)`) |
| **TrendingUp Icon** | **Removed** | Cleaned from imports and JSX | TypeScript build (`npm run build`) |
| **Supplier Emissions Bar** | **Preserved & Expanded** | Full width card (`w-full`), responsive | Visual verification & DOM snapshot |
| **Total Scope 3 Metric Card** | **Preserved** | 3,425.55 t CO₂e (3,425,553.45 kg) | Automated test assertion |
| **Category 1 Metric Card** | **Preserved** | 3,421.59 t CO₂e (3,421,593.68 kg) | Automated test assertion |
| **Category 2 Metric Card** | **Preserved** | 3.96 t CO₂e (3,959.77 kg) | Automated test assertion |
| **Unrounded Sum Footnote** | **Preserved & Relocated** | Displayed clearly under KPI cards | Playwright text selector match |
| **Calculation Method Distribution**| **Preserved** | Tiered cards (PF 56.7%, SB 31.1%, AB 12.1%) | Playwright test assertion |

---

## 2. Auditor Interactive Evidence Viewing & Retrieval Capability

### 2.1 Backend Implementation & Endpoints

To provide authenticated streaming of evidence files with correct MIME headers and strict multi-tenant boundary checks, the following endpoints and features were implemented in `backend/app/main.py`:

```python
@app.get(P+"/submissions/{sid}/evidence/{eid}/file")
@app.get(P+"/auditor/submissions/{sid}/evidence/{eid}/file")
@app.get(P+"/supplier/submissions/{sid}/evidence/{eid}/file")
@app.get(P+"/manufacturer/submissions/{sid}/evidence/{eid}/file")
def get_evidence_file(sid: str, eid: str, inline: bool = Query(default=True), u = Depends(current)):
    supplier_owned(sid, u)
    e = find("evidence_documents", eid)
    if e.get("submission_id") != sid:
        raise HTTPException(404, "Evidence document not found for this submission")
    stored = e.get("stored_filename", "")
    folder = (ROOT / settings.upload_dir).resolve()
    file_path = (folder / stored).resolve()
    if not str(file_path).startswith(str(folder)) or not file_path.is_file():
        raise HTTPException(404, "Evidence file not found on disk")
    ext = file_path.suffix.lower()
    mime_types = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".csv": "text/csv; charset=utf-8",
        ".txt": "text/plain; charset=utf-8",
    }
    media_type = mime_types.get(ext, "application/octet-stream")
    original_name = e.get("filename", file_path.name)
    disposition = "inline" if inline else "attachment"
    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=original_name,
        content_disposition_type=disposition
    )
```

### 2.2 Security & Access Control Matrix

| Test Scenario | User / Client | Target Document | Expected HTTP | Actual HTTP | Result |
|---|---|---|:---:|:---:|:---:|
| **Assigned Auditor PDF Fetch** | `auditor.xyz@scope3track.demo` | `AxiomX_Utility_Bill_FY2023-24.pdf` | `200 OK` | `200 OK` | **PASSED** (application/pdf) |
| **Assigned Auditor Image Fetch** | `auditor.xyz@scope3track.demo` | `AxiomX_Emissions_Audit_Badge.png` | `200 OK` | `200 OK` | **PASSED** (image/png) |
| **Cross-Auditor Isolation** | `auditor.green@scope3track.demo` | `AxiomX_Utility_Bill_FY2023-24.pdf` | `403 Forbidden` | `403 Forbidden` | **PASSED** (RBAC enforced) |
| **Unauthenticated Request** | Anonymous Client | `AxiomX_Utility_Bill_FY2023-24.pdf` | `401 Unauthorized` | `401 Unauthorized` | **PASSED** (Auth required) |
| **Query Token Streaming** | Direct Media Player with `?token=` | `AxiomX_Utility_Bill_FY2023-24.pdf` | `200 OK` | `200 OK` | **PASSED** (Token verified) |
| **Path Traversal Attack** | Manipulated filename (`../../etc/passwd`)| Server Disk | `404 Not Found` | `404 Not Found` | **PASSED** (Path jailed) |

### 2.3 Frontend Auditor Review Workspace Integration

In `frontend/src/pages/auditor/AuditorSubmissionReviewPage.tsx`, evidence documents are displayed with rich action cards:
- File type icon (`ImageIcon` for images, `FileText` for PDFs, `Paperclip` for tabular datasets).
- Original filename, formatted byte size, upload date badge.
- **Open / View** action button: Fetches the file blob asynchronously and renders the interactive modal viewer.
- **Download** action button: Triggers browser download with the original filename.
- Interactive modal features:
  - Embedded `<iframe>` viewer for PDF invoices and utility bills.
  - Responsive `<img>` viewport with object-contain for PNG/JPG audit certificates.
  - Structured card fallback with instant download for `.xlsx` / `.csv` spreadsheets.
  - Loading spinner during blob retrieval, error alert card with retry and back-to-review actions, and clean object URL revocation to prevent memory leaks.

---

## 3. Product Rebranding to TraceCarbon

### 3.1 Brand Identity Specifications

- **Brand Name**: `TraceCarbon`
- **Tagline**: `Trace. Measure. Improve.`
- **Logo File**: `frontend/public/TraceCarbon Eco-Tech Logo.png` (dimensions 1024x1024, clean transparent padding, rich emerald leaf / circuit eco-tech motif).

### 3.2 Implemented Touchpoints

1. **HTML & Metadata (`frontend/index.html`)**:
   - Title: `TraceCarbon — Trace. Measure. Improve.`
   - Favicon: `<link rel="icon" type="image/png" href="/TraceCarbon%20Eco-Tech%20Logo.png" />`
   - Description: `TraceCarbon — Industrial sustainability platform for Scope 3 emissions reporting, multi-method calculation, and auditor verification.`

2. **Login Experience (`frontend/src/pages/auth/LoginPage.tsx`)**:
   - Header badge displaying the official logo in a 56x56px rounded container (`w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40`).
   - Title: `TraceCarbon`
   - Tagline: `Trace. Measure. Improve.`

3. **Navigation Sidebar (`frontend/src/components/layout/Sidebar.tsx`)**:
   - Header brand block featuring the logo (`w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30`).
   - Clean brand typography (`TraceCarbon` + `Trace. Measure. Improve.`).

4. **Topbar (`frontend/src/components/layout/Topbar.tsx`)**:
   - `TraceCarbon Sustainability Portal` portal breadcrumb.

5. **Supplier Portal & Guidance Copy**:
   - `MonthlyReportsPage.tsx`: "TraceCarbon supports both Annual Financial Year and Monthly reporting for GHG Protocol emissions accounting."
   - `ReportingRequirementsPage.tsx`: "TraceCarbon includes an automatic conversion engine..."
   - `IntegratedSpreadsheetUploadModal.tsx`: "When you upload this file format in future months, TraceCarbon will automatically recognize the headers..."

6. **Download Filenames**:
   - Purchase template: `tracecarbon_purchase_records.xlsx`
   - Emissions inventory report: `TraceCarbon_Emissions_Inventory_YYYY-MM-DD.csv`
   - Supplier directory report: `TraceCarbon_Suppliers_Directory_YYYY-MM-DD.csv`

---

## 4. Automated Verification & Test Results

### 4.1 Playwright E2E Suite (`24_phase2_9_branding_evidence.spec.ts`)

```
Running 3 tests using 1 worker

  ✓ 1 [chromium-desktop] › TC-01: Rebranding & Manufacturer Dashboard Cleanup Verification (2.6s)
  ✓ 2 [chromium-desktop] › TC-02: Supplier Portal Branding & Navigation Verification (2.6s)
  ✓ 3 [chromium-desktop] › TC-03: Auditor Interactive Evidence Viewer & RBAC Enforcement (5.6s)

  3 passed (11.9s)
```

### 4.2 Playwright Regression Suite (`23_phase2_7_qa_acceptance.spec.ts`)

```
Running 5 tests using 1 worker

  ✓ 1 [chromium-desktop] › TC-01: Manufacturer Dashboard displays 3,425.55 t CO2e, Category 1/2, tiered methods, and unrounded footnote (4.2s)
  ✓ 2 [chromium-desktop] › TC-02: Calculations Page displays 28 receipts (20 active, 8 superseded) and modal shows provenance (4.3s)
  ✓ 3 [chromium-desktop] › TC-03: Reports Page displays CEDA CC BY-SA 4.0 license, CEA/IPCC disclosures, and CSV export (3.5s)
  ✓ 4 [chromium-desktop] › TC-04: Supplier Portal displays only SUP-001 records, reporting requirements, and reduction suggestions (6.1s)
  ✓ 5 [chromium-desktop] › TC-05: Auditor Portal displays assigned submissions, activity metrics table, and no fake approve/reject button (3.9s)

  5 passed (23.2s)
```

### 4.3 TypeScript Production Build Verification

```
> scope3track-frontend@1.0.0 build
> tsc -b && vite build

vite v6.4.5 building for production...
transforming...
✓ 1691 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.03 kB │ gzip:   0.57 kB
dist/assets/index-DOD84Q_4.css   42.95 kB │ gzip:   7.45 kB
dist/assets/index-Dew6JOhy.js   699.37 kB │ gzip: 193.62 kB
✓ built in 4.06s
```

---

## 5. Sign-Off & Demonstration Readiness

- **Isolated QA Verification**: All tests executed strictly against `scope3track_final_qa`. Primary `scope3track` remains unmodified.
- **Frontend Build**: Zero compiler warnings or TypeScript errors. Production bundle optimized and built cleanly.
- **Zero Calculation Mutation**: Portfolio inventory stands at exactly **3,425.5534 t CO₂e** across 20 active runs.
- **Auditor Workflow**: Evidence documents can now be inspected live in the auditor workspace with full cryptographic and RBAC boundaries intact.
- **Branding Uniformity**: The platform presents a cohesive, professional identity as **TraceCarbon — Trace. Measure. Improve.**
