# Scope3Track — Evidence Document Count Verification Report

**Date of Execution**: November 8, 2026  
**Test Suite**: `backend/tests/test_final_regression_backend.py` (Test 2 & 3) & `frontend/tests/15_final_fullstack_regression.spec.ts` (TC-FINAL-01)  
**Target Environment**: Isolated Test Database (`scope3track_final_qa`)  
**Main Demo DB Preservation**: Confirmed (`scope3track` evidence collection remains pristine with 0 modified records)

---

## 1. Executive Summary & Root Cause Analysis

### The Bug
In prior versions of Scope3Track, the paperclip document count in the submissions tables and dashboard headers across all three roles (Manufacturer, Supplier, and Auditor) consistently displayed `0`, even after suppliers had uploaded supporting PDF invoices and delivery notes.

### Confirmed Root Cause
1. **Schema & Model Omission**: The backend MongoDB `submissions` collection stored documents without maintaining an embedded `evidence_count` field. Furthermore, the FastAPI Pydantic response models (`SubmissionOut`) did not compute or include `evidence_count`.
2. **N+1 Avoidance via Direct Subquery Lack**: List endpoints (`/supplier/submissions`, `/manufacturer/submissions`, `/auditor/submissions`) simply fetched documents from `submissions` without aggregating the linked records from `evidence_documents`.
3. **Frontend Fallback**: The React TypeScript interfaces declared `evidence_count?: number`, falling back to `sub.evidence_count ?? 0` whenever the backend returned `null` or omitted the field.
4. **Missing Evidence Loader on Submission Detail**: `SubmissionDetailPage.tsx` failed to call `getSubmissionEvidence()`, preventing the evidence documents from rendering in the manufacturer inspection workspace.

### The Architectural Fix
- **Backend Batched Pipeline (`attach_evidence_counts`)**: Added high-performance MongoDB `$group` aggregation pipeline in `backend/app/main.py` that maps `submission_id` counts in a single round-trip, attaching `evidence_count` to all listed items with zero N+1 database overhead.
- **Single Item Attachment (`attach_single_evidence_count`)**: Attached live counts to individual submission detail responses for Supplier, Manufacturer, and Auditor.
- **Frontend Deep-Linking**: Updated all paperclip indicators in tables to render deep links to `#evidence`, instantly anchoring the user to the Supporting Verification Evidence pane.
- **Audit Review Parity**: Updated `AuditorSubmissionReviewPage.tsx` and `SubmissionDetailPage.tsx` to display attached evidence cards with filename, formatted file size, and upload timestamps.

---

## 2. Multi-Role Lifecycle & Parity Comparison Table

The following test was conducted end-to-end on test submission `2026-11` (Supplier: `XYZ Steel Ltd` / `supplier-xyz`, Auditor: `auditor.xyz@scope3track.demo`, Manufacturer: `manufacturer@scope3track.demo`):

| Lifecycle Phase | Action Taken | MongoDB `evidence_documents` Count | Supplier API (`/supplier/submissions`) | Manufacturer API (`/manufacturer/submissions`) | Auditor API (`/auditor/submissions`) | Supplier UI (`/supplier/submissions`) | Manufacturer UI (`/manufacturer/submissions`) | Auditor UI (`/auditor/submissions`) | Status | Screenshot Proof |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Phase 1: Initial** | Create draft monthly report | **0** | `0` | `0` | `0` | `0 files` | `0` | `0` | **PASS** | `01_evidence_count_zero.png` |
| **Phase 2: Single File** | Upload `electricity_invoice_evidence.pdf` (14.2 KB) | **1** | `1` | `1` | `1` | `1 files` | `1` | `1` | **PASS** | `02_evidence_count_one.png` |
| **Phase 3: Dual File** | Upload `fuel_delivery_receipt.pdf` (16.8 KB) | **2** | `2` | `2` | `2` | `2 files` | `2` | `2` | **PASS** | `03_evidence_count_two.png` |
| **Phase 4: Persistence** | Full browser reload across all 3 roles | **2** | `2` | `2` | `2` | `2 files` | `2` | `2` | **PASS** | `04_evidence_count_reload.png` |
| **Phase 5: Deletion** | Supplier removes `electricity_invoice_evidence.pdf` | **1** | `1` | `1` | `1` | `1 files` | `1` | `1` | **PASS** | `05_evidence_count_after_deletion.png` |

---

## 3. Security & Tenant Access Enforcement

Security tests in `test_final_regression_backend.py` (`test_evidence_security_isolation`) verified that:
1. **Unassigned Supplier Isolation**: Supplier B (`Green Aluminium`) cannot read, upload, or delete evidence for Supplier A (`XYZ Steel`) &mdash; returned `403 Forbidden`.
2. **Unassigned Auditor Isolation**: Internal Auditor assigned to Green Aluminium (`auditor.green@scope3track.demo`) attempting to view XYZ Steel's evidence receives `403 Forbidden`.
3. **Manufacturer Oversight**: ABC Manufacturing audit leadership maintains full read-only visibility into verified evidence for all suppliers across the corporate boundary.

---

## 4. Verification Conclusion

The evidence count synchronization is verified across database queries, REST API responses, and reactive frontend UI states. All counts reflect real-time MongoDB state dynamically without stale cache inconsistencies or reload degradation.
