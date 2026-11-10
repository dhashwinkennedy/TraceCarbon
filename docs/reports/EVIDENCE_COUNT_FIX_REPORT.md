# SCOPE3TRACK — EVIDENCE DOCUMENT COUNT DEFECT INVESTIGATION & RESOLUTION REPORT

**System:** Scope3Track — Enterprise Scope 3 GHG Accounting Platform  
**Tagline:** *Supplier Carbon Data. Simplified.*  
**Author:** Senior Backend QA, Security & Frontend Architect  
**Date:** November 8, 2026  
**Status:** **RESOLVED, VERIFIED & FULLY PASSING**  
**Database Isolation:** Tested on `scope3track_e2e_test` (Primary demo DB `scope3track` and root `.env` preserved intact)

---

## 1. Executive Summary

A critical data-visibility defect was identified across Scope3Track: in the submission tables and dashboards of all three roles (**Manufacturer**, **Supplier**, and **Internal Auditor**), the document/paperclip evidence icon displayed **`0`** even when supporting verification documents (utility bills, invoices, fuel receipts) had already been successfully uploaded and stored in MongoDB.

### Resolution Summary
1. **Confirmed Root Cause**: MongoDB `submissions` documents never stored or calculated `evidence_count`. The backend list endpoints (`/supplier/submissions`, `/manufacturer/submissions`, `/auditor/submissions`) and detail endpoints returned raw submission records omitting `evidence_count`. The React UI fell back to `sub.evidence_count ?? 0`, resulting in hardcoded-like zero displays. Furthermore, the Manufacturer submission detail page never invoked `getSubmissionEvidence()`.
2. **Backend Architecture**: Implemented a performant, batched `$group` aggregation pipeline `attach_evidence_counts()` that computes accurate document counts in $O(1)$ database trips per request without N+1 query overhead. Attached dynamic counts to all single and list endpoints.
3. **Frontend UX Enhancement**: Connected the paperclip document icons to interactive deep-links (`#evidence`), allowing users in all three roles to jump straight to the supporting evidence section. Fixed `SubmissionDetailPage.tsx` to load and display actual audit documents and metadata.
4. **Automated Verification**:
   - Backend `pytest` suite: **12 / 12 PASSED** (including `test_evidence_count.py` and `test_double_counting_prevention.py`).
   - Frontend `playwright` browser test: **PASSED (35.6s)** verifying the live lifecycle ($0 \rightarrow 2 \rightarrow \text{reload} \rightarrow 1$).
   - 100% parity verified between MongoDB records, backend API responses, and browser rendering.

---

## 2. Confirmed Root Cause Analysis

Thorough inspection of `backend/app/main.py`, MongoDB Atlas collections, and the React frontend revealed three concurrent root causes:

### Cause 1: Backend Submissions Endpoints Omitted `evidence_count`
In `backend/app/main.py`:
- `POST /api/v1/supplier/submissions/{sid}/evidence` inserted uploaded documents into the `evidence_documents` collection with `submission_id: sid`.
- However, the `submissions` collection in MongoDB did **not** maintain an `evidence_count` counter field.
- The listing endpoints:
  - `GET /api/v1/supplier/submissions`
  - `GET /api/v1/manufacturer/submissions`
  - `GET /api/v1/auditor/submissions`
  simply executed `[clean(x) for x in db()["submissions"].find(...)]`.
- Because the `submissions` documents contained no `evidence_count` key, the returned JSON omitted the field entirely.

### Cause 2: React Frontend Default Fallback to 0
In the React frontend, every dashboard and list page had code of the form:
```tsx
<span>{sub.evidence_count ?? 0}</span>
// or
<span>{sub.evidence_count ?? 0} files</span>
```
Because `sub.evidence_count` was `undefined` in every API response payload, JavaScript evaluated `undefined ?? 0` to `0`, displaying zero files even when documents existed in MongoDB.

### Cause 3: Manufacturer Submission Detail Page Data Gap
In `frontend/src/pages/manufacturer/SubmissionDetailPage.tsx`:
```tsx
// Defective line:
const evidenceList = (submission as any).evidence || [];
```
The page expected `submission.evidence` to be embedded on the submission object (which does not exist), and never queried `manufacturerService.getSubmissionEvidence(id)`. Consequently, the detail page also reported `Supporting Evidence (0)` and displayed no files.

---

## 3. Implementation Details

