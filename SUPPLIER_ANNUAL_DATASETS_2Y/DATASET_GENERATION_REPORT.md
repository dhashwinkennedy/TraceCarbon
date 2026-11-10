# Scope3Track — Two-Year Synthetic Supplier Dataset Generation Report

**Document Date**: November 9, 2026  
**Target Package**: `SUPPLIER_ANNUAL_DATASETS_2Y/`  
**Data Classification**: `SYNTHETIC DEMONSTRATION DATA — NOT ACTUAL COMPANY DISCLOSURES`  
**Statutory Financial Years**: **FY 2022-23 (1 April 2022 – 31 March 2023)** and **FY 2023-24 (1 April 2023 – 31 March 2024)**  

---

## 1. Executive Summary & Purpose

This engineering report documents the generation and assembly of the two-year synthetic supplier activity datasets for **Scope3Track**, a comprehensive supplier Scope 3 emissions estimation and monitoring platform.

The dataset has been assembled in a standalone root folder `SUPPLIER_ANNUAL_DATASETS_2Y` directly alongside `backend` and `frontend`. It provides an auditable, deterministic, and physically coherent baseline for all 10 fictional industrial suppliers across two consecutive Indian financial years.

### Key Constraints Adhered To
- **Strict Isolation**: Generated purely as local spreadsheet and document artifacts. Zero changes to backend code, frontend code, MongoDB database, or `.env` configuration.
- **17 + 3 Architecture**: 17 historical/preloaded workbooks in `PRELOAD_DATA/` and 3 live-upload demonstration workbooks in `MANUAL_UPLOAD_DATA/`.
- **Dual Financial Years**: FY2022-23 (Baseline) and FY2023-24 (Reporting Year).
- **Exact Numerical Harmony**: All individual workbooks and the consolidated master dataset agree 100% on their underlying activity values.

---

## 2. Supplier Profiles & Industrial Specifications

The 10 fictional suppliers span diverse industrial sectors representative of Indian manufacturing supply chains:

| Supplier ID | Supplier Name | Sector | Main Product | SKU | Scope 3 Category | Base Price (INR) | Plant Location |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SUP-001** | AxiomX Steel Suppliers | Steel | Hot-rolled steel coils | `ST-HR-001` | Category 1: Purchased Goods and Services | ₹55,000.00 | Vijayanagar Industrial Cluster, Karnataka |
| **SUP-002** | AxiomX Rubber Suppliers | Rubber | Industrial rubber sheets | `RB-TY-002` | Category 1: Purchased Goods and Services | ₹185,000.00 | Limda Industrial Area, Vadodara, Gujarat |
| **SUP-003** | AxiomX Aluminium Suppliers | Aluminium | Aluminium ingots | `AL-IN-003` | Category 1: Purchased Goods and Services | ₹230,000.00 | Renukoot Smelter Complex, Uttar Pradesh |
| **SUP-004** | AxiomX Cement Suppliers | Cement | PPC cement | `CM-PC-004` | Category 1: Purchased Goods and Services | ₹7,300.00 | Kotputli Clinker & Grinding Works, Rajasthan |
| **SUP-005** | AxiomX Chemical Suppliers | Chemicals | Soda ash | `CH-SA-005` | Category 1: Purchased Goods and Services | ₹28,500.00 | Mithapur Marine Chemical Complex, Gujarat |
| **SUP-006** | AxiomX Packaging Suppliers | Packaging | Corrugated packaging | `PK-BX-006` | Category 1: Purchased Goods and Services | ₹73,000.00 | Songadh Integrated Pulp & Paper Mill, Gujarat |
| **SUP-007** | AxiomX Textile Suppliers | Textiles | Industrial fabric | `TX-FC-007` | Category 1: Purchased Goods and Services | ₹285,000.00 | Santej Textile Processing Hub, Gujarat |
| **SUP-008** | AxiomX Glass Suppliers | Glass | Industrial glass sheets | `GL-SG-008` | Category 1: Purchased Goods and Services | ₹66,000.00 | Bawal Float Glass Industrial Park, Haryana |
| **SUP-009** | AxiomX Polymer Suppliers | Polymers | HDPE pipes | `PL-PP-009` | Category 1: Purchased Goods and Services | ₹127,000.00 | Jalgaon Polymer Extrusion Complex, Maharashtra |
| **SUP-010** | AxiomX Machinery Suppliers | Machinery | Industrial boilers | `MC-SG-010` | Category 2: Capital Goods | ₹15,000,000.00 | Haridwar Heavy Electrical & Boiler Complex, Uttarakhand |

