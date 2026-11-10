# Scope3Track backend

Single-manufacturer FastAPI/MongoDB backend for the Scope 3 hackathon demo. It supports one seeded company, ABC Manufacturing; supplier and auditor records are scoped to it. The API never provides public registration or multi-tenant/company switching.

## Run on Windows PowerShell

```powershell
cd 'C:\dhash\hackathon n events\INDUSTRIX\backend codex\backend'
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item ..\.env .\.env # or copy values into backend\.env
python -m app.scripts.seed_mock_data
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/docs`. The root `.env` is read automatically; do not commit it. `.env.example` lists all required values.

Demo credentials (development-only): `manufacturer@scope3track.demo` / `ManufacturerDemo123!`, `xyz.steel@scope3track.demo` / `SupplierDemo123!`, and `auditor.xyz@scope3track.demo` / `AuditorDemo123!`.

## Main workflows

Manufacturer endpoints create suppliers/auditors/products, set monthly requirements, download the fixed purchase workbook, preview/confirm uploads, run deterministic factor calculations, and read dashboard/receipt records. Suppliers create a single monthly draft, enter values, upload XLSX/CSV, confirm a suggested mapping, validate/submit, attach evidence, and answer clarifications. Auditors can only inspect assigned submissions, comment, and request clarification; there are deliberately no approval/rejection APIs.

Purchase uploads require the exact `supplier_id, product_name, reporting_month, purchased_quantity, quantity_unit, purchase_expenditure, currency` headers and never use AI. Supplier mappings are advisory and require confirmation. Synthetic seed factors are explicitly marked DEMO and are not official factors or suitable for real reporting.

## Tests

```powershell
pytest -q
```

The tests use an in-memory Mongo-compatible database and cover login, role/record permissions, reporting submission, assignment enforcement, clarification-safe route access, spreadsheet repeated-row handling, mocked AI quality/reduction responses, malformed AI output handling, and all three deterministic calculation methods. Live OpenRouter verification was run with the configured `.env` model and API key; the model listing and completion request both returned HTTP 200. Live MongoDB verification remains dependent on the configured Atlas endpoint being reachable.

## Limitations

AI spreadsheet mapping, report-quality assessment, evidence review, and reduction suggestions make a manually triggered live OpenRouter call when configured. Every response is JSON-validated before it is stored; no AI response changes submitted source data. Evidence review currently extracts PDF text only; XLSX/CSV evidence returns an explicit extraction limitation. Spreadsheet imports validate every mapped row; repeated values are rejected unless the manufacturer explicitly documents an activity `aggregation_rule` of `sum`. There is no live MongoDB verification in this environment because the Atlas SRV hostname could not be resolved.