### 3.1 Backend Aggregation & Endpoint Fixes (`backend/app/main.py`)

To prevent N+1 query performance degradation when listing submissions, a batched MongoDB aggregation pipeline was created:

```python
def attach_evidence_counts(subs: list[dict]) -> list[dict]:
    """Attaches accurate evidence_count to each submission in a single aggregation query."""
    if not subs: return []
    sub_ids = [s["id"] for s in subs if "id" in s]
    pipeline = [
        {"$match": {"submission_id": {"$in": sub_ids}}},
        {"$group": {"_id": "$submission_id", "count": {"$sum": 1}}}
    ]
    counts = {doc["_id"]: doc["count"] for doc in db()["evidence_documents"].aggregate(pipeline)}
    sup_ids = [s["supplier_id"] for s in subs if s.get("supplier_id") and not s.get("supplier_name")]
    sup_map = {sup["id"]: sup.get("name") for sup in db()["suppliers"].find({"id": {"$in": sup_ids}})} if sup_ids else {}
    for s in subs:
        s["evidence_count"] = counts.get(s["id"], 0)
        if not s.get("supplier_name") and s.get("supplier_id") in sup_map:
            s["supplier_name"] = sup_map[s["supplier_id"]]
    return subs

def attach_single_evidence_count(s: dict) -> dict:
    """Attaches accurate evidence_count and supplier_name to a single submission object."""
    if s and "id" in s:
        s["evidence_count"] = db()["evidence_documents"].count_documents({"submission_id": s["id"]})
        if not s.get("supplier_name") and s.get("supplier_id"):
            sup = db()["suppliers"].find_one({"id": s["supplier_id"]})
            if sup and sup.get("name"):
                s["supplier_name"] = sup["name"]
    return s
```

#### Updated Endpoints:
1. `GET /api/v1/supplier/submissions`: Returns `{"items": attach_evidence_counts(items)}`.
2. `GET /api/v1/supplier/submissions/{sid}`: Returns `attach_single_evidence_count(s)` via `supplier_owned`.
3. `POST /api/v1/supplier/submissions`: Returns `attach_single_evidence_count(clean(d))` with initial count 0.
4. `POST /api/v1/supplier/submissions/{sid}/evidence`: Updates submission `updated_at` timestamp upon upload.
5. `DELETE /api/v1/supplier/submissions/{sid}/evidence/{eid}`: Unlinks physical file, deletes document record, and updates `updated_at`.
6. `GET /api/v1/manufacturer/submissions`: Returns `{"items": attach_evidence_counts(items)}`.
7. `GET /api/v1/manufacturer/submissions/{sid}`: Returns `attach_single_evidence_count(find("submissions", sid))`.
8. `GET /api/v1/auditor/submissions`: Returns `{"items": attach_evidence_counts(items)}`.
9. `GET /api/v1/auditor/submissions/{sid}`: Returns `attach_single_evidence_count(s)` via `supplier_owned`.

---

### 3.2 Frontend Updates & UX Enhancements

| File | Change |
|---|---|
| `frontend/src/pages/manufacturer/SubmissionsPage.tsx` | Linked document icon & count to `/manufacturer/submissions/${sub.id}#evidence`. |
| `frontend/src/pages/manufacturer/SubmissionDetailPage.tsx` | Added `manufacturerService.getSubmissionEvidence(id)` to `fetchData()`, rendered actual files with size and extension tags, and added `id="evidence"`. |
| `frontend/src/pages/supplier/MonthlyReportsPage.tsx` | Linked document icon & count to `/supplier/submissions/${sub.id}#evidence`. |
| `frontend/src/pages/supplier/MonthlyReportDetailPage.tsx` | Added `id="evidence"` anchor to Supporting Verification Evidence section. |
| `frontend/src/pages/supplier/SupplierDashboard.tsx` | Added paperclip icon and linked evidence column to `/supplier/submissions/${sub.id}#evidence`. |
| `frontend/src/pages/auditor/AuditorSubmissionsPage.tsx` | Linked document icon & count to `/auditor/submissions/${sub.id}#evidence`. |
| `frontend/src/pages/auditor/AuditorDashboard.tsx` | Added paperclip icon and linked evidence column to `/auditor/submissions/${sub.id}#evidence`. |
| `frontend/src/pages/auditor/AuditorSubmissionReviewPage.tsx` | Added `id="evidence"` anchor and embedded attached evidence document cards directly in Section 5 alongside the AI review tool. |

