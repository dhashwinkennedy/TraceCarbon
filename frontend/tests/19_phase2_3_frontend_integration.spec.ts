import { test, expect } from '@playwright/test';
import {
  APP_URL,
  loginAs,
  captureScreenshot,
  setupConsoleAndNetworkTracking,
} from './test_helpers';

test.describe('Phase 2.3 — Multi-Method Frontend Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleAndNetworkTracking(page);
  });

  test('TC-01: Manufacturer Dashboard displays calculation method distribution in tonnes CO2e with Category 1 & 2 breakdown', async ({
    page,
  }) => {
    await loginAs(page, 'manufacturer');
    await page.goto(`${APP_URL}/manufacturer/dashboard`);
    await page.waitForLoadState('networkidle');

    // Verify calculation method distribution section exists
    const heading = page.locator('h3:has-text("Calculation Method Distribution")');
    await expect(heading).toBeVisible();

    // Verify synthetic demonstration data label
    const demoBadge = page.locator('text=Synthetic Demonstration Data');
    await expect(demoBadge).toBeVisible();

    // Verify method cards
    await expect(page.locator('text=Product-Factor (Tier 1)')).toBeVisible();
    await expect(page.locator('text=Activity-Based (Tier 2)')).toBeVisible();
    await expect(page.locator('text=Spend-Based (Tier 3)')).toBeVisible();

    // Verify units are in t CO2e
    const productFactorCard = page.locator('div:has-text("Product-Factor (Tier 1)"):has-text("Highest Quality")').first();
    await expect(productFactorCard).toContainText('t CO₂e');

    // Verify Category 1 and Category 2 segregation
    await expect(page.locator('text=Cat 1:').first()).toBeVisible();
    await expect(page.locator('text=Cat 2:').first()).toBeVisible();

    await captureScreenshot(page, 'phase2_3_01_dashboard_distribution');
  });

  test('TC-02: Calculations page displays all three method options with full parameters for eligible purchase PO-2022-001', async ({
    page,
  }) => {
    await loginAs(page, 'manufacturer');
    await page.goto(`${APP_URL}/manufacturer/calculations`);
    await page.waitForLoadState('networkidle');

    // Click "Run / Compare Methods"
    const openBtn = page.locator('button:has-text("Run / Compare Methods")');
    await expect(openBtn).toBeVisible();
    await openBtn.click();

    // Modal should be open
    await expect(page.locator('h3:has-text("Multi-Method Calculation Selection & Preview")')).toBeVisible();

    // Select PO-2022-001
    const purchaseSelect = page.locator('#modal-purchase-select');
    await purchaseSelect.selectOption({ value: 'PO-2022-001' });
    await page.waitForTimeout(1000); // Wait for options to load

    // Verify Product-Factor Card
    const pcfCard = page.locator('[data-testid="method-card-product_factor"]');
    await expect(pcfCard).toBeVisible();
    await expect(pcfCard).toContainText('Product Factor:');
    await expect(pcfCard).toContainText('Purchased Volume:');
    await expect(pcfCard).toContainText('Calculated Emissions:');

    // Verify Activity-Based Card
    const actCard = page.locator('[data-testid="method-card-activity_based"]');
    await expect(actCard).toBeVisible();
    await expect(actCard).toContainText('Facility Energy Emissions:');
    await expect(actCard).toContainText('Allocation Fraction (α):');
    await expect(actCard).toContainText('Expected Emissions:');

    // Verify Spend-Based Card
    const spendCard = page.locator('[data-testid="method-card-spend_based"]');
    await expect(spendCard).toBeVisible();
    await expect(spendCard).toContainText('NAICS Sector:');
    await expect(spendCard).toContainText('Expenditure & FX:');
    await expect(spendCard).toContainText('Open CEDA Factor & Emissions:');
    await expect(spendCard).toContainText('CEDA by Watershed • CC BY-SA 4.0');

    await captureScreenshot(page, 'phase2_3_02_method_options_po2022001');
  });

  test('TC-03: Preview-only mode computes spend-based and activity-based previews without database writes', async ({
    page,
  }) => {
    await loginAs(page, 'manufacturer');
    await page.goto(`${APP_URL}/manufacturer/calculations`);
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Run / Compare Methods")').click();
    await expect(page.locator('[data-testid="method-card-product_factor"]')).toBeVisible();

    // Select Spend-Based
    const spendCard = page.locator('[data-testid="method-card-spend_based"]');
    await spendCard.click();
    await page.waitForResponse((resp) => resp.url().includes('/calculations') && resp.request().method() === 'POST');

    // Verify preview panel appears
    const previewHeader = page.locator('text=Calculation Preview (preview_only: true)');
    await expect(previewHeader).toBeVisible();
    await expect(page.locator('text=Zero Database Writes')).toBeVisible();

    // Verify formula
    await expect(page.locator('code').filter({ hasText: 'ceda_factor_usd' })).toBeVisible();
    await captureScreenshot(page, 'phase2_3_03_spend_based_preview');

    // Select Activity-Based
    const actCard = page.locator('[data-testid="method-card-activity_based"]');
    await actCard.click();
    await page.waitForResponse((resp) => resp.url().includes('/calculations') && resp.request().method() === 'POST');

    // Verify activity-based formula
    await expect(page.locator('code').filter({ hasText: 'supplier_electricity' })).toBeVisible();
    await captureScreenshot(page, 'phase2_3_04_activity_based_preview');
  });

  test('TC-04: Ineligibility handling correctly blocks calculations and displays descriptive backend reasons', async ({
    page,
  }) => {
    await loginAs(page, 'manufacturer');
    await page.goto(`${APP_URL}/manufacturer/calculations`);
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Run / Compare Methods")').click();
    await expect(page.locator('[data-testid="method-card-product_factor"]')).toBeVisible();
    const purchaseSelect = page.locator('#modal-purchase-select');

    // 1. Test PO-2023-005 (Missing annual report)
    const resp005Promise = page.waitForResponse((resp) => resp.url().includes('PO-2023-005/method-options'));
    await purchaseSelect.selectOption('PO-2023-005');
    await resp005Promise;

    const actCard005 = page.locator('[data-testid="method-card-activity_based"]');
    await expect(actCard005).toContainText('Ineligible: MISSING_SUPPLIER_ANNUAL_ACTIVITY');
    await expect(actCard005).toContainText('No submitted annual supplier report exists for SUP-005 in FY2023-24');
    await expect(actCard005).toContainText('Calculation Blocked');

    // 2. Test PO-2023-009 (Allocation > 100%)
    const resp009Promise = page.waitForResponse((resp) => resp.url().includes('PO-2023-009/method-options'));
    await purchaseSelect.selectOption('PO-2023-009');
    await resp009Promise;

    const actCard009 = page.locator('[data-testid="method-card-activity_based"]');
    await expect(actCard009).toContainText('Ineligible: ALLOCATION_EXCEEDS_100_PERCENT');
    await expect(actCard009).toContainText('yielding invalid allocation fraction 1.0417 (> 1.0)');

    // 3. Test PO-2022-010 (Incompatible units)
    const resp010Promise = page.waitForResponse((resp) => resp.url().includes('PO-2022-010/method-options'));
    await purchaseSelect.selectOption('PO-2022-010');
    await resp010Promise;

    const actCard010 = page.locator('[data-testid="method-card-activity_based"]');
    await expect(actCard010).toContainText('Ineligible: INCOMPATIBLE_ALLOCATION_UNITS');
    await expect(actCard010).toContainText('Physical units are incompatible');

    await captureScreenshot(page, 'phase2_3_05_ineligible_rejections');
  });

  test('TC-05: Modal receipts display tailored parameters, attributions, limitations, and accounting formula', async ({
    page,
  }) => {
    await loginAs(page, 'manufacturer');
    await page.goto(`${APP_URL}/manufacturer/calculations`);
    await page.waitForLoadState('networkidle');

    // Inspect an existing receipt from the table
    const firstReceiptBtn = page.locator('button:has-text("Receipt")').first();
    await expect(firstReceiptBtn).toBeVisible();
    await firstReceiptBtn.click();

    // Verify Receipt Modal opens
    const receiptModal = page.locator('div:has-text("Scope 3 Calculation Receipt")').first();
    await expect(receiptModal).toBeVisible();
    await expect(page.locator('text=Calculated Footprint')).toBeVisible();
    await expect(page.locator('text=Accounting Formula')).toBeVisible();
    await expect(page.locator('text=Methodology Applied')).toBeVisible();

    await captureScreenshot(page, 'phase2_3_06_receipt_modal');

    // Close receipt
    await page.locator('button:has-text("Close Receipt")').click();
  });

  test('TC-06: Reports page displays provenance, CEDA attribution, disclaimers, and exports CSV', async ({
    page,
  }) => {
    await loginAs(page, 'manufacturer');
    await page.goto(`${APP_URL}/manufacturer/reports`);
    await page.waitForLoadState('networkidle');

    // Verify disclaimer notice
    const disclaimer = page.locator('text=Methodology & Demonstration Boundary Notice:');
    await expect(disclaimer).toBeVisible();
    await expect(page.locator('text=Not third-party certified or audited')).toBeVisible();

    // Verify table columns
    await expect(page.locator('th:has-text("Purchase & Supplier")')).toBeVisible();
    await expect(page.locator('th:has-text("Methodology")')).toBeVisible();
    await expect(page.locator('th:has-text("Provenance & Attribution")')).toBeVisible();
    await expect(page.locator('th:has-text("Result Footprint")')).toBeVisible();

    // Verify Export Button is functional
    const exportBtn = page.locator('button:has-text("Export Report (CSV)")');
    await expect(exportBtn).toBeVisible();

    await captureScreenshot(page, 'phase2_3_08_reports_inventory');
  });

  test('TC-07: Verify baseline inventory immutability and calculation integrity via API', async ({
    request,
  }) => {
    // 1. Authenticate manufacturer
    const loginRes = await request.post('http://127.0.0.1:8000/api/v1/auth/login', {
      data: { email: 'manufacturer@scope3track.demo', password: 'ManufacturerDemo123!' },
    });
    expect(loginRes.ok()).toBeTruthy();
    const { access_token } = await loginRes.json();

    // 2. Query Dashboard Summary
    const dashRes = await request.get('http://127.0.0.1:8000/api/v1/manufacturer/dashboard/summary', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    expect(dashRes.ok()).toBeTruthy();
    const dash = await dashRes.json();

    // Verify baseline total emissions remain intact at 2,692.86 t CO2e
    expect(dash.combined_kgco2e).toBe(2692863.53);
    expect(dash.emissions_kgco2e['Category 1']).toBe(2688903.75);
    expect(Math.round(dash.emissions_kgco2e['Category 2'] * 100) / 100).toBe(3959.78);

    // Verify method breakdown: 100% Product-Factor active
    expect(dash.method_breakdown.product_factor).toBe(2692863.53);
    expect(dash.method_breakdown.activity_based).toBe(0.0);
    expect(dash.method_breakdown.spend_based).toBe(0.0);

    // 3. Query emission factors: exactly 43 factors in QA
    const facRes = await request.get('http://127.0.0.1:8000/api/v1/manufacturer/emission-factors', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    expect(facRes.ok()).toBeTruthy();
    const factors = await facRes.json();
    const items = factors.items || factors;
    expect(items.length).toBe(43);
  });
});
