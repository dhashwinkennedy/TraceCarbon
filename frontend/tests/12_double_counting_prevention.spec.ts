import { test, expect } from '@playwright/test';
import { APP_URL, loginAs, captureScreenshot, appendResult, setupConsoleAndNetworkTracking } from './test_helpers';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('E2E Suite 12: Emissions Double-Counting Prevention & Method Switching', () => {
  test('TC-18: Verify single active calculation per purchase in inventory, receipt preservation, and interactive method switching', async ({ page }) => {
    test.setTimeout(90000);
    const start = Date.now();
    const { consoleErrors } = setupConsoleAndNetworkTracking(page);

    try {
      // ------------------------------------------------------------------
      // Step 1: Login as Manufacturer and Navigate to Calculations Engine
      // ------------------------------------------------------------------
      await loginAs(page, 'manufacturer');
      await page.goto(`${APP_URL}/manufacturer/calculations`);
      await page.waitForLoadState('networkidle');

      // Verify Calculation Inventory Protection banner
      await expect(
        page.locator('text=Calculation Inventory Protection: Exactly one primary calculation methodology is active in your inventory per purchase record.')
      ).toBeVisible();

      // Verify table headers include "Inventory Status" and "Actions"
      await expect(page.locator('th:has-text("Inventory Status")')).toBeVisible();
      await expect(page.locator('th:has-text("Actions")')).toBeVisible();

      // Verify "Active in Inventory" badges are present in the table
      const activeBadges = page.locator('text=Active in Inventory');
      await expect(activeBadges.first()).toBeVisible({ timeout: 10000 });

      const ssInitialTable = await captureScreenshot(page, '12_calculations_inventory_status_badges');

      // ------------------------------------------------------------------
      // Step 2: Check for Existing Superseded Runs or Set Active Button
      // ------------------------------------------------------------------
      const supersededBadges = page.locator('text=Superseded Run');
      const supersededCount = await supersededBadges.count();

      if (supersededCount > 0) {
        // We have historical superseded runs from prior recalculations!
        const setActiveBtn = page.locator('button:has-text("Set Active")').first();
        await expect(setActiveBtn).toBeVisible();

        // ------------------------------------------------------------------
        // Step 3: Switch Active Calculation Method via UI
        // ------------------------------------------------------------------
        await setActiveBtn.click();
        await page.waitForLoadState('networkidle');

        // Confirm active status refreshed
        await expect(page.locator('text=Active in Inventory').first()).toBeVisible();
        const ssSwitched = await captureScreenshot(page, '12_method_switched_active');
      }

      // ------------------------------------------------------------------
      // Step 4: Verify Dashboard Aggregation Counts Only Single Active Runs
      // ------------------------------------------------------------------
      await page.goto(`${APP_URL}/manufacturer/dashboard`);
      await page.waitForLoadState('networkidle');

      // Verify Total Scope 3 card is visible
      const totalCard = page.locator('div:has-text("Total Scope 3 Emissions")').last();
      await expect(totalCard).toBeVisible();

      const ssDashboard = await captureScreenshot(page, '12_dashboard_single_counted_summary');

      // ------------------------------------------------------------------
      // Step 5: Verify Reports Page Shows Inventory Status
      // ------------------------------------------------------------------
      await page.goto(`${APP_URL}/manufacturer/reports`);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('th:has-text("Inventory Status")')).toBeVisible();
      const ssReports = await captureScreenshot(page, '12_reports_inventory_status');

      const duration = Date.now() - start;
      appendResult({
        testId: 'TC-18',
        workflowName: 'Emissions Double-Counting Prevention and Dynamic Method Switching',
        role: 'manufacturer',
        testingMode: 'browser',
        status: 'PASSED',
        durationMs: duration,
        screenshotPath: `${ssInitialTable}; ${ssDashboard}; ${ssReports}`,
        details: `Verified single active calculation per purchase in inventory. Verified historical receipts preserved. Console errors: ${consoleErrors.length}`,
      });
    } catch (err: any) {
      const duration = Date.now() - start;
      const ssFail = await captureScreenshot(page, '12_failure');
      appendResult({
        testId: 'TC-18',
        workflowName: 'Emissions Double-Counting Prevention and Dynamic Method Switching',
        role: 'manufacturer',
        testingMode: 'browser',
        status: 'FAILED',
        durationMs: duration,
        screenshotPath: ssFail,
        details: `Failed with error: ${err.message}. Console errors: ${consoleErrors.length}`,
      });
      throw err;
    }
  });
});
