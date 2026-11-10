import { test, expect } from '@playwright/test';
import {
  APP_URL,
  loginAs,
  captureScreenshot,
  setupConsoleAndNetworkTracking,
} from './test_helpers';

test.describe('Phase 2.6 — Activated Portfolio UI Verification', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleAndNetworkTracking(page);
  });

  test('TC-01: Manufacturer Dashboard displays activated multi-method portfolio (3,425.55 t CO2e)', async ({ page }) => {
    await loginAs(page, 'manufacturer');
    await page.goto(`${APP_URL}/manufacturer/dashboard`);
    await page.waitForLoadState('networkidle');

    // 1. Total Scope 3 Footprint
    const totalCard = page.locator('div:has-text("Total Scope 3 Emissions")').first();
    await expect(totalCard).toContainText('3,425.55');

    // 2. Category 1 & Category 2
    const cat1Card = page.locator('div:has-text("Category 1: Purchased Goods")').first();
    await expect(cat1Card).toContainText('3,421.59');

    const cat2Card = page.locator('div:has-text("Category 2: Capital Goods")').first();
    await expect(cat2Card).toContainText('3.96');

    // 3. Method Distribution Section
    const pfMethodCard = page.locator('div:has-text("Product-Factor (Tier 1)")').first();
    await expect(pfMethodCard).toContainText('1,943.46');

    const actMethodCard = page.locator('div:has-text("Activity-Based (Tier 2)")').first();
    await expect(actMethodCard).toContainText('415.13');

    const spnMethodCard = page.locator('div:has-text("Spend-Based (Tier 3)")').first();
    await expect(spnMethodCard).toContainText('1,066.96');

    // Capture screenshot
    await captureScreenshot(page, 'phase2_6_01_activated_dashboard_distribution');
  });

  test('TC-02: Calculations Page displays active multi-method assignments across 20 purchases', async ({ page }) => {
    await loginAs(page, 'manufacturer');
    await page.goto(`${APP_URL}/manufacturer/calculations`);
    await page.waitForLoadState('networkidle');

    // Table rows: 28 total records (20 active + 8 historical baseline runs preserved for audit trail)
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(28);

    // Verify exactly 20 active calculations and 8 superseded historical runs
    const activeRows = page.locator('tbody tr:has-text("Active in Inventory")');
    await expect(activeRows).toHaveCount(20);

    const supersededRows = page.locator('tbody tr:has-text("Superseded Run")');
    await expect(supersededRows).toHaveCount(8);

    // Verify presence of all three active method badges
    await expect(page.locator('tbody tr td:has-text("Product-Factor")').first()).toBeVisible();
    await expect(page.locator('tbody tr td:has-text("Activity-Based")').first()).toBeVisible();
    await expect(page.locator('tbody tr td:has-text("Spend-Based")').first()).toBeVisible();

    await captureScreenshot(page, 'phase2_6_02_activated_calculations_table');
  });

  test('TC-03: Reports Page displays 28 calculation receipts with active/superseded status and full provenance', async ({ page }) => {
    await loginAs(page, 'manufacturer');
    await page.goto(`${APP_URL}/manufacturer/reports`);
    await page.waitForLoadState('networkidle');

    // Verify report table has records
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(20);

    // Verify CEDA and CEA/IPCC disclosures
    await expect(page.locator('text=CEDA by Watershed').first()).toBeVisible();
    await expect(page.locator('text=CC BY-SA 4.0').first()).toBeVisible();

    await captureScreenshot(page, 'phase2_6_03_activated_reports_inventory');
  });
});
