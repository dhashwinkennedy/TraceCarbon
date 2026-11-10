import { test, expect } from '@playwright/test';
import { APP_URL, loginAs, captureScreenshot, appendResult, FIXTURES_DIR, setupConsoleAndNetworkTracking } from './test_helpers';
import path from 'path';
import { execSync } from 'child_process';

test.describe('E2E Suite 03: Purchase Records & Procurement Ledger Ingestion', () => {
  test('TC-07: Download Excel Template, Upload Ledger, Verify SHA-256 and Ingest Rows', async ({ page }) => {
    const start = Date.now();
    const { consoleErrors } = setupConsoleAndNetworkTracking(page);
    page.on('dialog', async (dialog) => {
      await dialog.dismiss();
    });

    await loginAs(page, 'manufacturer');
    await page.goto(`${APP_URL}/manufacturer/purchases`);
    await page.waitForLoadState('networkidle');

    // 1. Download Template Check
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }),
      page.click('button:has-text("Download Excel Template")'),
    ]);
    const suggestedFilename = download.suggestedFilename();
    expect(suggestedFilename).toContain('.xlsx');

    const ssBeforeUpload = await captureScreenshot(page, '03_purchase_records_page');

    // 2. Prepare dynamic sample purchase records spreadsheet with fresh SHA-256 and fresh row fingerprints
    const dynamicFilePath = path.join(FIXTURES_DIR, 'purchase_records_dynamic.xlsx');
    const pyCmd = `python -c "import openpyxl, time, random; wb=openpyxl.load_workbook('frontend/tests/fixtures/purchase_records_test.xlsx'); ws=wb['Purchase Records']; ws['C2'] = '2026-06'; ws['C3'] = '2026-06'; q1 = 200 + random.randint(1, 90); q2 = 100 + random.randint(1, 90); ws['D2'] = q1; ws['D3'] = q2; ws_inst=wb.create_sheet('Instructions') if 'Instructions' not in wb.sheetnames else wb['Instructions']; ws_inst.cell(row=1, column=1, value='Run ' + str(time.time())); wb.save('frontend/tests/fixtures/purchase_records_dynamic.xlsx'); print(q1, q2)"`;
    const out = execSync(pyCmd).toString().trim().split(' ');
    const q1 = out[0];
    const q2 = out[1];

    const fileInput = page.locator('input[type="file"][accept=".xlsx"]');
    await fileInput.setInputFiles(dynamicFilePath);

    // 3. Verify Validation Summary appears
    await expect(page.locator('text=Pre-Ingestion Validation Summary')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Valid Rows', { exact: true })).toBeVisible();
    await expect(page.locator('text=SHA256:').first()).toBeVisible();

    const ssPreview = await captureScreenshot(page, '03_purchase_validation_preview');

    // 4. Confirm and Ingest
    await page.click('button:has-text("Confirm & Ingest")');
    await page.waitForLoadState('networkidle');

    // 5. Verify success alert and new records in table
    await expect(page.locator('text=Successfully ingested')).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${q1} tonnes`).first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${q2} tonnes`).first()).toBeVisible();

    const ssConfirmed = await captureScreenshot(page, '03_purchase_records_ingested');

    const duration = Date.now() - start;
    appendResult({
      testId: 'TC-07',
      workflowName: 'Purchase Excel Ingestion Workflow',
      role: 'manufacturer',
      testingMode: 'browser',
      status: 'PASSED',
      durationMs: duration,
      screenshotPath: ssConfirmed,
      details: `Downloaded template, uploaded multi-row ledger purchase_records_dynamic.xlsx, verified pre-ingestion SHA-256 checksum and confirmed ingestion of 2 valid procurement rows (${q1} tonnes, ${q2} tonnes). Console errors: ${consoleErrors.length}`,
    });
  });
});
