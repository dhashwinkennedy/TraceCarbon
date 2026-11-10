"""
GENERATE STRUCTURED DISCLOSURE EXPORTS (JSON & CSV) AND EMISSION FACTOR REFERENCES
Outputs:
- PUBLIC_DATASET_RESEARCH/03_STRUCTURED_DISCLOSURES/
- PUBLIC_DATASET_RESEARCH/04_FACTOR_DATASET_REFERENCES/
"""

import os
import json
import csv
from pathlib import Path
import openpyxl

BASE_DIR = Path(__file__).resolve().parent
WORKBOOK_PATH = BASE_DIR / "05_AUDIT_WORKBOOK" / "Scope3Track_Company_Source_Audit.xlsx"
DISCLOSURES_DIR = BASE_DIR / "03_STRUCTURED_DISCLOSURES"
FACTORS_DIR = BASE_DIR / "04_FACTOR_DATASET_REFERENCES"

def export_sheet_to_json_and_csv(ws, json_name, csv_name):
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return
    headers = [str(h) if h is not None else "" for h in rows[0]]
    data = []
    for r in rows[1:]:
        row_dict = {}
        for h, val in zip(headers, r):
            row_dict[h] = val
        data.append(row_dict)

    # Save JSON
    json_path = DISCLOSURES_DIR / json_name
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    # Save CSV
    csv_path = DISCLOSURES_DIR / csv_name
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        for r in rows[1:]:
            writer.writerow(r)

    print(f"Exported {json_name} and {csv_name}")

def export_all_disclosures():
    wb = openpyxl.load_workbook(WORKBOOK_PATH, data_only=True)
    mapping = {
        "Final_10_Companies": ("final_10_companies.json", "final_10_companies.csv"),
        "Company_Candidate_Register": ("company_candidate_register.json", "company_candidate_register.csv"),
        "First_Year_Disclosures": ("disclosures_first_year.json", "disclosures_first_year.csv"),
        "Second_Year_Disclosures": ("disclosures_second_year.json", "disclosures_second_year.csv"),
        "Data_Completeness_Matrix": ("data_completeness_matrix.json", "data_completeness_matrix.csv"),
        "Fictional_Alias_Mapping": ("fictional_alias_mapping.json", "fictional_alias_mapping.csv"),
        "Data_Quality_Issues": ("data_quality_issues.json", "data_quality_issues.csv"),
        "Selection_Scoring": ("selection_scoring.json", "selection_scoring.csv"),
        "Transformation_Log": ("transformation_log.json", "transformation_log.csv"),
        "Source_Document_Register": ("source_document_register.json", "source_document_register.csv"),
        "Emission_Factor_Audit": ("emission_factor_audit.json", "emission_factor_audit.csv")
    }
    for sheet_name, (json_file, csv_file) in mapping.items():
        if sheet_name in wb.sheetnames:
            export_sheet_to_json_and_csv(wb[sheet_name], json_file, csv_file)

