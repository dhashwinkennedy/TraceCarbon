import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { APP_URL, captureScreenshot, appendResult, setupConsoleAndNetworkTracking } from './test_helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALUMINIUM_FILE = path.resolve(
  __dirname,
  '../../PUBLIC_DATASET_RESEARCH/07_SYNTHETIC_DEMO_DATASET/02_PRELOAD_DATA/FY2023-24/SUP-003_AxiomX_Aluminium_Suppliers_FY2023-24.xlsx'
);

async function openSpreadsheetModal(page: Page) {
  await page.goto(`${APP_URL}/supplier/submissions`);
  await page.waitForLoadState('networkidle');

  // Check if an existing draft row has "Upload Sheet"
  const uploadBtn = page.locator('button:has-text("Upload Sheet")').first();
  if (await uploadBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    await uploadBtn.click();
  } else {
    // If no draft has "Upload Sheet", create a new report
    await page.locator('button:has-text("New Monthly Report")').click();
    await page.waitForTimeout(500);

    const continueBtn = page.locator('[data-testid="continue-to-method-btn"]');
    if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(500);
    }

    const choiceBtn = page.locator('[data-testid="choice-spreadsheet-upload"]').first();
    await choiceBtn.waitFor({ state: 'visible', timeout: 5000 });
    await choiceBtn.click();
  }

  // Verify modal is open at Step 1
  await expect(page.locator('h4:has-text("Select Utility or Operational Spreadsheet")')).toBeVisible({ timeout: 10000 });
}

