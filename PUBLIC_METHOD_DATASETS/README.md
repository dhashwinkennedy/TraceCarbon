# Scope3Track — Public Method Datasets Package
## Reconciled Reference Datasets, Emission Factors, and Provenance Audit for Activity-Based and Spend-Based Scope 3 Accounting

> **CRITICAL ARCHITECTURAL BOUNDARY: RESEARCH & DATASET PREPARATION PHASE ONLY**  
> This package represents Phase 1 research, source download, factor extraction, mathematical verification, and audit trail preparation.  
> The live Scope3Track application, backend code, frontend build, MongoDB database, root `.env`, and existing Product-Factor calculations (`2,692.86 t CO₂e`) remain 100% untouched.

---

## 1. Directory Structure

```text
PUBLIC_METHOD_DATASETS/
│
├── README.md                                # Package overview and usage guide (this file)
├── CORRECTIONS_AND_RECONCILIATION_LOG.md    # Master reconciliation log detailing all corrected values & invalid records
├── DATASET_RESEARCH_REPORT.md               # Comprehensive 16-point research and methodology report
├── DATA_PROVENANCE_REGISTER.xlsx            # Master spreadsheet tracking all factors, equations, sources & URLs
├── DATA_VALIDATION_REPORT.md                # Mathematical, thermodynamic, and anti-double-counting verification
├── SOURCE_LICENSES_AND_ATTRIBUTION.md       # Legal licenses, CC BY-SA 4.0 terms & Watershed attribution notices
│
├── SOURCE_DOWNLOADS/                        # Original downloaded reference files & metadata
│   ├── CEA/
│   │   ├── Original_CEA_Database.xlsx       # CEA CO2 Baseline Database v22.0 official time series (1.01 MB)
│   │   └── CEA_User_Guide.pdf               # Official CEA User Guide v22.0 (835 KB)
│   ├── IPCC/
│   │   ├── IPCC_2006_Stationary_Combustion.pdf  # 2006 IPCC Guidelines Vol 2 Ch 2 (756 KB)
│   │   ├── IPCC_2019_Refinement_Stationary_Combustion.pdf # 2019 Refinement Vol 2 Ch 2 (42 KB)
│   │   └── Relevant_Source_Tables.xlsx      # Extracted Table 1.2 (NCVs) & Table 2.3 (Combustion EFs)
│   ├── OPEN_CEDA/
│   │   ├── Open_CEDA_2024_Original.xlsx     # Open CEDA 2024 Base Year 2022 (1.10 MB)
│   │   ├── Open_CEDA_2025_Original.xlsx     # Open CEDA 2025 Base Year 2023 (4.70 MB)
│   │   └── Source_Metadata.md               # AWS Open Data metadata, release dates, and license terms
│   └── CORNERSTONE_OPTIONAL/
│       ├── Cornerstone_EEIO_2026_RC_Original.xlsx # Zenodo DOI 10.5281/zenodo.23396891 (34.28 MB)
│       └── Source_Metadata.md               # Evaluation notes as future comparative benchmark
│
├── ACTIVITY_BASED/                          # Reconciled Activity-Based calculation workbooks
│   ├── Activity_Factor_Register.xlsx        # CEA grid factors and IPCC diesel combustion factors
│   ├── Supplier_Annual_Energy_Emissions.xlsx# Scope 1 diesel and Scope 2 electricity for all 10 suppliers
│   ├── Supplier_Emissions_Per_Tonne.xlsx    # Specific energy intensity (kg CO2e/t) and eligibility audit
│   ├── ABC_Purchase_Allocation.xlsx         # Activity allocation across all 20 ABC Manufacturing purchases
│   └── Activity_Based_Calculation_Receipts.xlsx # Cryptographic calculation receipts with SHA-256 hashes
│
├── SPEND_BASED/                             # Reconciled Spend-Based calculation workbooks
│   ├── India_Sector_Factor_Register.xlsx    # Open CEDA EEIO factors for 10 Indian manufacturing sectors
│   ├── AxiomX_Sector_Mapping.xlsx           # NAICS sector mapping, rationales, and confidence ratings
│   ├── Currency_Exchange_Rates.xlsx         # Open CEDA embedded FX vs RBI reference rates & sensitivity
│   ├── Spend_Based_Purchase_Calculations.xlsx # Spend-based calculations for all 20 purchases
│   └── Spend_Based_Calculation_Receipts.xlsx # Cryptographic calculation receipts with SHA-256 hashes
│
└── COMBINED_DEMO/                           # Reconciled multi-method cross-comparison & assignment plan
    ├── CALCULATION_METHOD_DEMO_MASTER.xlsx  # Side-by-side comparison of all 3 methods for all 20 purchases
    ├── CALCULATION_METHOD_DEMO_MASTER.csv   # Standard CSV format of master comparison ledger
    └── PROPOSED_METHOD_ASSIGNMENT_PLAN.xlsx # 12 Product / 4 Activity / 4 Spend demonstration plan
```

