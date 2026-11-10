# Scope3Track — Two-Year Synthetic Supplier Dataset Validation Report

**Document Version**: 1.0.0  
**Audit Timestamp**: November 9, 2026  
**Audit Target Directory**: `C:\dhash\hackathon n events\INDUSTRIX\backend codex\SUPPLIER_ANNUAL_DATASETS_2Y\`  
**Overall Audit Result**: **PASSED (100%)** (14/14 Audit Checks Passed)  
**Data Classification**: `SYNTHETIC DEMONSTRATION DATA — NOT ACTUAL COMPANY DISCLOSURES`  

> [!IMPORTANT]
> **SYNTHETIC DATASET NOTICE**: All supplier entities, industrial facilities, activity metrics, and contact details are purely synthetic demonstration artifacts. They are informed by published sector averages (CEA CO2 Baseline v19/v20, 2006 IPCC Guidelines) but do not represent actual company disclosures.

---

## 1. Executive Summary

A complete, rigorous validation audit was executed against the standalone `SUPPLIER_ANNUAL_DATASETS_2Y` dataset package. The audit confirmed:
- Exactly 10 fictional industrial suppliers across 10 diverse sectors.
- Exactly 20 individual supplier-year workbooks organized in the required 17 + 3 distribution.
- 17 workbooks in `PRELOAD_DATA/` (10 for FY2022-23 baseline, 7 for FY2023-24 preloaded reporting).
- 3 workbooks in `MANUAL_UPLOAD_DATA/` (Steel, Cement, and Chemical for FY2023-24) with realistic alternative headers for spreadsheet upload testing.
- Consolidated `MASTER_SUPPLIER_ANNUAL_DATASET_2Y.xlsx` with all 6 required worksheets matching individual files byte-for-byte in values.
- Consolidated `MASTER_SUPPLIER_ANNUAL_DATASET_2Y.csv` with all 20 supplier-year records.
- Complete `DATA_DICTIONARY.xlsx` defining entities, units of measure, and validation rules.
- Zero modifications to `backend/`, `frontend/`, MongoDB database, or `.env` configuration.

---

## 2. Comprehensive Audit Verification Matrix

| Check ID | Requirement Description | Verification Details | Status |
| :--- | :--- | :--- | :---: |
| **CHK-001** | Exactly 10 industrial suppliers defined in Supplier Master | Verified 10 suppliers (SUP-001 through SUP-010 across 10 sectors). | **[PASS]** |
| **CHK-002** | Exactly 20 individual supplier-year Excel workbooks created | Verified 20 workbooks total (10 in FY23, 7 in FY24 Preload, 3 in Manual Upload). | **[PASS]** |
| **CHK-003** | Exactly 17 workbooks in PRELOAD_DATA (10 in FY22-23, 7 in FY23-24) | Found 10 in FY2022-23 and 7 in FY2023-24 (Total = 17). | **[PASS]** |
| **CHK-004** | Exactly 3 workbooks in MANUAL_UPLOAD_DATA (Steel, Cement, Chemical for FY23-24) | Found 3 files: ['AxiomX_Cement_FY2023-24.xlsx', 'AxiomX_Chemical_FY2023-24.xlsx', 'AxiomX_Steel_FY2023-24.xlsx']. | **[PASS]** |
| **CHK-005** | All 10 suppliers have verified FY2022-23 individual workbooks | 100% match of expected FY2022-23 filenames. | **[PASS]** |
| **CHK-006** | All 10 suppliers have FY2023-24 data across Preload (7) and Manual Upload (3) | 100% coverage of all 10 suppliers for FY2023-24. | **[PASS]** |
| **CHK-007** | Consolidated MASTER_SUPPLIER_ANNUAL_DATASET_2Y.xlsx contains all 6 required worksheets | Actual sheets: ['Supplier Master', 'FY2022-23 Activities', 'FY2023-24 Activities', 'Emission Factors', 'Calculated Emissions', 'Dataset Provenance']. | **[PASS]** |
| **CHK-008** | Master CSV contains exactly 20 supplier-year activity records | Found 20 records in CSV (10 for FY22-23, 10 for FY23-24). | **[PASS]** |
| **CHK-009** | Manual upload files match master dataset numerical values exactly | Steel match: True; Cement match: True; Chemical match: True. | **[PASS]** |
| **CHK-010** | All activity values are valid, physically realistic, and strictly non-negative (>0) | 100% of activity consumption metrics exceed zero and use standard industrial units. | **[PASS]** |
| **CHK-011** | No duplicate supplier-year activity records exist | All 20 supplier-year pairs are strictly unique. | **[PASS]** |
| **CHK-012** | Emissions are mathematically reproducible via deterministic statutory formulas | Scope 1 (IPCC diesel factor 2.68 kg/L) and Scope 2 (CEA grid factors 0.716 / 0.727 kg/kWh) verified. | **[PASS]** |
| **CHK-013** | Mandatory synthetic demonstration data disclaimer present across all workbooks | Disclaimer: 'SYNTHETIC DEMONSTRATION DATA — NOT ACTUAL COMPANY DISCLOSURES' prominently displayed on row 2 of all sheets. | **[PASS]** |
| **CHK-014** | DATA_DICTIONARY.xlsx documents entities, units, and field specifications | Verified sheets: ['Entities_and_Datasets', 'Field_Specifications'] with complete type and unit documentation. | **[PASS]** |

---

## 3. Detailed Dataset Reconciliation

### A. Supplier-Year Inventory (20 Workbooks Total)

| # | Supplier ID | Supplier Name | Industry Sector | FY2022-23 Workbook | FY2023-24 Workbook | Dataset Distribution |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| 1 | `SUP-001` | AxiomX Steel Suppliers | Steel | `PRELOAD_DATA/FY2022-23/AxiomX_Steel_FY2022-23.xlsx` | `MANUAL_UPLOAD_DATA/AxiomX_Steel_FY2023-24.xlsx` | 1 Preload + 1 Manual |
| 2 | `SUP-002` | AxiomX Rubber Suppliers | Rubber | `PRELOAD_DATA/FY2022-23/AxiomX_Rubber_FY2022-23.xlsx` | `PRELOAD_DATA/FY2023-24/AxiomX_Rubber_FY2023-24.xlsx` | 2 Preload |
| 3 | `SUP-003` | AxiomX Aluminium Suppliers | Aluminium | `PRELOAD_DATA/FY2022-23/AxiomX_Aluminium_FY2022-23.xlsx` | `PRELOAD_DATA/FY2023-24/AxiomX_Aluminium_FY2023-24.xlsx` | 2 Preload |
| 4 | `SUP-004` | AxiomX Cement Suppliers | Cement | `PRELOAD_DATA/FY2022-23/AxiomX_Cement_FY2022-23.xlsx` | `MANUAL_UPLOAD_DATA/AxiomX_Cement_FY2023-24.xlsx` | 1 Preload + 1 Manual |
| 5 | `SUP-005` | AxiomX Chemical Suppliers | Chemicals | `PRELOAD_DATA/FY2022-23/AxiomX_Chemical_FY2022-23.xlsx` | `MANUAL_UPLOAD_DATA/AxiomX_Chemical_FY2023-24.xlsx` | 1 Preload + 1 Manual |
| 6 | `SUP-006` | AxiomX Packaging Suppliers | Packaging | `PRELOAD_DATA/FY2022-23/AxiomX_Packaging_FY2022-23.xlsx` | `PRELOAD_DATA/FY2023-24/AxiomX_Packaging_FY2023-24.xlsx` | 2 Preload |
| 7 | `SUP-007` | AxiomX Textile Suppliers | Textiles | `PRELOAD_DATA/FY2022-23/AxiomX_Textile_FY2022-23.xlsx` | `PRELOAD_DATA/FY2023-24/AxiomX_Textile_FY2023-24.xlsx` | 2 Preload |
| 8 | `SUP-008` | AxiomX Glass Suppliers | Glass | `PRELOAD_DATA/FY2022-23/AxiomX_Glass_FY2022-23.xlsx` | `PRELOAD_DATA/FY2023-24/AxiomX_Glass_FY2023-24.xlsx` | 2 Preload |
| 9 | `SUP-009` | AxiomX Polymer Suppliers | Polymers | `PRELOAD_DATA/FY2022-23/AxiomX_Polymer_FY2022-23.xlsx` | `PRELOAD_DATA/FY2023-24/AxiomX_Polymer_FY2023-24.xlsx` | 2 Preload |
| 10 | `SUP-010` | AxiomX Machinery Suppliers | Machinery (Cat 2) | `PRELOAD_DATA/FY2022-23/AxiomX_Machinery_FY2022-23.xlsx` | `PRELOAD_DATA/FY2023-24/AxiomX_Machinery_FY2023-24.xlsx` | 2 Preload |

### B. Manual Upload Header Verification

The three manual demonstration files were verified to employ realistic alternative column headers for testing the Supplier Portal's spreadsheet upload and column mapping engine:
1. **`AxiomX_Steel_FY2023-24.xlsx`**:
   - `Grid Electricity Used (kWh)` -> Maps to Electricity (79,275,000.00 kWh)
   - `HSD for Generator (Litres)` -> Maps to Diesel (315,000.00 L)
   - `Finished Steel Output (Metric Tonnes)` -> Maps to Production (175,000.00 t)
   - `Iron Ore and Scrap Input (Metric Tonnes)` -> Maps to Raw Material (203,000.00 t)
2. **`AxiomX_Cement_FY2023-24.xlsx`**:
   - `Electrical Power Consumed (kWh)` -> Maps to Electricity (36,491,000.00 kWh)
   - `Diesel Consumed (L)` -> Maps to Diesel (270,000.00 L)
   - `Cement Produced (MT)` -> Maps to Production (455,000.00 t)
   - `Raw Mix and Additives Consumed (MT)` -> Maps to Raw Material (509,600.00 t)
3. **`AxiomX_Chemical_FY2023-24.xlsx`**:
   - `Total Electrical Energy (kWh)` -> Maps to Electricity (22,149,000.00 kWh)
   - `Diesel for Backup Generator (Litres)` -> Maps to Diesel (162,000.00 L)
   - `Chemical Production (Tonnes)` -> Maps to Production (53,500.00 t)
   - `Raw Material Feed (Tonnes)` -> Maps to Raw Material (75,435.00 t)

---

## 4. Final Sign-Off
All **14** validation checks have completed with **100% PASS** status. The synthetic dataset package is completely generated, validated, and ready for use.