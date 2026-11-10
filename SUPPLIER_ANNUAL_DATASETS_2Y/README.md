# Scope3Track — Two-Year Synthetic Supplier Annual Datasets (FY2022-23 & FY2023-24)

> **CLASSIFICATION**: `SYNTHETIC DEMONSTRATION DATA — NOT ACTUAL COMPANY DISCLOSURES`

This directory contains the complete synthetic annual supplier dataset package for **Scope3Track**, covering 10 fictional Indian industrial suppliers across two consecutive financial years.

---

## Directory Structure

```text
SUPPLIER_ANNUAL_DATASETS_2Y/
│
├── README.md                      # Overview and instructions (this file)
├── DATASET_GENERATION_REPORT.md   # Complete engineering & mathematical report
├── DATA_VALIDATION_REPORT.md      # Automated validation audit matrix (14 checks, 100% PASS)
│
├── MASTER_DATASET/                # Consolidated master files
│   ├── MASTER_SUPPLIER_ANNUAL_DATASET_2Y.xlsx    # Master workbook with 6 sheets
│   ├── MASTER_SUPPLIER_ANNUAL_DATASET_2Y.csv     # Flat CSV of all 20 records
│   └── DATA_DICTIONARY.xlsx                      # Entities & Field Specifications
│
├── PRELOAD_DATA/                  # 17 historical / baseline workbooks
│   ├── FY2022-23/                 # 10 workbooks (all 10 suppliers baseline)
│   │   ├── AxiomX_Steel_FY2022-23.xlsx
│   │   ├── AxiomX_Rubber_FY2022-23.xlsx
│   │   ├── AxiomX_Aluminium_FY2022-23.xlsx
│   │   ├── AxiomX_Cement_FY2022-23.xlsx
│   │   ├── AxiomX_Chemical_FY2022-23.xlsx
│   │   ├── AxiomX_Packaging_FY2022-23.xlsx
│   │   ├── AxiomX_Textile_FY2022-23.xlsx
│   │   ├── AxiomX_Glass_FY2022-23.xlsx
│   │   ├── AxiomX_Polymer_FY2022-23.xlsx
│   │   └── AxiomX_Machinery_FY2022-23.xlsx
│   │
│   └── FY2023-24/                 # 7 workbooks (non-demo suppliers)
│       ├── AxiomX_Rubber_FY2023-24.xlsx
│       ├── AxiomX_Aluminium_FY2023-24.xlsx
│       ├── AxiomX_Packaging_FY2023-24.xlsx
│       ├── AxiomX_Textile_FY2023-24.xlsx
│       ├── AxiomX_Glass_FY2023-24.xlsx
│       ├── AxiomX_Polymer_FY2023-24.xlsx
│       └── AxiomX_Machinery_FY2023-24.xlsx
│
└── MANUAL_UPLOAD_DATA/            # 3 workbooks for live demonstration
    ├── AxiomX_Steel_FY2023-24.xlsx               # Custom headers for Steel
    ├── AxiomX_Cement_FY2023-24.xlsx              # Custom headers for Cement
    └── AxiomX_Chemical_FY2023-24.xlsx            # Custom headers for Chemical
```

---

## Key Details

### 1. The 17 + 3 Dataset Distribution
- **PRELOAD_DATA (17 files)**: Pre-configured historical baseline data (FY2022-23 for all 10 suppliers, and FY2023-24 for the 7 non-manual suppliers).
- **MANUAL_UPLOAD_DATA (3 files)**: FY2023-24 workbooks for Steel, Cement, and Chemical. These files use realistic alternative column headers to test the Supplier Portal's spreadsheet upload and column mapping workflows.

### 2. Statutory Emission Factors Used
- **Electricity (Scope 2)**: CEA CO2 Baseline Database v19.0 (`0.716 kg/kWh` for FY23) and v20.0 (`0.727 kg/kWh` for FY24).
- **Diesel (Scope 1)**: 2006 IPCC Guidelines for National GHG Inventories (`2.68 kg/L`).

### 3. Usage & Safety Rules
- This directory is standalone and strictly decoupled from the runtime application.
- Do NOT modify backend or frontend code to reference these files directly unless explicitly directed.
- Do NOT alter existing MongoDB databases or `.env` configuration.