---

## 2. Key Factor & Parameter Summary

### 2.1 Activity-Based Factors
- **Grid Electricity (Central Electricity Authority, Ministry of Power, GoI):**
  - FY 2022–23 (Version 19.0): `0.716 kg CO₂ / kWh` (`0.716 t CO₂ / MWh`) — Weighted-average Indian national grid factor including renewable energy and captive power injection into the grid.
  - FY 2023–24 (Version 20.0): `0.727 kg CO₂ / kWh` (`0.727 t CO₂ / MWh`) — Weighted-average Indian national grid factor including renewable energy and captive power injection into the grid.
  - Retrospective Time Series (Version 22.0): Disclosed separately as `0.7191 kg CO₂ / kWh` (FY22) and `0.7289 kg CO₂ / kWh` (FY23).
- **Stationary Diesel Fuel (IPCC & BIS IS 1460:2017 Sixth Revision):**
  - Selected Density: `0.840 kg / L` (selected assumption within referenced specification range $0.820–0.845\text{ kg/L}$; not an empirical statistical median).
  - Net Calorific Value: `43.0 MJ / kg` (IPCC Vol 2 Ch 1 Table 1.2).
  - Manufacturing Combustion Factors: `74,100 kg CO₂/TJ`, `3.0 kg CH₄/TJ`, `0.6 kg N₂O/TJ`.
  - Effective Factor (IPCC AR5 100-yr GWP): **`2.6853 kg CO₂e / litre`** ($2.685269\text{ kg/L}$).
- **Mandatory Boundary Label:** `Supplier-specific energy activity allocation estimate — synthetic demonstration data` (facility diesel + electricity only; excludes process emissions and upstream supply chain).
- **Ineligible Records Explicitly Documented:**
  - `PO-2023-009` (Polymer FY23): `NOT_ELIGIBLE_FOR_ACTIVITY_ALLOCATION` (purchased qty 250 t exceeds denominator 240 t; allocation fraction 1.0417 is invalid).
  - `PO-2022-010` & `PO-2023-010` (Boilers Cat 2): `NOT_APPLICABLE — INCOMPATIBLE ALLOCATION UNITS` (purchase in units vs production in tonnes).

### 2.2 Spend-Based Factors (Open CEDA by Watershed)
- **Model:** Open CEDA (CC BY-SA 4.0; mandatory attribution: `"CEDA by Watershed"`).
- **Price Type:** Producer Price (`kg CO2e / USD`). Procurement expenditures assumed factory-gate equivalent.
- **Embedded Currency Rates:**
  - CY2022 Proxy (FY22-23): `78.186062 INR / USD`
  - CY2023 Proxy (FY23-24): `82.481132 INR / USD`
- **Official RBI Table 133 Annual Average Rates (Sensitivity):**
  - FY 2022–23: `80.3635 INR / USD` ($-2.71\%$ delta)
  - FY 2023–24: `82.7897 INR / USD` ($-0.37\%$ delta)
