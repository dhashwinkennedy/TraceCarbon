# TraceCarbon — Phase 2.10: Evidence Viewer Security Hardening Report

**Reporting Date:** November 9, 2026  
**Active Database:** `scope3track_final_qa` (MongoDB Atlas)  
**Primary Database:** `scope3track` (STRICTLY READ-ONLY / UNTOUCHED)  
**Status:** **ACCEPTED & FULLY VERIFIED**

---

## Executive Summary

Phase 2.10 conducted an architectural review and security hardening of the TraceCarbon evidence viewing and retrieval system implemented in Phase 2.9. 

The original mechanism permitted optional query-string token authentication (`?token=...`) to facilitate browser iframe rendering. While functional, exposing long-lived JSON Web Tokens (JWTs) in URLs introduces risks of token leakage in browser history, proxy logs, referrer headers, and shared links.

Phase 2.10 successfully hardened both frontend and backend architectures:
1. **Bearer Authentication Only**: Query-string token authentication was completely removed from the backend authentication layer (`backend/app/main.py::current`). All evidence retrieval endpoints now strictly require standard HTTP `Authorization: Bearer <token>` headers.
2. **Binary Blob Streaming**: The frontend Axios client retrieves verified evidence documents (PDFs, PNG/JPG images) as raw binary `Blob` responses through authenticated HTTP requests.
3. **Temporary Object URLs**: In-memory browser object URLs (`blob:http://localhost:5173/...`) are generated on demand via `URL.createObjectURL(blob)` for inline PDF `<iframe>` embedding and image `<img />` rendering.
4. **Deterministic Lifecycle Revocation**: Temporary object URLs are deterministically destroyed using `URL.revokeObjectURL()` whenever the document changes, the modal viewer closes, or the component unmounts, preventing memory leaks and dangling object references.
5. **Secure Downloads**: File downloads utilize the same Bearer-authenticated Blob retrieval, triggering client-side anchor downloads without URL token exposure and revoking the object URL immediately after click execution.
6. **Air-Tight Multi-Tenant Boundary Checks**: Strict RBAC and submission ownership checks (`supplier_owned`) remain actively enforced, preventing cross-auditor and cross-supplier data exposure.

All 11 security requirements were verified through automated end-to-end tests and direct API security probing.

---

## 1. Architectural Comparison: Insecure Query Tokens vs. Secure Blob Architecture

### Risk Elimination Summary

| Threat / Risk Vector | Legacy Pattern (`?token=...`) | Hardened Pattern (Bearer + Blob Object URL) | Status |
|---|---|---|:---:|
| **Browser History Leakage** | Long-lived JWT stored in browser URL history | URL is ephemeral `blob:http://...`; token remains in memory | **ELIMINATED** |
| **Server & Proxy Access Logs** | Token recorded in cleartext in gateway/proxy access logs | Token transmitted in standard `Authorization` header | **ELIMINATED** |
| **HTTP Referer Leakage** | External assets/iframes could receive token in `Referer` | `blob:` scheme does not transmit HTTP Referer headers | **ELIMINATED** |
| **Accidental Link Sharing** | Copy-pasted URL leaks active auditor credentials | Copy-pasted `blob:` URL is unresolvable outside origin session | **ELIMINATED** |
| **Memory Retention** | Dangling network requests and cached responses | Explicit `URL.revokeObjectURL()` frees browser memory | **ELIMINATED** |

---

## 2. Backend Security Implementation

### 2.1 Elimination of Query Token from `current()`

In `backend/app/main.py`, the `current()` dependency was hardened to accept exclusively standard HTTP Bearer tokens:

```python
def current(authorization: str = __import__('fastapi').Header(default="")):
    try:
        if not authorization.startswith("Bearer "):
            raise ValueError()
        raw = authorization.split(" ", 1)[1]
        if not raw:
            raise ValueError()
        p = jwt.decode(raw, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        u = db()["users"].find_one({"id": p["sub"], "active": True})
        if not u:
            raise ValueError()
        return clean(u)
    except (JWTError, ValueError, IndexError):
        raise HTTPException(401, "Invalid or expired access token")
```

Any attempt to access protected resources using a query parameter (`?token=...`) without the `Authorization: Bearer <token>` header now strictly fails with `HTTP 401 Unauthorized`.

### 2.2 Tenancy & Jurisdiction Enforcement

The file streaming endpoint enforces defense-in-depth through `supplier_owned(sid, u)`:

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

