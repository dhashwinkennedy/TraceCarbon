import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  APP_URL,
  captureScreenshot,
  setupConsoleAndNetworkTracking,
} from './test_helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORKBOOK_BASE = path.resolve(
  __dirname,
  '../../SUPPLIER_ANNUAL_DATASETS_2Y/MANUAL_UPLOAD_DATA'
);

const CHEMICAL_FILE = path.join(WORKBOOK_BASE, 'AxiomX_Chemical_FY2023-24.xlsx');
const STEEL_FILE = path.join(WORKBOOK_BASE, 'AxiomX_Steel_FY2023-24.xlsx');
const CEMENT_FILE = path.join(WORKBOOK_BASE, 'AxiomX_Cement_FY2023-24.xlsx');

async function loginWith(page: Page, email: string, pass: string, expectedPath: string) {
  await page.goto(`${APP_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', pass);
  await page.click('button[type="submit"]');
  await page.waitForURL(`**${expectedPath}*`, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

test.describe('Phase 2.4 — Supplier Data Upload & Multi-Method Eligibility Demonstration', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleAndNetworkTracking(page);
  });

  // --------------------------------------------------------------------------
  // TC-01: Chemical Supplier (SUP-005) Upload, Column Mapping, and Submission
  // --------------------------------------------------------------------------
  test('TC-01: Chemical Supplier (SUP-005) uploads AxiomX_Chemical_FY2023-24.xlsx, maps columns, and submits annual report', async ({
    page,
  }) => {
    // 1. Login as Chemical Supplier
    await loginWith(
      page,
      'supplier.chemical@axiomx.demo',
      'AxiomX!Chemical#2026',
      '/supplier/dashboard'
    );

    // 2. Navigate to Submissions
    await page.goto(`${APP_URL}/supplier/submissions`);
    await page.waitForLoadState('networkidle');

    // 3. Initiate New Report
    await page.locator('button:has-text("New Monthly Report")').click();
    await expect(page.locator('h3:has-text("Step 1: Select Reporting Period")')).toBeVisible();

    // Select Annual Cadence -> FY2023-24
    await page.locator('[data-testid="cadence-annual-btn"]').click();
    await page.locator('[data-testid="period-select-annual"]').selectOption('FY2023-24');
    await page.locator('[data-testid="continue-to-method-btn"]').click();

    // 4. Select Spreadsheet Upload
    await expect(page.locator('h3:has-text("Step 2: Choose Data Entry Method")')).toBeVisible();
    await page.locator('[data-testid="choice-spreadsheet-upload"]').click();

    // 5. Upload File (Step 1 of Wizard)
    await expect(page.locator('h4:has-text("Select Utility or Operational Spreadsheet")')).toBeVisible();
    await page.locator('[data-testid="spreadsheet-file-input"]').setInputFiles(CHEMICAL_FILE);
    await page.locator('[data-testid="upload-spreadsheet-btn"]').click();

    // 6. Step 2: Format & Column Alignment
    await expect(page.locator('h4:has-text("Column-to-Activity Alignment")')).toBeVisible({ timeout: 10000 });

    // Test AI Mapping button
    const aiBtn = page.locator('[data-testid="run-ai-mapping-btn"]');
    if (await aiBtn.isVisible()) {
      await aiBtn.click();
      await page.waitForTimeout(1000);
    }

    // Set & Confirm specific column alignments for Chemical Supplier
    await page.locator('[data-testid="mapping-select-electricity"]').selectOption({ label: 'Total Electrical Energy (kWh)' });
    await page.locator('[data-testid="mapping-select-diesel"]').selectOption({ label: 'Diesel for Backup Generator (Litres)' });
    await page.locator('[data-testid="mapping-select-production"]').selectOption({ label: 'Chemical Production (Tonnes)' });
    await page.locator('[data-testid="mapping-select-raw_material"]').selectOption({ label: 'Raw Material Feed (Tonnes)' });

    await captureScreenshot(page, 'phase2_4_01_chemical_mapping_alignment');

    // Confirm Mapping
    await page.locator('[data-testid="confirm-mapping-btn"]').click();

    // 7. Step 3: Schema Validation & Preview
    await expect(page.locator('text=Schema Validation: Passed')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Ready to Import')).toBeVisible();
    await captureScreenshot(page, 'phase2_4_02_chemical_schema_validation');

    await page.locator('[data-testid="proceed-final-import-btn"]').click();

    // 8. Step 4: Save Format Preference & Import
    await expect(page.locator('h4:has-text("Confirm Ingestion & Format Preference")')).toBeVisible();
    await page.locator('[data-testid="save-format-checkbox"]').check();
    await page.locator('[data-testid="format-name-input"]').fill('AxiomX Chemical Annual Utility Template');
    await page.locator('[data-testid="confirm-final-import-btn"]').click();

    // 9. Step 5: Success Completion
    await expect(page.locator('h4:has-text("Spreadsheet Ingested Successfully!")')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="view-updated-report-btn"]').click();

    // 10. Detail Page: Verify Activities and Submit
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Monthly Report: FY2023-24")')).toBeVisible();
    await expect(page.locator('span:has-text("draft")').first()).toBeVisible();

    // Verify imported values
    await expect(page.locator('text=22,149,000').first()).toBeVisible();
    await expect(page.locator('text=162,000').first()).toBeVisible();
    await expect(page.locator('text=53,500').first()).toBeVisible();
    await expect(page.locator('text=75,435').first()).toBeVisible();

    await captureScreenshot(page, 'phase2_4_03_chemical_report_detail_draft');

    // Submit Report to Auditor
    await page.locator('[data-testid="submit-report-btn"]').click();
    const submitPromise = page.waitForResponse(
      (r) => r.url().includes('/supplier/submissions/') && r.url().includes('/submit') && r.request().method() === 'POST'
    );
    await page.locator('button:has-text("Confirm & Submit")').click();
    await submitPromise;
    await page.waitForLoadState('networkidle');

    // Verify status is now 'submitted'
    await expect(page.locator('span:has-text("submitted")').first()).toBeVisible({ timeout: 10000 });
    await captureScreenshot(page, 'phase2_4_04_chemical_report_submitted');
  });

  // --------------------------------------------------------------------------
  // TC-02: Recheck Activity-Based Eligibility for PO-2023-005
  // --------------------------------------------------------------------------
  test('TC-02: Manufacturer rechecks PO-2023-005, verifies Activity-Based is now eligible, and previews without writes', async ({
    page,
  }) => {
    // 1. Login as Manufacturer
    await loginWith(
      page,
      'manufacturer@scope3track.demo',
      'ManufacturerDemo123!',
      '/manufacturer/dashboard'
    );

    // 2. Navigate to Calculations
    await page.goto(`${APP_URL}/manufacturer/calculations`);
    await page.waitForLoadState('networkidle');

    // 3. Open Modal and Select PO-2023-005
    await page.locator('button:has-text("Run / Compare Methods")').click();
    const purchaseSelect = page.locator('#modal-purchase-select');
    await expect(purchaseSelect).toBeVisible();

    const respPromise = page.waitForResponse((r) => r.url().includes('PO-2023-005/method-options'));
    await purchaseSelect.selectOption('PO-2023-005');
    await respPromise;

    // 4. Verify Activity-Based Card is now ELIGIBLE
    const actCard = page.locator('[data-testid="method-card-activity_based"]');
    await expect(actCard).toBeVisible();
    await expect(actCard).not.toContainText('Ineligible: MISSING_SUPPLIER_ANNUAL_ACTIVITY');
    await expect(actCard).toContainText('Facility Energy Emissions:');
    await expect(actCard).toContainText('Allocation Fraction (α):');
    await expect(actCard).toContainText('0.7477%');
    await expect(actCard).toContainText('Expected Emissions:');
    await expect(actCard).toContainText('123.64 t CO₂e');

    // 5. Click Activity-Based Card to trigger Preview Mode
    const previewPromise = page.waitForResponse(
      (r) => r.url().includes('/calculations') && r.request().method() === 'POST'
    );
    await actCard.click();
    await previewPromise;

    // Verify preview panel appears
    await expect(page.locator('text=Calculation Preview (preview_only: true)')).toBeVisible();
    await expect(page.locator('text=Zero Database Writes')).toBeVisible();
    await expect(page.locator('code').filter({ hasText: 'supplier_electricity' })).toBeVisible();
    await expect(page.locator('text=123.6437 t CO₂e (Scope 3 Category 1)')).toBeVisible();

    await captureScreenshot(page, 'phase2_4_05_po2023005_activity_based_eligible');

    // Close modal without executing or activating
    await page.locator('button:has-text("Close Modal")').click();
  });

  // --------------------------------------------------------------------------
  // TC-03: Steel Supplier (SUP-001) Upload & Alignment Demonstration
  // --------------------------------------------------------------------------
  test('TC-03: Steel Supplier (SUP-001) uploads AxiomX_Steel_FY2023-24.xlsx with different structure and submits', async ({
    page,
  }) => {
    await loginWith(
      page,
      'supplier.steel@axiomx.demo',
      'AxiomX!Steel#2026',
      '/supplier/dashboard'
    );

    await page.goto(`${APP_URL}/supplier/submissions`);
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("New Monthly Report")').click();
    await page.locator('[data-testid="cadence-annual-btn"]').click();
    await page.locator('[data-testid="period-select-annual"]').selectOption('FY2023-24');
    await page.locator('[data-testid="continue-to-method-btn"]').click();

    await page.locator('[data-testid="choice-spreadsheet-upload"]').click();
    await page.locator('[data-testid="spreadsheet-file-input"]').setInputFiles(STEEL_FILE);
    await page.locator('[data-testid="upload-spreadsheet-btn"]').click();

    // Step 2: Align Columns for Steel Supplier
    await expect(page.locator('h4:has-text("Column-to-Activity Alignment")')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="mapping-select-electricity"]').selectOption({ label: 'Grid Electricity Used (kWh)' });
    await page.locator('[data-testid="mapping-select-diesel"]').selectOption({ label: 'HSD for Generator (Litres)' });
    await page.locator('[data-testid="mapping-select-production"]').selectOption({ label: 'Finished Steel Output (Metric Tonnes)' });
    await page.locator('[data-testid="mapping-select-raw_material"]').selectOption({ label: 'Iron Ore and Scrap Input (Metric Tonnes)' });

    await captureScreenshot(page, 'phase2_4_06_steel_mapping_alignment');

    await page.locator('[data-testid="confirm-mapping-btn"]').click();
    await expect(page.locator('text=Schema Validation: Passed')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="proceed-final-import-btn"]').click();

    await page.locator('[data-testid="save-format-checkbox"]').check();
    await page.locator('[data-testid="format-name-input"]').fill('AxiomX Steel Annual Energy Template');
    await page.locator('[data-testid="confirm-final-import-btn"]').click();

    await expect(page.locator('h4:has-text("Spreadsheet Ingested Successfully!")')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="view-updated-report-btn"]').click();

    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Monthly Report: FY2023-24")')).toBeVisible();
    await expect(page.locator('text=79,275,000').first()).toBeVisible();
    await expect(page.locator('text=315,000').first()).toBeVisible();
    await expect(page.locator('text=175,000').first()).toBeVisible();

    await page.locator('[data-testid="submit-report-btn"]').click();
    const submitPromise = page.waitForResponse(
      (r) => r.url().includes('/supplier/submissions/') && r.url().includes('/submit') && r.request().method() === 'POST'
    );
    await page.locator('button:has-text("Confirm & Submit")').click();
    await submitPromise;
    await page.waitForLoadState('networkidle');

    await expect(page.locator('span:has-text("submitted")').first()).toBeVisible({ timeout: 10000 });
    await captureScreenshot(page, 'phase2_4_07_steel_report_submitted');
  });

  // --------------------------------------------------------------------------
  // TC-04: Cement Supplier (SUP-004) Upload & Alignment Demonstration
  // --------------------------------------------------------------------------
  test('TC-04: Cement Supplier (SUP-004) uploads AxiomX_Cement_FY2023-24.xlsx with distinct headers and submits', async ({
    page,
  }) => {
    await loginWith(
      page,
      'supplier.cement@axiomx.demo',
      'AxiomX!Cement#2026',
      '/supplier/dashboard'
    );

    await page.goto(`${APP_URL}/supplier/submissions`);
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("New Monthly Report")').click();
    await page.locator('[data-testid="cadence-annual-btn"]').click();
    await page.locator('[data-testid="period-select-annual"]').selectOption('FY2023-24');
    await page.locator('[data-testid="continue-to-method-btn"]').click();

    await page.locator('[data-testid="choice-spreadsheet-upload"]').click();
    await page.locator('[data-testid="spreadsheet-file-input"]').setInputFiles(CEMENT_FILE);
    await page.locator('[data-testid="upload-spreadsheet-btn"]').click();

    // Step 2: Align Columns for Cement Supplier
    await expect(page.locator('h4:has-text("Column-to-Activity Alignment")')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="mapping-select-electricity"]').selectOption({ label: 'Electrical Power Consumed (kWh)' });
    await page.locator('[data-testid="mapping-select-diesel"]').selectOption({ label: 'Diesel Consumed (L)' });
    await page.locator('[data-testid="mapping-select-production"]').selectOption({ label: 'Cement Produced (MT)' });
    await page.locator('[data-testid="mapping-select-raw_material"]').selectOption({ label: 'Raw Mix and Additives Consumed (MT)' });

    await captureScreenshot(page, 'phase2_4_08_cement_mapping_alignment');

    await page.locator('[data-testid="confirm-mapping-btn"]').click();
    await expect(page.locator('text=Schema Validation: Passed')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="proceed-final-import-btn"]').click();

    await page.locator('[data-testid="save-format-checkbox"]').check();
    await page.locator('[data-testid="format-name-input"]').fill('AxiomX Cement Operations Template');
    await page.locator('[data-testid="confirm-final-import-btn"]').click();

    await expect(page.locator('h4:has-text("Spreadsheet Ingested Successfully!")')).toBeVisible({ timeout: 10000 });
    await page.locator('[data-testid="view-updated-report-btn"]').click();

    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1:has-text("Monthly Report: FY2023-24")')).toBeVisible();
    await expect(page.locator('text=36,491,000').first()).toBeVisible();
    await expect(page.locator('text=270,000').first()).toBeVisible();
    await expect(page.locator('text=455,000').first()).toBeVisible();

    await page.locator('[data-testid="submit-report-btn"]').click();
    const submitPromise = page.waitForResponse(
      (r) => r.url().includes('/supplier/submissions/') && r.url().includes('/submit') && r.request().method() === 'POST'
    );
    await page.locator('button:has-text("Confirm & Submit")').click();
    await submitPromise;
    await page.waitForLoadState('networkidle');

    await expect(page.locator('span:has-text("submitted")').first()).toBeVisible({ timeout: 10000 });
    await captureScreenshot(page, 'phase2_4_09_cement_report_submitted');
  });

  // --------------------------------------------------------------------------
  // TC-05: Security, Access Isolation, and Baseline Immutability
  // --------------------------------------------------------------------------
  test('TC-05: Workflow security: cross-account rejection, duplicate period rejection, and baseline immutability', async ({
    request,
  }) => {
    // 1. Authenticate as Steel Supplier (SUP-001)
    const steelLogin = await request.post(`${APP_URL}/api/v1/auth/login`, {
      data: { email: 'supplier.steel@axiomx.demo', password: 'AxiomX!Steel#2026' },
    });
    expect(steelLogin.status()).toBe(200);
    const steelToken = (await steelLogin.json()).access_token;

    // 2. Authenticate as Chemical Supplier (SUP-005)
    const chemLogin = await request.post(`${APP_URL}/api/v1/auth/login`, {
      data: { email: 'supplier.chemical@axiomx.demo', password: 'AxiomX!Chemical#2026' },
    });
    expect(chemLogin.status()).toBe(200);
    const chemToken = (await chemLogin.json()).access_token;

    // 3. Security Check: Steel Supplier attempts to access Chemical Supplier's submission
    const chemSubsRes = await request.get(`${APP_URL}/api/v1/supplier/submissions`, {
      headers: { Authorization: `Bearer ${chemToken}` },
    });
    const chemSubs = (await chemSubsRes.json()).items;
    expect(chemSubs.length).toBeGreaterThan(0);
    const chemSubId = chemSubs[0].id;

    // Attempt unauthorized read by Steel Supplier -> Expect HTTP 403 Forbidden
    const crossRes = await request.get(`${APP_URL}/api/v1/supplier/submissions/${chemSubId}`, {
      headers: { Authorization: `Bearer ${steelToken}` },
    });
    expect(crossRes.status()).toBe(403);

    // 4. Collision Check: Attempt to create duplicate FY2023-24 report -> Expect HTTP 409 Conflict
    const dupRes = await request.post(`${APP_URL}/api/v1/supplier/submissions`, {
      data: { reporting_month: 'FY2023-24' },
      headers: { Authorization: `Bearer ${chemToken}` },
    });
    expect(dupRes.status()).toBe(409);

    // 5. Baseline Immutability Check via Manufacturer Dashboard
    const mfgLogin = await request.post(`${APP_URL}/api/v1/auth/login`, {
      data: { email: 'manufacturer@scope3track.demo', password: 'ManufacturerDemo123!' },
    });
    expect(mfgLogin.status()).toBe(200);
    const mfgToken = (await mfgLogin.json()).access_token;

    const dashRes = await request.get(`${APP_URL}/api/v1/manufacturer/dashboard/summary`, {
      headers: { Authorization: `Bearer ${mfgToken}` },
    });
    expect(dashRes.status()).toBe(200);
    const dash = await dashRes.json();

    // Baseline total must remain strictly at 2,692,863.53 kg CO2e
    const totalEmissionsKg = Math.round(dash.combined_kgco2e * 100) / 100;
    expect(totalEmissionsKg).toBe(2692863.53);

    // Active calculations check
    const calcsRes = await request.get(`${APP_URL}/api/v1/manufacturer/calculations`, {
      headers: { Authorization: `Bearer ${mfgToken}` },
    });
    expect(calcsRes.status()).toBe(200);
    const calcs = await calcsRes.json();
    const activeCalcs = calcs.items.filter((c: any) => c.is_active);
    expect(activeCalcs.length).toBe(20);
    expect(activeCalcs.every((c: any) => c.method === 'product_factor')).toBe(true);
  });
});