---

## 3. Annual Activity Data & Physical Scale

Every supplier includes four mandatory physical activity metrics reported for each financial year:
1. **Purchased Electricity Consumption (kWh)**: Grid power consumed during production.
2. **Diesel Fuel Consumption (Litres)**: High-speed diesel (HSD) consumed in backup generators and mobile yard equipment.
3. **Finished Production Output (Tonnes)**: Total volume of finished commercial product produced.
4. **Raw Material Consumption (Tonnes)**: Total volume of raw material feed processed.

### Activity Summary Table (All 20 Records)

| Record ID | Supplier Name | FY | Electricity (kWh) | Diesel (L) | Production (t) | Raw Material (t) | Classification |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `ACT-2023-001` | AxiomX Steel Suppliers | FY2022-23 | 70,400,000 | 280,000 | 160,000 | 184,000 | Preload Dataset |
| `ACT-2023-002` | AxiomX Rubber Suppliers | FY2022-23 | 11,250,000 | 145,000 | 12,500 | 13,125 | Preload Dataset |
| `ACT-2023-003` | AxiomX Aluminium Suppliers | FY2022-23 | 49,920,000 | 210,000 | 26,000 | 28,080 | Preload Dataset |
| `ACT-2023-004` | AxiomX Cement Suppliers | FY2022-23 | 33,600,000 | 255,000 | 420,000 | 470,400 | Preload Dataset |
| `ACT-2023-005` | AxiomX Chemical Suppliers | FY2022-23 | 22,000,000 | 165,000 | 55,000 | 77,000 | Preload Dataset |
| `ACT-2023-006` | AxiomX Packaging Suppliers | FY2022-23 | 14,720,000 | 110,000 | 32,000 | 34,240 | Preload Dataset |
| `ACT-2023-007` | AxiomX Textile Suppliers | FY2022-23 | 21,600,000 | 160,000 | 16,000 | 17,440 | Preload Dataset |
| `ACT-2023-008` | AxiomX Glass Suppliers | FY2022-23 | 29,040,000 | 185,000 | 44,000 | 51,920 | Preload Dataset |
| `ACT-2023-009` | AxiomX Polymer Suppliers | FY2022-23 | 13,640,000 | 95,000 | 22,000 | 22,660 | Preload Dataset |
| `ACT-2023-010` | AxiomX Machinery Suppliers | FY2022-23 | 9,450,000 | 135,000 | 9,000 | 10,440 | Preload Dataset |
| `ACT-2024-001` | AxiomX Steel Suppliers | FY2023-24 | 79,275,000 | 315,000 | 175,000 | 203,000 | Manual Upload Dataset |
| `ACT-2024-002` | AxiomX Rubber Suppliers | FY2023-24 | 11,312,400 | 142,000 | 13,200 | 13,860 | Preload Dataset |
| `ACT-2024-003` | AxiomX Aluminium Suppliers | FY2023-24 | 53,680,000 | 225,000 | 27,500 | 29,700 | Preload Dataset |
| `ACT-2024-004` | AxiomX Cement Suppliers | FY2023-24 | 36,491,000 | 270,000 | 455,000 | 509,600 | Manual Upload Dataset |
| `ACT-2024-005` | AxiomX Chemical Suppliers | FY2023-24 | 22,149,000 | 162,000 | 53,500 | 75,435 | Manual Upload Dataset |
| `ACT-2024-006` | AxiomX Packaging Suppliers | FY2023-24 | 15,042,000 | 112,000 | 34,500 | 36,915 | Preload Dataset |
| `ACT-2024-007` | AxiomX Textile Suppliers | FY2023-24 | 21,964,000 | 158,000 | 17,000 | 18,530 | Preload Dataset |
| `ACT-2024-008` | AxiomX Glass Suppliers | FY2023-24 | 31,015,500 | 194,000 | 46,500 | 54,870 | Preload Dataset |
| `ACT-2024-009` | AxiomX Polymer Suppliers | FY2023-24 | 14,976,000 | 102,000 | 24,000 | 24,720 | Preload Dataset |
| `ACT-2024-010` | AxiomX Machinery Suppliers | FY2023-24 | 9,898,000 | 140,000 | 9,800 | 11,368 | Preload Dataset |

