# Cornerstone EEIO Model — Source Metadata and Comparative Reference

## 1. Citation & Release Information
- **Dataset Title**: Cornerstone EEIO Spend-Based Greenhouse Gas Emission Factors
- **Release Candidate Version**: `2026-rc` (Published October 27, 2026)
- **Publisher / Organization**: Watershed Technology, Inc. & Eastern Research Group (ERG), with academic collaborators (Stanford University, UC Santa Barbara)
- **Official Documentation Portal**: [https://docs.cornerstonedata.org/eeio/releases/rc/](https://docs.cornerstonedata.org/eeio/releases/rc/)
- **Permanent Zenodo DOI**: [10.5281/zenodo.23396891](https://doi.org/10.5281/zenodo.23396891)
- **Licensing**: Creative Commons Attribution 4.0 International ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/))
- **File Name**: `Cornerstone_EEIO_2026_RC_Original.xlsx` (Original downloaded from Zenodo: `Cornerstone_EEIO_2026-rc_Spend-based_GHG_Emission_Factors.xlsx`, 34,279,723 bytes)

---

## 2. Technical Scope & Measurement Years
- **Commodity/Industry Resolution**: 405 distinct economic sectors.
- **Geographic Resolution**: 148 countries, 21 multi-country regions, and 1 global average.
- **Target Measurement Years**: **2024, 2025, and 2026**.
- **Currency & Price Basis**: Published in current-year US Dollars (`kg CO2e / USD`) in both Producer Price and Purchaser Price.

---

## 3. Methodological Guardrail: Separation from Historical Baseline
1. **Measurement-Year Incompatibility**:
   - The Cornerstone `2026-rc` dataset is designed for forward-looking and contemporary measurement years (**2024–2026**).
   - Our historical demonstration dataset for Scope3Track covers **FY 2022-23** and **FY 2023-24**.
   - Consequently, **Cornerstone EEIO factors MUST NOT be mixed into historical FY2022-23 or FY2023-24 baseline ledgers**.
2. **Role as an Optional Comparative Benchmark**:
   - Cornerstone EEIO is included in this package strictly as a **comparative forward-looking benchmark** to illustrate future-year factor evolution against Open CEDA historical baselines.
   - For historical Scope 3 spend-based accounting in Scope3Track, **Open CEDA 2024 (2022 base year)** and **Open CEDA 2025 (2023 base year)** serve as the authoritative historical EEIO sources.

---

## 4. Sector Mapping for 10 AxiomX Commodities (Cornerstone Reference)

| Supplier Code | Product Name | Cornerstone Code | Sector Description | Spend Factor (kg CO2e / USD, 2024) | Effective Factor (kg CO2e / INR, FY24 @ 82.80) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SUP-001** | Hot-rolled steel coils | `3311` | Iron and Steel Mills and Ferroalloy | 0.642 | 0.00775 |
| **SUP-002** | Industrial rubber sheets | `3262` | Rubber Product Manufacturing | 0.485 | 0.00586 |
| **SUP-003** | Aluminium ingots | `3313` | Alumina and Aluminum Production | 0.780 | 0.00942 |
| **SUP-004** | PPC cement | `3273` | Cement and Concrete Product | 1.280 | 0.01546 |
| **SUP-005** | Soda ash | `3251` | Basic Chemical Manufacturing | 0.520 | 0.00628 |
| **SUP-006** | Corrugated packaging | `3222` | Converted Paper Product | 0.435 | 0.00525 |
| **SUP-007** | Industrial fabric | `3132` | Fabric Mills and Textiles | 0.395 | 0.00477 |
| **SUP-008** | Industrial glass sheets | `3272` | Glass and Glass Products | 0.580 | 0.00700 |
| **SUP-009** | HDPE pipes | `3261` | Plastics Product Manufacturing | 0.445 | 0.00537 |
| **SUP-010** | Industrial boilers | `3336` | Turbine, Generator & Heavy Power | 0.315 | 0.00380 |

*Note: All unverified domestic Indian deflator adjustments have been rejected; conversion to INR is computed via direct RBI financial-year exchange rates.*
