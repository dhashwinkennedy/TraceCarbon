# Scope3Track — Public Industrial Dataset Research and Source Audit

This repository contains the complete public-data research package, source verification audit, and structured dataset references for **Scope3Track**, an enterprise supplier Scope 3 greenhouse gas monitoring and estimation platform.

> [!IMPORTANT]
> **Strict Research Scope**: This package is strictly confined to `PUBLIC_DATASET_RESEARCH/`. No application prototype code, database configurations, or production files were modified. All data is traceable to audited corporate disclosures, government baselines, and scientific open-access models.

---

## 1. Directory Structure

```text
PUBLIC_DATASET_RESEARCH/
├── 01_COMPANY_RESEARCH/              # Sector research and detailed company profiles
│   ├── steel/jsw_steel_profile.md
│   ├── rubber/apollo_tyres_profile.md
│   ├── aluminium/hindalco_profile.md
│   ├── cement/ultratech_profile.md
│   ├── chemicals/tata_chemicals_profile.md
│   ├── packaging_paper/jk_paper_profile.md
│   ├── textiles/arvind_profile.md
│   ├── glass/asahi_india_glass_profile.md
│   ├── polymers/supreme_industries_profile.md
│   └── machinery/bhel_profile.md
├── 02_ORIGINAL_SOURCE_DOCUMENTS/     # Master document index & verification stubs
│   ├── SOURCE_DOCUMENTS_INDEX.md
│   └── [20 Downloaded Corporate PDFs & Filings]
├── 03_STRUCTURED_DISCLOSURES/        # JSON & CSV exports of corporate disclosures
│   ├── final_10_companies.json / .csv
│   ├── company_candidate_register.json / .csv
│   ├── disclosures_first_year.json / .csv (FY 2022-23)
│   ├── disclosures_second_year.json / .csv (FY 2023-24)
│   ├── data_completeness_matrix.json / .csv
│   ├── fictional_alias_mapping.json / .csv
│   ├── data_quality_issues.json / .csv
│   ├── selection_scoring.json / .csv
│   ├── transformation_log.json / .csv
│   ├── source_document_register.json / .csv
│   └── emission_factor_audit.json / .csv
├── 04_FACTOR_DATASET_REFERENCES/     # External emission factor databases & guidelines
│   ├── CEA/                         # Central Electricity Authority v19 & v20
│   ├── IPCC/                        # IPCC 2006 Stationary Combustion Table 2.2
│   ├── Cornerstone_EEIO/            # Cornerstone spend-based factors (Zenodo 2026-rc)
│   └── Other_Benchmarks/           # Worldsteel, GCCA, CEEW, IAI benchmarks
├── 05_AUDIT_WORKBOOK/                # Master 11-sheet Excel audit workbook
│   └── Scope3Track_Company_Source_Audit.xlsx
├── 06_FINAL_RESEARCH_REPORT/         # Comprehensive analytical research reports
│   ├── SELECTED_10_COMPANIES.md
│   ├── DATA_AVAILABILITY_SUMMARY.md
│   └── EMISSION_FACTOR_SOURCE_REPORT.md
├── CORRECTION_AND_VERIFICATION_REPORT.md # Comprehensive verification audit report
├── generate_workbook.py              # Script generating the 11-sheet Excel workbook
├── generate_structured_data.py       # Script generating JSON, CSV, and factor files
├── generate_markdown_reports.py     # Script generating all Markdown profiles & reports
└── build_full_research_package.py   # Master orchestration script
```

---

## 2. Summary of Selected 10 Indian Industrial Companies

