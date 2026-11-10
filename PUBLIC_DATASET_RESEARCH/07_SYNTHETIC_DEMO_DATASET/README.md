# Scope3Track — Synthetic Industrial Demonstration Dataset Package (Phase 1)

> [!IMPORTANT]
> **DATA CLASSIFICATION NOTICE**:  
> `SYNTHETIC DEMONSTRATION DATA — NOT ACTUAL COMPANY DISCLOSURES`  
> Informed by publicly available industrial benchmarks in `PUBLIC_DATASET_RESEARCH/`. Not actual company disclosures.

---

## 1. Directory Structure

```text
07_SYNTHETIC_DEMO_DATASET/
│
├── README.md                              # Master dataset directory index & guide
├── SYNTHETIC_DATA_GENERATION_REPORT.md    # Methodology, sector profiles, and calculations
├── DATA_DICTIONARY.xlsx                   # Entity definitions, field specifications, and code lists
├── DATA_VALIDATION_REPORT.md              # 12-point automated verification audit report
│
├── 01_MASTER_DATA/                        # Complete 20-record master reference datasets
│   ├── Supplier_Master.xlsx               # 10 fictional industrial suppliers
│   ├── Product_Catalog.xlsx               # 10 demonstration product SKUs and benchmark intensities
│   ├── Annual_Supplier_Activities.xlsx    # Master 20 annual activity records (FY23 & FY24)
│   ├── Annual_Supplier_Activities.csv     # Plaintext CSV export of annual activities
│   ├── Synthetic_Emission_Factors.xlsx    # CEA, IPCC, and plant-specific synthetic emission factors
│   ├── Calculated_Emissions.xlsx          # Scope 1, Scope 2, Total GHG, and intensity ledger
│   ├── Manufacturer_Purchases.xlsx        # 20 procurement transactions for ABC Manufacturing
│   └── Dataset_Provenance.xlsx            # Exhaustive line-by-line provenance audit trail
│
├── 02_PRELOAD_DATA/                       # Historical preload package (17 records)
│   ├── FY2022-23/                         # 10 historical records for all suppliers
│   │   ├── Supplier_Activities_FY2022-23.xlsx
│   │   └── Supplier_Activities_FY2022-23.csv
│   └── FY2023-24/                         # 7 historical records for non-demonstration suppliers
│       ├── Supplier_Activities_FY2023-24.xlsx
│       └── Supplier_Activities_FY2023-24.csv
│
└── 03_MANUAL_UPLOAD_FILES/                # Reserved for Phase 2 manual demonstration (3 workbooks)
    ├── AxiomX_Steel_FY2023-24.xlsx        # Supplier 1 (Steel) FY24 activity workbook
    ├── AxiomX_Cement_FY2023-24.xlsx       # Supplier 4 (Cement) FY24 activity workbook
    ├── AxiomX_Chemical_FY2023-24.xlsx     # Supplier 5 (Chemicals) FY24 activity workbook
    └── MANUAL_UPLOAD_INSTRUCTIONS.md      # Walkthrough for Phase 2 hackathon demonstration
```

---

## 2. Summary of Synthetic Industrial Suppliers

| Supplier ID | Supplier Name | Industry Sector | Representative Product | Scope 3 Category | FY23 Footprint | FY24 Footprint | FY24 Data Channel |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SUP-001** | AxiomX Steel Suppliers | Steel | Hot-rolled steel coils | Category 1 | 319.73 kg/t | 334.16 kg/t | **Manual Demo Upload** |
| **SUP-002** | AxiomX Rubber Suppliers | Rubber | Industrial rubber sheets | Category 1 | 675.49 kg/t | 651.87 kg/t | Preloaded Historical |
| **SUP-003** | AxiomX Aluminium Suppliers | Aluminium | Aluminium ingots | Category 1 | 1,396.37 kg/t | 1,441.03 kg/t | Preloaded Historical |
| **SUP-004** | AxiomX Cement Suppliers | Cement | PPC cement | Category 1 | 58.91 kg/t | 59.90 kg/t | **Manual Demo Upload** |
| **SUP-005** | AxiomX Chemical Suppliers | Chemicals | Soda ash | Category 1 | 294.44 kg/t | 309.09 kg/t | **Manual Demo Upload** |
| **SUP-006** | AxiomX Packaging Suppliers | Packaging | Corrugated packaging | Category 1 | 338.57 kg/t | 325.67 kg/t | Preloaded Historical |
| **SUP-007** | AxiomX Textile Suppliers | Textiles | Industrial fabric | Category 1 | 993.40 kg/t | 964.19 kg/t | Preloaded Historical |
| **SUP-008** | AxiomX Glass Suppliers | Glass | Industrial glass sheets | Category 1 | 483.83 kg/t | 496.09 kg/t | Preloaded Historical |
| **SUP-009** | AxiomX Polymer Suppliers | Polymers | HDPE pipes | Category 1 | 455.49 kg/t | 465.04 kg/t | Preloaded Historical |
| **SUP-010** | AxiomX Machinery Suppliers | Machinery | Industrial boilers | **Category 2** | 792.00 kg/t | 772.56 kg/t | Preloaded Historical |

---

## 3. Strict Phase 1 Boundary Statement
- **Phase 1 Status**: Generation, assembly, and local validation are **100% COMPLETE**.
- **Phase 2 Status**: Prototype integration is **NOT STARTED** and awaits separate user authorization.
- Zero changes made to `backend/`, `frontend/`, MongoDB databases, or `.env`.