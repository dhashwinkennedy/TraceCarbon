import { test, expect } from '@playwright/test';
import { APP_URL, captureScreenshot, appendResult, setupConsoleAndNetworkTracking } from './test_helpers';

const DEMO_ACCOUNTS_FIXTURE = [
  // Manufacturer
  { group: 'manufacturer', tabTestId: 'demo-tab-manufacturer', email: 'manufacturer@scope3track.demo', pass: 'ManufacturerDemo123!', name: 'ABC Manufacturing Ltd', rolePath: '/manufacturer/dashboard' },

  // 10 Suppliers
  { group: 'supplier', tabTestId: 'demo-tab-supplier', email: 'supplier.steel@axiomx.demo', pass: 'AxiomX!Steel#2026', name: 'AxiomX Steel Suppliers', code: 'SUP-001' },
  { group: 'supplier', tabTestId: 'demo-tab-supplier', email: 'supplier.rubber@axiomx.demo', pass: 'AxiomX!Rubber#2026', name: 'AxiomX Rubber Suppliers', code: 'SUP-002' },
  { group: 'supplier', tabTestId: 'demo-tab-supplier', email: 'supplier.aluminium@axiomx.demo', pass: 'AxiomX!Aluminium#2026', name: 'AxiomX Aluminium Suppliers', code: 'SUP-003' },
  { group: 'supplier', tabTestId: 'demo-tab-supplier', email: 'supplier.cement@axiomx.demo', pass: 'AxiomX!Cement#2026', name: 'AxiomX Cement Suppliers', code: 'SUP-004' },
  { group: 'supplier', tabTestId: 'demo-tab-supplier', email: 'supplier.chemical@axiomx.demo', pass: 'AxiomX!Chemical#2026', name: 'AxiomX Chemical Suppliers', code: 'SUP-005' },
  { group: 'supplier', tabTestId: 'demo-tab-supplier', email: 'supplier.packaging@axiomx.demo', pass: 'AxiomX!Packaging#2026', name: 'AxiomX Packaging Suppliers', code: 'SUP-006' },
  { group: 'supplier', tabTestId: 'demo-tab-supplier', email: 'supplier.textile@axiomx.demo', pass: 'AxiomX!Textile#2026', name: 'AxiomX Textile Suppliers', code: 'SUP-007' },
  { group: 'supplier', tabTestId: 'demo-tab-supplier', email: 'supplier.glass@axiomx.demo', pass: 'AxiomX!Glass#2026', name: 'AxiomX Glass Suppliers', code: 'SUP-008' },
  { group: 'supplier', tabTestId: 'demo-tab-supplier', email: 'supplier.polymer@axiomx.demo', pass: 'AxiomX!Polymer#2026', name: 'AxiomX Polymer Suppliers', code: 'SUP-009' },
  { group: 'supplier', tabTestId: 'demo-tab-supplier', email: 'supplier.machinery@axiomx.demo', pass: 'AxiomX!Machinery#2026', name: 'AxiomX Machinery Suppliers', code: 'SUP-010' },

  // 2 Auditors
  { group: 'auditor', tabTestId: 'demo-tab-auditor', email: 'auditor.xyz@scope3track.demo', pass: 'AuditorDemo123!', name: 'Auditor One (XYZ)', code: 'AUD-XYZ' },
  { group: 'auditor', tabTestId: 'demo-tab-auditor', email: 'auditor.green@scope3track.demo', pass: 'AuditorDemo123!', name: 'Auditor Two (Green)', code: 'AUD-GRN' },
];

