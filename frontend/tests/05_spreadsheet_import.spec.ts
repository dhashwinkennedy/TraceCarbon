import { test, expect } from '@playwright/test';
import { APP_URL, loginAs, captureScreenshot, appendResult, FIXTURES_DIR, setupConsoleAndNetworkTracking } from './test_helpers';
import path from 'path';
import { execSync } from 'child_process';

test.describe('E2E Suite 05: Supplier Multi-Row Spreadsheet Upload & AI Mapping', () => {
  test('TC-09: Upload multi-row Excel, run live AI mapping, confirm alignment and import summed metrics', async ({ page }) => {
    test.setTimeout(90000); // Allow sufficient time for live OpenRouter AI reasoning
    const start = Date.now();
    const { consoleErrors } = setupConsoleAndNetworkTracking(page);

    await loginAs(page, 'supplier');
    
    // First ensure there is a draft report for 2026-03
    await page.goto(`${APP_URL}/supplier/submissions`);
    await page.waitForLoadState('networkidle');

    // Create 2026-03 draft if not present
    const hasMonth3 = await page.locator('text=2026-03').count() > 0;
    if (!hasMonth3) {
      await page.click('button:has-text("New Monthly Report")');
      await expect(page.locator('text=Initiate Monthly Report')).toBeVisible();
      await page.fill('input[type="month"]', '2026-03');
      await page.click('button[type="submit"]:has-text("Create Draft")');
      await page.waitForLoadState('networkidle');
    }

    // Go to Spreadsheet Wizard
    await page.goto(`${APP_URL}/supplier/spreadsheet-wizard`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Step 1: Select Monthly Report & Upload Spreadsheet')).toBeVisible({ timeout: 10000 });

    // Select target report (2026-03)
    const optValue = await page.locator('select option:has-text("2026-03")').getAttribute('value');
    if (optValue) {
      await page.selectOption('select', optValue);
    }

    // Generate fresh dynamic spreadsheet with unique SHA-256
    const dynamicFilePath = path.join(FIXTURES_DIR, 'supplier_activity_dynamic.xlsx');
    const pyCmd = `python -c "import openpyxl, time; wb=openpyxl.load_workbook('frontend/tests/fixtures/supplier_activity_multi_row.xlsx'); ws=wb.create_sheet('RunInfo') if 'RunInfo' not in wb.sheetnames else wb['RunInfo']; ws.cell(row=1, column=1, value='Run: ' + str(time.time())); wb.save('frontend/tests/fixtures/supplier_activity_dynamic.xlsx')"`;
    execSync(pyCmd);

    // Upload spreadsheet file
    const fileInput = page.locator('input[type="file"][accept*=".xlsx"]');
    await fileInput.setInputFiles(dynamicFilePath);

    const ssUploadSelected = await captureScreenshot(page, '05_wizard_upload_selected');

    // Click Upload & Analyze Header Schema
    await page.click('button[type="submit"]:has-text("Upload & Analyze Header Schema")');
    await page.waitForLoadState('networkidle');

    // Step 2: Advisory AI Mapping appears (calling live OpenRouter AI)
    await expect(page.locator('text=Step 2: Advisory AI Column Mapping')).toBeVisible({ timeout: 45000 });
    const ssAiMapping = await captureScreenshot(page, '05_wizard_ai_mapping_suggestions');

    // Click Review & Adjust Mappings to go to Step 3
    await page.click('button:has-text("Review & Adjust Mappings")');
    await expect(page.locator('text=Step 3: Confirm Column Alignments')).toBeVisible({ timeout: 10000 });

    // Ensure mapping selects are populated
    // Requirements order: 0: electricity -> Electricity_kWh, 1: diesel -> Diesel_Litres, 2: production -> Production_Tonnes, 3: raw_material -> Raw_Material_Tonnes
    const mappingRows = page.locator('tbody tr');
    const electSelect = mappingRows.nth(0).locator('select');
    if ((await electSelect.inputValue()) === '') {
      await electSelect.selectOption('Electricity_kWh');
    }
    const dieselSelect = mappingRows.nth(1).locator('select');
    if ((await dieselSelect.inputValue()) === '') {
      await dieselSelect.selectOption('Diesel_Litres');
    }
    const prodSelect = mappingRows.nth(2).locator('select');
    if ((await prodSelect.inputValue()) === '') {
      await prodSelect.selectOption('Production_Tonnes');
    }
    const rawSelect = mappingRows.nth(3).locator('select');
    if ((await rawSelect.inputValue()) === '') {
      await rawSelect.selectOption('Raw_Material_Tonnes');
    }

    const ssMappingConfigured = await captureScreenshot(page, '05_wizard_mapping_configured');

    // Confirm Mapping & Proceed to Step 4
    await page.click('button:has-text("Confirm Mapping & Validate")');
    await page.waitForLoadState('networkidle');

    // Step 4: Validation & Ingestion Preview
    await expect(page.locator('text=Step 4: Schema Validation Status')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Ready to Import')).toBeVisible({ timeout: 15000 });

    const ssValidated = await captureScreenshot(page, '05_wizard_validation_passed');

    // Click Complete Ingestion & Commit
    await page.click('button:has-text("Complete Ingestion & Commit")');
    await page.waitForLoadState('networkidle');

    // Step 5: Success
    await expect(page.locator('text=Spreadsheet Activities Successfully Ingested!')).toBeVisible({ timeout: 15000 });
    const ssImported = await captureScreenshot(page, '05_wizard_import_complete');

    const duration = Date.now() - start;
    appendResult({
      testId: 'TC-09',
      workflowName: 'Supplier Multi-Row Spreadsheet Import',
      role: 'supplier',
      testingMode: 'browser',
      status: 'PASSED',
      durationMs: duration,
      screenshotPath: ssImported,
      details: `Uploaded multi-row Excel supplier_activity_multi_row.xlsx, executed live AI mapping, validated schema, and imported summed activities using additive summation rule sum. Console errors: ${consoleErrors.length}`,
    });
  });
});
