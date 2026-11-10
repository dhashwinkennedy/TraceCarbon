import io
import openpyxl
import httpx
from pathlib import Path

# 1. Login to get token
res = httpx.post("http://127.0.0.1:8000/api/v1/auth/login", json={
    "email": "manufacturer@scope3track.demo",
    "password": "ManufacturerDemo123!"
}, timeout=15)
token = res.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# 2. Download template from backend endpoint
template_res = httpx.get("http://127.0.0.1:8000/api/v1/manufacturer/purchase-records/template", headers=headers, timeout=15)
wb = openpyxl.load_workbook(io.BytesIO(template_res.content))

# 3. Verify worksheet and columns
assert "Purchase Records" in wb.sheetnames, f"Expected 'Purchase Records' sheet, found {wb.sheetnames}"
ws = wb["Purchase Records"]
headers_row = [cell.value for cell in ws[1]]
print("Headers in template:", headers_row)

# 4. Append Category 2 machinery purchase row
cat2_row = [
    "SUP001",                 # supplier_id (supplier_code)
    "Production machinery",   # product_name
    "2026-05",                # reporting_month
    2,                        # purchased_quantity
    "unit",                   # quantity_unit
    5000000,                  # purchase_expenditure (INR 50 lakh)
    "INR"                     # currency
]
ws.append(cat2_row)

# 5. Save workbook to fixtures
output_path = Path("frontend/tests/fixtures/category2_machinery_upload.xlsx")
wb.save(output_path)
print(f"Saved completed workbook to {output_path} with {ws.max_row} rows.")