---

## 4. Test Results and Verification

### 4.1 Backend Pytest Suite

```bash
$env:PYTHONPATH="backend"; $env:MONGODB_DB="scope3track_e2e_test"; python -m pytest backend/tests -v
```

| Test File | Test Case | Status | Details |
|---|---|:---:|---|
| `test_evidence_count.py` | `test_evidence_count_complete_lifecycle` | **PASSED** | 13 lifecycle checks ($0 \rightarrow 1 \rightarrow 2 \rightarrow 1 \rightarrow 0$) across Supplier, Manufacturer, and Auditor. |
| `test_evidence_count.py` | `test_evidence_security_and_isolation` | **PASSED** | Verifies 403 Forbidden for cross-supplier access and unassigned auditors. |
| `test_double_counting_prevention.py` | `test_double_counting_prevention_end_to_end` | **PASSED** | Verifies active run selection and double-counting prevention. |
| `test_api.py` | `test_health_and_auth` | **PASSED** | Health check & Argon2 auth verification. |
| `test_api.py` | `test_supplier_access_control_and_submission` | **PASSED** | Submission creation and activity unit conversion. |
| `test_api.py` | `test_auditor_assignment_enforced` | **PASSED** | Auditor assignment boundary checks. |
| `test_api.py` | `test_deterministic_product_factor_calculation` | **PASSED** | Product factor Scope 3 calculation verification. |
| `test_ai_and_workflows.py` | 5 AI & workflow tests | **PASSED** | Report quality, reduction suggestions, mapping import rules. |

**Result: 12 passed in 29.8s.**

---

### 4.2 Playwright End-to-End Browser Test (`14_evidence_count_lifecycle.spec.ts`)

```bash
npx --prefix frontend playwright test tests/14_evidence_count_lifecycle.spec.ts
```

```
Running 1 test using 1 worker

  ok 1 frontend\tests\14_evidence_count_lifecycle.spec.ts:6:3 › E2E Suite 14: Evidence Document Counts Multi-Role Verification › TC-EVID-01: Multi-role evidence document count lifecycle (0 -> 2 -> reload -> 1 -> API/DB parity) (35.6s)

  1 passed (38.1s)
```

#### Lifecycle Step-by-Step Validation:
1. **Initial State (0 Files)**:
   - Supplier logs in, creates draft for `2026-08`.
   - Submissions list displays `0 files`.
2. **Uploading 2 Documents**:
   - Uploads `electricity_invoice_evidence.pdf`.
   - Uploads `fuel_delivery_receipt.pdf`.
   - Detail page header updates dynamically: `Supporting Verification Evidence (2)`.
3. **Multi-Role Count 2 Verification**:
   - **Supplier List**: Table row displays `2 files`.
   - **Supplier Dashboard**: Recent reports table displays `2 files`.
   - **Manufacturer List**: Table row displays `2`.
   - **Manufacturer List Reload**: Persists at `2`.
   - **Manufacturer Detail Page**: Navigates via `#evidence`, displays `Supporting Evidence (2)` and lists both files with names and sizes.
   - **Auditor List**: Table row displays `2`.
   - **Auditor List Reload**: Persists at `2`.
   - **Auditor Review Workspace**: Section 5 displays `Review Evidence (2 files)` and lists both files.
4. **Deletion (2 $\rightarrow$ 1 Document)**:
   - Supplier clicks trash icon on `electricity_invoice_evidence.pdf`.
   - Document removed; detail page updates to `Supporting Verification Evidence (1)`.
5. **Multi-Role Count 1 Verification**:
   - **Supplier List**: Displays `1 files`.
   - **Manufacturer List**: Displays `1` (persists on reload).
   - **Auditor List**: Displays `1` (persists on reload).

---

### 4.3 Database and API Parity Verification

Direct cross-check executed against isolated test database `scope3track_e2e_test`:

