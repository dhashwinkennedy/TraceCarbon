import { test, expect } from '@playwright/test';
import { APP_URL, loginAs, captureScreenshot, appendResult, setupConsoleAndNetworkTracking } from './test_helpers';

test.describe('E2E Suite 01: Authentication & Navigation', () => {
  test('TC-01: Manufacturer login and multi-page portal navigation', async ({ page }) => {
    const start = Date.now();
    const { consoleErrors, networkFailures } = setupConsoleAndNetworkTracking(page);

    await loginAs(page, 'manufacturer');
    await expect(page).toHaveURL(/.*\/manufacturer\/dashboard/);
    await expect(page.locator('text=Emissions Intelligence Dashboard')).toBeVisible();

    const ssDash = await captureScreenshot(page, '01_manufacturer_dashboard');

    // Navigation tests
    const routes = [
      { path: '/manufacturer/suppliers', heading: 'Supplier Management' },
      { path: '/manufacturer/auditors', heading: 'Internal Auditors & Verification Governance' },
      { path: '/manufacturer/products', heading: 'Product Catalog' },
      { path: '/manufacturer/factors', heading: 'Emission Factors & Activity Library' },
      { path: '/manufacturer/purchases', heading: 'Purchase Records & Procurement Ledger' },
      { path: '/manufacturer/submissions', heading: 'Supplier Submissions' },
      { path: '/manufacturer/calculations', heading: 'Emissions Calculation Engine' },
      { path: '/manufacturer/reports', heading: 'Emissions & Supplier Reports' },
      { path: '/manufacturer/profile', heading: 'Enterprise Company Profile' },
    ];

    for (const r of routes) {
      await page.goto(`${APP_URL}${r.path}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator(`text=${r.heading}`).first()).toBeVisible({ timeout: 10000 });
    }

    const duration = Date.now() - start;
    appendResult({
      testId: 'TC-01',
      workflowName: 'Manufacturer Login & Navigation',
      role: 'manufacturer',
      testingMode: 'browser',
      status: 'PASSED',
      durationMs: duration,
      screenshotPath: ssDash,
      details: `Successfully authenticated manufacturer and navigated all 9 manufacturer routes without breaking errors. Console errors: ${consoleErrors.length}`,
    });
  });

  test('TC-02: Supplier login and portal navigation', async ({ page }) => {
    const start = Date.now();
    const { consoleErrors } = setupConsoleAndNetworkTracking(page);

    await loginAs(page, 'supplier');
    await expect(page).toHaveURL(/.*\/supplier\/dashboard/);
    await expect(page.locator('text=Supplier Carbon Portal')).toBeVisible();

    const ssDash = await captureScreenshot(page, '01_supplier_dashboard');

    const routes = [
      { path: '/supplier/requirements', heading: 'Reporting Requirements' },
      { path: '/supplier/submissions', heading: 'Monthly Carbon Reporting' },
      { path: '/supplier/clarifications', heading: 'Auditor Inquiries & Clarifications' },
      { path: '/supplier/reductions', heading: 'AI Carbon Reduction Suggestions' },
      { path: '/supplier/profile', heading: 'Supplier Verified Profile' },
    ];

    for (const r of routes) {
      await page.goto(`${APP_URL}${r.path}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator(`text=${r.heading}`).first()).toBeVisible({ timeout: 10000 });
    }

    const duration = Date.now() - start;
    appendResult({
      testId: 'TC-02',
      workflowName: 'Supplier Login & Navigation',
      role: 'supplier',
      testingMode: 'browser',
      status: 'PASSED',
      durationMs: duration,
      screenshotPath: ssDash,
      details: `Successfully authenticated tier-1 supplier and navigated all 5 supplier routes. Console errors: ${consoleErrors.length}`,
    });
  });

  test('TC-03: Auditor login and desk navigation', async ({ page }) => {
    const start = Date.now();
    const { consoleErrors } = setupConsoleAndNetworkTracking(page);

    await loginAs(page, 'auditor');
    await expect(page).toHaveURL(/.*\/auditor\/dashboard/);
    await expect(page.locator('text=Auditor Verification Desk')).toBeVisible();

    const ssDash = await captureScreenshot(page, '01_auditor_dashboard');

    const routes = [
      { path: '/auditor/assignments', heading: 'Assigned Suppliers Portfolio' },
      { path: '/auditor/submissions', heading: 'Supplier Audit Submissions' },
    ];

    for (const r of routes) {
      await page.goto(`${APP_URL}${r.path}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator(`text=${r.heading}`).first()).toBeVisible({ timeout: 10000 });
    }

    const duration = Date.now() - start;
    appendResult({
      testId: 'TC-03',
      workflowName: 'Auditor Login & Navigation',
      role: 'auditor',
      testingMode: 'browser',
      status: 'PASSED',
      durationMs: duration,
      screenshotPath: ssDash,
      details: `Successfully authenticated internal auditor and navigated all auditor desk routes. Console errors: ${consoleErrors.length}`,
    });
  });
});
