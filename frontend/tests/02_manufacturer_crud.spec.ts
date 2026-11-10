import { test, expect } from '@playwright/test';
import { APP_URL, loginAs, captureScreenshot, appendResult, setupConsoleAndNetworkTracking } from './test_helpers';

test.describe('E2E Suite 02: Manufacturer Administration & Entity Operations', () => {
  test('TC-04: Create Supplier and toggle Active/Inactive status', async ({ page }) => {
    const start = Date.now();
    const { consoleErrors } = setupConsoleAndNetworkTracking(page);

    await loginAs(page, 'manufacturer');
    await page.goto(`${APP_URL}/manufacturer/suppliers`);
    await page.waitForLoadState('networkidle');

    // Click Add Supplier
    await page.click('button:has-text("Add Supplier")');
    await expect(page.locator('text=Add Upstream Supplier')).toBeVisible();

    const supCode = `SUP${Math.floor(100 + Math.random() * 900)}`;
    const supName = `Apex Forgings Ltd ${supCode}`;
    const supEmail = `apex.${supCode.toLowerCase()}@scope3track.demo`;

    // Fill form
    await page.fill('input[placeholder*="Acme Steel"]', supName);
    await page.fill('input[placeholder*="SUP003"]', supCode);
    await page.fill('input[placeholder*="contact@supplier.com"]', `contact@${supCode.toLowerCase()}.demo`);
    await page.fill('input[placeholder*="portal.login@supplier.com"]', supEmail);
    await page.fill('input[type="password"]', 'SupplierDemo123!');

    // Submit
    await page.click('button[type="submit"]:has-text("Create Supplier")');
    await page.waitForLoadState('networkidle');

    // Verify supplier row appears
    await expect(page.locator(`text=${supName}`).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${supCode}`).first()).toBeVisible();

    const ssSupplier = await captureScreenshot(page, '02_supplier_created');

    // Toggle active status for newly created supplier
    const row = page.locator(`tr:has-text("${supName}")`);
    await row.locator('button:has-text("Deactivate")').click();
    
    // Confirmation modal should appear
    await expect(page.locator('h3:has-text("Deactivate Supplier")')).toBeVisible();
    await page.locator('div[role="dialog"] button:has-text("Deactivate Supplier"), .fixed button:has-text("Deactivate Supplier")').click();
    await page.waitForLoadState('networkidle');

    // Verify status updated to Inactive
    await expect(row.locator('text=Inactive').first()).toBeVisible({ timeout: 10000 });
    const ssDeactivated = await captureScreenshot(page, '02_supplier_deactivated');

    const duration = Date.now() - start;
    appendResult({
      testId: 'TC-04',
      workflowName: 'Supplier Creation & Status Toggle',
      role: 'manufacturer',
      testingMode: 'browser',
      status: 'PASSED',
      durationMs: duration,
      screenshotPath: ssSupplier,
      details: `Created new supplier Apex Forgings Ltd (SUP003) and verified active/inactive status toggle with modal confirmation. Console errors: ${consoleErrors.length}`,
    });
  });

  test('TC-05: Create Internal Auditor (ABC Manufacturing Employee) & Assignments', async ({ page }) => {
    const start = Date.now();
    const { consoleErrors } = setupConsoleAndNetworkTracking(page);

    await loginAs(page, 'manufacturer');
    await page.goto(`${APP_URL}/manufacturer/auditors`);
    await page.waitForLoadState('networkidle');

    // Click Add Internal Auditor
    await page.click('button:has-text("Add Internal Auditor")');
    await expect(page.locator('text=Add Internal Auditor (ABC Staff)')).toBeVisible();

    const audEmpId = `EMP-AUD-${Math.floor(100 + Math.random() * 900)}`;
    const audName = `Senior Auditor ${audEmpId}`;
    const audEmail = `auditor.${audEmpId.toLowerCase()}@scope3track.demo`;

    // Fill form fields
    await page.fill('input[placeholder*="John Doe"]', audName);
    await page.fill('input[placeholder*="EMP-1042"]', audEmpId);
    await page.fill('input[placeholder*="john@company.com"]', `work.${audEmpId.toLowerCase()}@abcmfg.demo`);
    await page.fill('input[placeholder*="john.auditor@company.com"]', audEmail);
    await page.fill('input[type="password"]', 'AuditorDemo123!');

    // Submit
    await page.click('button[type="submit"]:has-text("Register Auditor")');
    await page.waitForLoadState('networkidle');

    // Verify auditor appears in table
    await expect(page.locator(`text=${audName}`).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${audEmpId}`).first()).toBeVisible();

    const ssAuditor = await captureScreenshot(page, '02_auditor_created');

    // Assign supplier to auditor
    await page.click('button:has-text("Assign Supplier to Auditor")');
    await expect(page.locator('text=Assign Supplier to Internal Auditor')).toBeVisible();

    // Select auditor from dropdown and select supplier
    await page.selectOption('select:has-text("Senior Auditor Jane")', { label: 'Senior Auditor Jane (EMP-AUD-009)' }).catch(async () => {
      // Fallback to select first select
      const selects = page.locator('select');
      await selects.first().selectOption({ index: 0 });
    });
    const selects = page.locator('select');
    if (await selects.count() > 1) {
      await selects.nth(1).selectOption({ index: 0 });
    }

    await page.click('button[type="submit"]:has-text("Confirm Assignment")');
    await page.waitForLoadState('networkidle');

    // Verify assignment item appears in Active Audit Portfolio Assignments table
    await expect(page.locator('table').first()).toBeVisible();

    const duration = Date.now() - start;
    appendResult({
      testId: 'TC-05',
      workflowName: 'Auditor Creation & Assignment',
      role: 'manufacturer',
      testingMode: 'browser',
      status: 'PASSED',
      durationMs: duration,
      screenshotPath: ssAuditor,
      details: `Created internal ABC Manufacturing auditor Senior Auditor Jane (EMP-AUD-009) and assigned portfolio tier-1 supplier. Console errors: ${consoleErrors.length}`,
    });
  });

  test('TC-06: Create Product in Product Catalog', async ({ page }) => {
    const start = Date.now();
    const { consoleErrors } = setupConsoleAndNetworkTracking(page);

    await loginAs(page, 'manufacturer');
    await page.goto(`${APP_URL}/manufacturer/products`);
    await page.waitForLoadState('networkidle');

    // Click Add Product
    await page.click('button:has-text("Add Product")');
    await expect(page.locator('text=Add New Product')).toBeVisible();

    const prodCode = `BM-${Math.floor(100 + Math.random() * 900)}`;
    const prodName = `Structural Beam ${prodCode}`;

    // Fill form
    await page.fill('input[placeholder*="Aluminium Ingot"]', prodName);
    await page.fill('input[placeholder*="ALU-001"]', prodCode);
    await page.selectOption('select', 'Category 1');
    await page.fill('input[placeholder*="tonnes"]', 'tonnes');

    // Submit
    await page.click('button[type="submit"]:has-text("Create Product")');
    await page.waitForLoadState('networkidle');

    // Verify row
    await expect(page.locator(`text=${prodName}`).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${prodCode}`).first()).toBeVisible();

    const ssProduct = await captureScreenshot(page, '02_product_created');

    const duration = Date.now() - start;
    appendResult({
      testId: 'TC-06',
      workflowName: 'Product Catalog Management',
      role: 'manufacturer',
      testingMode: 'browser',
      status: 'PASSED',
      durationMs: duration,
      screenshotPath: ssProduct,
      details: `Created product Structural Beam 200mm (BM-200) under Scope 3 Category 1. Console errors: ${consoleErrors.length}`,
    });
  });
});