---

## 4. Statutory Emission Factors & Calculations

### A. Grid Electricity Emission Factors (Scope 2)
- **FY 2022-23**: `0.716 kg CO2 / kWh` (Source: Central Electricity Authority CO2 Baseline Database v19.0, Dec 2023).
- **FY 2023-24**: `0.727 kg CO2 / kWh` (Source: Central Electricity Authority CO2 Baseline Database v20.0, Dec 2024).

### B. Diesel Combustion Emission Factors (Scope 1)
- **High-Speed Diesel**: `2.68 kg CO2 / Litre` (Source: 2006 IPCC Guidelines for National GHG Inventories, Vol 2 Ch 2 Table 2.2).

### C. Emission Calculation Formulas
$$\text{Scope 1 (tCO}_2\text{e)} = \frac{\text{Diesel Consumption (L)} \times 2.68\text{ kg/L}}{1,000}$$
$$\text{Scope 2 (tCO}_2\text{e)} = \frac{\text{Electricity Consumption (kWh)} \times \text{Grid Factor (kg/kWh)}}{1,000}$$
$$\text{Total Operational GHG (tCO}_2\text{e)} = \text{Scope 1} + \text{Scope 2}$$
$$\text{Specific GHG Intensity (kg CO}_2\text{e/t)} = \frac{\text{Total Operational GHG (tCO}_2\text{e)} \times 1,000}{\text{Production Output (t)}}$$

### D. Calculated Emissions Ledger

