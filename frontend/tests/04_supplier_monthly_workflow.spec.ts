import { test, expect } from '@playwright/test';
import { APP_URL, loginAs, captureScreenshot, appendResult, setupConsoleAndNetworkTracking } from './test_helpers';

test.describe('E2E Suite 04: Supplier Monthly Draft, Manual Activity Entry & Submission', () => {
  test('TC-08: Create monthly report draft, enter manual activities, and submit to auditor', async ({ page }) => {
    const start = Date.now();
    const { consoleErrors } = setupConsoleAndNetworkTracking(page);

    await loginAs(page, 'supplier');
    await page.goto(`${APP_URL}/supplier/submissions`);
    await page.waitForLoadState('networkidle');

    // Click New Monthly Report
    await page.click('button:has-text("New Monthly Report")');
    await expect(page.locator('text=Initiate Monthly Report')).toBeVisible();

    // Select month 2026-02
    const monthInput = page.locator('input[type="month"]');
    await monthInput.fill('2026-02');

    // Submit modal form
    await page.click('button[type="submit"]:has-text("Create Draft")');
    await page.waitForLoadState('networkidle');

    // Should navigate to /supplier/submissions/:id
    await expect(page).toHaveURL(/.*\/supplier\/submissions\/.*/);
    await expect(page.locator('text=Monthly Report: 2026-02')).toBeVisible({ timeout: 15000 });

    const ssDraftCreated = await captureScreenshot(page, '04_supplier_draft_created');

    // Enter manual activity 1: electricity
    await page.selectOption('select', 'electricity');
    await page.fill('input[type="number"]', '125000');
    await page.fill('input[placeholder*="Meter #3"]', 'Main factory HT energy meter');
    await page.click('button:has-text("Add / Update Metric")');
    await expect(page.locator('text=Updated activity record: electricity')).toBeVisible({ timeout: 10000 });

    // Enter manual activity 2: diesel
    await page.selectOption('select', 'diesel');
    await page.fill('input[type="number"]', '2400');
    await page.fill('input[placeholder*="Meter #3"]', 'Backup DG set fuel tank receipt');
    await page.click('button:has-text("Add / Update Metric")');
    await expect(page.locator('text=Updated activity record: diesel')).toBeVisible({ timeout: 10000 });

    // Enter manual activity 3: production
    await page.selectOption('select', 'production');
    await page.fill('input[type="number"]', '620');
    await page.fill('input[placeholder*="Meter #3"]', 'Finished coil production output weighbridge');
    await page.click('button:has-text("Add / Update Metric")');
    await expect(page.locator('text=Updated activity record: production')).toBeVisible({ timeout: 10000 });

    // Enter manual activity 4: raw_material
    await page.selectOption('select', 'raw_material');
    await page.fill('input[type="number"]', '750');
    await page.fill('input[placeholder*="Meter #3"]', 'Raw scrap iron & sponge iron inputs');
    await page.click('button:has-text("Add / Update Metric")');
    await expect(page.locator('text=Updated activity record: raw_material')).toBeVisible({ timeout: 10000 });

    // Verify activities table has rows
    await expect(page.locator('text=125,000 kWh').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=2,400 litres').first()).toBeVisible();
    await expect(page.locator('text=620 tonnes').first()).toBeVisible();
    await expect(page.locator('text=750 tonnes').first()).toBeVisible();

    const ssActivitiesLogged = await captureScreenshot(page, '04_activities_logged');

    // Submit to Auditor
    await page.click('button:has-text("Submit to Auditor")');
    await expect(page.locator('text=Submit Monthly Carbon Report')).toBeVisible();

    // Confirm submission in modal
    await page.click('button:has-text("Confirm & Submit")');
    await page.waitForLoadState('networkidle');

    // Verify status changes to Submitted
    await expect(page.locator('text=submitted').first()).toBeVisible({ timeout: 10000 });

    const ssSubmitted = await captureScreenshot(page, '04_submission_completed');

    const duration = Date.now() - start;
    appendResult({
      testId: 'TC-08',
      workflowName: 'Supplier Monthly Report Creation & Submission',
      role: 'supplier',
      testingMode: 'browser',
      status: 'PASSED',
      durationMs: duration,
      screenshotPath: ssSubmitted,
      details: `Created monthly report draft for 2026-02, manually entered 4 primary activities (electricity, diesel, production, raw_material), and submitted report to auditor. Console errors: ${consoleErrors.length}`,
    });
  });
});
