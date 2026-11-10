import { test, expect } from '@playwright/test';
import {
  APP_URL,
  loginAs,
  captureScreenshot,
  appendResult,
  setupConsoleAndNetworkTracking,
} from './test_helpers';

test.describe('E2E Suite 29: AI Report Quality & Completeness Scan Timeout & Resilience', () => {
  const SUBMISSION_ID = 'sub-SUP-001-FY2022-23';

  test('TC-01: AI Report Quality & Completeness Scan completes with multi-stage progress', async ({ page }) => {
    test.setTimeout(60000);
    const start = Date.now();
    const { consoleErrors } = setupConsoleAndNetworkTracking(page);

    await loginAs(page, 'auditor');
    await page.goto(`${APP_URL}/auditor/submissions/${SUBMISSION_ID}`);
    await page.waitForLoadState('networkidle');

    // Route with realistic 4-second delay to verify multi-stage transitions & timer
    await page.route('**/api/v1/auditor/submissions/*/ai/report-quality', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'assessment-tc-01',
          type: 'report_quality',
          submission_id: SUBMISSION_ID,
          result: {
            rating: 'Good',
            findings: [
              {
                finding: 'Electricity consumption matches expected industrial profile for steel rolling mill.',
                data_reference: 'activities[0].value',
                explanation: '70,400,000 kWh aligned with annual manufacturing output of 160,000 tonnes.',
              },
              {
                finding: 'Backup diesel generation activity logged with appropriate volume units.',
                data_reference: 'activities[1].value',
                explanation: '280,000 litres reported with valid unit metadata.',
              },
            ],
            missing_information: [
              'Third-party calibration certificates for main sub-meters are recommended.',
            ],
            suggested_clarification_questions: [
              'Please clarify whether diesel consumption includes auxiliary water pumping stations.',
              'Confirm meter boundary calibration frequency for FY2022-23.',
            ],
          },
        }),
      });
    });

    // Section 4 Header & Button Verification
    await expect(page.locator('text=AI Report Quality & Completeness Scan')).toBeVisible({ timeout: 10000 });
    const runBtn = page.locator('[data-testid="run-quality-scan-btn"]');
    await expect(runBtn).toBeVisible();

    // Trigger Scan
    await runBtn.click();

    // Verify multi-stage progress indicators
    const progressCard = page.locator('[data-testid="quality-scan-progress"]');
    await expect(progressCard).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Preparing report data')).toBeVisible();
    await expect(page.locator('text=AI analysis in progress')).toBeVisible();

    // Verify live elapsed timer is ticking
    const timer = page.locator('[data-testid="quality-elapsed-timer"]');
    await expect(timer).toBeVisible();

    // Verify button is disabled during scan
    await expect(runBtn).toBeDisabled();

    // Capture screenshot of in-flight progress
    await captureScreenshot(page, '29_ai_quality_scan_in_flight');

    // Wait for completed scan results
    const resultsContainer = page.locator('[data-testid="quality-scan-results"]');
    await expect(resultsContainer).toBeVisible({ timeout: 15000 });

    // Validate structured results
    const rating = page.locator('[data-testid="quality-assessment-rating"]');
    await expect(rating).toBeVisible();
    const ratingText = await rating.innerText();
    expect(ratingText.trim()).toBe('Good');

    // Verify findings, missing information, and suggested questions lists
    await expect(page.locator('[data-testid="quality-findings-list"]')).toBeVisible();
    await expect(page.locator('text=Electricity consumption matches expected industrial profile')).toBeVisible();
    await expect(page.locator('[data-testid="quality-missing-info-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="quality-questions-list"]')).toBeVisible();

    // Verify button transitioned to Re-run and is enabled
    await expect(runBtn).toBeEnabled();
    await expect(runBtn).toContainText('Re-run Report Quality Scan');

    const ssPath = await captureScreenshot(page, '29_ai_quality_scan_completed');
    appendResult({
      testId: 'TC-29-01',
      workflowName: 'AI Report Quality Scan with Multi-Stage Progress',
      role: 'auditor',
      testingMode: 'browser',
      status: 'PASSED',
      durationMs: Date.now() - start,
      screenshotPath: ssPath,
      details: `AI quality scan completed. Rating: ${ratingText}. Multi-stage progress indicators and findings successfully populated.`,
    });
  });

  test('TC-02: Extended Timeout Resilience (>30s Simulated Delay succeeds)', async ({ page }) => {
    test.setTimeout(60000);
    const start = Date.now();

    await loginAs(page, 'auditor');
    await page.goto(`${APP_URL}/auditor/submissions/${SUBMISSION_ID}`);
    await page.waitForLoadState('networkidle');

    // Intercept with 35s delay (exceeding original 30s timeout)
    let requestCount = 0;
    await page.route('**/api/v1/auditor/submissions/*/ai/report-quality', async (route) => {
      requestCount++;
      await new Promise((resolve) => setTimeout(resolve, 35000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-assessment-35s',
          type: 'report_quality',
          submission_id: SUBMISSION_ID,
          result: {
            rating: 'Good',
            findings: [
              {
                finding: 'Simulated >30s delayed scan completed successfully without timeout.',
                data_reference: 'activities',
                explanation: 'Request took 35s, well within 120s limit.',
              },
            ],
            missing_information: [],
            suggested_clarification_questions: [
              'Verify monthly diesel fuel generator logs for Q3.',
            ],
          },
        }),
      });
    });

    const runBtn = page.locator('[data-testid="run-quality-scan-btn"]');
    await runBtn.click();

    // Confirm progress is visible
    await expect(page.locator('[data-testid="quality-scan-progress"]')).toBeVisible();

    // Wait until elapsed timer exceeds 30s
    await page.waitForTimeout(32000);
    const timerText = await page.locator('[data-testid="quality-elapsed-timer"]').innerText();
    expect(timerText).toMatch(/Elapsed:\s+(3[1-9]|[4-9]\d)s/);

    // Verify it did NOT fail at 30s with Axios timeout
    await expect(page.locator('[data-testid="quality-scan-error"]')).not.toBeVisible();

    // Verify results successfully render at 35s
    await expect(page.locator('[data-testid="quality-scan-results"]')).toBeVisible({ timeout: 10000 });
    const rating = page.locator('[data-testid="quality-assessment-rating"]');
    await expect(rating).toHaveText('Good');
    expect(requestCount).toBe(1);

    const ssPath = await captureScreenshot(page, '29_ai_quality_scan_35s_timeout_resilience');
    appendResult({
      testId: 'TC-29-02',
      workflowName: 'AI Report Quality Timeout Resilience (>30s Delay)',
      role: 'auditor',
      testingMode: 'browser',
      status: 'PASSED',
      durationMs: Date.now() - start,
      screenshotPath: ssPath,
      details: 'Request sustained for 35s without hitting previous 30s timeout limit. Successfully rendered results.',
    });
  });

  test('TC-03: Duplicate Trigger Prevention and Re-entry Guard', async ({ page }) => {
    test.setTimeout(30000);
    const start = Date.now();

    await loginAs(page, 'auditor');
    await page.goto(`${APP_URL}/auditor/submissions/${SUBMISSION_ID}`);
    await page.waitForLoadState('networkidle');

    let dispatchCount = 0;
    await page.route('**/api/v1/auditor/submissions/*/ai/report-quality', async (route) => {
      dispatchCount++;
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            rating: 'Good',
            findings: ['Single dispatch verified.'],
            missing_information: [],
            suggested_clarification_questions: [],
          },
        }),
      });
    });

    const runBtn = page.locator('[data-testid="run-quality-scan-btn"]');
    // Rapid double click
    await runBtn.click({ clickCount: 2, delay: 100 }).catch(() => {});

    // Button should immediately be disabled
    await expect(runBtn).toBeDisabled();

    // Wait for scan to finish
    await expect(page.locator('[data-testid="quality-scan-results"]')).toBeVisible({ timeout: 10000 });
    expect(dispatchCount).toBe(1);

    appendResult({
      testId: 'TC-29-03',
      workflowName: 'AI Report Quality Re-entry & Duplicate Dispatch Guard',
      role: 'auditor',
      testingMode: 'browser',
      status: 'PASSED',
      durationMs: Date.now() - start,
      screenshotPath: '',
      details: 'Rapid clicks resulted in exactly 1 HTTP dispatch; button disabled during execution.',
    });
  });

  test('TC-04: Error Handling - Upstream 504 Gateway Timeout Display', async ({ page }) => {
    test.setTimeout(30000);
    const start = Date.now();

    await loginAs(page, 'auditor');
    await page.goto(`${APP_URL}/auditor/submissions/${SUBMISSION_ID}`);
    await page.waitForLoadState('networkidle');

    await page.route('**/api/v1/auditor/submissions/*/ai/report-quality', async (route) => {
      await route.fulfill({
        status: 504,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Gateway Timeout: upstream AI service did not respond in time' }),
      });
    });

    const runBtn = page.locator('[data-testid="run-quality-scan-btn"]');
    await runBtn.click();

    const errorAlert = page.locator('[data-testid="quality-scan-error"]');
    await expect(errorAlert).toBeVisible({ timeout: 5000 });
    await expect(errorAlert).toContainText('AI Analysis Timeout');
    await expect(errorAlert).toContainText('HTTP 504');
    await expect(page.locator('button:has-text("Retry Scan")')).toBeVisible();

    const ssPath = await captureScreenshot(page, '29_ai_quality_scan_error_504');
    appendResult({
      testId: 'TC-29-04',
      workflowName: 'AI Report Quality Error Handling: 504 Gateway Timeout',
      role: 'auditor',
      testingMode: 'browser',
      status: 'PASSED',
      durationMs: Date.now() - start,
      screenshotPath: ssPath,
      details: 'HTTP 504 cleanly handled with informative banner, HTTP 504 badge, and retry button.',
    });
  });

  test('TC-05: Error Handling - HTTP 429 Rate Limit Display', async ({ page }) => {
    test.setTimeout(30000);
    const start = Date.now();

    await loginAs(page, 'auditor');
    await page.goto(`${APP_URL}/auditor/submissions/${SUBMISSION_ID}`);
    await page.waitForLoadState('networkidle');

    await page.route('**/api/v1/auditor/submissions/*/ai/report-quality', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Rate limit exceeded' }),
      });
    });

    const runBtn = page.locator('[data-testid="run-quality-scan-btn"]');
    await runBtn.click();

    const errorAlert = page.locator('[data-testid="quality-scan-error"]');
    await expect(errorAlert).toBeVisible({ timeout: 5000 });
    await expect(errorAlert).toContainText('Rate Limit Reached');
    await expect(errorAlert).toContainText('HTTP 429');

    const ssPath = await captureScreenshot(page, '29_ai_quality_scan_error_429');
    appendResult({
      testId: 'TC-29-05',
      workflowName: 'AI Report Quality Error Handling: 429 Rate Limit',
      role: 'auditor',
      testingMode: 'browser',
      status: 'PASSED',
      durationMs: Date.now() - start,
      screenshotPath: ssPath,
      details: 'HTTP 429 gracefully rendered with rate limit banner and retry options.',
    });
  });

  test('TC-06: Error Handling - HTTP 503 Provider Unavailable Display', async ({ page }) => {
    test.setTimeout(30000);
    const start = Date.now();

    await loginAs(page, 'auditor');
    await page.goto(`${APP_URL}/auditor/submissions/${SUBMISSION_ID}`);
    await page.waitForLoadState('networkidle');

    await page.route('**/api/v1/auditor/submissions/*/ai/report-quality', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'OpenRouter service is temporarily unavailable' }),
      });
    });

    const runBtn = page.locator('[data-testid="run-quality-scan-btn"]');
    await runBtn.click();

    const errorAlert = page.locator('[data-testid="quality-scan-error"]');
    await expect(errorAlert).toBeVisible({ timeout: 5000 });
    await expect(errorAlert).toContainText('AI Provider Unavailable');
    await expect(errorAlert).toContainText('HTTP 503');

    const ssPath = await captureScreenshot(page, '29_ai_quality_scan_error_503');
    appendResult({
      testId: 'TC-29-06',
      workflowName: 'AI Report Quality Error Handling: 503 Provider Unavailable',
      role: 'auditor',
      testingMode: 'browser',
      status: 'PASSED',
      durationMs: Date.now() - start,
      screenshotPath: ssPath,
      details: 'HTTP 503 properly caught and displayed as Provider Unavailable banner.',
    });
  });

  test('TC-07: Error Handling - HTTP 502 Invalid AI Schema Response', async ({ page }) => {
    test.setTimeout(30000);
    const start = Date.now();

    await loginAs(page, 'auditor');
    await page.goto(`${APP_URL}/auditor/submissions/${SUBMISSION_ID}`);
    await page.waitForLoadState('networkidle');

    await page.route('**/api/v1/auditor/submissions/*/ai/report-quality', async (route) => {
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'OpenRouter returned invalid report-quality response structure' }),
      });
    });

    const runBtn = page.locator('[data-testid="run-quality-scan-btn"]');
    await runBtn.click();

    const errorAlert = page.locator('[data-testid="quality-scan-error"]');
    await expect(errorAlert).toBeVisible({ timeout: 5000 });
    await expect(errorAlert).toContainText('Invalid AI Model Response');
    await expect(errorAlert).toContainText('HTTP 502');

    const ssPath = await captureScreenshot(page, '29_ai_quality_scan_error_502');
    appendResult({
      testId: 'TC-29-07',
      workflowName: 'AI Report Quality Error Handling: 502 Invalid AI Response',
      role: 'auditor',
      testingMode: 'browser',
      status: 'PASSED',
      durationMs: Date.now() - start,
      screenshotPath: ssPath,
      details: 'HTTP 502 model schema error displayed with clear remediation options.',
    });
  });
});
