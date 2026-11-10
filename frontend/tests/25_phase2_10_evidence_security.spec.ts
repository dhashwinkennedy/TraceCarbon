import { test, expect } from '@playwright/test';
import { APP_URL, captureScreenshot } from './test_helpers';

test.describe('Phase 2.10 — Evidence Viewer Security Hardening', () => {

  const submissionId = 'c07ed2f9-8dcf-440b-bcbb-75914427543c';
  const pdfEid = '36c88aaa-8fc9-4993-b2cc-3976c49ede5b';
  const pngEid = 'c50011b4-fdc2-42a5-afb0-2739d7146ec9';

  test('TC-01: Auditor opens PDF and Image evidence via Bearer Auth and Blob Object URLs', async ({ page }) => {
    // 1. Login as Assigned Auditor (auditor-xyz)
    await page.goto(`${APP_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', 'auditor.xyz@scope3track.demo');
    await page.fill('input[type="password"]', 'AuditorDemo123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/auditor/dashboard');
    await page.waitForLoadState('networkidle');

    // 2. Navigate to SUP-005 FY2023-24 Submission Review
    await page.goto(`${APP_URL}/auditor/submissions/${submissionId}`);
    await page.waitForLoadState('networkidle');

    // 3. Verify Evidence Section & Action Buttons
    await expect(page.locator('h3').filter({ hasText: 'AI Evidence Document Review' })).toBeVisible();
    const viewButtons = page.locator('button').filter({ hasText: 'Open / View' });
    await expect(viewButtons.first()).toBeVisible();

    // 4. Click "Open / View" on PDF document
    await viewButtons.first().click();

    // Verify Viewer Modal opens
    const modal = page.locator('.fixed.inset-0').last();
    await expect(modal).toBeVisible();
    await expect(modal.locator('text=AxiomX_Utility_Bill_FY2023-24.pdf')).toBeVisible();

    // Verify iframe uses blob: URL (no tokens in URL)
    const iframe = modal.locator('iframe');
    await expect(iframe).toBeVisible();
    const iframeSrc = await iframe.getAttribute('src');
    expect(iframeSrc).toMatch(/^blob:http/);
    expect(iframeSrc).not.toContain('token=');
    expect(iframeSrc).not.toContain('Bearer');

    // Capture PDF Viewer Screenshot
    await captureScreenshot(page, 'phase2_10_01_secure_blob_pdf_viewer');

    // 5. Close Modal
    await modal.locator('button[title="Close viewer"], button:has-text("Close")').last().click();
    await expect(modal).not.toBeVisible();

    // 6. Click "Open / View" on PNG document
    await viewButtons.nth(1).click();
    const imgModal = page.locator('.fixed.inset-0').last();
    await expect(imgModal).toBeVisible();
    await expect(imgModal.locator('text=AxiomX_Emissions_Audit_Badge.png')).toBeVisible();

    // Verify img uses blob: URL (no tokens in URL)
    const img = imgModal.locator('img[alt*="AxiomX_Emissions_Audit_Badge.png"]');
    await expect(img).toBeVisible();
    const imgSrc = await img.getAttribute('src');
    expect(imgSrc).toMatch(/^blob:http/);
    expect(imgSrc).not.toContain('token=');
    expect(imgSrc).not.toContain('Bearer');

    // Capture Image Viewer Screenshot
    await captureScreenshot(page, 'phase2_10_02_secure_blob_image_viewer');

    // Close Modal
    await imgModal.locator('button:has-text("Close")').last().click();
    await expect(imgModal).not.toBeVisible();
  });

  test('TC-02: Security Boundaries & Negative RBAC Isolation', async ({ request }) => {
    // 1. Query-string token rejection (tokens not accepted in URL)
    const loginRes = await request.post(`${APP_URL}/api/v1/auth/login`, {
      data: { email: 'auditor.xyz@scope3track.demo', password: 'AuditorDemo123!' },
    });
    const aToken = (await loginRes.json()).access_token;

    const queryTokenRes = await request.get(
      `${APP_URL}/api/v1/auditor/submissions/${submissionId}/evidence/${pdfEid}/file?token=${aToken}`
    );
    expect(queryTokenRes.status()).toBe(401);

    // 2. Unauthenticated request rejection
    const unauthRes = await request.get(
      `${APP_URL}/api/v1/auditor/submissions/${submissionId}/evidence/${pdfEid}/file`
    );
    expect(unauthRes.status()).toBe(401);

    // 3. Expired token rejection
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhdWRpdG9yLXh5eiIsInJvbGUiOiJhdWRpdG9yIiwiZXhwIjoxNTAwMDAwMDAwfQ.invalid_sig_here';
    const expiredRes = await request.get(
      `${APP_URL}/api/v1/auditor/submissions/${submissionId}/evidence/${pdfEid}/file`,
      { headers: { Authorization: `Bearer ${expiredToken}` } }
    );
    expect(expiredRes.status()).toBe(401);

    // 4. Missing evidence document returns 404
    const missingRes = await request.get(
      `${APP_URL}/api/v1/auditor/submissions/${submissionId}/evidence/non-existent-eid-12345/file`,
      { headers: { Authorization: `Bearer ${aToken}` } }
    );
    expect(missingRes.status()).toBe(404);

    // 5. Unsupported file type upload returns 415
    const supLoginRes = await request.post(`${APP_URL}/api/v1/auth/login`, {
      data: { email: 'supplier.chemical@axiomx.demo', password: 'AxiomX!Chemical#2026' },
    });
    const sToken = (await supLoginRes.json()).access_token;

    const badUploadRes = await request.post(
      `${APP_URL}/api/v1/supplier/submissions/${submissionId}/evidence`,
      {
        headers: { Authorization: `Bearer ${sToken}` },
        multipart: {
          file: {
            name: 'malicious.bat',
            mimeType: 'application/x-bat',
            buffer: Buffer.from('@echo off\necho hello'),
          },
        },
      }
    );
    expect(badUploadRes.status()).toBe(415);

    // 6. Cross-auditor access blocked (auditor-green is not assigned to SUP-005)
    const greenLoginRes = await request.post(`${APP_URL}/api/v1/auth/login`, {
      data: { email: 'auditor.green@scope3track.demo', password: 'AuditorDemo123!' },
    });
    const gToken = (await greenLoginRes.json()).access_token;

    const crossAuditorRes = await request.get(
      `${APP_URL}/api/v1/auditor/submissions/${submissionId}/evidence/${pdfEid}/file`,
      { headers: { Authorization: `Bearer ${gToken}` } }
    );
    expect(crossAuditorRes.status()).toBe(403);

    // 7. Cross-supplier access blocked (SUP-001 cannot access SUP-005)
    const steelLoginRes = await request.post(`${APP_URL}/api/v1/auth/login`, {
      data: { email: 'supplier.steel@axiomx.demo', password: 'AxiomX!Steel#2026' },
    });
    const steelToken = (await steelLoginRes.json()).access_token;

    const crossSupplierRes = await request.get(
      `${APP_URL}/api/v1/supplier/submissions/${submissionId}/evidence/${pdfEid}/file`,
      { headers: { Authorization: `Bearer ${steelToken}` } }
    );
    expect(crossSupplierRes.status()).toBe(403);
  });

});