test.describe('TraceCarbon — AI Spreadsheet Column Mapping & Manual Fallback Workflow', () => {

  test('TC-01: End-to-end AI mapping workflow using SUP-003 Aluminium FY2023-24 spreadsheet', async ({ page }) => {
    test.setTimeout(180000);
    const start = Date.now();
    const { consoleErrors } = setupConsoleAndNetworkTracking(page);

    // 1. Sign In as SUP-003 Aluminium using Demo Credentials autofill
    await page.goto(`${APP_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.click('button[data-testid="demo-tab-supplier"]');
    await page.click('button[data-testid="demo-account-supplier.aluminium@axiomx.demo"]');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/supplier/dashboard');

    // 2. Open Spreadsheet Modal
    await openSpreadsheetModal(page);
    const ss01Upload = await captureScreenshot(page, 'ai_mapping_01_upload_modal');

    // 3. Upload SUP-003 Aluminium file
    await page.locator('[data-testid="spreadsheet-file-input"]').setInputFiles(ALUMINIUM_FILE);
    await page.locator('[data-testid="upload-spreadsheet-btn"]').click();

    // 4. Step 2: Format & Column Alignment
    await expect(page.locator('h4:has-text("Column-to-Activity Alignment")')).toBeVisible({ timeout: 15000 });

    // Verify AI mapping button exists
    const aiBtn = page.locator('[data-testid="run-ai-mapping-btn"]');
    await expect(aiBtn).toBeVisible();

    // Click "Suggest Mappings with AI"
    await aiBtn.click();

    // Wait for AI mapping to complete (Nemotron may take 25-45s)
    await expect(aiBtn).toHaveText('Suggest Mappings with AI', { timeout: 90000 });

    // Verify all 4 mandated activities populated with column names from the sheet
    const elecSelect = page.locator('[data-testid="mapping-select-electricity"]');
    const dieselSelect = page.locator('[data-testid="mapping-select-diesel"]');
    const prodSelect = page.locator('[data-testid="mapping-select-production"]');
    const rawSelect = page.locator('[data-testid="mapping-select-raw_material"]');

    await expect(elecSelect).toHaveValue('Electricity_Consumption_kWh', { timeout: 10000 });
    await expect(dieselSelect).toHaveValue('Diesel_Consumption_Litres');
    await expect(prodSelect).toHaveValue('Production_Output_Tonnes');
    await expect(rawSelect).toHaveValue('Raw_Material_Consumption_Tonnes');

    const ss02AiMapped = await captureScreenshot(page, 'ai_mapping_02_ai_suggestions_populated');

    // 5. Confirm Column Alignment
    await page.locator('[data-testid="confirm-mapping-btn"]').click();

    // 6. Step 3: Schema Validation & Preview
    await expect(page.locator('text=Schema Validation: Passed')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Ready to Import')).toBeVisible();
    const ss03Validation = await captureScreenshot(page, 'ai_mapping_03_schema_validation_passed');

    // Proceed to Final Import
    await page.locator('[data-testid="proceed-final-import-btn"]').click();

    // 7. Step 4: Confirm Ingestion
    await expect(page.locator('h4:has-text("Confirm Ingestion & Format Preference")')).toBeVisible();
    await page.locator('[data-testid="confirm-final-import-btn"]').click();

    // 8. Step 5: Success
    await expect(page.locator('h4:has-text("Spreadsheet Ingested Successfully!")')).toBeVisible({ timeout: 15000 });
    const ss04Success = await captureScreenshot(page, 'ai_mapping_04_import_success');

    appendResult({
      testId: 'TC-AIMAP-01',
      workflowName: 'AI Spreadsheet Auto-Mapping End-to-End',
      role: 'supplier',
      testingMode: 'browser',
      status: 'PASSED',
      durationMs: Date.now() - start,
      screenshotPath: ss02AiMapped,
      details: 'Successfully executed live AI mapping with SUP-003 Aluminium workbook. All 4 activities accurately mapped and validated.',
    });
  });

  test('TC-02: Simulated 429 rate limit triggers informative message and manual fallback', async ({ page }) => {
    test.setTimeout(90000);
    const start = Date.now();

    // Intercept ai-map to simulate OpenRouter rate limit (429)
    await page.route('**/ai-map', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: 'AI service rate limit exceeded. Rate limit reached (OpenRouter 429): 10 requests per minute',
        }),
      });
    });

    // Sign in as SUP-003 Aluminium
    await page.goto(`${APP_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.click('button[data-testid="demo-tab-supplier"]');
    await page.click('button[data-testid="demo-account-supplier.aluminium@axiomx.demo"]');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/supplier/dashboard');

    // Open Spreadsheet Modal
    await openSpreadsheetModal(page);

    // Upload file
    await page.locator('[data-testid="spreadsheet-file-input"]').setInputFiles(ALUMINIUM_FILE);
    await page.locator('[data-testid="upload-spreadsheet-btn"]').click();

    await expect(page.locator('h4:has-text("Column-to-Activity Alignment")')).toBeVisible({ timeout: 15000 });

    // Trigger AI Mapping (which receives simulated 429)
    await page.locator('[data-testid="run-ai-mapping-btn"]').click();

    // Verify rate-limit message is displayed accurately
    const notice = page.locator('div:has-text("rate-limit"), div:has-text("rate limit")').first();
    await expect(notice).toBeVisible({ timeout: 10000 });
    await expect(notice).toContainText('rate limit');

    // Verify MANUAL mapping selectors remain fully interactive and functional
    await page.locator('[data-testid="mapping-select-electricity"]').selectOption({ label: 'Electricity_Consumption_kWh' });
    await page.locator('[data-testid="mapping-select-diesel"]').selectOption({ label: 'Diesel_Consumption_Litres' });
    await page.locator('[data-testid="mapping-select-production"]').selectOption({ label: 'Production_Output_Tonnes' });
    await page.locator('[data-testid="mapping-select-raw_material"]').selectOption({ label: 'Raw_Material_Consumption_Tonnes' });

    const ssManual = await captureScreenshot(page, 'ai_mapping_05_manual_fallback_after_429');

    // Confirm manual mapping
    await page.locator('[data-testid="confirm-mapping-btn"]').click();
    await expect(page.locator('text=Schema Validation: Passed')).toBeVisible({ timeout: 15000 });

    appendResult({
      testId: 'TC-AIMAP-02',
      workflowName: 'AI Rate Limit 429 & Manual Fallback',
      role: 'supplier',
      testingMode: 'browser',
      status: 'PASSED',
      durationMs: Date.now() - start,
      screenshotPath: ssManual,
      details: 'Verified informative 429 rate limit notice and robust manual mapping fallback.',
    });
  });

  test('TC-03: Simulated 503 provider error triggers informative message and manual fallback', async ({ page }) => {
    test.setTimeout(90000);
    const start = Date.now();

    // Intercept ai-map to simulate OpenRouter provider outage (503)
    await page.route('**/ai-map', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: 'AI service temporarily unavailable. Provider unavailable (HTTP 503): Upstream provider overloaded',
        }),
      });
    });

    // Sign in as SUP-003 Aluminium
    await page.goto(`${APP_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.click('button[data-testid="demo-tab-supplier"]');
    await page.click('button[data-testid="demo-account-supplier.aluminium@axiomx.demo"]');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/supplier/dashboard');

    // Open Spreadsheet Modal
    await openSpreadsheetModal(page);

    // Upload file
    await page.locator('[data-testid="spreadsheet-file-input"]').setInputFiles(ALUMINIUM_FILE);
    await page.locator('[data-testid="upload-spreadsheet-btn"]').click();

    await expect(page.locator('h4:has-text("Column-to-Activity Alignment")')).toBeVisible({ timeout: 15000 });

    // Trigger AI Mapping (which receives simulated 503)
    await page.locator('[data-testid="run-ai-mapping-btn"]').click();

    // Verify provider unavailable message is displayed accurately (NOT rate-limit!)
    const notice = page.locator('div:has-text("temporarily unavailable"), div:has-text("overloaded")').first();
    await expect(notice).toBeVisible({ timeout: 10000 });
    await expect(notice).toContainText('temporarily unavailable');

    // Verify manual mapping still works
    await page.locator('[data-testid="mapping-select-electricity"]').selectOption({ label: 'Electricity_Consumption_kWh' });
    await page.locator('[data-testid="mapping-select-diesel"]').selectOption({ label: 'Diesel_Consumption_Litres' });
    await page.locator('[data-testid="mapping-select-production"]').selectOption({ label: 'Production_Output_Tonnes' });
    await page.locator('[data-testid="mapping-select-raw_material"]').selectOption({ label: 'Raw_Material_Consumption_Tonnes' });

    const ss503 = await captureScreenshot(page, 'ai_mapping_06_manual_fallback_after_503');

    // Confirm manual mapping
    await page.locator('[data-testid="confirm-mapping-btn"]').click();
    await expect(page.locator('text=Schema Validation: Passed')).toBeVisible({ timeout: 15000 });

    appendResult({
      testId: 'TC-AIMAP-03',
      workflowName: 'AI Provider 503 Outage & Manual Fallback',
      role: 'supplier',
      testingMode: 'browser',
      status: 'PASSED',
      durationMs: Date.now() - start,
      screenshotPath: ss503,
      details: 'Verified informative 503 provider message and robust manual mapping fallback.',
    });
  });
});