def generate_emission_factor_references():
    # 1. CEA Grid Emission Factors
    cea_dir = FACTORS_DIR / "CEA"
    cea_dir.mkdir(parents=True, exist_ok=True)
    cea_csv = cea_dir / "cea_grid_emission_factors.csv"
    with open(cea_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["database_version", "fiscal_year", "emission_factor_type", "value_tco2_per_mwh", "value_kgco2_per_kwh", "renewable_included", "uncertainty_pct", "source_table_page"])
        writer.writerow(["v20.0 (Dec 2024)", "FY 2023-24", "National Weighted Average (incl. RES)", 0.727, 0.727, "Yes", "+/- 3.5%", "User Guide v20.0, Page 15"])
        writer.writerow(["v20.0 (Dec 2024)", "FY 2023-24", "Operating Margin (OM)", 0.962, 0.962, "No", "+/- 4.0%", "User Guide v20.0, Page 15"])
        writer.writerow(["v20.0 (Dec 2024)", "FY 2023-24", "Build Margin (BM)", 0.552, 0.552, "Yes", "+/- 5.0%", "User Guide v20.0, Page 15"])
        writer.writerow(["v20.0 (Dec 2024)", "FY 2023-24", "Combined Margin (CM 50/50)", 0.757, 0.757, "Yes", "+/- 4.0%", "User Guide v20.0, Page 15"])
        writer.writerow(["v19.0 (Dec 2023)", "FY 2022-23", "National Weighted Average (incl. RES)", 0.716, 0.716, "Yes", "+/- 3.5%", "User Guide v19.0, Page 20"])
        writer.writerow(["v19.0 (Dec 2023)", "FY 2022-23", "Thermal Weighted Average", 0.823, 0.823, "No", "+/- 3.5%", "User Guide v19.0, Page 20"])
        writer.writerow(["v19.0 (Dec 2023)", "FY 2022-23", "Operating Margin (OM)", 0.971, 0.971, "No", "+/- 4.0%", "User Guide v19.0, Page 20"])
        writer.writerow(["v19.0 (Dec 2023)", "FY 2022-23", "Build Margin (BM)", 0.867, 0.867, "Yes", "+/- 5.0%", "User Guide v19.0, Page 20"])
        writer.writerow(["v19.0 (Dec 2023)", "FY 2022-23", "Combined Margin (CM 50/50)", 0.919, 0.919, "Yes", "+/- 4.0%", "User Guide v19.0, Page 20"])

    cea_md = cea_dir / "CEA_DATABASE_REFERENCE.md"
    cea_md.write_text("""# Central Electricity Authority (CEA) — CO2 Baseline Database Reference

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
   $$\\text{Scope 2 GHG (tCO}_2\\text{)} = \\text{Purchased Grid Electricity (MWh)} \\times \\text{CEA Grid Factor (tCO}_2/\\text{MWh)}$$
2. **Vintage Discipline**:
   - Disclosures and monthly reports for **FY 2023-24** MUST apply **0.727 tCO2/MWh** (CEA v20.0).
   - Disclosures and baseline comparisons for **FY 2022-23** MUST apply **0.716 tCO2/MWh** (CEA v19.0).
3. **Data Licensing and Attribution**: Public domain, Government of India Open Data License.
""", encoding="utf-8")

    # 2. IPCC 2006 Fuel Factors
    ipcc_dir = FACTORS_DIR / "IPCC"
    ipcc_dir.mkdir(parents=True, exist_ok=True)
    ipcc_csv = ipcc_dir / "ipcc_stationary_combustion_factors.csv"
    with open(ipcc_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["fuel_name", "fuel_category", "ncv_default_gj_per_tonne", "emission_factor_kg_co2_per_tj", "emission_factor_kg_co2_per_gj", "derived_physical_factor_estimate", "physical_conversion_assumptions", "uncertainty_range_pct", "ipcc_reference_table"])
        writer.writerow(["High Speed Diesel (HSD)", "Liquid Fossil", 43.0, 74100.0, 74.1, "2.68 kg CO2 / Litre", "Density 0.84 kg/L; NCV 43.0 GJ/t (36.12 MJ/L)", "+/- 2.0%", "2006 Vol 2 Ch 2 Table 2.2"])
        writer.writerow(["Furnace Oil / HFO", "Liquid Fossil", 40.4, 77400.0, 77.4, "3.13 kg CO2 / Litre", "Density 1.00 kg/L; NCV 40.4 GJ/t (40.40 MJ/L)", "+/- 3.0%", "2006 Vol 2 Ch 2 Table 2.2"])
        writer.writerow(["Natural Gas", "Gaseous Fossil", 48.0, 56100.0, 56.1, "2.13 kg CO2 / SCM", "Standard density 0.78 kg/m3; NCV 48.0 GJ/t (37.4 MJ/SCM)", "+/- 2.5%", "2006 Vol 2 Ch 2 Table 2.2"])
        writer.writerow(["Non-Coking Indian Coal", "Solid Fossil", 16.5, 96100.0, 96.1, "1585.65 kg CO2 / MT", "NCV 16.5 GJ/t (Indian Coal Grade G9-G11)", "+/- 7.0%", "2006 Vol 2 Ch 2 Table 2.2"])
        writer.writerow(["Liquefied Petroleum Gas (LPG)", "Liquid/Gaseous Fossil", 47.3, 63100.0, 63.1, "2.98 kg CO2 / kg", "NCV 47.3 GJ/t (47.3 MJ/kg)", "+/- 3.0%", "2006 Vol 2 Ch 2 Table 2.2"])
        writer.writerow(["Solid Biomass / Wood Residue", "Biomass Solid", 15.6, 112000.0, 112.0, "1747.20 kg CO2 / MT (Biogenic Memo)", "NCV 15.6 GJ/t; Reported under memo items", "+/- 10.0%", "2006 Vol 2 Ch 2 Table 2.2"])

    ipcc_md = ipcc_dir / "IPCC_GUIDELINES_REFERENCE.md"
    ipcc_md.write_text("""# 2006 IPCC Guidelines for National Greenhouse Gas Inventories — Stationary Combustion

## 1. Overview and Authority
The **Intergovernmental Panel on Climate Change (IPCC)** provides the international gold standard default emission factors and Net Calorific Values (NCVs) for stationary combustion across industrial facilities.
- **Reference**: *2006 IPCC Guidelines for National Greenhouse Gas Inventories, Volume 2: Energy, Chapter 2 (Stationary Combustion), Table 2.2*.

## 2. Default Parameters (Primary Energy-Based Standards)
| Fuel Type | IPCC Category | Default NCV (GJ/tonne) | Carbon Content (kg C/GJ) | Default Primary EF (kg CO2 / TJ) | Derived Physical Factor | Conversion Assumptions & Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **High Speed Diesel (HSD)** | Liquid Fossil | 43.0 | 20.2 | **74,100** | **2.68 kg CO2 / Litre** | Derived assuming density 0.84 kg/L and NCV 43.0 GJ/t |
| **Furnace Oil (HFO)** | Liquid Fossil | 40.4 | 21.1 | **77,400** | **3.13 kg CO2 / Litre** | Derived assuming density 1.00 kg/L and NCV 40.4 GJ/t |
| **Natural Gas** | Gaseous Fossil | 48.0 | 15.3 | **56,100** | **2.13 kg CO2 / SCM** | Derived assuming standard gas density and NCV 37.4 MJ/SCM |
| **Non-Coking Coal** | Solid Fossil | 16.5 | 26.2 | **96,100** | **1,585.65 kg CO2 / MT** | Derived assuming Indian Grade G9-G11 thermal coal |
| **Liquefied Petroleum Gas (LPG)**| Fossil | 47.3 | 17.2 | **63,100** | **2.98 kg CO2 / kg** | Derived assuming NCV 47.3 GJ/t |
| **Solid Biomass / Wood** | Biomass | 15.6 | 30.5 | **112,000** | **1,747.20 kg CO2 / MT** | Biogenic CO2; recorded as memo item under GHG Protocol |

## 3. Important Methodological Distinctions
- **Primary vs Derived**: The statutory IPCC factor is strictly energy-based (expressed in $\\text{kg CO}_2/\\text{TJ}$). Physical metrics (per Litre, per SCM) are secondary derived approximations that depend on batch-specific fuel density and calorific value.
- **Biogenic Emissions**: Emissions from biomass combustion must be recorded under separate informational memo items and NOT aggregated into gross Scope 1 fossil totals.
""", encoding="utf-8")

    # 3. Cornerstone EEIO Factors
    eeio_dir = FACTORS_DIR / "Cornerstone_EEIO"
    eeio_dir.mkdir(parents=True, exist_ok=True)
    eeio_csv = eeio_dir / "cornerstone_eeio_spend_factors.csv"
    with open(eeio_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["cornerstone_sector_code", "sector_description", "spend_factor_kgco2e_per_usd", "spend_factor_kgco2e_per_inr_fy24", "scope3_category", "uncertainty_pct", "applicable_demo_supplier", "notes"])
        writer.writerow(["3311", "Iron and Steel Mills and Ferroalloy", 0.642, 0.00775, "Category 1: Purchased Goods", "+/- 15%", "AxiomX Steel Suppliers (SUP-001)", "Direct RBI FX conversion (82.80 INR/USD). Unverified deflators removed."])
        writer.writerow(["3262", "Rubber Product Manufacturing", 0.485, 0.00586, "Category 1: Purchased Goods", "+/- 14%", "AxiomX Rubber Suppliers (SUP-002)", "Direct RBI FX conversion (82.80 INR/USD). Unverified deflators removed."])
        writer.writerow(["3313", "Alumina and Aluminum Production", 0.780, 0.00942, "Category 1: Purchased Goods", "+/- 16%", "AxiomX Aluminium Suppliers (SUP-003)", "Direct RBI FX conversion (82.80 INR/USD). Unverified deflators removed."])
        writer.writerow(["3273", "Cement and Concrete Product Manufacturing", 1.280, 0.01546, "Category 1: Purchased Goods", "+/- 12%", "AxiomX Cement Suppliers (SUP-004)", "Direct RBI FX conversion (82.80 INR/USD). Unverified deflators removed."])
        writer.writerow(["3251", "Basic Chemical Manufacturing", 0.520, 0.00628, "Category 1: Purchased Goods", "+/- 16%", "AxiomX Chemical Suppliers (SUP-005)", "Direct RBI FX conversion (82.80 INR/USD). Unverified deflators removed."])
        writer.writerow(["3222", "Converted Paper Product Manufacturing", 0.435, 0.00525, "Category 1: Purchased Goods", "+/- 15%", "AxiomX Packaging Suppliers (SUP-006)", "Direct RBI FX conversion (82.80 INR/USD). Unverified deflators removed."])
        writer.writerow(["3132", "Fabric Mills and Textile Furnishings", 0.395, 0.00477, "Category 1: Purchased Goods", "+/- 14%", "AxiomX Textile Suppliers (SUP-007)", "Direct RBI FX conversion (82.80 INR/USD). Unverified deflators removed."])
        writer.writerow(["3272", "Glass and Glass Product Manufacturing", 0.580, 0.00700, "Category 1: Purchased Goods", "+/- 15%", "AxiomX Glass Suppliers (SUP-008)", "Direct RBI FX conversion (82.80 INR/USD). Unverified deflators removed."])
        writer.writerow(["3261", "Plastics Product Manufacturing", 0.445, 0.00537, "Category 1: Purchased Goods", "+/- 14%", "AxiomX Polymer Suppliers (SUP-009)", "Direct RBI FX conversion (82.80 INR/USD). Unverified deflators removed."])
        writer.writerow(["3336", "Turbine, Generator, and Heavy Power Transmission", 0.315, 0.00380, "Category 2: Capital Goods", "+/- 18%", "AxiomX Machinery Suppliers (SUP-010)", "Direct RBI FX conversion (82.80 INR/USD). Unverified deflators removed."])

    eeio_md = eeio_dir / "CORNERSTONE_EEIO_REFERENCE.md"
    eeio_md.write_text("""# Cornerstone EEIO Model — Spend-Based Emission Factor Reference

## 1. Overview and Citation
The **Cornerstone Environmentally Extended Input-Output (EEIO) Model** is a globally harmonized multi-regional input-output database developed for supply chain Scope 3 carbon footprinting.
- **Reference**: Release candidate `2026-rc` (October 27, 2026).
- **Zenodo DOI**: [10.5281/zenodo.23396891](https://doi.org/10.5281/zenodo.23396891)
- **Documentation**: [https://docs.cornerstonedata.org/eeio/](https://docs.cornerstonedata.org/eeio/)
- **License**: Creative Commons Attribution 4.0 International (CC-BY 4.0).
- **Resolution**: 405 Commodity/Industry Sectors.

## 2. Currency Conversion and Correction of Unverified Deflators
Primary Cornerstone EEIO spend factors are published in **$\\text{kg CO}_2\\text{e} / \\text{USD}$**.

### Correction of Unverified Deflator Assumptions
In previous draft working files, ad-hoc domestic Indian purchasing-power deflator factors (such as `0.0704`, `0.0452`, `0.0736`, `0.0951`) were provisionally introduced without empirical citation or official source documentation. 
**Correction Applied**: In accordance with empirical audit standards, all unverified deflator coefficients have been removed. 
INR spend-based emission factors are computed via direct currency conversion using the official Reserve Bank of India (RBI) annual average exchange rates:
- **FY 2023-24 Average Market Exchange Rate**: **82.80 INR / USD**
- **FY 2022-23 Average Market Exchange Rate**: **80.39 INR / USD**

$$\\text{Spend Factor (kg CO}_2\\text{e / INR)} = \\frac{\\text{Spend Factor (kg CO}_2\\text{e / USD)}}{82.80\\text{ INR / USD}}$$

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
""", encoding="utf-8")

    # 4. Other Benchmarks
    benchmarks_dir = FACTORS_DIR / "Other_Benchmarks"
    benchmarks_dir.mkdir(parents=True, exist_ok=True)
    bench_csv = benchmarks_dir / "industrial_benchmark_factors.csv"
    with open(bench_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["sector", "organization", "metric_name", "benchmark_value", "unit", "geographic_scope", "citation"])
        writer.writerow(["Steel", "World Steel Association", "BF-BOF Specific GHG Intensity", 2.32, "tCO2e / t crude steel", "Global Average", "Worldsteel Sustainability Indicators 2023"])
        writer.writerow(["Steel", "Council on Energy, Environment and Water (CEEW)", "Indian BF-BOF Steelmaking Intensity", 2.45, "tCO2e / t crude steel", "India", "CEEW Industrial Decarbonisation Dashboard 2024"])
        writer.writerow(["Aluminium", "International Aluminium Institute (IAI)", "Primary Aluminium Smelting GHG Intensity", 15.10, "tCO2e / t primary Al", "Global Average", "IAI Life Cycle Carbon Footprint Report 2023"])
        writer.writerow(["Cement", "Global Cement and Concrete Association (GCCA)", "Global Net Specific CO2", 558.0, "kg CO2 / t cementitious", "Global Average", "GCCA GNR Project 2023 Report"])
        writer.writerow(["Cement", "Cement Manufacturers Association (CMA India)", "Indian Average Specific Net CO2", 562.0, "kg CO2 / t cementitious", "India", "CMA India Low Carbon Technology Roadmap"])
        writer.writerow(["Paper", "Indian Paper Manufacturers Association (IPMA)", "Specific Energy per Tonne Paper", 26.5, "GJ / MT paper", "India", "IPMA Energy Benchmark Survey 2024"])

    bench_md = benchmarks_dir / "SECTOR_BENCHMARKS_REFERENCE.md"
    bench_md.write_text("""# Cross-Sector Industrial Benchmarks Reference

## 1. Scope and Utility
This directory contains external reference benchmarks from peak industry bodies (World Steel Association, GCCA, IAI, CEEW, CMA India, IPMA).
These benchmarks serve as independent sanity checks for the verified corporate BRSR disclosures of the 10 selected companies in Scope3Track.

## 2. Key Industrial Alignment Checks
1. **JSW Steel vs World Steel / CEEW**:
   - Reported JSW Steel intensity: **2.44 tCO2e/t crude steel** (FY24), up from **2.36 tCO2e/t** (FY23).
   - CEEW Indian BF-BOF benchmark: **2.45 tCO2e/t crude steel** (Variance: -0.4%).
2. **UltraTech Cement vs GCCA / CMA India**:
   - Reported UltraTech Net intensity: **556 kg CO2/t cementitious** (FY24) and **557 kg CO2/t** (FY23).
   - GCCA Global benchmark: **558 kg CO2/t**; CMA Indian benchmark: **562 kg CO2/t**.
3. **Hindalco Smelter vs IAI**:
   - Reported Hindalco aluminium specific intensity: **19.39 tCO2e/t primary Al** (FY24), up from **19.10 tCO2e/t** (FY23).
   - Reflects Indian coal-dominated captive power thermal supply in Renukoot/Mahan/Aditya smelters.
4. **JK Paper vs IPMA**:
   - Reported JK Paper specific energy: **24.52 GJ/MT**.
   - IPMA Indian integrated mill benchmark: **26.5 GJ/MT** (Outperforming national benchmark due to 61.9% biomass co-gen).
""", encoding="utf-8")

    print("Emission factor references generated successfully.")

if __name__ == "__main__":
    export_all_disclosures()
    generate_emission_factor_references()