| Sector | Legal Entity | Ticker | Fictional Platform Alias | Supplier ID | Scope 3 Category | Audited Specific GHG Intensity | Selection Score | Assurance Provider |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Steel** | JSW Steel Limited | `JSWSTEEL` | AxiomX Steel Suppliers | `SUP-001` | Category 1 | **2.44 tCO2e / tcs** | 96.0 / 100 | DNV Business Assurance |
| **Rubber** | Apollo Tyres Limited | `APOLLOTYRE` | AxiomX Rubber Suppliers | `SUP-002` | Category 1 | **0.950 tCO2e / MT** | 94.0 / 100 | TUV India Private Limited |
| **Aluminium** | Hindalco Industries Limited | `HINDALCO` | AxiomX Aluminium Suppliers | `SUP-003` | Category 1 | **19.39 tCO2e / MT** | 95.0 / 100 | DNV Business Assurance |
| **Cement** | UltraTech Cement Limited | `ULTRACEMCO` | AxiomX Cement Suppliers | `SUP-004` | Category 1 | **618.17 kg CO2 / t** | 96.0 / 100 | BDO India LLP |
| **Chemicals** | Tata Chemicals Limited | `TATACHEM` | AxiomX Chemical Suppliers | `SUP-005` | Category 1 | **0.75 tCO2e / MT** | 93.0 / 100 | KPMG India |
| **Packaging** | JK Paper Limited | `JKPAPER` | AxiomX Packaging Suppliers | `SUP-006` | Category 1 | **138.45 tCO2e / Cr**| 92.0 / 100 | Ernst & Young Associates LLP |
| **Textiles** | Arvind Limited | `ARVIND` | AxiomX Textile Suppliers | `SUP-007` | Category 1 | **2.13 kg CO2e / m** | 93.0 / 100 | Intertek India Private Limited |
| **Glass** | Asahi India Glass Limited | `ASAHIINDIA` | AxiomX Glass Suppliers | `SUP-008` | Category 1 | **0.620 tCO2e / MT** | 86.0 / 100 | Self-certified (Internal Audit) |
| **Polymers** | The Supreme Industries Limited | `SUPREMEIND` | AxiomX Polymer Suppliers | `SUP-009` | Category 1 | **0.386 tCO2e / MT** | 87.0 / 100 | Self-certified (Internal Audit) |
| **Machinery** | Bharat Heavy Electricals Limited | `BHEL` | AxiomX Machinery Suppliers | `SUP-010` | **Category 2** | **12.33 tCO2e / Cr** | 93.0 / 100 | Bureau Veritas (India) Pvt Ltd |

---

## 3. Core Deliverables Verification

1. **Excel Audit Workbook**:
   - Location: `05_AUDIT_WORKBOOK/Scope3Track_Company_Source_Audit.xlsx`
   - **Worksheets (11)**: `Final_10_Companies`, `Company_Candidate_Register`, `First_Year_Disclosures`, `Second_Year_Disclosures`, `Data_Completeness_Matrix`, `Emission_Factor_Audit`, `Source_Document_Register`, `Fictional_Alias_Mapping`, `Data_Quality_Issues`, `Selection_Scoring`, `Transformation_Log`.
   - Strict chronological ordering: FY 2022-23 first, FY 2023-24 second.
2. **Comprehensive Research Reports**:
   - `06_FINAL_RESEARCH_REPORT/SELECTED_10_COMPANIES.md`: Complete company profiles, selection rubrics, and platform mapping.
   - `06_FINAL_RESEARCH_REPORT/DATA_AVAILABILITY_SUMMARY.md`: Multi-sector cross-comparison, SEBI BRSR Core maturity, and longitudinal YoY performance.
   - `06_FINAL_RESEARCH_REPORT/EMISSION_FACTOR_SOURCE_REPORT.md`: CEA grid factors, IPCC fuel factors, Cornerstone spend factors, and calculation hierarchy.
3. **Structured Machine-Readable Disclosures**:
   - `03_STRUCTURED_DISCLOSURES/`: High-fidelity JSON and CSV tables ready for analytical ingestion or database staging.
4. **Verified Reference Datasets**:
   - `04_FACTOR_DATASET_REFERENCES/`: CEA, IPCC, Cornerstone EEIO, and industrial benchmark reference files.
5. **Correction and Verification Audit Report**:
   - `CORRECTION_AND_VERIFICATION_REPORT.md`: Exhaustive verification report answering all verification requirements and documenting empirical data checks.