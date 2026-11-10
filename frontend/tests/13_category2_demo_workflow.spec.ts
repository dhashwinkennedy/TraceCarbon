import { test, expect } from '@playwright/test';
import { APP_URL, loginAs, captureScreenshot, setupConsoleAndNetworkTracking } from './test_helpers';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEMO_SCREENSHOTS_DIR = path.resolve(__dirname, 'screenshots', 'category2-demo');

if (!fs.existsSync(DEMO_SCREENSHOTS_DIR)) {
  fs.mkdirSync(DEMO_SCREENSHOTS_DIR, { recursive: true });
}

test.describe('Category 2 Capital Goods Demonstration Setup (scope3track)', () => {
  test('Execute Category 2 product verification, Excel upload, confirmation, and calculation audit', async ({ page }) => {
    test.setTimeout(90000);
    const { consoleErrors } = setupConsoleAndNetworkTracking(page);

    // ------------------------------------------------------------------
    // Step 1: Login as Manufacturer
    // ------------------------------------------------------------------
    await loginAs(page, 'manufacturer');

    // ------------------------------------------------------------------
    // Step 2: Open Product Catalog & Verify Category 2 Machinery Product
    // ------------------------------------------------------------------
    await page.goto(`${APP_URL}/manufacturer/products`);
    await page.waitForLoadState('networkidle');

    // Verify "Production machinery" product row
    const prodRow = page.locator('tr:has-text("Production machinery")').first();
    await expect(prodRow).toBeVisible({ timeout: 10000 });
    await expect(prodRow.locator('text=MAC-001')).toBeVisible();
    await expect(prodRow.locator('text=Category 2')).toBeVisible();
    await expect(prodRow.locator('text=unit')).toBeVisible();
    await expect(prodRow.locator('text=Active')).toBeVisible();

    const ssProd = path.join(DEMO_SCREENSHOTS_DIR, '01_product_catalog_category2.png');
    await page.screenshot({ path: ssProd, fullPage: true });
    console.log(`[SCREENSHOT] Captured 01_product_catalog_category2 at ${ssProd}`);

    // ------------------------------------------------------------------
    // Step 3/4: Open Purchase Records & Verify Confirmed Category 2 Ledger
    // ------------------------------------------------------------------
    await page.goto(`${APP_URL}/manufacturer/purchases`);
    await page.waitForLoadState('networkidle');

    // Verify purchase appears in the purchase ledger table
    const tableRow = page.locator('tr:has-text("2026-05")').first();
    await expect(tableRow).toBeVisible({ timeout: 10000 });
    await expect(tableRow.locator('text=product-machine')).toBeVisible();
    await expect(tableRow.locator('text=2 unit')).toBeVisible();
    await expect(tableRow.locator('text=INR 5,000,000.00')).toBeVisible();

    const ssConfirmed = path.join(DEMO_SCREENSHOTS_DIR, '03_confirmed_category2_purchase.png');
    await page.screenshot({ path: ssConfirmed, fullPage: true });
    console.log(`[SCREENSHOT] Captured 03_confirmed_category2_purchase at ${ssConfirmed}`);

    // ------------------------------------------------------------------
    // Step 5: Audit Emission Factors Library
    // ------------------------------------------------------------------
    await page.goto(`${APP_URL}/manufacturer/emission-factors`);
    await page.waitForLoadState('networkidle');

    const ssFactors = path.join(DEMO_SCREENSHOTS_DIR, '06_emission_factors_audit.png');
    await page.screenshot({ path: ssFactors, fullPage: true });
    console.log(`[SCREENSHOT] Captured 06_emission_factors_audit at ${ssFactors}`);

    // ------------------------------------------------------------------
    // Step 6: Open Calculations Engine & Inspect Factor Selection for Cat 2
    // ------------------------------------------------------------------
    await page.goto(`${APP_URL}/manufacturer/calculations`);
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Run Calculation")');
    await expect(page.locator('text=Execute Emissions Calculation')).toBeVisible({ timeout: 10000 });

    // Select the new Category 2 purchase record in the modal dropdown
    const purchaseSelect = page.locator('form select').first();
    const options = await purchaseSelect.locator('option').allTextContents();
    const machIndex = options.findIndex((opt) => opt.includes('2026-05'));
    if (machIndex >= 0) {
      await purchaseSelect.selectOption({ index: machIndex });
    }

    // Select Product-Factor methodology
    await page.click('button:has-text("Product-Factor")');
    await page.waitForTimeout(300);

    // Inspect the factor select dropdown
    const factorSelect = page.locator('form select').nth(1);
    const factorOptions = await factorSelect.locator('option').allTextContents();
    console.log('[FACTOR OPTIONS IN UI]', factorOptions);

    const hasMachineryFactor = factorOptions.some((opt) =>
      opt.toLowerCase().includes('machinery') || opt.toLowerCase().includes('factor-machinery-demo')
    );

    const ssCalcForm = path.join(DEMO_SCREENSHOTS_DIR, '04_calculation_form_product_factor.png');
    await page.screenshot({ path: ssCalcForm, fullPage: true });
    console.log(`[SCREENSHOT] Captured 04_calculation_form_product_factor at ${ssCalcForm}`);

    if (!hasMachineryFactor) {
      console.log('[BLOCKER VERIFIED] factor-machinery-demo is NOT present in the product-factor dropdown.');
      const ssDropdown = path.join(DEMO_SCREENSHOTS_DIR, '05_factor_dropdown_and_incompatibility.png');
      await page.screenshot({ path: ssDropdown, fullPage: true });
    }

    // Close the calculation modal
    await page.click('button:has-text("Cancel")');

    // ------------------------------------------------------------------
    // Step 7: View Manufacturer Dashboard
    // ------------------------------------------------------------------
    await page.goto(`${APP_URL}/manufacturer/dashboard`);
    await page.waitForLoadState('networkidle');

    // Filter by reporting month 2026-05
    const monthSelect = page.locator('select').first();
    const monthOptions = await monthSelect.locator('option').allTextContents();
    if (monthOptions.includes('2026-05')) {
      await monthSelect.selectOption('2026-05');
      await page.waitForLoadState('networkidle');
    }

    const ssDashboard = path.join(DEMO_SCREENSHOTS_DIR, '07_manufacturer_dashboard_cat2_status.png');
    await page.screenshot({ path: ssDashboard, fullPage: true });
    console.log(`[SCREENSHOT] Captured 07_manufacturer_dashboard_cat2_status at ${ssDashboard}`);
  });
});
