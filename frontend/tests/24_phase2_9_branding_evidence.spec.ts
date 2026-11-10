import { test, expect } from '@playwright/test';
import { APP_URL, captureScreenshot, loginAs } from './test_helpers';

test.describe('Phase 2.9 — Dashboard Cleanup, Auditor Evidence Viewer & TraceCarbon Branding', () => {

  test('TC-01: Rebranding & Manufacturer Dashboard Cleanup Verification', async ({ page }) => {
    // 1. Check Login Page Branding
    await page.goto(`${APP_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Document title
    await expect(page).toHaveTitle(/TraceCarbon — Trace\. Measure\. Improve\./);

    // Login page logo, brand name, tagline
    const loginLogo = page.locator('img[alt="TraceCarbon Logo"]');
    await expect(loginLogo).toBeVisible();
    await expect(page.locator('h1').filter({ hasText: 'TraceCarbon' })).toBeVisible();
    await expect(page.locator('text=Trace. Measure. Improve.')).toBeVisible();

    // 2. Login as Manufacturer
    await page.fill('input[type="email"]', 'manufacturer@scope3track.demo');
    await page.fill('input[type="password"]', 'ManufacturerDemo123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/manufacturer/dashboard');
    await page.waitForLoadState('networkidle');

    // 3. Verify Sidebar & Topbar Branding
    const sidebarLogo = page.locator('aside img[alt="TraceCarbon Logo"]');
    await expect(sidebarLogo).toBeVisible();
    await expect(page.locator('aside').filter({ hasText: 'TraceCarbon' })).toBeVisible();
    await expect(page.locator('header').filter({ hasText: 'TraceCarbon Sustainability Portal' })).toBeVisible();

    // 4. Verify Dashboard Cleanup: GHG Scope 3 Breakdown doughnut is REMOVED
    await expect(page.locator('text=GHG Scope 3 Breakdown')).toHaveCount(0);
    await expect(page.locator('text=Category 1 vs Category 2 Distribution')).toHaveCount(0);

    // 5. Verify Preserved Sections:
    // Emissions by Supplier full-width card
    await expect(page.locator('h3').filter({ hasText: 'Emissions by Supplier' })).toBeVisible();
    // Calculation Method Distribution
    await expect(page.locator('h3').filter({ hasText: 'Calculation Method Distribution' })).toBeVisible();
    // KPI Metric Cards
    await expect(page.locator('text=Total Scope 3 Emissions')).toBeVisible();
    await expect(page.locator('text=Category 1: Purchased Goods')).toBeVisible();
    await expect(page.locator('text=Category 2: Capital Goods')).toBeVisible();

    // 6. Verify Unrounded Sum Footnote is preserved
    await expect(page.locator('text=Total Scope 3 is computed from unrounded sums')).toBeVisible();

    // Capture Manufacturer Dashboard Screenshot
    await captureScreenshot(page, 'phase2_9_01_updated_manufacturer_dashboard');
  });

  test('TC-02: Supplier Portal Branding & Navigation Verification', async ({ page }) => {
    // 1. Login as Chemical Supplier
    await page.goto(`${APP_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', 'supplier.chemical@axiomx.demo');
    await page.fill('input[type="password"]', 'AxiomX!Chemical#2026');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/supplier/dashboard');
    await page.waitForLoadState('networkidle');

    // 2. Verify Supplier Workspace Branding
    const sidebarLogo = page.locator('aside img[alt="TraceCarbon Logo"]');
    await expect(sidebarLogo).toBeVisible();
    await expect(page.locator('aside span').filter({ hasText: 'TraceCarbon' })).toBeVisible();
    await expect(page.locator('header').filter({ hasText: 'TraceCarbon Sustainability Portal' })).toBeVisible();

    // 3. Navigate to Submissions
    await page.goto(`${APP_URL}/supplier/submissions`);
    await page.waitForLoadState('networkidle');

    // Capture Supplier Portal Screenshot
    await captureScreenshot(page, 'phase2_9_02_supplier_portal_branding');
  });

  test('TC-03: Auditor Interactive Evidence Viewer & RBAC Enforcement', async ({ page, request }) => {
    // 1. Login as Assigned Auditor (auditor-xyz)
    await page.goto(`${APP_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', 'auditor.xyz@scope3track.demo');
    await page.fill('input[type="password"]', 'AuditorDemo123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/auditor/dashboard');
    await page.waitForLoadState('networkidle');

    // 2. Navigate to SUP-005 FY2023-24 Submission Review
    const submissionId = 'c07ed2f9-8dcf-440b-bcbb-75914427543c';
    await page.goto(`${APP_URL}/auditor/submissions/${submissionId}`);
    await page.waitForLoadState('networkidle');

    // 3. Verify Evidence Section & Action Buttons
    await expect(page.locator('h3').filter({ hasText: 'AI Evidence Document Review' })).toBeVisible();
    const pdfCard = page.locator('div').filter({ hasText: 'AxiomX_Utility_Bill_FY2023-24.pdf' }).last();
    await expect(pdfCard).toBeVisible();

    // Verify Open / View and Download buttons
    const viewButtons = page.locator('button').filter({ hasText: 'Open / View' });
    await expect(viewButtons.first()).toBeVisible();
    const downloadButtons = page.locator('button').filter({ hasText: 'Download' });
    await expect(downloadButtons.first()).toBeVisible();

    // 4. Click "Open / View" on PDF document
    await viewButtons.first().click();

    // Verify Viewer Modal opens
    const modal = page.locator('div[role="dialog"], .fixed.inset-0').last();
    await expect(modal).toBeVisible();
    await expect(modal.locator('text=AxiomX_Utility_Bill_FY2023-24.pdf')).toBeVisible();
    await expect(modal.locator('iframe')).toBeVisible();

    // Capture Auditor Evidence Viewer Screenshot
    await captureScreenshot(page, 'phase2_9_03_auditor_evidence_viewer');

    // 5. Close Modal
    await modal.locator('button[title="Close viewer"], button:has-text("Close")').last().click();
    await expect(modal).not.toBeVisible();

    // 6. Click "Open / View" on Image document
    await viewButtons.nth(1).click();
    const imgModal = page.locator('.fixed.inset-0').last();
    await expect(imgModal).toBeVisible();
    await expect(imgModal.locator('img[alt*="AxiomX_Emissions_Audit_Badge.png"]')).toBeVisible();

    // Close Modal
    await imgModal.locator('button:has-text("Close")').last().click();

    // 7. Security / RBAC Verification via API
    // 7a. Unauthenticated request must return 401
    const unauthRes = await request.get(
      `${APP_URL}/api/v1/auditor/submissions/${submissionId}/evidence/36c88aaa-8fc9-4993-b2cc-3976c49ede5b/file`
    );
    expect(unauthRes.status()).toBe(401);

    // 7b. Unassigned auditor (auditor-green) must return 403 Forbidden
    const greenLoginRes = await request.post(`${APP_URL}/api/v1/auth/login`, {
      data: { email: 'auditor.green@scope3track.demo', password: 'AuditorDemo123!' },
    });
    const greenToken = (await greenLoginRes.json()).access_token;

    const crossAuditorRes = await request.get(
      `${APP_URL}/api/v1/auditor/submissions/${submissionId}/evidence/36c88aaa-8fc9-4993-b2cc-3976c49ede5b/file`,
      { headers: { Authorization: `Bearer ${greenToken}` } }
    );
    expect(crossAuditorRes.status()).toBe(403);
  });

});