- **Indian Manufacturing Sector Factors (Open CEDA):**
  - Steel (`331110`): `5.1890 kg CO₂e/USD` (CY22) / `5.9769 kg CO₂e/USD` (CY23)
  - Rubber (`326290`): `1.7079 kg CO₂e/USD` (CY22) / `1.5751 kg CO₂e/USD` (CY23)
  - Aluminium (`331313`): `2.7105 kg CO₂e/USD` (CY22) / `2.5253 kg CO₂e/USD` (CY23)
  - Cement (`327310`): `10.4984 kg CO₂e/USD` (CY22) / `9.3215 kg CO₂e/USD` (CY23)
  - Chemicals (`325180`): `1.0461 kg CO₂e/USD` (CY22) / `0.9942 kg CO₂e/USD` (CY23)
  - Packaging (`322210`): `1.1899 kg CO₂e/USD` (CY22) / `1.1272 kg CO₂e/USD` (CY23)
  - Textiles (`313200`): `0.9246 kg CO₂e/USD` (CY22) / `0.8324 kg CO₂e/USD` (CY23)
  - Glass (`327200`): `1.2541 kg CO₂e/USD` (CY22) / `1.1509 kg CO₂e/USD` (CY23)
  - Plastics (`326120`): `1.0674 kg CO₂e/USD` (CY22) / `0.9778 kg CO₂e/USD` (CY23)
  - Boilers / Machinery (`332410`): `1.3114 kg CO₂e/USD` (CY22) / `1.1683 kg CO₂e/USD` (CY23)

---

## 3. Reconciled Portfolio Totals & Demonstration Plan

### 3.1 All 20 Purchases Evaluated Under Each Method
- **Product-Factor Baseline:** Category 1: `2,688.90 t`, Category 2: `3.96 t`, Total: **`2,692.86 t CO₂e`** (`2,692.8635 t`)
- **Valid Activity-Based (17 Valid):** Category 1: `2,606.07 t`, Category 2: *Incompatible Units*, Total: **`2,606.07 t CO₂e`** (`2,606.0744 t`)
- **Spend-Based Alternative:** Category 1: `20,322.59 t`, Category 2: `1,161.84 t`, Total: **`21,484.42 t CO₂e`** (`21,484.4225 t`)

### 3.2 Reconciled Demonstration Plan (Zero Double-Counting)
In `COMBINED_DEMO/PROPOSED_METHOD_ASSIGNMENT_PLAN.xlsx`, the ineligible Activity-Based record `PO-2023-009` is replaced with eligible Category 1 purchase `PO-2023-005` (Soda ash: $400\text{ t} / 53,500\text{ t} = 0.7477\%$, compatible units):
- **12 purchases assigned to Product-Factor:** `1,943.46 t CO₂e` (`1,943.4599 t`)
- **4 purchases assigned to Activity-Based:** `415.13 t CO₂e` (`415.1336 t`; Glass & Polymer in FY22; Chemical & Glass in FY23)
- **4 purchases assigned to Spend-Based:** `1,066.96 t CO₂e` (`1,066.9598 t`; Packaging & Textiles across FY22 & FY23)
- **Total Portfolio Active Scope 3:** **`3,425.55 t CO₂e`** (`3,425.5534 t`, exactly 1 active method per purchase)

---

## 4. Instructions for Phase 2 Integration

When the engineering team is authorized to proceed to Phase 2:
1. Seed `emission_factors` collection with the validated CEA, IPCC, and Open CEDA factors documented in `DATA_PROVENANCE_REGISTER.xlsx`.
2. Implement calculation endpoints for `POST /api/calculations/activity` and `POST /api/calculations/spend`.
3. Preserve the single-active-calculation invariant (`{purchase_record_id: ..., is_active: True}`).
4. Ensure all dashboard cards display standardized units in **`t CO₂e`** and show `'Not used'` when zero active calculations exist for a method.
