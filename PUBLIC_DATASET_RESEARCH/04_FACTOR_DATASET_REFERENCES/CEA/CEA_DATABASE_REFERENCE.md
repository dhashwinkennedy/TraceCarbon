# Central Electricity Authority (CEA) — CO2 Baseline Database Reference

## 1. Overview and Statutory Authority
The **Central Electricity Authority (CEA)** under the Ministry of Power, Government of India, is the official statutory authority mandated to publish annual carbon dioxide emission baselines for the Indian power sector.
- **Official Portal**: [https://cea.nic.in/cdm-co2-baseline-database/](https://cea.nic.in/cdm-co2-baseline-database/)
- **Scope**: All grid-connected electricity generating stations operating on the Indian National Grid.
- **Reporting Vintage Matching**: Mandatory vintage alignment between reporting fiscal year and corresponding CEA baseline edition.

## 2. Key Statutory Factor Values (Verified from Official Documents)
### A. Version 20.0 (Published December 2024 — Verified in `cea_user_guide_v20.pdf`, Page 15)
- **Applicable Reporting Year**: **FY 2023-24** (1 April 2023 – 31 March 2024).
- **National Weighted Average Grid Emission Factor (incl. RES)**: **0.727 tCO2/MWh** (equivalent to **0.727 kg CO2/kWh**).
- **Operating Margin (OM)**: **0.962 tCO2/MWh**.
- **Build Margin (BM)**: **0.552 tCO2/MWh**.
- **Combined Margin (CM 50:50)**: **0.757 tCO2/MWh**.

### B. Version 19.0 (Published December 2023 — Verified in `cea_user_guide_v19.pdf`, Page 20)
- **Applicable Reporting Year**: **FY 2022-23** (1 April 2022 – 31 March 2023).
- **National Weighted Average Grid Emission Factor (incl. RES)**: **0.716 tCO2/MWh** (equivalent to **0.716 kg CO2/kWh**).
- **Thermal Weighted Average**: **0.823 tCO2/MWh**.
- **Operating Margin (OM)**: **0.971 tCO2/MWh**.
- **Build Margin (BM)**: **0.867 tCO2/MWh**.
- **Combined Margin (CM 50:50)**: **0.919 tCO2/MWh**.

## 3. Scope3Track Implementation and Protocol Alignment
1. **Scope 2 Purchased Electricity Formulation**:
   $$\text{Scope 2 GHG (tCO}_2\text{)} = \text{Purchased Grid Electricity (MWh)} \times \text{CEA Grid Factor (tCO}_2/\text{MWh)}$$
2. **Vintage Discipline**:
   - Disclosures and monthly reports for **FY 2023-24** MUST apply **0.727 tCO2/MWh** (CEA v20.0).
   - Disclosures and baseline comparisons for **FY 2022-23** MUST apply **0.716 tCO2/MWh** (CEA v19.0).
3. **Data Licensing and Attribution**: Public domain, Government of India Open Data License.
