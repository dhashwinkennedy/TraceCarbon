import { test, expect } from '@playwright/test';
import { APP_URL, loginAs, captureScreenshot, appendResult, setupConsoleAndNetworkTracking } from './test_helpers';

test.describe('E2E Suite 08: Supplier Carbon Reduction Suggestions (Live OpenRouter AI)', () => {
  test('TC-12: Generate qualitative reduction suggestions for verified month and inspect genuine AI fields', async ({ page }) => {
    test.setTimeout(120000); // Live OpenRouter inference
    const start = Date.now();
    const { consoleErrors } = setupConsoleAndNetworkTracking(page);

    await loginAs(page, 'supplier');
    await page.goto(`${APP_URL}/supplier/reductions`);
    await page.waitForLoadState('networkidle');

    // Select submission for 2026-01 which has calculated runs
    const select = page.locator('select');
    if (await select.count() > 0) {
      const options = await select.locator('option').allTextContents();
      const idx = options.findIndex((opt) => opt.includes('2026-01'));
      if (idx >= 0) {
        await select.selectOption({ index: idx });
        await page.waitForLoadState('networkidle');
      }
    }

    const ssBefore = await captureScreenshot(page, '08_reduction_suggestions_ready');

    // Click Generate AI Suggestions
    await page.click('button:has-text("Generate AI Suggestions")');

    // Wait for OpenRouter AI inference
    await expect(page.locator('text=Expected Direction:').first()).toBeVisible({ timeout: 60000 });
    await expect(page.locator('text=Observed:').first()).toBeVisible();

    // Verify absence of unreturned/invented fields (no capex, no payback)
    const pageText = await page.textContent('body');
    expect(pageText).not.toContain('Payback Period');
    expect(pageText).not.toContain('Estimated CapEx');
    expect(pageText).not.toContain('Payback Years');
    expect(pageText).not.toContain('Implementation Cost');

    const ssGenerated = await captureScreenshot(page, '08_reduction_suggestions_live_ai');

    const duration = Date.now() - start;
    appendResult({
      testId: 'TC-12',
      workflowName: 'AI Carbon Reduction Suggestions',
      role: 'supplier',
      testingMode: 'browser',
      status: 'PASSED',
      durationMs: duration,
      screenshotPath: ssGenerated,
      details: `Generated live qualitative decarbonization suggestions via OpenRouter without fabricated financial metrics (0 invented capex/payback fields). Console errors: ${consoleErrors.length}`,
    });
  });
});
