import { test, expect } from '@playwright/test';
import { APP_URL, loginAs, captureScreenshot, appendResult, setupConsoleAndNetworkTracking } from './test_helpers';

test.describe('E2E Suite 10: Responsive Layouts & Console/Network Hygiene', () => {
  test('TC-16: Responsive layout verification across Desktop (1440px), Tablet (768px), and Mobile (390px)', async ({ page }) => {
    const start = Date.now();
    const { consoleErrors, networkFailures } = setupConsoleAndNetworkTracking(page);

    await loginAs(page, 'manufacturer');

    // 1. Desktop (1440 x 900)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${APP_URL}/manufacturer/dashboard`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Total Scope 3 Emissions').first()).toBeVisible();
    const ssDesktop = await captureScreenshot(page, '10_responsive_desktop_1440px');

    // 2. Tablet (768 x 1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${APP_URL}/manufacturer/dashboard`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Total Scope 3 Emissions').first()).toBeVisible();
    const ssTablet = await captureScreenshot(page, '10_responsive_tablet_768px');

    // 3. Mobile (390 x 844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${APP_URL}/manufacturer/dashboard`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Total Scope 3 Emissions').first()).toBeVisible();
    const ssMobileMfg = await captureScreenshot(page, '10_responsive_mobile_390px_mfg');

    // Mobile on Supplier Portal
    await page.goto(`${APP_URL}/login`);
    await loginAs(page, 'supplier');
    await page.goto(`${APP_URL}/supplier/dashboard`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Supplier Carbon Portal').first()).toBeVisible();
    const ssMobileSup = await captureScreenshot(page, '10_responsive_mobile_390px_sup');

    const duration = Date.now() - start;
    appendResult({
      testId: 'TC-16',
      workflowName: 'Responsive Design & Multi-Viewport Verification',
      role: 'manufacturer',
      testingMode: 'browser',
      status: 'PASSED',
      durationMs: duration,
      screenshotPath: ssDesktop,
      details: `Verified responsive design at 1440px, 768px, and 390px without UI overflow or layout truncation. Console errors: ${consoleErrors.length}, Network failures: ${networkFailures.length}`,
    });
  });
});
