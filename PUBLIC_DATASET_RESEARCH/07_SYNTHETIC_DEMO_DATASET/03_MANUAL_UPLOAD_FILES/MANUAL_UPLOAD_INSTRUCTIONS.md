# Scope3Track — Manual Demonstration Upload Instructions

> [!IMPORTANT]
> **PHASE 1 RESTRICTION NOTICE**:
> These workbooks are reserved strictly for Phase 2 live demonstration.
> **DO NOT upload, seed, or ingest these files during Phase 1.**

---

## 1. Overview and Purpose
This directory contains three isolated Excel workbooks representing the **FY 2023-24 activity disclosures** for three key industrial suppliers:
1. `AxiomX_Steel_FY2023-24.xlsx` (SUP-001)
2. `AxiomX_Cement_FY2023-24.xlsx` (SUP-004)
3. `AxiomX_Chemical_FY2023-24.xlsx` (SUP-005)

These three suppliers have preloaded baseline data for **FY 2022-23** already present in the historical preload package, but their **FY 2023-24** annual activity records have been intentionally omitted from the preload package.

During the Phase 2 live hackathon demonstration, the user or presenter will log in as each of these three suppliers and perform a manual file upload through the Scope3Track Supplier Portal to demonstrate:
1. **Spreadsheet Ingestion & Parser Flexibility**: How Scope3Track parses heterogeneous vendor spreadsheets.
2. **AI-Assisted Column Mapping**: How the AI model resolves varied column header labels to standard emission activity schemas.
3. **Automated Calculation & Carbon Footprint Receipt**: Instant generation of Scope 1, Scope 2, and product carbon footprint receipts with audit-trail citations.
4. **Manufacturer Dashboard Aggregation**: Immediate live update of the Manufacturer Category 1 Scope 3 inventory without double-counting.

---

## 2. Spreadsheet Layouts and Column Variations

Each workbook utilizes realistic company-specific column headers to test and prove AI column mapping capabilities:

| Supplier Entity | File Name | Electricity Column Label | Diesel Fuel Column Label | Production Output Column Label | Raw Material Column Label |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AxiomX Steel Suppliers** (`SUP-001`) | `AxiomX_Steel_FY2023-24.xlsx` | `Grid Electricity Used (kWh)` | `HSD for Generator (Litres)` | `Finished Steel Output (Metric Tonnes)` | `Iron Ore and Scrap Input (Metric Tonnes)` |
| **AxiomX Cement Suppliers** (`SUP-004`) | `AxiomX_Cement_FY2023-24.xlsx` | `Electrical Power Consumed (kWh)` | `Diesel Consumed (L)` | `Cement Produced (MT)` | `Raw Mix and Additives Consumed (MT)` |
| **AxiomX Chemical Suppliers** (`SUP-005`) | `AxiomX_Chemical_FY2023-24.xlsx` | `Total Electrical Energy (kWh)` | `Diesel for Backup Generator (Litres)` | `Chemical Production (Tonnes)` | `Raw Material Feed (Tonnes)` |

---

## 3. Step-by-Step Demonstration Walkthrough (For Phase 2)

### Demonstration Flow 1: AxiomX Steel Suppliers (`SUP-001`)
1. In the Scope3Track login portal, log in as `supplier1@scope3track.com` (AxiomX Steel Suppliers).
2. Navigate to **Annual Submissions** -> **New Submission (FY 2023-24)**.
3. Select **Upload Annual Activity Spreadsheet**.
4. Drag and drop `03_MANUAL_UPLOAD_FILES/AxiomX_Steel_FY2023-24.xlsx`.
5. Observe the AI Column Mapping preview:
   - `Grid Electricity Used (kWh)` maps to `Electricity Consumption (kWh)`.
   - `HSD for Generator (Litres)` maps to `Diesel Consumption (Litres)`.
   - `Finished Steel Output (Metric Tonnes)` maps to `Production Output (Tonnes)`.
   - `Iron Ore and Scrap Input (Metric Tonnes)` maps to `Raw Material Input (Tonnes)`.
6. Confirm the mapping and click **Submit & Calculate Emissions**.
7. Observe the calculated Scope 2 emissions ($79,275,000 	imes 0.727 / 1000 = 57,632.925	ext{ tCO}_2	ext{e}$) and Scope 1 emissions ($315,000 	imes 2.68 / 1000 = 844.200	ext{ tCO}_2	ext{e}$), resulting in a Product Carbon Footprint of **334.16 kg CO2e / MT**.

### Demonstration Flow 2: AxiomX Cement Suppliers (`SUP-004`)
1. Log in as `supplier4@scope3track.com` (AxiomX Cement Suppliers).
2. Upload `03_MANUAL_UPLOAD_FILES/AxiomX_Cement_FY2023-24.xlsx`.
3. Verify that `Electrical Power Consumed (kWh)` and `Diesel Consumed (L)` are correctly mapped.
4. Verify emission calculation: Scope 2 = $26,528.957	ext{ tCO}_2	ext{e}$, Scope 1 = $723.600	ext{ tCO}_2	ext{e}$, Footprint = **59.90 kg CO2e / MT**.

### Demonstration Flow 3: AxiomX Chemical Suppliers (`SUP-005`)
1. Log in as `supplier5@scope3track.com` (AxiomX Chemical Suppliers).
2. Upload `03_MANUAL_UPLOAD_FILES/AxiomX_Chemical_FY2023-24.xlsx`.
3. Verify that `Total Electrical Energy (kWh)` and `Diesel for Backup Generator (Litres)` are correctly mapped.
4. Verify emission calculation: Scope 2 = $16,102.323	ext{ tCO}_2	ext{e}$, Scope 1 = $434.160	ext{ tCO}_2	ext{e}$, Footprint = **309.09 kg CO2e / MT**.

---

## 4. Verification Check
All numerical values in these three workbooks match their corresponding master records in `01_MASTER_DATA/Annual_Supplier_Activities.xlsx` (`ACT-2024-001`, `ACT-2024-004`, and `ACT-2024-005`).