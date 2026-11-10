import { test, expect } from '@playwright/test';
import {
  APP_URL,
  loginAs,
  captureScreenshot,
  setupConsoleAndNetworkTracking,
} from './test_helpers';

test.describe('Phase 2.5 — Pre-Activation Portfolio Dry Run Verification', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleAndNetworkTracking(page);
  });

  test('TC-01: Dry Run Previews for 4 Proposed Activity-Based Purchases (Zero Mutation)', async ({ page }) => {
    await loginAs(page, 'manufacturer');
    await page.goto(`${APP_URL}/manufacturer/calculations`);
    await page.waitForLoadState('networkidle');

    // Open Modal
    await page.locator('button:has-text("Run / Compare Methods")').click();
    await expect(page.locator('h3:has-text("Multi-Method Calculation Selection & Preview")')).toBeVisible();

    const purchaseSelect = page.locator('#modal-purchase-select');

    // 1. PO-2022-008 (Glass, FY22)
    let respPromise = page.waitForResponse(r => r.url().includes('PO-2022-008/method-options'));
    await purchaseSelect.selectOption('PO-2022-008');
    await respPromise;
    let postPromise = page.waitForResponse(r => r.url().includes('/calculations') && r.request().method() === 'POST');
    await page.locator('[data-testid="method-card-activity_based"]').click();
    await postPromise;
    await expect(page.locator('text=Calculation Preview (preview_only: true)')).toBeVisible();
    await expect(page.locator('text=Zero Database Writes')).toBeVisible();
    await captureScreenshot(page, 'phase2_5_01_po2022008_activity_preview');

    // 2. PO-2022-009 (HDPE, FY22)
    respPromise = page.waitForResponse(r => r.url().includes('PO-2022-009/method-options'));
    await purchaseSelect.selectOption('PO-2022-009');
    await respPromise;
    postPromise = page.waitForResponse(r => r.url().includes('/calculations') && r.request().method() === 'POST');
    await page.locator('[data-testid="method-card-activity_based"]').click();
    await postPromise;
    await expect(page.locator('text=Calculation Preview (preview_only: true)')).toBeVisible();
    await captureScreenshot(page, 'phase2_5_02_po2022009_activity_preview');

    // 3. PO-2023-005 (Soda Ash, FY23)
    respPromise = page.waitForResponse(r => r.url().includes('PO-2023-005/method-options'));
    await purchaseSelect.selectOption('PO-2023-005');
    await respPromise;
    postPromise = page.waitForResponse(r => r.url().includes('/calculations') && r.request().method() === 'POST');
    await page.locator('[data-testid="method-card-activity_based"]').click();
    await postPromise;
    await expect(page.locator('text=Calculation Preview (preview_only: true)')).toBeVisible();
    await captureScreenshot(page, 'phase2_5_03_po2023005_activity_preview');

    // 4. PO-2023-008 (Glass, FY23)
    respPromise = page.waitForResponse(r => r.url().includes('PO-2023-008/method-options'));
    await purchaseSelect.selectOption('PO-2023-008');
    await respPromise;
    postPromise = page.waitForResponse(r => r.url().includes('/calculations') && r.request().method() === 'POST');
    await page.locator('[data-testid="method-card-activity_based"]').click();
    await postPromise;
    await expect(page.locator('text=Calculation Preview (preview_only: true)')).toBeVisible();
    await captureScreenshot(page, 'phase2_5_04_po2023008_activity_preview');
  });

  test('TC-02: Dry Run Previews for 4 Proposed Spend-Based Purchases (Zero Mutation)', async ({ page }) => {
    await loginAs(page, 'manufacturer');
    await page.goto(`${APP_URL}/manufacturer/calculations`);
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Run / Compare Methods")').click();
    await expect(page.locator('h3:has-text("Multi-Method Calculation Selection & Preview")')).toBeVisible();

    const purchaseSelect = page.locator('#modal-purchase-select');

    // 1. PO-2022-006 (Packaging, FY22)
    let respPromise = page.waitForResponse(r => r.url().includes('PO-2022-006/method-options'));
    await purchaseSelect.selectOption('PO-2022-006');
    await respPromise;
    let postPromise = page.waitForResponse(r => r.url().includes('/calculations') && r.request().method() === 'POST');
    await page.locator('[data-testid="method-card-spend_based"]').click();
    await postPromise;
    await expect(page.locator('text=Calculation Preview (preview_only: true)')).toBeVisible();
    await expect(page.locator('text=Zero Database Writes')).toBeVisible();
    await captureScreenshot(page, 'phase2_5_05_po2022006_spend_preview');

    // 2. PO-2022-007 (Fabric, FY22)
    respPromise = page.waitForResponse(r => r.url().includes('PO-2022-007/method-options'));
    await purchaseSelect.selectOption('PO-2022-007');
    await respPromise;
    postPromise = page.waitForResponse(r => r.url().includes('/calculations') && r.request().method() === 'POST');
    await page.locator('[data-testid="method-card-spend_based"]').click();
    await postPromise;
    await expect(page.locator('text=Calculation Preview (preview_only: true)')).toBeVisible();
    await captureScreenshot(page, 'phase2_5_06_po2022007_spend_preview');

    // 3. PO-2023-006 (Packaging, FY23)
    respPromise = page.waitForResponse(r => r.url().includes('PO-2023-006/method-options'));
    await purchaseSelect.selectOption('PO-2023-006');
    await respPromise;
    postPromise = page.waitForResponse(r => r.url().includes('/calculations') && r.request().method() === 'POST');
    await page.locator('[data-testid="method-card-spend_based"]').click();
    await postPromise;
    await expect(page.locator('text=Calculation Preview (preview_only: true)')).toBeVisible();
    await captureScreenshot(page, 'phase2_5_07_po2023006_spend_preview');

    // 4. PO-2023-007 (Fabric, FY23)
    respPromise = page.waitForResponse(r => r.url().includes('PO-2023-007/method-options'));
    await purchaseSelect.selectOption('PO-2023-007');
    await respPromise;
    postPromise = page.waitForResponse(r => r.url().includes('/calculations') && r.request().method() === 'POST');
    await page.locator('[data-testid="method-card-spend_based"]').click();
    await postPromise;
    await expect(page.locator('text=Calculation Preview (preview_only: true)')).toBeVisible();
    await captureScreenshot(page, 'phase2_5_08_po2023007_spend_preview');
  });

  test('TC-03: Verify Calculations Table and Dashboard Baseline Remain Unmutated', async ({ page }) => {
    await loginAs(page, 'manufacturer');
    await page.goto(`${APP_URL}/manufacturer/calculations`);
    await page.waitForLoadState('networkidle');

    // Verify 20 calculations are shown in table
    const tableRows = page.locator('tbody tr');
    await expect(tableRows).toHaveCount(20);

    // Verify all active calculations show Product-Factor
    const methodBadges = page.locator('tbody tr td:has-text("Product-Factor")');
    await expect(methodBadges).toHaveCount(20);

    await captureScreenshot(page, 'phase2_5_09_calculations_inventory_unmutated');

    // Visit Dashboard
    await page.goto(`${APP_URL}/manufacturer/dashboard`);
    await page.waitForLoadState('networkidle');

    // Verify Baseline summary displays ~2,692.86 t CO2e
    const totalEmissionsCard = page.locator('div:has-text("Total Scope 3 Emissions")').first();
    await expect(totalEmissionsCard).toContainText('2,692.86');

    // Verify Method Distribution shows 100% Product-Factor
    const pfCard = page.locator('div:has-text("Product-Factor (Tier 1)")').first();
    await expect(pfCard).toContainText('2,692.86');

    await captureScreenshot(page, 'phase2_5_10_dashboard_baseline_unmutated');
  });
});