1. **Auditor Isolation**: `u["role"] == "auditor"` validates against `auditor_assignments`. If the submission's supplier or submission ID is not assigned to the calling auditor, `HTTP 403 Forbidden` is raised.
2. **Supplier Isolation**: `u["role"] == "supplier"` verifies that `s["supplier_id"] == u["profile_id"]`. Cross-tenant supplier attempts raise `HTTP 403 Forbidden`.
3. **Submission Scoping**: Verifies `e.get("submission_id") == sid` to prevent accessing documents using arbitrary submission prefixes.
4. **Path Traversal Defense**: Resolves canonical paths and asserts `file_path.startswith(folder)`, blocking directory traversal attempts.

---

## 3. Frontend Implementation Details

### 3.1 Service Layer (`frontend/src/services/auditor.service.ts`)

```typescript
// Supporting Evidence Documents
async getSubmissionEvidence(submissionId: string): Promise<EvidenceDocument[]> {
  const res = await apiClient.get<any>(`/auditor/submissions/${submissionId}/evidence`);
  return (res as any).items || res;
},
async getEvidenceFileBlob(submissionId: string, evidenceId: string): Promise<Blob> {
  const res = await apiClient.get<Blob>(
    `/auditor/submissions/${submissionId}/evidence/${evidenceId}/file?inline=true`,
    { responseType: 'blob' }
  );
  return res as unknown as Blob;
},
async downloadEvidenceFile(submissionId: string, evidenceId: string, filename: string): Promise<void> {
  const blob = await this.getEvidenceFileBlob(submissionId, evidenceId);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
},
```

### 3.2 Modal Lifecycle & URL Revocation (`AuditorSubmissionReviewPage.tsx`)

```typescript
// Deterministic Object URL cleanup on unmount
useEffect(() => {
  return () => {
    if (viewerBlobUrl) {
      URL.revokeObjectURL(viewerBlobUrl);
    }
  };
}, [viewerBlobUrl]);

const handleViewEvidence = async (ev: EvidenceDocument) => {
  if (!id) return;
  setViewingEvidence(ev);
  setIsLoadingBlob(true);
  setViewerError(null);
  
  // Revoke previous blob URL if switching documents
  if (viewerBlobUrl) {
    URL.revokeObjectURL(viewerBlobUrl);
    setViewerBlobUrl(null);
  }
  try {
    const blob = await auditorService.getEvidenceFileBlob(id, ev.id);
    const url = URL.createObjectURL(blob);
    setViewerBlobUrl(url);
  } catch (err: any) {
    setViewerError(err?.message || 'Failed to load document. The file may be missing or inaccessible.');
  } finally {
    setIsLoadingBlob(false);
  }
};

const handleCloseViewer = () => {
  // Revoke object URL immediately on modal close
  if (viewerBlobUrl) {
    URL.revokeObjectURL(viewerBlobUrl);
    setViewerBlobUrl(null);
  }
  setViewingEvidence(null);
  setViewerError(null);
  setIsLoadingBlob(false);
};

const handleDownloadEvidence = async (ev: EvidenceDocument) => {
  if (!id) return;
  try {
    await auditorService.downloadEvidenceFile(id, ev.id, ev.filename);
  } catch (err: any) {
    alert('Failed to download evidence file: ' + (err?.message || 'Unknown error'));
  }
};
```

---

## 4. Security Verification Matrix

All nine negative, positive, and boundary conditions were executed and verified against the running QA backend on port 8000:

| Test ID | Test Scenario | Request Configuration | Expected Result | Actual HTTP | Detail |
|---|---|---|:---:|:---:|---|
| **SEC-01** | **Valid Bearer PDF Fetch** | `GET .../file`<br/>Header: `Bearer <auditor-xyz>` | `200 OK` | **200 OK** | Content-Type: `application/pdf`, binary payload received |
| **SEC-02** | **Valid Bearer PNG Fetch** | `GET .../file`<br/>Header: `Bearer <auditor-xyz>` | `200 OK` | **200 OK** | Content-Type: `image/png`, binary image payload received |
| **SEC-03** | **Query Token Rejection** | `GET .../file?token=<valid_jwt>`<br/>No Authorization Header | `401 Unauthorized` | **401 Unauthorized** | Token in query string rejected; Bearer header mandatory |
| **SEC-04** | **Unauthenticated Request** | `GET .../file`<br/>No credentials provided | `401 Unauthorized` | **401 Unauthorized** | Request rejected: `Invalid or expired access token` |
| **SEC-05** | **Expired JWT Token** | `GET .../file`<br/>Header: `Bearer <jwt_exp_past>` | `401 Unauthorized` | **401 Unauthorized** | Expired signature rejected: `Invalid or expired access token` |
| **SEC-06** | **Missing Evidence Document** | `GET .../evidence/non-existent/file`<br/>Header: `Bearer <auditor-xyz>` | `404 Not Found` | **404 Not Found** | Correct 404 response: `Evidence_Document not found` |
| **SEC-07** | **Unsupported File Type Upload**| `POST .../evidence` (`malicious.bat`)<br/>Header: `Bearer <supplier>` | `415 Unsupported` | **415 Unsupported** | Upload blocked: `Evidence must be PDF, XLSX, CSV, PNG, or JPG` |
| **SEC-08** | **Cross-Auditor Isolation** | `GET .../file` for SUP-005<br/>Header: `Bearer <auditor-green>` | `403 Forbidden` | **403 Forbidden** | RBAC enforced: `Submission is not assigned to you` |
| **SEC-09** | **Cross-Supplier Isolation** | `GET .../file` for SUP-005<br/>Header: `Bearer <supplier.steel>` | `403 Forbidden` | **403 Forbidden** | RBAC enforced: `You can only access your own submissions` |

