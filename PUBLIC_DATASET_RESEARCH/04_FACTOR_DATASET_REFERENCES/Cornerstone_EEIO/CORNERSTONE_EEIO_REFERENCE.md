# Cornerstone EEIO Model — Spend-Based Emission Factor Reference

## 1. Overview and Citation
The **Cornerstone Environmentally Extended Input-Output (EEIO) Model** is a globally harmonized multi-regional input-output database developed for supply chain Scope 3 carbon footprinting.
- **Reference**: Release candidate `2026-rc` (October 27, 2026).
- **Zenodo DOI**: [10.5281/zenodo.23396891](https://doi.org/10.5281/zenodo.23396891)
- **Documentation**: [https://docs.cornerstonedata.org/eeio/](https://docs.cornerstonedata.org/eeio/)
- **License**: Creative Commons Attribution 4.0 International (CC-BY 4.0).
- **Resolution**: 405 Commodity/Industry Sectors.

## 2. Currency Conversion and Correction of Unverified Deflators
Primary Cornerstone EEIO spend factors are published in **$\text{kg CO}_2\text{e} / \text{USD}$**.

### Correction of Unverified Deflator Assumptions
In previous draft working files, ad-hoc domestic Indian purchasing-power deflator factors (such as `0.0704`, `0.0452`, `0.0736`, `0.0951`) were provisionally introduced without empirical citation or official source documentation. 
**Correction Applied**: In accordance with empirical audit standards, all unverified deflator coefficients have been removed. 
INR spend-based emission factors are computed via direct currency conversion using the official Reserve Bank of India (RBI) annual average exchange rates:
- **FY 2023-24 Average Market Exchange Rate**: **82.80 INR / USD**
- **FY 2022-23 Average Market Exchange Rate**: **80.39 INR / USD**

$$\text{Spend Factor (kg CO}_2\text{e / INR)} = \frac{\text{Spend Factor (kg CO}_2\text{e / USD)}}{82.80\text{ INR / USD}}$$

| Sector Code | Sector Description | Spend Factor (kg CO2e / USD) | Spend Factor (kg CO2e / INR, FY24) | Scope 3 Category | Applicable Supplier |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **3311** | Iron and Steel Mills and Ferroalloy | 0.642 | **0.00775** | Category 1: Purchased Goods | AxiomX Steel Suppliers (SUP-001) |
| **3262** | Rubber Product Manufacturing | 0.485 | **0.00586** | Category 1: Purchased Goods | AxiomX Rubber Suppliers (SUP-002) |
| **3313** | Alumina and Aluminum Production | 0.780 | **0.00942** | Category 1: Purchased Goods | AxiomX Aluminium Suppliers (SUP-003) |
| **3273** | Cement and Concrete Product | 1.280 | **0.01546** | Category 1: Purchased Goods | AxiomX Cement Suppliers (SUP-004) |
| **3251** | Basic Chemical Manufacturing | 0.520 | **0.00628** | Category 1: Purchased Goods | AxiomX Chemical Suppliers (SUP-005) |
| **3222** | Converted Paper Product | 0.435 | **0.00525** | Category 1: Purchased Goods | AxiomX Packaging Suppliers (SUP-006) |
| **3132** | Fabric Mills and Textiles | 0.395 | **0.00477** | Category 1: Purchased Goods | AxiomX Textile Suppliers (SUP-007) |
| **3272** | Glass and Glass Products | 0.580 | **0.00700** | Category 1: Purchased Goods | AxiomX Glass Suppliers (SUP-008) |
| **3261** | Plastics Product Manufacturing | 0.445 | **0.00537** | Category 1: Purchased Goods | AxiomX Polymer Suppliers (SUP-009) |
| **3336** | Turbine, Generator & Heavy Power | 0.315 | **0.00380** | Category 2: Capital Goods | AxiomX Machinery Suppliers (SUP-010) |

## 3. Methodological Guardrail: Separation of Spend vs Physical Metrics
- Spend-based calculations provide a top-down screening estimate for supply chain prioritization.
- Spend-based factors MUST NOT be mixed or conflated with physical activity factors (e.g. per tonne of steel or cement) in the same calculation ledger.
