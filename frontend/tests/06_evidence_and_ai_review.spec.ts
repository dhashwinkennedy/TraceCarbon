import { test, expect } from '@playwright/test';
import { APP_URL, loginAs, captureScreenshot, appendResult, FIXTURES_DIR, setupConsoleAndNetworkTracking } from './test_helpers';
import path from 'path';

test.describe('E2E Suite 06: Evidence Ingestion, PyMuPDF Extraction, AI Advisory & Clarifications', () => {
  test('TC-10: Upload PDF Evidence, Run AI Evidence Review & AI Quality, Post Comment & Resolve Clarification', async ({ page }) => {
    test.setTimeout(180000); // Allow sufficient time for two live OpenRouter AI scans
    const start = Date.now();
    const { consoleErrors } = setupConsoleAndNetworkTracking(page);

    // 1. Supplier creates 2026-04 draft and uploads PDF Evidence
    await loginAs(page, 'supplier');
    await page.goto(`${APP_URL}/supplier/submissions`);
    await page.waitForLoadState('networkidle');

    // Click New Monthly Report
    await page.click('button:has-text("New Monthly Report")');
    await expect(page.locator('text=Initiate Monthly Report')).toBeVisible();

    const monthInput = page.locator('input[type="month"]');
    await monthInput.fill('2026-04');

    await page.click('button[type="submit"]:has-text("Create Draft")');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/.*\/supplier\/submissions\/.*/);
    await expect(page.locator('text=Monthly Report: 2026-04')).toBeVisible({ timeout: 15000 });

    // Enter all 4 required activities so validation passes
    // Activity 1: electricity (matches invoice)
    await page.selectOption('select', 'electricity');
    await page.fill('input[type="number"]', '100000');
    await page.fill('input[placeholder*="Meter #3"]', 'Main factory HT energy meter matching invoice');
    await page.click('button:has-text("Add / Update Metric")');
    await expect(page.locator('text=Updated activity record: electricity')).toBeVisible({ timeout: 10000 });

    // Activity 2: diesel
    await page.selectOption('select', 'diesel');
    await page.fill('input[type="number"]', '2400');
    await page.fill('input[placeholder*="Meter #3"]', 'Backup generator fuel consumption');
    await page.click('button:has-text("Add / Update Metric")');
    await expect(page.locator('text=Updated activity record: diesel')).toBeVisible({ timeout: 10000 });

    // Activity 3: production
    await page.selectOption('select', 'production');
    await page.fill('input[type="number"]', '620');
    await page.fill('input[placeholder*="Meter #3"]', 'Total monthly rolled coil tonnage');
    await page.click('button:has-text("Add / Update Metric")');
    await expect(page.locator('text=Updated activity record: production')).toBeVisible({ timeout: 10000 });

    // Activity 4: raw_material
    await page.selectOption('select', 'raw_material');
    await page.fill('input[type="number"]', '840');
    await page.fill('input[placeholder*="Meter #3"]', 'Scrap iron & pig iron batch load slips');
    await page.click('button:has-text("Add / Update Metric")');
    await expect(page.locator('text=Updated activity record: raw_material')).toBeVisible({ timeout: 10000 });

    // Upload PDF evidence
    const pdfPath = path.join(FIXTURES_DIR, 'electricity_invoice_evidence.pdf');
    const fileInput = page.locator('input[type="file"][accept*=".pdf"], input[type="file"]');
    await fileInput.setInputFiles(pdfPath);
    await page.waitForLoadState('networkidle');

    // Verify uploaded evidence appears in list
    await expect(page.locator('text=electricity_invoice_evidence.pdf').first()).toBeVisible({ timeout: 15000 });
    const ssEvidenceUploaded = await captureScreenshot(page, '06_supplier_evidence_uploaded');

    // Submit report so auditor can review it
    await page.click('button:has-text("Submit to Auditor")');
    await expect(page.locator('text=Submit Monthly Carbon Report')).toBeVisible();
    await page.click('button:has-text("Confirm & Submit")');
    await page.waitForLoadState('networkidle');

    // Verify submitted status badge
    await expect(page.locator('text=Submitted').first()).toBeVisible({ timeout: 15000 });

    const submissionUrl = page.url();
    const submissionId = submissionUrl.split('/').pop();

    // 2. Logout and login as Internal Auditor
    await page.goto(`${APP_URL}/login`);
    await loginAs(page, 'auditor');
    await page.goto(`${APP_URL}/auditor/submissions/${submissionId}`);
    await page.waitForLoadState('networkidle');

    // Verify evidence button reflects attached document
    await expect(page.locator('button:has-text("Review Evidence")')).toBeEnabled({ timeout: 10000 });
    await expect(page.locator('text=1 attached document(s)')).toBeVisible({ timeout: 10000 });

    // 3. Run live AI Evidence Review (PyMuPDF text extraction + OpenRouter)
    await page.click('button:has-text("Review Evidence")');
    // Wait for OpenRouter AI assessment
    await expect(page.locator('text=Evidence Parity Rating')).toBeVisible({ timeout: 60000 });

    const ssEvidenceReview = await captureScreenshot(page, '06_auditor_ai_evidence_review');

    // 4. Run live AI Report Quality Assessment
    await page.click('button:has-text("Run Report Quality Scan")');
    await expect(page.locator('text=Quality Assessment Rating')).toBeVisible({ timeout: 60000 });

    const ssQualityScan = await captureScreenshot(page, '06_auditor_ai_quality_scan');

    // 5. Post an audit comment
    await page.fill('textarea[placeholder*="Record verification observation"]', 'Utility invoice text corroborated against reported electricity figures.');
    await page.click('button:has-text("Add Audit Finding")');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Utility invoice text corroborated against reported electricity figures.').first()).toBeVisible({ timeout: 10000 });

    // 6. Raise clarification request
    await page.fill('textarea[placeholder*="Ask supplier to clarify"]', 'Please provide diesel fuel delivery slips for the remaining 2,000 litres.');
    await page.click('button:has-text("Raise Clarification Inquiry")');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Please provide diesel fuel delivery slips').first()).toBeVisible({ timeout: 10000 });

    const ssAuditWorkspace = await captureScreenshot(page, '06_auditor_workspace_actions');

    // 7. Login as Supplier to respond to clarification
    await page.goto(`${APP_URL}/login`);
    await loginAs(page, 'supplier');
    await page.goto(`${APP_URL}/supplier/clarifications`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Please provide diesel fuel delivery slips').first()).toBeVisible({ timeout: 10000 });
    
    // Type response using direct placeholder
    const responseTextarea = page.locator('textarea[placeholder*="Explain the data point"]').first();
    await responseTextarea.fill('Diesel delivery receipts from Bharat Petroleum attached in supplemental evidence.');
    await page.locator('button:has-text("Submit Response")').first().click();
    await page.waitForLoadState('networkidle');

    // Verify response success
    await expect(page.locator('text=Response submitted to auditor successfully').first()).toBeVisible({ timeout: 10000 });
    const ssSupplierResponded = await captureScreenshot(page, '06_supplier_clarification_response');

    // 8. Login back as Auditor to resolve
    await page.goto(`${APP_URL}/login`);
    await loginAs(page, 'auditor');
    await page.goto(`${APP_URL}/auditor/submissions/${submissionId}`);
    await page.waitForLoadState('networkidle');

    const resolveBtn = page.locator('button:has-text("Mark Resolved")').first();
    await resolveBtn.click();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=resolved').first()).toBeVisible({ timeout: 10000 });
    const ssResolved = await captureScreenshot(page, '06_auditor_clarification_resolved');

    const duration = Date.now() - start;
    appendResult({
      testId: 'TC-10',
      workflowName: 'Evidence Upload, AI Review & Clarification Loop',
      role: 'auditor',
      testingMode: 'browser',
      status: 'PASSED',
      durationMs: duration,
      screenshotPath: ssResolved,
      details: `Uploaded PDF evidence to monthly report, executed PyMuPDF text corroboration via OpenRouter AI, ran report quality scan, logged audit findings, initiated clarification request, received supplier response, and marked inquiry resolved. Console errors: ${consoleErrors.length}`,
    });
  });
});