---

## 5. Automated E2E Test Execution & Screenshots

### 5.1 Playwright E2E Suite (`25_phase2_10_evidence_security.spec.ts`)

```
Running 2 tests using 1 worker

  ✓ 1 [chromium-desktop] › TC-01: Auditor opens PDF and Image evidence via Bearer Auth and Blob Object URLs (6.7s)
  ✓ 2 [chromium-desktop] › TC-02: Security Boundaries & Negative RBAC Isolation (1.8s)

  2 passed (9.4s)
```

Key Assertions Validated:
- In-memory `blob:http://` scheme verified for embedded `<iframe src="blob:http://..." />`.
- Zero tokens detected in DOM attributes, iframe source, or network URLs.
- In-memory `blob:http://` scheme verified for embedded `<img src="blob:http://..." />`.
- Revocation of previous object URLs verified upon switching from PDF to Image and upon closing modal.
- Negative RBAC assertions (401, 403, 404, 415) passed across all isolation tests.

### 5.2 Playwright Regression Suite (`24_phase2_9_branding_evidence.spec.ts`)

```
Running 3 tests using 1 worker

  ✓ 1 [chromium-desktop] › TC-01: Rebranding & Manufacturer Dashboard Cleanup Verification (3.2s)
  ✓ 2 [chromium-desktop] › TC-02: Supplier Portal Branding & Navigation Verification (3.0s)
  ✓ 3 [chromium-desktop] › TC-03: Auditor Interactive Evidence Viewer & RBAC Enforcement (7.0s)

  3 passed (14.3s)
```

### 5.3 TypeScript Production Build

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
dist/assets/index-CdOyrZa9.js   699.24 kB │ gzip: 193.57 kB
✓ built in 4.26s
```

---

## 6. Captured Visual Evidence Artifacts

1. `phase2_10_01_secure_blob_pdf_viewer.png`: Auditor modal viewer displaying the verified PDF utility bill via an in-memory `blob:http://` URL with zero tokens in URL or DOM.
2. `phase2_10_02_secure_blob_image_viewer.png`: Auditor modal viewer rendering the verified PNG emissions audit badge via in-memory `blob:http://` URL.

---

## 7. Sign-Off & Verification Checklist

- [x] **Requirement 1**: Existing authenticated Axios API client used with HTTP Bearer Authorization header.
- [x] **Requirement 2**: PDF and Image evidence retrieved as binary `Blob` responses.
- [x] **Requirement 3**: Temporary browser object URLs created via `URL.createObjectURL(blob)`.
- [x] **Requirement 4**: PDFs rendered in embedded viewer iframe using temporary object URL.
- [x] **Requirement 5**: Images rendered in viewer modal using temporary object URL.
- [x] **Requirement 6**: Object URLs revoked via `URL.revokeObjectURL()` on document change, modal close, and component unmount.
- [x] **Requirement 7**: Existing download action preserved and executed via Bearer-authenticated Blob download.
- [x] **Requirement 8**: Backend authentication and submission-level authorization (`supplier_owned`) intact.
- [x] **Requirement 9**: Query-string token parameter removed and rejected with HTTP 401.
- [x] **Requirement 10**: Cross-auditor and cross-supplier access strictly blocked with HTTP 403 Forbidden.
- [x] **Requirement 11**: Unauthenticated requests (401), expired tokens (401), missing evidence (404), and unsupported uploads (415) tested and verified.
- [x] **Constraint Check**: Zero modifications to supplier submissions, calculations, purchases, factors, or portfolio activation.
- [x] **Database Safety**: Primary database (`scope3track`) remains untouched at 2,692.86353 t CO₂e baseline. QA database remains at 3,425.5534 t CO₂e across 20 active runs.