test.describe('TraceCarbon — Demo Credentials & Quick Personas Verification', () => {

  test('TC-01: Verify Demo Credentials structure, tabs, counts and all 13 accounts autofill', async ({ page }) => {
    const start = Date.now();
    const { consoleErrors } = setupConsoleAndNetworkTracking(page);

    await page.goto(`${APP_URL}/login`);
    await page.waitForLoadState('networkidle');

    // 1. Verify Header and Branding
    await expect(page.locator('text=Demo Credentials')).toBeVisible();
    await expect(page.locator('text=13 Active Personas')).toBeVisible();

    // 2. Verify the 3 tabs and badges
    const mfgTab = page.locator('button[data-testid="demo-tab-manufacturer"]');
    const supTab = page.locator('button[data-testid="demo-tab-supplier"]');
    const audTab = page.locator('button[data-testid="demo-tab-auditor"]');

    await expect(mfgTab).toBeVisible();
    await expect(mfgTab).toContainText('Manufacturer');
    await expect(mfgTab).toContainText('1');

    await expect(supTab).toBeVisible();
    await expect(supTab).toContainText('Suppliers');
    await expect(supTab).toContainText('10');

    await expect(audTab).toBeVisible();
    await expect(audTab).toContainText('Auditors');
    await expect(audTab).toContainText('2');

    // Screenshot tab 1: Manufacturer
    const ssMfg = await captureScreenshot(page, 'demo_credentials_01_manufacturer_tab');

    // 3. Test Manufacturer Account Autofill
    const mfgCard = page.locator('button[data-testid="demo-account-manufacturer@scope3track.demo"]');
    await expect(mfgCard).toBeVisible();
    await expect(mfgCard).toContainText('ABC Manufacturing Ltd');
    await expect(mfgCard).toContainText('ManufacturerDemo123!');

    await mfgCard.click();
    await expect(page.locator('input[type="email"]')).toHaveValue('manufacturer@scope3track.demo');
    await expect(page.locator('input[type="password"]')).toHaveValue('ManufacturerDemo123!');
    await expect(mfgCard).toContainText('Filled');

    // 4. Test Suppliers Tab & All 10 Supplier Accounts
    await supTab.click();
    const ssSup = await captureScreenshot(page, 'demo_credentials_02_suppliers_tab');

    const suppliers = DEMO_ACCOUNTS_FIXTURE.filter(a => a.group === 'supplier');
    expect(suppliers.length).toBe(10);

    for (const sup of suppliers) {
      const supCard = page.locator(`button[data-testid="demo-account-${sup.email}"]`);
      await expect(supCard).toBeVisible();
      await expect(supCard).toContainText(sup.name);
      await expect(supCard).toContainText(sup.code!);
      await expect(supCard).toContainText(sup.pass);

      // Click to autofill and verify
      await supCard.click();
      await expect(page.locator('input[type="email"]')).toHaveValue(sup.email);
      await expect(page.locator('input[type="password"]')).toHaveValue(sup.pass);
      await expect(supCard).toContainText('Filled');
    }

    // 5. Test Auditors Tab & Both Auditor Accounts
    await audTab.click();
    const ssAud = await captureScreenshot(page, 'demo_credentials_03_auditors_tab');

    const auditors = DEMO_ACCOUNTS_FIXTURE.filter(a => a.group === 'auditor');
    expect(auditors.length).toBe(2);

    for (const aud of auditors) {
      const audCard = page.locator(`button[data-testid="demo-account-${aud.email}"]`);
      await expect(audCard).toBeVisible();
      await expect(audCard).toContainText(aud.name);
      await expect(audCard).toContainText(aud.pass);

      // Click to autofill and verify
      await audCard.click();
      await expect(page.locator('input[type="email"]')).toHaveValue(aud.email);
      await expect(page.locator('input[type="password"]')).toHaveValue(aud.pass);
      await expect(audCard).toContainText('Filled');
    }

    appendResult({
      testId: 'TC-DEMO-01',
      workflowName: 'Demo Credentials Structure & Autofill',
      role: 'public',
      testingMode: 'browser',
      status: 'PASSED',
      durationMs: Date.now() - start,
      screenshotPath: ssSup,
      details: `Verified all 13 accounts across 3 groups (1 Manufacturer, 10 Suppliers, 2 Auditors). Verified autofill for all accounts without errors. Console errors: ${consoleErrors.length}`,
    });
  });

  test('TC-02: Test successful authentication using autofilled credentials for all 3 roles', async ({ page }) => {
    const start = Date.now();

    // 1. Manufacturer Login via Autofill
    await page.goto(`${APP_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.click('button[data-testid="demo-tab-manufacturer"]');
    await page.click('button[data-testid="demo-account-manufacturer@scope3track.demo"]');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/manufacturer/dashboard');
    await expect(page.locator('text=Emissions Intelligence Dashboard')).toBeVisible();

    // 2. Supplier Login via Autofill (SUP-001 Steel)
    await page.goto(`${APP_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.click('button[data-testid="demo-tab-supplier"]');
    await page.click('button[data-testid="demo-account-supplier.steel@axiomx.demo"]');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/supplier/dashboard');
    await expect(page.locator('text=Supplier Carbon Portal')).toBeVisible();

    // 3. Auditor Login via Autofill (Auditor One XYZ)
    await page.goto(`${APP_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.click('button[data-testid="demo-tab-auditor"]');
    await page.click('button[data-testid="demo-account-auditor.xyz@scope3track.demo"]');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/auditor/dashboard');
    await expect(page.locator('text=Auditor Verification Desk')).toBeVisible();

    appendResult({
      testId: 'TC-DEMO-02',
      workflowName: 'Autofill End-to-End Authentication',
      role: 'public',
      testingMode: 'browser',
      status: 'PASSED',
      durationMs: Date.now() - start,
      screenshotPath: '',
      details: 'Successfully authenticated Manufacturer, Supplier SUP-001, and Auditor XYZ using 1-click autofill.',
    });
  });

  test('TC-03: Responsive mobile viewport layout check', async ({ page }) => {
    const start = Date.now();
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

    await page.goto(`${APP_URL}/login`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Demo Credentials')).toBeVisible();
    await expect(page.locator('button[data-testid="demo-tab-supplier"]')).toBeVisible();

    await page.click('button[data-testid="demo-tab-supplier"]');
    await expect(page.locator('button[data-testid="demo-account-supplier.steel@axiomx.demo"]')).toBeVisible();

    const ssMobile = await captureScreenshot(page, 'demo_credentials_04_mobile_viewport');

    appendResult({
      testId: 'TC-DEMO-03',
      workflowName: 'Mobile Responsive Credentials Layout',
      role: 'public',
      testingMode: 'browser',
      status: 'PASSED',
      durationMs: Date.now() - start,
      screenshotPath: ssMobile,
      details: 'Verified Demo Credentials section renders cleanly on mobile screen (375px width).',
    });
  });
});
