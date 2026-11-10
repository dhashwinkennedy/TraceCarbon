import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { APP_URL, captureScreenshot, appendResult } from './test_helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALUMINIUM_FILE = path.resolve(
  __dirname,
  '../../PUBLIC_DATASET_RESEARCH/07_SYNTHETIC_DEMO_DATASET/02_PRELOAD_DATA/FY2023-24/SUP-003_AxiomX_Aluminium_Suppliers_FY2023-24.xlsx'
);

test.describe('TraceCarbon — AI Mapping Verification & Empty/Invalid Response Fallback', () => {

  test('TC-01: Live AI mapping populated visibly with exact schema and database upload binding', async ({ page }) => {
    test.setTimeout(180000);
    const start = Date.now();

    // Track network response for /ai-map
    let aiMapResponse: any = null;
    page.on('response', async (res) => {
      if (res.url().includes('/ai-map') && res.request().method() === 'POST') {
        try {
          aiMapResponse = await res.json();
        } catch {}
      }
    });

    // 1. Sign in as SUP-003 Aluminium
    await page.goto(`${APP_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.click('button[data-testid="demo-tab-supplier"]');
    await page.click('button[data-testid="demo-account-supplier.aluminium@axiomx.demo"]');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/supplier/dashboard');

    // 2. Go to submissions
    await page.goto(`${APP_URL}/supplier/submissions`);
    await page.waitForLoadState('networkidle');

    // 3. Open spreadsheet modal
    const uploadBtn = page.locator('button:has-text("Upload Sheet")').first();
    if (await uploadBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await uploadBtn.click();
    } else {
      await page.locator('button:has-text("New Monthly Report")').click();
      await page.waitForTimeout(500);
      const continueBtn = page.locator('[data-testid="continue-to-method-btn"]');
      if (await continueBtn.isVisible().catch(() => false)) {
        await continueBtn.click();
        await page.waitForTimeout(500);
      }
      const choiceBtn = page.locator('[data-testid="choice-spreadsheet-upload"]').first();
      await choiceBtn.click();
    }

    await expect(page.locator('h4:has-text("Select Utility or Operational Spreadsheet")')).toBeVisible({ timeout: 10000 });

    // 4. Upload SUP-003 Aluminium file
    await page.locator('[data-testid="spreadsheet-file-input"]').setInputFiles(ALUMINIUM_FILE);
    await page.locator('[data-testid="upload-spreadsheet-btn"]').click();

    // 5. Wait for Step 2
    await expect(page.locator('h4:has-text("Column-to-Activity Alignment")')).toBeVisible({ timeout: 15000 });

    // 6. Click "Suggest Mappings with AI"
    const aiBtn = page.locator('[data-testid="run-ai-mapping-btn"]');
    await aiBtn.click();

    // Wait for AI button to complete loading
    await expect(aiBtn).toHaveText('Suggest Mappings with AI', { timeout: 90000 });

    // 7. Verify backend response JSON schema
    expect(aiMapResponse).not.toBeNull();
    expect(aiMapResponse.suggestions).toBeDefined();
    expect(Array.isArray(aiMapResponse.suggestions)).toBe(true);
    expect(aiMapResponse.suggestions.length).toBe(4);
    expect(aiMapResponse.has_valid_mappings).toBe(true);
    expect(aiMapResponse.upload_id).toBeDefined();
    expect(aiMapResponse.submission_id).toBeDefined();

    // 8. Verify frontend dropdowns are visibly populated
    const elecSelect = page.locator('[data-testid="mapping-select-electricity"]');
    const dieselSelect = page.locator('[data-testid="mapping-select-diesel"]');
    const prodSelect = page.locator('[data-testid="mapping-select-production"]');
    const rawSelect = page.locator('[data-testid="mapping-select-raw_material"]');

    await expect(elecSelect).toHaveValue('Electricity_Consumption_kWh');
    await expect(dieselSelect).toHaveValue('Diesel_Consumption_Litres');
    await expect(prodSelect).toHaveValue('Production_Output_Tonnes');
    await expect(rawSelect).toHaveValue('Raw_Material_Consumption_Tonnes');

    // Verify purple AI suggestion badges are rendered
    await expect(page.locator('text=AI Suggested: Electricity_Consumption_kWh')).toBeVisible();
    await expect(page.locator('text=AI Suggested: Diesel_Consumption_Litres')).toBeVisible();
    await expect(page.locator('text=AI Suggested: Production_Output_Tonnes')).toBeVisible();
    await expect(page.locator('text=AI Suggested: Raw_Material_Consumption_Tonnes')).toBeVisible();

    const ssPopulated = await captureScreenshot(page, 'ai_mapping_verified_01_live_populated');

    // 9. Confirm mapping -> Step 3
    await page.locator('[data-testid="confirm-mapping-btn"]').click();
    await expect(page.locator('text=Schema Validation: Passed')).toBeVisible({ timeout: 15000 });

    appendResult({
      testId: 'TC-AIMAP-VERIF-01',
      workflowName: 'Live AI Mapping State & Upload Binding',
      role: 'supplier',
      testingMode: 'browser',
      status: 'PASSED',
      durationMs: Date.now() - start,
      screenshotPath: ssPopulated,
      details: 'Verified live AI response schema, database upload binding, and immediate visible selector population.',
    });
  });

  test('TC-02: HTTP 200 with empty mapping displays informative notice and retains manual fallback', async ({ page }) => {
    test.setTimeout(60000);
    const start = Date.now();

    // Intercept /ai-map to return HTTP 200 with empty suggestions
    await page.route('**/ai-map', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          suggestions: [],
          mappings: [],
          has_valid_mappings: false,
          requires_supplier_confirmation: true,
          upload_id: 'mock-upload-id',
          submission_id: 'mock-sub-id',
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

    await page.goto(`${APP_URL}/supplier/submissions`);
    await page.waitForLoadState('networkidle');

    // Open upload modal
    const uploadBtn = page.locator('button:has-text("Upload Sheet")').first();
    if (await uploadBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await uploadBtn.click();
    } else {
      await page.locator('button:has-text("New Monthly Report")').click();
      await page.waitForTimeout(500);
      const continueBtn = page.locator('[data-testid="continue-to-method-btn"]');
      if (await continueBtn.isVisible().catch(() => false)) {
        await continueBtn.click();
        await page.waitForTimeout(500);
      }
      const choiceBtn = page.locator('[data-testid="choice-spreadsheet-upload"]').first();
      await choiceBtn.click();
    }

    // Upload file
    await page.locator('[data-testid="spreadsheet-file-input"]').setInputFiles(ALUMINIUM_FILE);
    await page.locator('[data-testid="upload-spreadsheet-btn"]').click();

    await expect(page.locator('h4:has-text("Column-to-Activity Alignment")')).toBeVisible({ timeout: 15000 });

    // Trigger AI Mapping (which returns 200 with empty mappings)
    await page.locator('[data-testid="run-ai-mapping-btn"]').click();

    // Verify informative notice is displayed (NOT silently swallowed!)
    const notice = page.locator('div:has-text("could not find high-confidence matches")').first();
    await expect(notice).toBeVisible({ timeout: 10000 });
    await expect(notice).toContainText('Please configure your mappings manually using the column selectors below');

    // Verify manual mapping fallback works perfectly
    await page.locator('[data-testid="mapping-select-electricity"]').selectOption({ label: 'Electricity_Consumption_kWh' });
    await page.locator('[data-testid="mapping-select-diesel"]').selectOption({ label: 'Diesel_Consumption_Litres' });
    await page.locator('[data-testid="mapping-select-production"]').selectOption({ label: 'Production_Output_Tonnes' });
    await page.locator('[data-testid="mapping-select-raw_material"]').selectOption({ label: 'Raw_Material_Consumption_Tonnes' });

    const ssEmptyFallback = await captureScreenshot(page, 'ai_mapping_verified_02_empty_response_fallback');

    // Confirm manual mapping
    await page.locator('[data-testid="confirm-mapping-btn"]').click();
    await expect(page.locator('text=Schema Validation: Passed')).toBeVisible({ timeout: 15000 });

    appendResult({
      testId: 'TC-AIMAP-VERIF-02',
      workflowName: 'Empty HTTP 200 Handling & Manual Fallback',
      role: 'supplier',
      testingMode: 'browser',
      status: 'PASSED',
      durationMs: Date.now() - start,
      screenshotPath: ssEmptyFallback,
      details: 'Verified that empty HTTP 200 response shows an informative notice rather than silent blank failure.',
    });
  });

  test('TC-03: HTTP 200 with null columns displays informative notice and retains manual fallback', async ({ page }) => {
    test.setTimeout(60000);
    const start = Date.now();

    // Intercept /ai-map to return HTTP 200 with null column mappings (low confidence / unmapped)
    await page.route('**/ai-map', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          suggestions: [
            { activity_id: 'electricity', column: null, confidence: 0.1, reason: 'Uncertain match' },
            { activity_id: 'diesel', column: null, confidence: 0.1, reason: 'Uncertain match' },
            { activity_id: 'production', column: null, confidence: 0.1, reason: 'Uncertain match' },
            { activity_id: 'raw_material', column: null, confidence: 0.1, reason: 'Uncertain match' },
          ],
          mappings: [],
          has_valid_mappings: false,
          requires_supplier_confirmation: true,
          upload_id: 'mock-upload-id',
          submission_id: 'mock-sub-id',
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

    await page.goto(`${APP_URL}/supplier/submissions`);
    await page.waitForLoadState('networkidle');

    // Open upload modal
    const uploadBtn = page.locator('button:has-text("Upload Sheet")').first();
    if (await uploadBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await uploadBtn.click();
    } else {
      await page.locator('button:has-text("New Monthly Report")').click();
      await page.waitForTimeout(500);
      const continueBtn = page.locator('[data-testid="continue-to-method-btn"]');
      if (await continueBtn.isVisible().catch(() => false)) {
        await continueBtn.click();
        await page.waitForTimeout(500);
      }
      const choiceBtn = page.locator('[data-testid="choice-spreadsheet-upload"]').first();
      await choiceBtn.click();
    }

    // Upload file
    await page.locator('[data-testid="spreadsheet-file-input"]').setInputFiles(ALUMINIUM_FILE);
    await page.locator('[data-testid="upload-spreadsheet-btn"]').click();

    await expect(page.locator('h4:has-text("Column-to-Activity Alignment")')).toBeVisible({ timeout: 15000 });

    // Trigger AI Mapping (which returns 200 with null column mappings)
    await page.locator('[data-testid="run-ai-mapping-btn"]').click();

    // Verify informative notice is displayed
    const notice = page.locator('div:has-text("could not find high-confidence matches")').first();
    await expect(notice).toBeVisible({ timeout: 10000 });

    // Verify manual selectors remain active
    await page.locator('[data-testid="mapping-select-electricity"]').selectOption({ label: 'Electricity_Consumption_kWh' });
    await page.locator('[data-testid="mapping-select-diesel"]').selectOption({ label: 'Diesel_Consumption_Litres' });
    await page.locator('[data-testid="mapping-select-production"]').selectOption({ label: 'Production_Output_Tonnes' });
    await page.locator('[data-testid="mapping-select-raw_material"]').selectOption({ label: 'Raw_Material_Consumption_Tonnes' });

    const ssNullFallback = await captureScreenshot(page, 'ai_mapping_verified_03_null_columns_fallback');

    // Confirm manual mapping
    await page.locator('[data-testid="confirm-mapping-btn"]').click();
    await expect(page.locator('text=Schema Validation: Passed')).toBeVisible({ timeout: 15000 });

    appendResult({
      testId: 'TC-AIMAP-VERIF-03',
      workflowName: 'Null Column HTTP 200 Handling & Manual Fallback',
      role: 'supplier',
      testingMode: 'browser',
      status: 'PASSED',
      durationMs: Date.now() - start,
      screenshotPath: ssNullFallback,
      details: 'Verified that null-column HTTP 200 response shows an informative notice and preserves manual fallback.',
    });
  });
});
