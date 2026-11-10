import { Page, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const APP_URL = 'http://localhost:5173';
export const SCREENSHOTS_DIR = path.resolve(__dirname, 'screenshots');
export const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');
export const RESULTS_CSV = path.resolve(__dirname, 'e2e_results.csv');

export interface TestResultRecord {
  testId: string;
  workflowName: string;
  role: 'manufacturer' | 'supplier' | 'auditor' | 'public';
  testingMode: 'browser' | 'direct_api' | 'mocked' | 'failed' | 'blocked';
  status: 'PASSED' | 'FAILED' | 'SKIPPED' | 'BLOCKED';
  durationMs: number;
  screenshotPath: string;
  details: string;
}

export function appendResult(record: TestResultRecord) {
  const fileExists = fs.existsSync(RESULTS_CSV);
  if (!fileExists) {
    const header = 'test_id,workflow_name,role,testing_mode,status,duration_ms,screenshot_path,details\n';
    fs.writeFileSync(RESULTS_CSV, header, 'utf-8');
  }
  const cleanDetails = record.details.replace(/"/g, '""');
  const row = `"${record.testId}","${record.workflowName}","${record.role}","${record.testingMode}","${record.status}",${record.durationMs},"${record.screenshotPath}","${cleanDetails}"\n`;
  fs.appendFileSync(RESULTS_CSV, row, 'utf-8');
}

export async function captureScreenshot(page: Page, name: string): Promise<string> {
  const filePath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

export async function loginAs(
  page: Page,
  role: 'manufacturer' | 'supplier' | 'auditor'
) {
  const credentials = {
    manufacturer: { email: 'manufacturer@scope3track.demo', password: 'ManufacturerDemo123!' },
    supplier: { email: 'supplier.steel@axiomx.demo', password: 'AxiomX!Steel#2026' },
    auditor: { email: 'auditor.xyz@scope3track.demo', password: 'AuditorDemo123!' },
  }[role];

  await page.goto(`${APP_URL}/login`);
  await page.waitForLoadState('networkidle');

  // Fill login form
  await page.fill('input[type="email"], input[name="email"]', credentials.email);
  await page.fill('input[type="password"], input[name="password"]', credentials.password);
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  const expectedPath = {
    manufacturer: '/manufacturer/dashboard',
    supplier: '/supplier/dashboard',
    auditor: '/auditor/dashboard',
  }[role];

  await page.waitForURL(`**${expectedPath}*`, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

export function setupConsoleAndNetworkTracking(page: Page) {
  const consoleErrors: string[] = [];
  const networkFailures: Array<{ url: string; status: number; method: string }> = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('response', (res) => {
    if (res.status() >= 400) {
      networkFailures.push({
        url: res.url(),
        status: res.status(),
        method: res.request().method(),
      });
    }
  });

  return { consoleErrors, networkFailures };
}
