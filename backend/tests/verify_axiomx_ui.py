"""
Playwright UI verification script for Scope3Track with AxiomX dataset.
Captures high-resolution screenshots for:
1. Manufacturer Dashboard & Suppliers Directory
2. Auditor Submissions & Review Portal
3. Supplier Portal (with FY22 submitted and FY23-24 outstanding for upload)
"""

import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ARTIFACTS_DIR = Path(r"C:\Users\hilto\.gemini\antigravity\brain\7bec86e2-3007-4b8c-becd-1d188e859879")

def run_ui_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        print("[UI TEST] 1. Logging in as Manufacturer Admin...")
        page.goto("http://localhost:5173/login")
        page.wait_for_selector('input[type="email"]')
        page.fill('input[type="email"]', "manufacturer@scope3track.demo")
        page.fill('input[type="password"]', "ManufacturerDemo123!")
        page.click('button[type="submit"]')
        page.wait_for_url("http://localhost:5173/")
        time.sleep(2)
        
        # Dashboard Screenshot
        page.screenshot(path=str(ARTIFACTS_DIR / "axiomx_01_manufacturer_dashboard.png"), full_page=True)
        print("  [SAVED] axiomx_01_manufacturer_dashboard.png")

        # Suppliers Directory Screenshot
        page.click('a[href="/suppliers"]')
        time.sleep(2)
        page.screenshot(path=str(ARTIFACTS_DIR / "axiomx_02_manufacturer_suppliers_list.png"), full_page=True)
        print("  [SAVED] axiomx_02_manufacturer_suppliers_list.png")

        # Purchases Screenshot
        page.click('a[href="/purchases"]')
        time.sleep(2)
        page.screenshot(path=str(ARTIFACTS_DIR / "axiomx_03_manufacturer_purchases.png"), full_page=True)
        print("  [SAVED] axiomx_03_manufacturer_purchases.png")

        # Logout
        print("[UI TEST] 2. Logging in as Auditor (auditor.xyz@scope3track.demo)...")
        page.goto("http://localhost:5173/login")
        # Clear storage
        context.clear_cookies()
        page.evaluate("() => localStorage.clear()")
        page.reload()
        page.wait_for_selector('input[type="email"]')
        page.fill('input[type="email"]', "auditor.xyz@scope3track.demo")
        page.fill('input[type="password"]', "AuditorDemo123!")
        page.click('button[type="submit"]')
        page.wait_for_url("http://localhost:5173/auditor")
        time.sleep(2)
        page.screenshot(path=str(ARTIFACTS_DIR / "axiomx_04_auditor_submissions_view.png"), full_page=True)
        print("  [SAVED] axiomx_04_auditor_submissions_view.png")

        # Logout & Login as Supplier 1 (AxiomX Steel)
        print("[UI TEST] 3. Logging in as Supplier SUP-001 (supplier.steel@axiomx.demo)...")
        page.goto("http://localhost:5173/login")
        context.clear_cookies()
        page.evaluate("() => localStorage.clear()")
        page.reload()
        page.wait_for_selector('input[type="email"]')
        page.fill('input[type="email"]', "supplier.steel@axiomx.demo")
        page.fill('input[type="password"]', "AxiomX!Steel#2026")
        page.click('button[type="submit"]')
        page.wait_for_url("http://localhost:5173/supplier")
        time.sleep(2)
        page.screenshot(path=str(ARTIFACTS_DIR / "axiomx_05_supplier_steel_reports.png"), full_page=True)
        print("  [SAVED] axiomx_05_supplier_steel_reports.png")

        browser.close()
        print("\n[SUCCESS] All UI verification screenshots captured successfully!")

if __name__ == "__main__":
    run_ui_verification()