| Calculation ID | Supplier Name | FY | Scope 1 (tCO2e) | Scope 2 (tCO2e) | Total GHG (tCO2e) | Intensity (kg/t) | YoY Change |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `CALC-2022-001` | AxiomX Steel Suppliers | FY2022-23 | 750.400 | 50,406.400 | 51,156.800 | 319.730 | Baseline |
| `CALC-2022-002` | AxiomX Rubber Suppliers | FY2022-23 | 388.600 | 8,055.000 | 8,443.600 | 675.488 | Baseline |
| `CALC-2022-003` | AxiomX Aluminium Suppliers | FY2022-23 | 562.800 | 35,742.720 | 36,305.520 | 1,396.366 | Baseline |
| `CALC-2022-004` | AxiomX Cement Suppliers | FY2022-23 | 683.400 | 24,057.600 | 24,741.000 | 58.907 | Baseline |
| `CALC-2022-005` | AxiomX Chemical Suppliers | FY2022-23 | 442.200 | 15,752.000 | 16,194.200 | 294.440 | Baseline |
| `CALC-2022-006` | AxiomX Packaging Suppliers | FY2022-23 | 294.800 | 10,539.520 | 10,834.320 | 338.572 | Baseline |
| `CALC-2022-007` | AxiomX Textile Suppliers | FY2022-23 | 428.800 | 15,465.600 | 15,894.400 | 993.400 | Baseline |
| `CALC-2022-008` | AxiomX Glass Suppliers | FY2022-23 | 495.800 | 20,792.640 | 21,288.440 | 483.828 | Baseline |
| `CALC-2022-009` | AxiomX Polymer Suppliers | FY2022-23 | 254.600 | 9,766.240 | 10,020.840 | 455.493 | Baseline |
| `CALC-2022-010` | AxiomX Machinery Suppliers | FY2022-23 | 361.800 | 6,766.200 | 7,128.000 | 792.000 | Baseline |
| `CALC-2023-001` | AxiomX Steel Suppliers | FY2023-24 | 844.200 | 57,632.925 | 58,477.125 | 334.155 | +4.51% |
| `CALC-2023-002` | AxiomX Rubber Suppliers | FY2023-24 | 380.560 | 8,224.115 | 8,604.675 | 651.869 | -3.50% |
| `CALC-2023-003` | AxiomX Aluminium Suppliers | FY2023-24 | 603.000 | 39,025.360 | 39,628.360 | 1,441.031 | +3.20% |
| `CALC-2023-004` | AxiomX Cement Suppliers | FY2023-24 | 723.600 | 26,528.957 | 27,252.557 | 59.896 | +1.68% |
| `CALC-2023-005` | AxiomX Chemical Suppliers | FY2023-24 | 434.160 | 16,102.323 | 16,536.483 | 309.093 | +4.98% |
| `CALC-2023-006` | AxiomX Packaging Suppliers | FY2023-24 | 300.160 | 10,935.534 | 11,235.694 | 325.672 | -3.81% |
| `CALC-2023-007` | AxiomX Textile Suppliers | FY2023-24 | 423.440 | 15,967.828 | 16,391.268 | 964.192 | -2.94% |
| `CALC-2023-008` | AxiomX Glass Suppliers | FY2023-24 | 519.920 | 22,548.268 | 23,068.188 | 496.090 | +2.53% |
| `CALC-2023-009` | AxiomX Polymer Suppliers | FY2023-24 | 273.360 | 10,887.552 | 11,160.912 | 465.038 | +2.10% |
| `CALC-2023-010` | AxiomX Machinery Suppliers | FY2023-24 | 375.200 | 7,195.846 | 7,571.046 | 772.556 | -2.46% |

---

## 5. Folder Hierarchy & File Manifest

```text
SUPPLIER_ANNUAL_DATASETS_2Y/
│
├── README.md
├── DATASET_GENERATION_REPORT.md
├── DATA_VALIDATION_REPORT.md
│
├── MASTER_DATASET/
│   ├── MASTER_SUPPLIER_ANNUAL_DATASET_2Y.xlsx    # 6 comprehensive sheets
│   ├── MASTER_SUPPLIER_ANNUAL_DATASET_2Y.csv     # 20 flat activity records
│   └── DATA_DICTIONARY.xlsx                      # Entities & Field Specifications
│
├── PRELOAD_DATA/
│   ├── FY2022-23/
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
│   └── FY2023-24/
│       ├── AxiomX_Rubber_FY2023-24.xlsx
│       ├── AxiomX_Aluminium_FY2023-24.xlsx
│       ├── AxiomX_Packaging_FY2023-24.xlsx
│       ├── AxiomX_Textile_FY2023-24.xlsx
│       ├── AxiomX_Glass_FY2023-24.xlsx
│       ├── AxiomX_Polymer_FY2023-24.xlsx
│       └── AxiomX_Machinery_FY2023-24.xlsx
│
└── MANUAL_UPLOAD_DATA/
    ├── AxiomX_Steel_FY2023-24.xlsx               # Custom headers for column mapping
    ├── AxiomX_Cement_FY2023-24.xlsx              # Custom headers for column mapping
    └── AxiomX_Chemical_FY2023-24.xlsx            # Custom headers for column mapping
```

---

## 6. Conclusion
The `SUPPLIER_ANNUAL_DATASETS_2Y` directory represents a complete, auditable, and self-contained synthetic data repository ready for demonstration and regression testing.