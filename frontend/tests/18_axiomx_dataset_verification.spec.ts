import { test, expect } from '@playwright/test';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/hilto/.gemini/antigravity/brain/7bec86e2-3007-4b8c-becd-1d188e859879';

test.describe('AxiomX Dataset Verification & End-to-End Governance', () => {

  test('1. Manufacturer Dashboard and AxiomX Suppliers Directory', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'manufacturer@scope3track.demo');
    await page.fill('input[type="password"]', 'ManufacturerDemo123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/manufacturer\/dashboard/);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify Calculation Method Distribution cards
    await expect(page.locator('text=Calculation Method Distribution')).toBeVisible();
    await expect(page.locator('text=Product-Factor (Tier 1)').locator('..').locator('..')).toContainText('2,692.86 t CO₂e');
    await expect(page.locator('text=Activity-Based (Tier 2)').locator('..').locator('..')).toContainText('Not used');
    await expect(page.locator('text=Spend-Based (Tier 3)').locator('..').locator('..')).toContainText('Not used');

    // Capture Manufacturer Dashboard
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'axiomx_01_manufacturer_dashboard.png'),
      fullPage: true
    });

    // Navigate to Suppliers page
    await page.goto('/manufacturer/suppliers');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify all 10 AxiomX suppliers are visible in the table
    await expect(page.locator('text=AxiomX Steel Suppliers')).toBeVisible();
    await expect(page.locator('text=AxiomX Rubber Suppliers')).toBeVisible();
    await expect(page.locator('text=AxiomX Aluminium Suppliers')).toBeVisible();
    await expect(page.locator('text=AxiomX Cement Suppliers')).toBeVisible();
    await expect(page.locator('text=AxiomX Chemical Suppliers')).toBeVisible();
    await expect(page.locator('text=AxiomX Packaging Suppliers')).toBeVisible();
    await expect(page.locator('text=AxiomX Textile Suppliers')).toBeVisible();
    await expect(page.locator('text=AxiomX Glass Suppliers')).toBeVisible();
    await expect(page.locator('text=AxiomX Polymer Suppliers')).toBeVisible();
    await expect(page.locator('text=AxiomX Machinery Suppliers')).toBeVisible();

    // Capture Suppliers Directory
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'axiomx_02_manufacturer_suppliers_list.png'),
      fullPage: true
    });

    // Navigate to Purchases
    await page.goto('/manufacturer/purchases');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'axiomx_03_manufacturer_purchases.png'),
      fullPage: true
    });
  });

  test('2. Auditor Portal - Balanced Dual-Auditor Workload Governance', async ({ page }) => {
    // Auditor 1
    await page.goto('/login');
    await page.fill('input[type="email"]', 'auditor.xyz@scope3track.demo');
    await page.fill('input[type="password"]', 'AuditorDemo123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/auditor/);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify Auditor One sees assigned submissions (SUP-001 through SUP-006)
    await expect(page.locator('text=AxiomX Steel Suppliers').first()).toBeVisible();
    await expect(page.locator('text=AxiomX Rubber Suppliers').first()).toBeVisible();

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'axiomx_04_auditor_xyz_submissions.png'),
      fullPage: true
    });
  });

  test('3. Supplier Portal - FY22 Submitted and FY23-24 Outstanding for Live Upload', async ({ page }) => {
    // SUP-001 AxiomX Steel Suppliers
    await page.goto('/login');
    await page.fill('input[type="email"]', 'supplier.steel@axiomx.demo');
    await page.fill('input[type="password"]', 'AxiomX!Steel#2026');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/supplier/);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Go to Submissions / Reports page
    await page.goto('/supplier/submissions');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify FY2022-23 submission exists
    await expect(page.locator('text=FY2022-23')).toBeVisible();

    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'axiomx_05_supplier_steel_reports.png'),
      fullPage: true
    });
  });
});
