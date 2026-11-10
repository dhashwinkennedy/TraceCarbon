# Emission Factor Source Audit & Methodological Harmonization

## 1. Central Electricity Authority (CEA) Grid Database
The **Central Electricity Authority (CEA)** under the Ministry of Power, Government of India, compiles official annual carbon dioxide emission baselines across all grid-connected generating stations.

### Statutory Factors (Verified from Official Reports)
- **Database Version 20.0 (December 2024)**:
  - **Applicable Reporting Year**: **FY 2023-24** (1 April 2023 – 31 March 2024).
  - **National Weighted Average Factor (incl. RES)**: **0.727 tCO2 / MWh** (equivalent to **0.727 kg CO2 / kWh**).
  - **Operating Margin (OM)**: **0.962 tCO2 / MWh**.
  - **Build Margin (BM)**: **0.552 tCO2 / MWh**.
  - **Combined Margin (CM 50:50)**: **0.757 tCO2 / MWh**.
  - *Reference*: `cea_user_guide_v20.pdf`, Page 15, Table 1.

- **Database Version 19.0 (December 2023)**:
  - **Applicable Reporting Year**: **FY 2022-23** (1 April 2022 – 31 March 2023).
  - **National Weighted Average Factor (incl. RES)**: **0.716 tCO2 / MWh** (equivalent to **0.716 kg CO2 / kWh**).
  - **Thermal Weighted Average Factor**: **0.823 tCO2 / MWh**.
  - **Operating Margin (OM)**: **0.971 tCO2 / MWh**.
  - **Build Margin (BM)**: **0.867 tCO2 / MWh**.
  - **Combined Margin (CM 50:50)**: **0.919 tCO2 / MWh**.
  - *Reference*: `cea_user_guide_v19.pdf`, Page 20, Table 1.

### Mathematical Formulation in Scope3Track
For any supplier monthly report with purchased grid electricity:
$$\text{Scope 2 GHG (tCO}_2\text{e)} = \text{Purchased Grid Electricity (MWh)} \times \text{CEA Grid Factor (tCO}_2/\text{MWh)}$$

---

## 2. 2006 IPCC Stationary Combustion Fuel Factors
The **Intergovernmental Panel on Climate Change (IPCC) Guidelines for National Greenhouse Gas Inventories (Volume 2: Energy, Chapter 2)** provides international standard Net Calorific Values (NCVs) and default emission factors:

| Fuel Name | Net Calorific Value (NCV) | IPCC Default EF (kg CO2 / TJ) | Standardized EF (kg CO2 / GJ) | Derived Physical Factor | Conversion Assumptions & Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **High Speed Diesel (HSD)** | 43.0 GJ / tonne | 74,100 | 74.10 | **2.68 kg CO2 / Litre** | Assumes density 0.84 kg/L and NCV 43.0 GJ/t |
| **Furnace Oil (HFO)** | 40.4 GJ / tonne | 77,400 | 77.40 | **3.13 kg CO2 / Litre** | Assumes density 1.00 kg/L and NCV 40.4 GJ/t |
| **Natural Gas** | 48.0 GJ / tonne | 56,100 | 56.10 | **2.13 kg CO2 / SCM** | Assumes standard gas density and NCV 37.4 MJ/SCM |
| **Indian Non-Coking Coal** | 16.5 GJ / tonne | 96,100 | 96.10 | **1,585.65 kg CO2 / MT** | Assumes Indian Coal Grade G9-G11 |
| **LPG** | 47.3 GJ / tonne | 63,100 | 63.10 | **2.98 kg CO2 / kg** | Assumes NCV 47.3 GJ/t |
| **Solid Biomass** | 15.6 GJ / tonne | 112,000 | 112.00 | **1,747.20 kg CO2 / MT** | Biogenic CO2 memo item |

> [!IMPORTANT]
> **Primary Energy Factors vs Derived Physical Estimates**: The primary statutory standard in IPCC guidelines is strictly energy-based (expressed in $\text{kg CO}_2/\text{TJ}$). Physical metrics (per Litre, per SCM) are derived secondary calculations requiring fuel density and net calorific value assumptions.

---

## 3. Cornerstone EEIO Spend-Based Model
The **Cornerstone Environmentally Extended Input-Output Model** (Release candidate `2026-rc`, Zenodo DOI: [10.5281/zenodo.23396891](https://doi.org/10.5281/zenodo.23396891)) provides spend-based greenhouse gas intensity metrics for 405 sectors.

### Correction of Unverified Deflators
In draft research files, ad-hoc domestic purchasing-power deflators were provisionally introduced without official citation. In accordance with empirical audit guidelines, all unverified deflators have been eliminated.
Spend-based emission factors are converted to Indian Rupees (INR) using direct annual average exchange rates published by the Reserve Bank of India (RBI):
- **FY 2023-24 Average Market Exchange Rate**: **82.80 INR / USD**
- **FY 2022-23 Average Market Exchange Rate**: **80.39 INR / USD**

$$\text{Spend Factor (kg CO}_2\text{e / INR)} = \frac{\text{Spend Factor (kg CO}_2\text{e / USD)}}{82.80\text{ INR / USD}}$$

| Industrial Sector | Cornerstone Code | Spend Factor (kg CO2e / USD) | Standardized Spend Factor (kg CO2e / INR) | Scope 3 Category | Applicable Supplier |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Iron and Steel Mills** | 3311 | 0.642 | **0.00775** | Category 1 | AxiomX Steel Suppliers (SUP-001) |
| **Rubber Products** | 3262 | 0.485 | **0.00586** | Category 1 | AxiomX Rubber Suppliers (SUP-002) |
| **Aluminium Production** | 3313 | 0.780 | **0.00942** | Category 1 | AxiomX Aluminium Suppliers (SUP-003) |
| **Cement and Concrete** | 3273 | 1.280 | **0.01546** | Category 1 | AxiomX Cement Suppliers (SUP-004) |
| **Basic Chemicals** | 3251 | 0.520 | **0.00628** | Category 1 | AxiomX Chemical Suppliers (SUP-005) |
| **Paper and Packaging** | 3222 | 0.435 | **0.00525** | Category 1 | AxiomX Packaging Suppliers (SUP-006) |
| **Textile Mills** | 3132 | 0.395 | **0.00477** | Category 1 | AxiomX Textile Suppliers (SUP-007) |
| **Glass Manufacturing** | 3272 | 0.580 | **0.00700** | Category 1 | AxiomX Glass Suppliers (SUP-008) |
| **Plastics Manufacturing** | 3261 | 0.445 | **0.00537** | Category 1 | AxiomX Polymer Suppliers (SUP-009) |
| **Industrial Machinery** | 3336 | 0.315 | **0.00380** | **Category 2** | AxiomX Machinery Suppliers (SUP-010) |

---

## 4. Methodological Distinction: Spend-Based vs Physical Metrics
Spend-based EEIO factors are screening estimates designed for expenditure categorization and materiality analysis. They MUST NOT be mixed or aggregated with physical activity-based factors (e.g. per tonne of steel or cement) for the same purchase record. Scope3Track enforces a strict **one active calculation receipt per purchase record** rule to prevent double-counting.
