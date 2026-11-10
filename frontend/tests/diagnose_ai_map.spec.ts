import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALUMINIUM_FILE = path.resolve(
  __dirname,
  '../../PUBLIC_DATASET_RESEARCH/07_SYNTHETIC_DEMO_DATASET/02_PRELOAD_DATA/FY2023-24/SUP-003_AxiomX_Aluminium_Suppliers_FY2023-24.xlsx'
);

test('Diagnose AI Mapping HTTP 200 payload and frontend state', async ({ page }) => {
  test.setTimeout(120000);

  const consoleLogs: string[] = [];
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') consoleErrors.push(text);
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(`[PAGEERROR] ${err.message}`);
  });

  let aiMapResponse: any = null;
  page.on('response', async (res) => {
    if (res.url().includes('/ai-map')) {
      try {
        aiMapResponse = {
          url: res.url(),
          status: res.status(),
          headers: res.headers(),
          json: await res.json(),
        };
      } catch (e: any) {
        aiMapResponse = {
          url: res.url(),
          status: res.status(),
          text: await res.text().catch(() => ''),
        };
      }
    }
  });

  // 1. Login
  await page.goto('http://localhost:5173/login');
  await page.waitForLoadState('networkidle');
  await page.click('button[data-testid="demo-tab-supplier"]');
  await page.click('button[data-testid="demo-account-supplier.aluminium@axiomx.demo"]');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/supplier/dashboard');

  // 2. Go to submissions
  await page.goto('http://localhost:5173/supplier/submissions');
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

  // 4. Upload file
  await page.locator('[data-testid="spreadsheet-file-input"]').setInputFiles(ALUMINIUM_FILE);
  await page.locator('[data-testid="upload-spreadsheet-btn"]').click();

  // 5. Wait for Step 2
  await expect(page.locator('h4:has-text("Column-to-Activity Alignment")')).toBeVisible({ timeout: 15000 });

  // 6. Check initial dropdown values
  const elecBefore = await page.locator('[data-testid="mapping-select-electricity"]').inputValue();
  const dieselBefore = await page.locator('[data-testid="mapping-select-diesel"]').inputValue();
  const prodBefore = await page.locator('[data-testid="mapping-select-production"]').inputValue();
  const rawBefore = await page.locator('[data-testid="mapping-select-raw_material"]').inputValue();

  console.log(`BEFORE AI CLICK:
    electricity: '${elecBefore}'
    diesel: '${dieselBefore}'
    production: '${prodBefore}'
    raw_material: '${rawBefore}'`);

  // 7. Click AI Mapping
  const aiBtn = page.locator('[data-testid="run-ai-mapping-btn"]');
  await aiBtn.click();

  // Wait for button to stop loading
  await expect(aiBtn).toHaveText('Suggest Mappings with AI', { timeout: 90000 });

  // 8. Check dropdown values after AI mapping
  const elecAfter = await page.locator('[data-testid="mapping-select-electricity"]').inputValue();
  const dieselAfter = await page.locator('[data-testid="mapping-select-diesel"]').inputValue();
  const prodAfter = await page.locator('[data-testid="mapping-select-production"]').inputValue();
  const rawAfter = await page.locator('[data-testid="mapping-select-raw_material"]').inputValue();

  console.log(`AFTER AI CLICK:
    electricity: '${elecAfter}'
    diesel: '${dieselAfter}'
    production: '${prodAfter}'
    raw_material: '${rawAfter}'`);

  console.log('AI-MAP RESPONSE:', JSON.stringify(aiMapResponse, null, 2));
  console.log('CONSOLE LOGS:', consoleLogs.join('\n'));
  console.log('CONSOLE ERRORS:', consoleErrors.join('\n'));
});
