import { test, expect } from '@playwright/test';
import { APP_URL, loginAs, captureScreenshot, appendResult, setupConsoleAndNetworkTracking } from './test_helpers';

test.describe('E2E Suite 09: Role-Based Access Control & URL Protection', () => {
  test('TC-13: Verify supplier cannot access manufacturer or auditor endpoints', async ({ page }) => {
    const start = Date.now();
    const { consoleErrors } = setupConsoleAndNetworkTracking(page);

    await loginAs(page, 'supplier');

    // Attempt visiting manufacturer routes
    await page.goto(`${APP_URL}/manufacturer/dashboard`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*\/supplier\/dashboard/);

    await page.goto(`${APP_URL}/manufacturer/calculations`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*\/supplier\/dashboard/);

    // Attempt visiting auditor routes
    await page.goto(`${APP_URL}/auditor/dashboard`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*\/supplier\/dashboard/);

    const ssSupplierRbac = await captureScreenshot(page, '09_supplier_rbac_enforced');

    const duration = Date.now() - start;
    appendResult({
      testId: 'TC-13',
      workflowName: 'Supplier RBAC Boundary Enforcement',
      role: 'supplier',
      testingMode: 'browser',
      status: 'PASSED',
      durationMs: duration,
      screenshotPath: ssSupplierRbac,
      details: `Enforced route protection: Supplier cannot access manufacturer or auditor administrative portals. Console errors: ${consoleErrors.length}`,
    });
  });

  test('TC-14: Verify auditor cannot access manufacturer or supplier portals', async ({ page }) => {
    const start = Date.now();
    const { consoleErrors } = setupConsoleAndNetworkTracking(page);

    await loginAs(page, 'auditor');

    // Attempt visiting manufacturer routes
    await page.goto(`${APP_URL}/manufacturer/dashboard`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*\/auditor\/dashboard/);

    // Attempt visiting supplier routes
    await page.goto(`${APP_URL}/supplier/dashboard`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*\/auditor\/dashboard/);

    const ssAuditorRbac = await captureScreenshot(page, '09_auditor_rbac_enforced');

    const duration = Date.now() - start;
    appendResult({
      testId: 'TC-14',
      workflowName: 'Auditor RBAC Boundary Enforcement',
      role: 'auditor',
      testingMode: 'browser',
      status: 'PASSED',
      durationMs: duration,
      screenshotPath: ssAuditorRbac,
      details: `Enforced route protection: Auditor cannot access manufacturer administrative or supplier self-reporting views. Console errors: ${consoleErrors.length}`,
    });
  });

  test('TC-15: Verify unauthenticated user cannot access protected paths', async ({ page }) => {
    const start = Date.now();
    const { consoleErrors } = setupConsoleAndNetworkTracking(page);

    await page.goto(`${APP_URL}/manufacturer/dashboard`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*\/login/);

    await page.goto(`${APP_URL}/supplier/dashboard`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*\/login/);

    await page.goto(`${APP_URL}/auditor/dashboard`);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/.*\/login/);

    const ssUnauth = await captureScreenshot(page, '09_unauthenticated_redirect_login');

    const duration = Date.now() - start;
    appendResult({
      testId: 'TC-15',
      workflowName: 'Unauthenticated Route Protection',
      role: 'public',
      testingMode: 'browser',
      status: 'PASSED',
      durationMs: duration,
      screenshotPath: ssUnauth,
      details: `Protected all internal paths from unauthenticated access; verified redirect to /login. Console errors: ${consoleErrors.length}`,
    });
  });
});
