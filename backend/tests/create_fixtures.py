"""Generates synthetic test fixtures for supplier spreadsheets, manufacturer purchases, and evidence PDFs."""
import io
from pathlib import Path
import pandas as pd
import fitz  # PyMuPDF

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"
FIXTURES_DIR.mkdir(parents=True, exist_ok=True)

def generate_fixtures():
    print(f"Generating test fixtures in: {FIXTURES_DIR}")

    # -------------------------------------------------------------
    # 1. Supplier Spreadsheets (11 variants)
    # -------------------------------------------------------------
    # 1.1 Valid single-row file (.xlsx)
    df_single = pd.DataFrame([{
        "electricity_kwh": 50000,
        "diesel_litres": 1500,
        "production_tonnes": 300,
        "raw_material_tonnes": 400
    }])
    df_single.to_excel(FIXTURES_DIR / "supplier_valid_single.xlsx", index=False)

    # 1.2 Valid multi-row file (.xlsx)
    df_multi = pd.DataFrame([
        {"electricity_kwh": 25000, "diesel_litres": 750, "production_tonnes": 150, "raw_material_tonnes": 200},
        {"electricity_kwh": 25000, "diesel_litres": 750, "production_tonnes": 150, "raw_material_tonnes": 200}
    ])
    df_multi.to_excel(FIXTURES_DIR / "supplier_valid_multi.xlsx", index=False)

    # 1.3 Multiple worksheets (.xlsx)
    with pd.ExcelWriter(FIXTURES_DIR / "supplier_multi_sheets.xlsx", engine="openpyxl") as writer:
        df_single.to_excel(writer, sheet_name="Energy & Operations", index=False)
        pd.DataFrame([{"Notes": "Monthly facility meter logs", "Facility": "Plant 1"}]).to_excel(writer, sheet_name="Facility Notes", index=False)

    # 1.4 Missing activity columns (.xlsx)
    df_missing = pd.DataFrame([{
        "electricity_kwh": 50000,
        "diesel_litres": 1500
        # missing production and raw_material
    }])
    df_missing.to_excel(FIXTURES_DIR / "supplier_missing_columns.xlsx", index=False)

    # 1.5 Ambiguous column headers (.xlsx)
    df_ambiguous = pd.DataFrame([{
        "Power Usage": 50000,
        "Fuel Burned": 1500,
        "Factory Output": 300,
        "Materials In": 400
    }])
    df_ambiguous.to_excel(FIXTURES_DIR / "supplier_ambiguous_headers.xlsx", index=False)

    # 1.6 Invalid numeric values (.xlsx)
    df_invalid_num = pd.DataFrame([{
        "electricity_kwh": "TEN THOUSAND",
        "diesel_litres": "UNKNOWN",
        "production_tonnes": 300,
        "raw_material_tonnes": "N/A"
    }])
    df_invalid_num.to_excel(FIXTURES_DIR / "supplier_invalid_numeric.xlsx", index=False)

    # 1.7 Missing cells (.xlsx)
    df_missing_cells = pd.DataFrame([{
        "electricity_kwh": 50000,
        "diesel_litres": None,
        "production_tonnes": 300,
        "raw_material_tonnes": None
    }])
    df_missing_cells.to_excel(FIXTURES_DIR / "supplier_missing_cells.xlsx", index=False)

    # 1.8 Unsupported units (.xlsx)
    df_unsupported = pd.DataFrame([{
        "electricity_gallons": 50000,
        "diesel_kwh": 1500,
        "production_miles": 300,
        "raw_material_psi": 400
    }])
    df_unsupported.to_excel(FIXTURES_DIR / "supplier_unsupported_units.xlsx", index=False)

    # 1.9 Duplicate activity entries (.xlsx)
    df_duplicate = pd.DataFrame([
        {"electricity_kwh": 40000, "diesel_litres": 1000, "production_tonnes": 200, "raw_material_tonnes": 250},
        {"electricity_kwh": 10000, "diesel_litres": 500, "production_tonnes": 100, "raw_material_tonnes": 150}
    ])
    df_duplicate.to_excel(FIXTURES_DIR / "supplier_duplicate_entries.xlsx", index=False)

    # 1.10 Empty spreadsheet (.xlsx and empty bytes)
    (FIXTURES_DIR / "supplier_empty.xlsx").write_bytes(b"")

    # 1.11 Invalid file extension (.txt)
    (FIXTURES_DIR / "supplier_invalid_ext.txt").write_text("electricity_kwh,50000\ndiesel_litres,1500")

    # -------------------------------------------------------------
    # 2. Manufacturer Purchase Excel (10 variants)
    # -------------------------------------------------------------
    PURCHASE_COLS = ["supplier_id","product_name","reporting_month","purchased_quantity","quantity_unit","purchase_expenditure","currency"]

    def make_purchase_excel(filename, rows, sheet_name="Purchase Records", cols=PURCHASE_COLS):
        buff = io.BytesIO()
        with pd.ExcelWriter(FIXTURES_DIR / filename, engine="openpyxl") as w:
            pd.DataFrame(rows, columns=cols).to_excel(w, index=False, sheet_name=sheet_name)
            pd.DataFrame({"Instructions": ["Use exact template"]}).to_excel(w, index=False, sheet_name="Instructions")

    # 2.1 Correct fixed template
    make_purchase_excel("purchase_valid.xlsx", [{
        "supplier_id": "SUP001",
        "product_name": "Steel sheets",
        "reporting_month": "2026-01",
        "purchased_quantity": 100.0,
        "quantity_unit": "tonnes",
        "purchase_expenditure": 1000000.0,
        "currency": "INR"
    }])

    # 2.2 Missing required column (missing currency)
    make_purchase_excel("purchase_missing_column.xlsx", [{
        "supplier_id": "SUP001",
        "product_name": "Steel sheets",
        "reporting_month": "2026-01",
        "purchased_quantity": 100.0,
        "quantity_unit": "tonnes",
        "purchase_expenditure": 1000000.0
    }], cols=PURCHASE_COLS[:-1])

    # 2.3 Incorrect header ('supplier' instead of 'supplier_id')
    wrong_cols = ["supplier", "product_name", "reporting_month", "purchased_quantity", "quantity_unit", "purchase_expenditure", "currency"]
    make_purchase_excel("purchase_incorrect_header.xlsx", [{
        "supplier": "SUP001",
        "product_name": "Steel sheets",
        "reporting_month": "2026-01",
        "purchased_quantity": 100.0,
        "quantity_unit": "tonnes",
        "purchase_expenditure": 1000000.0,
        "currency": "INR"
    }], cols=wrong_cols)

    # 2.4 Invalid supplier ID ('SUP999')
    make_purchase_excel("purchase_invalid_supplier.xlsx", [{
        "supplier_id": "SUP999",
        "product_name": "Steel sheets",
        "reporting_month": "2026-01",
        "purchased_quantity": 100.0,
        "quantity_unit": "tonnes",
        "purchase_expenditure": 1000000.0,
        "currency": "INR"
    }])

    # 2.5 Invalid reporting month ('2026-13')
    make_purchase_excel("purchase_invalid_month.xlsx", [{
        "supplier_id": "SUP001",
        "product_name": "Steel sheets",
        "reporting_month": "2026-13",
        "purchased_quantity": 100.0,
        "quantity_unit": "tonnes",
        "purchase_expenditure": 1000000.0,
        "currency": "INR"
    }])

    # 2.6 Invalid quantity (-10 or non-numeric)
    make_purchase_excel("purchase_invalid_qty.xlsx", [{
        "supplier_id": "SUP001",
        "product_name": "Steel sheets",
        "reporting_month": "2026-01",
        "purchased_quantity": -10.0,
        "quantity_unit": "tonnes",
        "purchase_expenditure": 1000000.0,
        "currency": "INR"
    }])

    # 2.7 Negative expenditure (-50000)
    make_purchase_excel("purchase_negative_expenditure.xlsx", [{
        "supplier_id": "SUP001",
        "product_name": "Steel sheets",
        "reporting_month": "2026-01",
        "purchased_quantity": 100.0,
        "quantity_unit": "tonnes",
        "purchase_expenditure": -50000.0,
        "currency": "INR"
    }])

    # 2.8 Missing currency (empty string / None)
    make_purchase_excel("purchase_missing_currency.xlsx", [{
        "supplier_id": "SUP001",
        "product_name": "Steel sheets",
        "reporting_month": "2026-01",
        "purchased_quantity": 100.0,
        "quantity_unit": "tonnes",
        "purchase_expenditure": 1000000.0,
        "currency": ""
    }])

    # 2.9 Duplicate rows within same file
    make_purchase_excel("purchase_duplicate_rows.xlsx", [
        {
            "supplier_id": "SUP001",
            "product_name": "Steel sheets",
            "reporting_month": "2026-01",
            "purchased_quantity": 50.0,
            "quantity_unit": "tonnes",
            "purchase_expenditure": 500000.0,
            "currency": "INR"
        },
        {
            "supplier_id": "SUP001",
            "product_name": "Steel sheets",
            "reporting_month": "2026-01",
            "purchased_quantity": 50.0,
            "quantity_unit": "tonnes",
            "purchase_expenditure": 500000.0,
            "currency": "INR"
        }
    ])

    # 2.10 Multiple legitimate purchases of same supplier and product in one month
    make_purchase_excel("purchase_multiple_legitimate.xlsx", [
        {
            "supplier_id": "SUP001",
            "product_name": "Steel sheets",
            "reporting_month": "2026-01",
            "purchased_quantity": 40.0,
            "quantity_unit": "tonnes",
            "purchase_expenditure": 400000.0,
            "currency": "INR"
        },
        {
            "supplier_id": "SUP001",
            "product_name": "Steel sheets",
            "reporting_month": "2026-01",
            "purchased_quantity": 60.0,
            "quantity_unit": "tonnes",
            "purchase_expenditure": 600000.0,
            "currency": "INR"
        }
    ])

    # -------------------------------------------------------------
    # 3. Evidence PDF File
    # -------------------------------------------------------------
    pdf_path = FIXTURES_DIR / "evidence_xyz_steel_2026_01.pdf"
    doc = fitz.open()
    page = doc.new_page()
    text = (
        "ENERGY CONSUMPTION & PRODUCTION EVIDENCE REPORT\n"
        "===============================================\n\n"
        "Company: XYZ Steel (Supplier Code: SUP001)\n"
        "Facility: Plant 1 - Main Smelting & Rolling Mill\n"
        "Reporting Period: January 2026 (2026-01)\n\n"
        "Verified Activity Data:\n"
        "  - Electricity Consumed: 100,000 kWh\n"
        "    Source: Grid Meter #MTR-88219 (State Electricity Board)\n\n"
        "  - Diesel Fuel Consumed: 2,000 litres\n"
        "    Source: On-site Generator & Vehicle Dispenser Log\n\n"
        "  - Total Steel Production: 500 tonnes\n"
        "    Product: Hot-rolled Steel Sheets (STL-001)\n\n"
        "  - Raw Material Consumed: 600 tonnes\n"
        "    Material: Iron ore and scrap charge\n\n"
        "Auditor Notes: Utility statements reconciled against internal ledger.\n"
        "Invoice Reference: INV-2026-01-XYZ-8891\n"
        "Issued by: XYZ Steel Environmental Compliance Division\n"
    )
    page.insert_text((50, 72), text, fontsize=11)
    doc.save(pdf_path)
    doc.close()
    print("Generated all fixtures successfully.")

if __name__ == "__main__":
    generate_fixtures()
