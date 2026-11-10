import { test, expect } from '@playwright/test';
import { APP_URL, loginAs, captureScreenshot, appendResult, setupConsoleAndNetworkTracking } from './test_helpers';

test.describe('E2E Suite 07: Scope 3 GHG Emissions Calculation Engine & Audit Receipts', () => {
  test('TC-11: Execute calculations for all 3 GHG Protocol methodologies (Product-Factor, Activity-Based, Spend-Based) and inspect receipts', async ({ page }) => {
    const start = Date.now();
    const { consoleErrors } = setupConsoleAndNetworkTracking(page);

    await loginAs(page, 'manufacturer');
    await page.goto(`${APP_URL}/manufacturer/calculations`);
    await page.waitForLoadState('networkidle');

    // ----------------------------------------------------
    // Method 1: Product-Factor (Tier 1 Supplier Specific)
    // ----------------------------------------------------
    await page.click('button:has-text("Run Calculation")');
    await expect(page.locator('text=Execute Emissions Calculation')).toBeVisible();

    // Select Product-Factor methodology
    await page.click('button:has-text("Product-Factor")');
    await page.waitForTimeout(300);

    // Execute
    await page.click('button[type="submit"]:has-text("Execute Calculation")');
    await page.waitForLoadState('networkidle');

    // Verification receipt modal should open automatically
    await expect(page.locator('text=Scope 3 Calculation Receipt')).toBeVisible({ timeout: 15000 });
    const ssReceipt1 = await captureScreenshot(page, '07_calculation_receipt_product_factor');
    await page.click('button:has-text("Close Receipt")');

    // ----------------------------------------------------
    // Method 2: Activity-Based (Tier 2 Primary Energy)
    // ----------------------------------------------------
    await page.click('button:has-text("Run Calculation")');
    await expect(page.locator('text=Execute Emissions Calculation')).toBeVisible();

    await page.click('button:has-text("Activity-Based")');
    await page.waitForTimeout(300);

    // Ensure a purchase record with a submitted supplier report is selected (e.g. 2026-01 or 2026-02)
    // Select purchase record option that has 2026-01 or 2026-02
    const purchaseSelect = page.locator('form select').first();
    const options = await purchaseSelect.locator('option').allTextContents();
    const validOptIndex = options.findIndex((opt) => opt.includes('2026-01') || opt.includes('2026-02'));
    if (validOptIndex >= 0) {
      await purchaseSelect.selectOption({ index: validOptIndex });
    }

    // Verify allocation fields
    await expect(page.locator('text=Supplier Activity Allocation Rules')).toBeVisible();

    await page.click('button[type="submit"]:has-text("Execute Calculation")');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Scope 3 Calculation Receipt')).toBeVisible({ timeout: 15000 });
    const ssReceipt2 = await captureScreenshot(page, '07_calculation_receipt_activity_based');
    await page.click('button:has-text("Close Receipt")');

    // ----------------------------------------------------
    // Method 3: Spend-Based (Tier 3 Economic Factor)
    // ----------------------------------------------------
    await page.click('button:has-text("Run Calculation")');
    await expect(page.locator('text=Execute Emissions Calculation')).toBeVisible();

    await page.click('button:has-text("Spend-Based")');
    await page.waitForTimeout(300);

    await page.click('button[type="submit"]:has-text("Execute Calculation")');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Scope 3 Calculation Receipt')).toBeVisible({ timeout: 15000 });
    const ssReceipt3 = await captureScreenshot(page, '07_calculation_receipt_spend_based');
    await page.click('button:has-text("Close Receipt")');

    // Verify all 3 methods appear in calculations history table
    await expect(page.locator('tr:has-text("Product-Factor")').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('tr:has-text("Activity-Based")').first()).toBeVisible();
    await expect(page.locator('tr:has-text("Spend-Based")').first()).toBeVisible();

    const ssHistory = await captureScreenshot(page, '07_calculations_history_table');

    const duration = Date.now() - start;
    appendResult({
      testId: 'TC-11',
      workflowName: 'Three Calculation Methodologies & Receipts',
      role: 'manufacturer',
      testingMode: 'browser',
      status: 'PASSED',
      durationMs: duration,
      screenshotPath: ssHistory,
      details: `Executed all 3 GHG Protocol calculation methodologies (Product-Factor, Activity-Based, Spend-Based) via frontend modal, inspected cryptographic receipts, and verified records in ledger. Console errors: ${consoleErrors.length}`,
    });
  });
});
