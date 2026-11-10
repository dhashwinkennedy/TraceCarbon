import { test, expect } from '@playwright/test';
import { APP_URL, loginAs, captureScreenshot, appendResult, setupConsoleAndNetworkTracking } from './test_helpers';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('E2E Suite 11: Scope 3 Category 2 (Capital Goods) Emissions Investigation', () => {
  test('TC-17: Verify Category 2 zero-state messaging, interactive calculation, dashboard refresh, and acquisition month filtering', async ({ page }) => {
    test.setTimeout(90000);
    const start = Date.now();
    const { consoleErrors } = setupConsoleAndNetworkTracking(page);

    const projectRoot = path.resolve(__dirname, '../..');
    const fixtureScript = path.join(projectRoot, 'backend', 'tests', 'setup_cat2_fixture.py');

    // Ensure fixture is setup: insert Category 2 purchase record & compatible DEMO factor
    execSync(`python "${fixtureScript}" setup`, { stdio: 'inherit' });

    try {
      // ------------------------------------------------------------------
      // Step 1: Initial Dashboard View (Zero Category 2 Calculations)
      // ------------------------------------------------------------------
      await loginAs(page, 'manufacturer');
      await page.goto(`${APP_URL}/manufacturer/dashboard`);
      await page.waitForLoadState('networkidle');

      // Verify Category 2 card shows zero-state with non-prejudicial advisory subtitle
      const cat2Card = page.locator('div:has-text("Category 2: Capital Goods")').last();
      await expect(cat2Card).toBeVisible();
      await expect(cat2Card.locator('text=0.00 kg CO₂e').first()).toBeVisible();
      await expect(cat2Card.locator('text=No calculated Category 2 emissions available for this period').first()).toBeVisible();

      const ssZero = await captureScreenshot(page, '11_dashboard_cat2_zero_state');

      // ------------------------------------------------------------------
      // Step 2: Execute Category 2 Calculation in Calculations Engine
      // ------------------------------------------------------------------
      await page.goto(`${APP_URL}/manufacturer/calculations`);
      await page.waitForLoadState('networkidle');

      await page.click('button:has-text("Run Calculation")');
      await expect(page.locator('text=Execute Emissions Calculation')).toBeVisible();

      // Select Product-Factor methodology
      await page.click('button:has-text("Product-Factor")');
      await page.waitForTimeout(300);

      // Select the Category 2 purchase record (Production machinery — 2026-05)
      const purchaseSelect = page.locator('form select').first();
      const options = await purchaseSelect.locator('option').allTextContents();
      const machIndex = options.findIndex((opt) => opt.includes('Production machinery') || opt.includes('MAC-001') || opt.includes('2026-05'));
      if (machIndex >= 0) {
        await purchaseSelect.selectOption({ index: machIndex });
      }

      // Select compatible machinery emission factor
      const factorSelect = page.locator('form select').nth(1);
      const factorOpts = await factorSelect.locator('option').allTextContents();
      const factorIndex = factorOpts.findIndex((opt) => opt.includes('capital machinery') || opt.includes('factor-machinery'));
      if (factorIndex >= 0) {
        await factorSelect.selectOption({ index: factorIndex });
      }

      // Execute calculation
      await page.click('button[type="submit"]:has-text("Execute Calculation")');
      await page.waitForLoadState('networkidle');

      // Verify calculation receipt modal displays Category 2
      await expect(page.locator('text=Scope 3 Calculation Receipt')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('text=Category 2').first()).toBeVisible();
      await expect(page.locator('text=25.00 t CO₂e').first()).toBeVisible();

      const ssReceipt = await captureScreenshot(page, '11_calculation_receipt_category2');
      await page.click('button:has-text("Close Receipt")');

      // ------------------------------------------------------------------
      // Step 3: Verify Dashboard Refresh with Calculated Category 2 Emissions
      // ------------------------------------------------------------------
      await page.goto(`${APP_URL}/manufacturer/dashboard`);
      await page.waitForLoadState('networkidle');

      // Category 2 card now shows 25.00 t CO2e
      const updatedCat2Card = page.locator('div:has-text("Category 2: Capital Goods")').last();
      await expect(updatedCat2Card.locator('text=25.00 t CO₂e').first()).toBeVisible({ timeout: 10000 });
      // Subtitle switches from "No calculated..." to standard subtitle "Machinery & capitalized assets"
      await expect(updatedCat2Card.locator('text=Machinery & capitalized assets').first()).toBeVisible();

      const ssCalculated = await captureScreenshot(page, '11_dashboard_cat2_calculated');

      // ------------------------------------------------------------------
      // Step 4: Verify Reporting Month Filtering
      // ------------------------------------------------------------------
      // Filter by acquisition month 2026-05
      const monthFilter = page.locator('select').first();
      await monthFilter.selectOption('2026-05');
      await page.waitForLoadState('networkidle');

      // In 2026-05: Category 2 is 25.00 t CO2e, Category 1 is 0.00 kg CO2e
      await expect(page.locator('text=25.00 t CO₂e').first()).toBeVisible();
      const cat1Card = page.locator('div:has-text("Category 1: Purchased Goods")').last();
      await expect(cat1Card.locator('text=0.00 kg CO₂e').first()).toBeVisible();

      const ssFiltered = await captureScreenshot(page, '11_dashboard_cat2_month_filtered');

      // Switch filter back to 2026-01 (should show 0.00 kg CO2e for Cat 2 with zero-state subtitle)
      await monthFilter.selectOption('2026-01');
      await page.waitForLoadState('networkidle');
      const janCat2Card = page.locator('div:has-text("Category 2: Capital Goods")').last();
      await expect(janCat2Card.locator('text=0.00 kg CO₂e').first()).toBeVisible();
      await expect(janCat2Card.locator('text=No calculated Category 2 emissions available for this period').first()).toBeVisible();

      const duration = Date.now() - start;
      appendResult({
        testId: 'TC-17',
        workflowName: 'Category 2 Zero-State, Calculation & Month Filter',
        role: 'manufacturer',
        testingMode: 'browser',
        status: 'PASSED',
        durationMs: duration,
        screenshotPath: ssCalculated,
        details: `Verified Category 2 zero-state message, interactive product_factor calculation (25.00 t CO2e), dashboard refresh, and single-period acquisition month filtering (2026-05 vs 2026-01). Console errors: ${consoleErrors.length}`,
      });
    } finally {
      // Clean up synthetic test records
      execSync(`python "${fixtureScript}" teardown`, { stdio: 'inherit' });
    }
  });
});
