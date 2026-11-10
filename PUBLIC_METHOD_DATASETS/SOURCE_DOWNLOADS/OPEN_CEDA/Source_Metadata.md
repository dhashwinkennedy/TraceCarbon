# Open CEDA by Watershed — Source Metadata and Technical Documentation

## 1. Dataset Overview & Statutory Citation
- **Dataset Title**: Comprehensive Environmental Data Archive — Open Edition (Open CEDA)
- **Publisher / Author**: Watershed Technology, Inc.
- **Official Public Dataset Registry**: [AWS Open Data Registry — Open CEDA](https://registry.opendata.aws/open-ceda/)
- **Public S3 Bucket**: `s3://open-ceda/` (Public read access via `--no-sign-request`)
- **Direct S3 Explorer**: [https://open-ceda.s3.amazonaws.com/index.html](https://open-ceda.s3.amazonaws.com/index.html)
- **Licensing**: Creative Commons Attribution-ShareAlike 4.0 International ([CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/))
- **Mandatory Attribution**: "CEDA by Watershed"

---

## 2. Edition Comparison & Vintage Selection

| Metric / Parameter | Open CEDA 2024 Edition | Open CEDA 2025 Edition |
| :--- | :--- | :--- |
| **Original File Name** | `Open CEDA 2024 by Watershed.xlsx` | `Open CEDA 2025 by Watershed.xlsx` |
| **Download Source** | `https://open-ceda.s3.amazonaws.com/data/Open%20CEDA%202024%20by%20Watershed.xlsx` | `https://open-ceda.s3.amazonaws.com/data/Open%20CEDA%202025%20by%20Watershed.xlsx` |
| **File Size** | 1,104,164 bytes (1.10 MB) | 4,704,329 bytes (4.70 MB) |
| **Release Date** | May 22, 2025 | November 11, 2025 |
| **Base Economic Year** | **2022** (Pre-adjusted to 2022 US Dollars) | **2023** (Raw factors in 2023 US Dollars) |
| **Target Reporting Year** | **FY 2022-23** (1 April 2022 – 31 March 2023) | **FY 2023-24** (1 April 2023 – 31 March 2024) |
| **Economic Resolution** | 401 distinct commodity/industry sectors | 400 distinct commodity/industry sectors |
| **Geographic Resolution** | 148 countries + 1 Rest of World (149 rows) | 148 countries + regional aggregates |
| **Price Basis** | Producer price (gate price excl. retail margins) | Producer price (with purchaser price converter) |
| **Currency Basis** | US Dollar (`kgCO2e / US Dollar`) | US Dollar (`kgCO2e / US Dollar` in `GHG_t_Raw`) |
| **India (`IND`) Row** | Row 90 in `Open CEDA` sheet | Row 66 in `GHG_t_Raw` sheet |

---

## 3. Methodological Alignment & Price-Basis Rationale
1. **Producer Price vs. Purchaser Price**:
   - The primary emission factors in Open CEDA are denominated in **Producer Price** (`kg CO2e / USD`).
   - Manufacturer purchase expenditure in ABC Manufacturing's procurement records represents direct commercial purchase orders (invoice value excluding end-user GST and post-procurement retail markups), which directly corresponds to the **Producer Price** standard.
2. **Currency Conversion Logic**:
   - Primary Open CEDA factors are denominated in `kg CO2e / USD`.
   - To apply against procurement records denominated in Indian Rupees (INR):
     $$\text{Expenditure (USD)} = \frac{\text{Purchase Expenditure (INR)}}{\text{Exchange Rate (INR/USD)}}$$
     $$\text{Spend-Based Emissions (kg CO}_2\text{e)} = \text{Expenditure (USD)} \times \text{Open CEDA Factor (kg CO}_2\text{e/USD)}$$
   - Alternatively expressed as an effective domestic factor:
     $$\text{Spend Factor (kg CO}_2\text{e/INR)} = \frac{\text{Open CEDA Factor (kg CO}_2\text{e/USD)}}{\text{Exchange Rate (INR/USD)}}$$

3. **Exchange Rates Applied**:
   - **Open CEDA Embedded Rates** (Source: Openexchangerates.org):
     - 2022: **78.186 INR/USD**
     - 2023: **82.481 INR/USD**
   - **Reserve Bank of India (RBI) Statutory Financial Year Rates**:
     - FY 2022-23 (1 April 2022 – 31 March 2023): **80.390 INR/USD**
     - FY 2023-24 (1 April 2023 – 31 March 2024): **82.800 INR/USD**

---

## 4. India (`IND`) Sector Codes for AxiomX Products

| Supplier Code | AxiomX Supplier Name | Product Name | Open CEDA Sector Code | Sector Description | 2022 Factor (CEDA 2024) | 2023 Factor (CEDA 2025) | Unit |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SUP-001** | AxiomX Steel Suppliers | Hot-rolled steel coils | `331110` | Iron and steel mills and ferroalloy manufacturing | 5.189019 | 5.976869 | kg CO2e / USD |
| **SUP-002** | AxiomX Rubber Suppliers | Industrial rubber sheets | `326290` | Other rubber product manufacturing | 1.707897 | 1.575139 | kg CO2e / USD |
| **SUP-003** | AxiomX Aluminium Suppliers | Aluminium ingots | `331313` | Alumina refining and primary aluminum production | 2.710521 | 2.525320 | kg CO2e / USD |
| **SUP-004** | AxiomX Cement Suppliers | PPC cement | `327310` | Cement manufacturing | 10.498445 | 9.321503 | kg CO2e / USD |
| **SUP-005** | AxiomX Chemical Suppliers | Soda ash | `325180` | Other Basic Inorganic Chemical Manufacturing | 1.046134 | 0.994175 | kg CO2e / USD |
| **SUP-006** | AxiomX Packaging Suppliers | Corrugated packaging | `322210` | Paperboard container manufacturing | 1.189885 | 1.127227 | kg CO2e / USD |
| **SUP-007** | AxiomX Textile Suppliers | Industrial fabric | `313200` | Fabric mills | 0.924629 | 0.832374 | kg CO2e / USD |
| **SUP-008** | AxiomX Glass Suppliers | Industrial glass sheets | `327200` | Glass and glass product manufacturing | 1.254113 | 1.150881 | kg CO2e / USD |
| **SUP-009** | AxiomX Polymer Suppliers | HDPE pipes | `326120` | Plastics pipe, pipe fitting manufacturing | 1.067384 | 0.977843 | kg CO2e / USD |
| **SUP-010** | AxiomX Machinery Suppliers | Industrial boilers | `332410` | Power boiler and heat exchanger manufacturing | 1.311412 | 1.168301 | kg CO2e / USD |

---

## 5. Scope and Limitations
- **Macro-Economic Averages**: Spend-based EEIO factors reflect sector-wide, national macroeconomic input-output structures and include broad tier-N upstream supply chain inputs.
- **Top-Down Screening**: Under the GHG Protocol Scope 3 Standard, spend-based accounting is recognized as a Tier 3 screening methodology. It should be used to prioritize high-expenditure categories or where primary supplier data is unavailable.
- **Non-Conflation**: Spend-based estimates must never be added to physical product-factor or activity-based estimates for the same purchase record.