| Inspection Layer | Evidence Count | Document ID | Filename | Size |
|---|:---:|---|---|---|
| **MongoDB Atlas** (`evidence_documents`) | **1** | `f38d9ce0-66a4-4686-9731-baf09a9e8f66` | `fuel_delivery_receipt.pdf` | 505 B |
| **Supplier API** (`/supplier/submissions/{id}`) | **1** | `f38d9ce0-66a4-4686-9731-baf09a9e8f66` | `fuel_delivery_receipt.pdf` | 505 B |
| **Supplier Evidence API** (`.../evidence`) | **1 item** | `f38d9ce0-66a4-4686-9731-baf09a9e8f66` | `fuel_delivery_receipt.pdf` | 505 B |
| **Manufacturer API** (`/manufacturer/submissions/{id}`) | **1** | `f38d9ce0-66a4-4686-9731-baf09a9e8f66` | `fuel_delivery_receipt.pdf` | 505 B |
| **Manufacturer Evidence API** (`.../evidence`) | **1 item** | `f38d9ce0-66a4-4686-9731-baf09a9e8f66` | `fuel_delivery_receipt.pdf` | 505 B |
| **Auditor API** (`/auditor/submissions/{id}`) | **1** | `f38d9ce0-66a4-4686-9731-baf09a9e8f66` | `fuel_delivery_receipt.pdf` | 505 B |
| **Auditor Evidence API** (`.../evidence`) | **1 item** | `f38d9ce0-66a4-4686-9731-baf09a9e8f66` | `fuel_delivery_receipt.pdf` | 505 B |

$$\text{MongoDB Count (1)} \equiv \text{API Count (1)} \equiv \text{Evidence Items (1)} \equiv \text{UI Display (1)}$$

---

### 4.4 Role Security and Access Control Enforcement

| User | Attempted Endpoint | Expected Status | Actual Status | Security Result |
|---|---|:---:|:---:|---|
| `green.aluminium` (Unrelated Supplier) | `GET /supplier/submissions/96c8aac2...` | `403 Forbidden` | `403` | **PASS** — Cross-tenant isolation enforced. |
| `green.aluminium` (Unrelated Supplier) | `GET /supplier/submissions/96c8aac2.../evidence` | `403 Forbidden` | `403` | **PASS** — Evidence files inaccessible. |
| `auditor.green` (Unassigned Auditor) | `GET /auditor/submissions/96c8aac2...` | `403 Forbidden` | `403` | **PASS** — Assignment barrier enforced. |
| `auditor.green` (Unassigned Auditor) | `GET /auditor/submissions/96c8aac2.../evidence` | `403 Forbidden` | `403` | **PASS** — Unassigned auditor blocked. |

---

## 5. Visual Artifacts (Screenshots)

All full-page screenshots were captured during the Playwright execution and are saved in `frontend/tests/screenshots/`:

1. `14_supplier_evidence_count_2.png`: Shows Supplier monthly reports table with `2 files` attached to the report.
2. `14_manufacturer_evidence_count_2.png`: Shows Manufacturer submissions table displaying count `2` and the detailed inspection card displaying both evidence files.
3. `14_auditor_evidence_count_2.png`: Shows Internal Auditor submissions table displaying count `2` and Section 5 showing `Review Evidence (2 files)`.
4. `14_supplier_evidence_count_1.png`: Shows Supplier monthly reports table dynamically updated to `1 files` after document deletion.
5. `14_manufacturer_evidence_count_1.png`: Shows Manufacturer submissions table dynamically updated to `1` after deletion.
6. `14_auditor_evidence_count_1.png`: Shows Auditor submissions table dynamically updated to `1` after deletion.

---

## 6. Verification Checklist

- [x] Initial submission returns `evidence_count: 0`.
- [x] Uploading 1st document increments count to `1` across Supplier, Manufacturer, Auditor.
- [x] Uploading 2nd document increments count to `2` across Supplier, Manufacturer, Auditor.
- [x] Browser page reload preserves count of `2` across all three dashboards.
- [x] Deleting document decrements count to `1` across Supplier, Manufacturer, Auditor.
- [x] Document/paperclip icons in all table rows link to `${sub.id}#evidence`.
- [x] Manufacturer detail page retrieves and displays attached evidence documents.
- [x] Auditor review workspace displays attached documents and file count on action button.
- [x] MongoDB `evidence_documents` count matches API and UI counts with 100% parity.
- [x] Role-based isolation (cross-supplier and unassigned auditor) returns HTTP 403 Forbidden.
- [x] Primary demo database `scope3track` and root `.env` remain completely unmodified.
- [x] Complete backend pytest suite passes (12/12).
- [x] Frontend production build compiles cleanly (`npm run build`).

**Conclusion:** The evidence count defect is completely resolved across backend, frontend, and database layers with zero data integrity issues. Scope3Track is ready for production and live demonstration.
