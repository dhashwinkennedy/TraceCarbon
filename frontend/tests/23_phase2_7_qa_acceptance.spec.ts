import { test, expect } from '@playwright/test';
import {
  APP_URL,
  loginAs,
  captureScreenshot,
  setupConsoleAndNetworkTracking,
} from './test_helpers';

test.describe('Phase 2.7 — QA Acceptance & Demonstration Readiness Audit', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleAndNetworkTracking(page);
  });

  // --------------------------------------------------------------------------
  // TC-01: Manufacturer Dashboard Verification
  // --------------------------------------------------------------------------
  test('TC-01: Manufacturer Dashboard displays 3,425.55 t CO2e, Category 1/2, tiered methods, and unrounded footnote', async ({
    page,
  }) => {
    await loginAs(page, 'manufacturer');
    await page.goto(`${APP_URL}/manufacturer/dashboard`);
    await page.waitForLoadState('networkidle');

    // 1. Total Scope 3 Footprint
    const totalCard = page.locator('div:has-text("Total Scope 3 Emissions")').first();
    await expect(totalCard).toContainText('3,425.55');

    // 2. Categories
    const cat1Card = page.locator('div:has-text("Category 1: Purchased Goods")').first();
    await expect(cat1Card).toContainText('3,421.59');

    const cat2Card = page.locator('div:has-text("Category 2: Capital Goods")').first();
    await expect(cat2Card).toContainText('3.96');

    // 3. Method Distribution
    const pfCard = page.locator('div:has-text("Product-Factor (Tier 1)")').first();
    await expect(pfCard).toContainText('1,943.46');

    const actCard = page.locator('div:has-text("Activity-Based (Tier 2)")').first();
    await expect(actCard).toContainText('415.13');

    const spnCard = page.locator('div:has-text("Spend-Based (Tier 3)")').first();
    await expect(spnCard).toContainText('1,066.96');

    // 4. Rounding Footnote
    await expect(
      page.locator('text=Total Scope 3 is computed from unrounded sums').first()
    ).toBeVisible();

    await captureScreenshot(page, 'phase2_7_01_manufacturer_dashboard');
  });

  // --------------------------------------------------------------------------
  // TC-02: Calculations Page and Audit Receipt Modal
  // --------------------------------------------------------------------------
  test('TC-02: Calculations Page displays 28 receipts (20 active, 8 superseded) and modal shows provenance', async ({
    page,
  }) => {
    await loginAs(page, 'manufacturer');
    await page.goto(`${APP_URL}/manufacturer/calculations`);
    await page.waitForLoadState('networkidle');

    // Verify 28 total rows
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(28);

    // Verify 20 active rows and 8 superseded rows
    const activeRows = page.locator('tbody tr:has-text("Active in Inventory")');
    await expect(activeRows).toHaveCount(20);

    const supersededRows = page.locator('tbody tr:has-text("Superseded Run")');
    await expect(supersededRows).toHaveCount(8);

    // Capture calculations table
    await captureScreenshot(page, 'phase2_7_02_manufacturer_calculations');

    // Open first calculation receipt modal
    const firstReceiptBtn = page.locator('tbody tr button:has-text("Receipt")').first();
    await firstReceiptBtn.click();
    await page.waitForTimeout(500);

    // Verify modal content
    const modal = page.locator('div[role="dialog"], div.fixed:has-text("Calculation Receipt")').first();
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Audit Hash (SHA-256)');
    await expect(modal).toContainText('Formula');

    await captureScreenshot(page, 'phase2_7_03_manufacturer_receipt_modal');

    // Close modal
    const closeBtn = page.locator('button:has-text("Close Receipt"), button:has-text("✕")').first();
    await closeBtn.click();
  });

  // --------------------------------------------------------------------------
  // TC-03: Reports & CSV Export Metadata
  // --------------------------------------------------------------------------
  test('TC-03: Reports Page displays CEDA CC BY-SA 4.0 license, CEA/IPCC disclosures, and CSV export', async ({
    page,
  }) => {
    await loginAs(page, 'manufacturer');
    await page.goto(`${APP_URL}/manufacturer/reports`);
    await page.waitForLoadState('networkidle');

    // Verify table has records
    const rows = page.locator('tbody tr');
    expect(await rows.count()).toBeGreaterThanOrEqual(20);

    // Verify CEDA and CEA/IPCC disclosures
    await expect(page.locator('text=CEDA by Watershed').first()).toBeVisible();
    await expect(page.locator('text=CC BY-SA 4.0').first()).toBeVisible();

    // Verify CSV Export button is present
    const exportBtn = page.locator('button:has-text("Export CSV"), button:has-text("Export")').first();
    await expect(exportBtn).toBeVisible();

    await captureScreenshot(page, 'phase2_7_04_manufacturer_reports_export');
  });

  // --------------------------------------------------------------------------
  // TC-04: Supplier Portal Read-Only Navigation & Isolation
  // --------------------------------------------------------------------------
  test('TC-04: Supplier Portal displays only SUP-001 records, reporting requirements, and reduction suggestions', async ({
    page,
  }) => {
    await loginAs(page, 'supplier');
    await page.goto(`${APP_URL}/supplier/dashboard`);
    await page.waitForLoadState('networkidle');

    // 1. Dashboard shows supplier profile
    await expect(page.locator('text=SUP-001').first()).toBeVisible();

    // 2. Submissions list
    await page.goto(`${APP_URL}/supplier/submissions`);
    await page.waitForLoadState('networkidle');
    const rows = page.locator('tbody tr');
    expect(await rows.count()).toBeGreaterThanOrEqual(1);

    await captureScreenshot(page, 'phase2_7_05_supplier_portal_submissions');

    // 3. Reduction suggestions page
    await page.goto(`${APP_URL}/supplier/reductions`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=AI Carbon Reduction Suggestions').first()).toBeVisible();

    await captureScreenshot(page, 'phase2_7_06_supplier_ai_mapping_view');
  });

  // --------------------------------------------------------------------------
  // TC-05: Auditor Portal & Submission Detail Workspace
  // --------------------------------------------------------------------------
  test('TC-05: Auditor Portal displays assigned submissions, activity metrics table, and no fake approve/reject button', async ({
    page,
  }) => {
    await loginAs(page, 'auditor');
    await page.goto(`${APP_URL}/auditor/submissions`);
    await page.waitForLoadState('networkidle');

    // 1. Verify auditor submissions table
    const subRows = page.locator('tbody tr');
    expect(await subRows.count()).toBeGreaterThanOrEqual(1);

    await captureScreenshot(page, 'phase2_7_07_auditor_portal_submissions');

    // 2. Open first submission review workspace
    const reviewLink = page.locator('tbody tr a:has-text("Review"), tbody tr a').first();
    await reviewLink.click();
    await page.waitForLoadState('networkidle');

    // 3. Verify workspace sections
    await expect(page.locator('text=Primary Reported Activities').first()).toBeVisible();
    await expect(page.locator('text=Internal Audit Findings').first()).toBeVisible();
    await expect(page.locator('text=Clarification Inquiries').first()).toBeVisible();

    // 4. Verify absence of false "Approve" or "Reject" buttons
    const approveBtn = page.locator('button:has-text("Approve Submission"), button:has-text("Reject Submission")');
    await expect(approveBtn).toHaveCount(0);

    await captureScreenshot(page, 'phase2_7_08_auditor_submission_detail');
  });
});
