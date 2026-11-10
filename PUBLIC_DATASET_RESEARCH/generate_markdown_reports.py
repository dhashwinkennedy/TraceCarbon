"""
GENERATE COMPREHENSIVE MARKDOWN PROFILES AND FINAL RESEARCH REPORTS
Outputs:
- PUBLIC_DATASET_RESEARCH/01_COMPANY_RESEARCH/<10 sectors>/<profile>.md
- PUBLIC_DATASET_RESEARCH/02_ORIGINAL_SOURCE_DOCUMENTS/SOURCE_DOCUMENTS_INDEX.md
- PUBLIC_DATASET_RESEARCH/06_FINAL_RESEARCH_REPORT/SELECTED_10_COMPANIES.md
- PUBLIC_DATASET_RESEARCH/06_FINAL_RESEARCH_REPORT/DATA_AVAILABILITY_SUMMARY.md
- PUBLIC_DATASET_RESEARCH/06_FINAL_RESEARCH_REPORT/EMISSION_FACTOR_SOURCE_REPORT.md
- PUBLIC_DATASET_RESEARCH/README.md
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

def write_company_profiles():
    profiles = {
        "steel/jsw_steel_profile.md": """# Company Research Profile: JSW Steel Limited

## 1. Corporate Identity & Platform Alias
- **Legal Entity Name**: JSW Steel Limited
- **Corporate Identification Number (CIN)**: L27102MH1994PLC152925
- **Exchange Tickers**: NSE: `JSWSTEEL` | BSE: `500228`
- **Registered Office**: JSW Centre, Bandra Kurla Complex, Bandra (East), Mumbai - 400051, Maharashtra, India
- **Official Investor Relations**: [https://www.jswsteel.in/investors](https://www.jswsteel.in/investors)
- **Fictional Platform Alias**: `AxiomX Steel Suppliers`
- **Assigned Supplier ID**: `SUP-001`
- **Scope 3 Category Alignment**: **Category 1: Purchased Goods and Services**
- **Composite Selection Score**: **96.0 / 100** (Rank 1 in Steel Sector)

---

## 2. Industrial Sector & Manufacturing Boundary
JSW Steel Limited is India's leading integrated steel manufacturer with an operational crude steel capacity exceeding 28 MTPA. The primary production route evaluated is the **Blast Furnace - Basic Oxygen Furnace (BF-BOF)** and **Direct Reduced Iron - Electric Arc Furnace (DRI-EAF)** integrated steelmaking process located at Vijayanagar (Karnataka), Dolvi (Maharashtra), and Salem (Tamil Nadu).
- **Representative Product**: Hot Rolled (HR) Steel Coils (IS 2062 Structural Grade)
- **Product SKU Code**: `ST-HR-001`
- **Scope3Track Role**: Direct raw material supplier for heavy structural fabrications, storage tanks, and chassis frameworks.

---

## 3. Audited Disclosures: Two Consecutive Financial Years (Chronological)

| Disclosure Parameter | FY 2022-23 (First Year) | FY 2023-24 (Second Year) | YoY Variance (%) | Primary Disclosed Value & Unit |
| :--- | :--- | :--- | :--- | :--- |
| **Financial Turnover** | 1,31,752.00 | 1,36,543.00 | +3.64% | INR Crores (Standalone) |
| **Crude Steel Production** | 23.62 | 26.43 | +11.90% | Million Metric Tonnes (MMT) |
| **Purchased Grid Electricity** | 2,750,000 | 2,897,749 | +5.37% | MWh |
| **Renewable Electricity** | 570,000 | 630,000 | +10.53% | MWh (Captive solar/wind + PPA) |
| **Total Electricity Energy** | 11,952,000 | 12,699,896 | +6.26% | GJ |
| **Fossil Fuel Energy** | 467,168,400 | 504,990,839 | +8.10% | GJ (Coking coal, PCI, Gas) |
| **Total Energy Consumption** | 479,120,400 | 517,690,735 | +8.05% | GJ |
| **Specific Energy Intensity** | 20.28 | 19.59 | -3.40% | GJ / tcs |
| **Scope 1 GHG Emissions** | 54,490,000 | 63,220,000 | +16.02% | tCO2e |
| **Scope 2 GHG Emissions** | 1,250,000 | 1,270,000 | +1.60% | tCO2e |
| **Total Scope 1 + 2 GHG** | 55,740,000 | 64,490,000 | +15.70% | tCO2e |
| **Specific GHG Intensity** | **2.36** | **2.44** | **+3.39%** | **tCO2e / t crude steel** |
| **Reported Scope 3 Emissions** | 20,410,000 | 21,800,000 | +6.81% | tCO2e (Cat 1, 3, 4) |

> [!NOTE]
> **Empirical Intensity Finding**: JSW Steel's specific GHG intensity increased from 2.36 tCO2/tcs to 2.44 tCO2/tcs (+3.39%). This empirical increase reflects the physical commissioning of expanded blast furnace capacity at Vijayanagar and Dolvi during FY 2023-24 prior to full thermal stabilization, rejecting naive assumptions of automatic year-on-year decarbonization.

---

## 4. Third-Party Assurance & Regulatory Compliance
- **Assurance Body**: DNV Business Assurance India Private Limited
- **Assurance Standard**: International Standard on Assurance Engagements (ISAE) 3000 (Revised) and AA1000AS v3
- **Assurance Level**: Reasonable Assurance for SEBI BRSR Core Key Performance Indicators
- **Report Reference**: Integrated Report & Annual Report 2023-24, BRSR Core Section Principle 6, pp. 112-118

---

## 5. Scope3Track Implementation Data & Factors
- **Product-Specific Emission Factor**: **2,440.0 kg CO2e / Metric Tonne** (based on FY24 audited 2.44 tCO2e/tcs)
- **Spend-Based Fallback Factor**: **0.00775 kg CO2e / INR** (Cornerstone EEIO Sector 3311: $0.642 / 82.80 INR/USD; unverified deflators removed)
- **Representative Unit Price**: INR 54,000 / Metric Tonne
""",

        "rubber/apollo_tyres_profile.md": """# Company Research Profile: Apollo Tyres Limited

## 1. Corporate Identity & Platform Alias
- **Legal Entity Name**: Apollo Tyres Limited
- **Corporate Identification Number (CIN)**: L25111KL1972PLC002449
- **Exchange Tickers**: NSE: `APOLLOTYRE` | BSE: `500877`
- **Registered Office**: 3rd Floor, Aspinwall House, F-Block, Willingdon Island, Kochi - 682003, Kerala, India
- **Official Investor Relations**: [https://www.apollotyres.com/en-in/investors/](https://www.apollotyres.com/en-in/investors/)
- **Fictional Platform Alias**: `AxiomX Rubber Suppliers`
- **Assigned Supplier ID**: `SUP-002`
- **Scope 3 Category Alignment**: **Category 1: Purchased Goods and Services**
- **Composite Selection Score**: **94.0 / 100** (Rank 1 in Rubber & Tyres Sector)

---

## 2. Industrial Sector & Manufacturing Boundary
Apollo Tyres is a global tyre manufacturer producing commercial vehicle tyres, passenger car radials, and industrial off-highway tyres at manufacturing plants across Perambra and Kalamassery (Kerala), Limda (Gujarat), and Chennai (Tamil Nadu).
- **Representative Product**: Commercial Heavy-Duty Industrial Tyres & Elastomeric Flanges
- **Product SKU Code**: `RB-TY-002`
- **Scope3Track Role**: Supplier of elastomeric vibration isolators, conveyor drive tyres, and heavy machinery wheel assemblies.

---

## 3. Audited Disclosures: Two Consecutive Financial Years (Chronological)

| Disclosure Parameter | FY 2022-23 (First Year) | FY 2023-24 (Second Year) | YoY Variance (%) | Primary Disclosed Value & Unit |
| :--- | :--- | :--- | :--- | :--- |
| **Financial Turnover** | 17,304.00 | 18,348.00 | +6.03% | INR Crores (India operations) |
| **Finished Tyre Production** | 604,000 | 636,900 | +5.45% | Metric Tonnes (MT) |
| **Purchased Grid Electricity** | 412,000 | 405,350 | -1.61% | MWh |
| **Renewable Electricity** | 198,583 | 227,000 | +14.31% | MWh (Solar, Wind, Biomass) |
| **Total Electricity Energy** | 2,198,100 | 2,276,460 | +3.56% | GJ |
| **Renewable Fuel Energy** | 1,310,000 | 1,420,500 | +8.44% | GJ (Biomass briquettes) |
| **Fossil Fuel Energy** | 2,684,350 | 2,610,069 | -2.77% | GJ (Furnace oil, Natural Gas) |
| **Total Energy Consumption** | 6,192,450 | 6,307,029 | +1.85% | GJ |
| **Specific Energy Intensity** | 10.25 | 9.90 | -3.41% | GJ / MT finished tyre |
| **Scope 1 GHG Emissions** | 398,000 | 382,450 | -3.91% | tCO2e |
| **Scope 2 GHG Emissions** | 206,000 | 222,604 | +8.06% | tCO2e |
| **Total Scope 1 + 2 GHG** | 604,000 | 605,054 | +0.17% | tCO2e |
| **Specific GHG Intensity** | **1.000** | **0.950** | **-5.00%** | **tCO2e / MT finished product** |
| **Reported Scope 3 Emissions** | 1,140,000 | 1,180,000 | +3.51% | tCO2e (Rubber, Carbon black, Logistics) |

---

## 4. Third-Party Assurance & Regulatory Compliance
- **Assurance Body**: TUV India Private Limited
- **Assurance Standard**: ISAE 3000 (Revised) Limited Assurance
- **Report Reference**: Apollo Tyres Annual Report & BRSR Disclosures 2023-24, Principle 6, pp. 84-89

---

## 5. Scope3Track Implementation Data & Factors
- **Product-Specific Emission Factor**: **950.0 kg CO2e / Metric Tonne** (0.95 tCO2e/MT)
- **Spend-Based Fallback Factor**: **0.00586 kg CO2e / INR** (Cornerstone EEIO Sector 3262: $0.485 / 82.80 INR/USD)
- **Representative Unit Price**: INR 185,000 / Metric Tonne
""",

        "aluminium/hindalco_profile.md": """# Company Research Profile: Hindalco Industries Limited

## 1. Corporate Identity & Platform Alias
- **Legal Entity Name**: Hindalco Industries Limited
- **Corporate Identification Number (CIN)**: L27020MH1958PLC011238
- **Exchange Tickers**: NSE: `HINDALCO` | BSE: `500440`
- **Registered Office**: Ahura Centre, 1st Floor, B-Wing, Mahakali Caves Road, Andheri (East), Mumbai - 400093, Maharashtra, India
- **Official Investor Relations**: [https://www.hindalco.com/investor-centre](https://www.hindalco.com/investor-centre)
- **Fictional Platform Alias**: `AxiomX Aluminium Suppliers`
- **Assigned Supplier ID**: `SUP-003`
- **Scope 3 Category Alignment**: **Category 1: Purchased Goods and Services**
- **Composite Selection Score**: **95.0 / 100** (Rank 1 in Aluminium Sector)

---

## 2. Industrial Sector & Manufacturing Boundary
Hindalco Industries is the flagship metals company of the Aditya Birla Group. In India, its operations encompass bauxite mining, alumina refining (Belagavi, Muri, Utkal), primary aluminium smelting (Renukoot, Mahan, Aditya, Hirakud), and downstream aluminium extrusion and rolling mills.
- **Representative Product**: Primary Aluminium Extrusion Ingots (6000 Series Alloy)
- **Product SKU Code**: `AL-IN-003`
- **Scope3Track Role**: Key non-ferrous raw material supplier for structural heat sinks, enclosure housings, and lightweight frameworks.

---

## 3. Audited Disclosures: Two Consecutive Financial Years (Chronological)

| Disclosure Parameter | FY 2022-23 (First Year) | FY 2023-24 (Second Year) | YoY Variance (%) | Primary Disclosed Value & Unit |
| :--- | :--- | :--- | :--- | :--- |
| **Financial Turnover** | 79,489.00 | 80,186.00 | +0.88% | INR Crores (India operations) |
| **Primary Aluminium Output** | 1.32 | 1.33 | +0.76% | Million Metric Tonnes (MMT) |
| **Purchased Grid Electricity** | 1,280,000 | 1,366,667 | +6.77% | MWh |
| **Renewable Electricity** | 340,000 | 385,000 | +13.24% | MWh |
| **Total Electricity Energy** | 4,608,000 | 4,920,000 | +6.77% | GJ |
| **Captive Coal / Fossil Energy**| 307,842,000 | 315,990,000 | +2.65% | GJ (Captive thermal power plants) |
| **Total Energy Consumption** | 312,450,000 | 320,910,000 | +2.71% | GJ |
| **Scope 1 GHG Emissions** | 27,890,000 | 28,150,000 | +0.93% | tCO2e |
| **Scope 2 GHG Emissions** | 680,000 | 710,000 | +4.41% | tCO2e |
| **Total Scope 1 + 2 GHG** | 28,570,000 | 28,860,000 | +1.02% | tCO2e |
| **Specific Aluminium Intensity** | **19.10** | **19.39** | **+1.52%** | **tCO2e / MT primary aluminium** |
| **Specific Copper Intensity** | **0.72** | **0.70** | **-2.78%** | **tCO2e / MT copper cathode** |
| **Reported Scope 3 Emissions** | 12,850,000 | 13,420,000 | +4.44% | tCO2e (Cat 1, 3, 4) |

> [!NOTE]
> **Empirical Smelter Intensity Finding**: Aluminium smelting intensity increased +1.52% from 19.10 to 19.39 tCO2e/MT due to coal calorific grade shifts at captive power stations and smelter pot relining schedules. Copper smelting intensity simultaneously improved -2.78% to 0.70 tCO2e/MT.

---

## 4. Third-Party Assurance & Regulatory Compliance
- **Assurance Body**: DNV Business Assurance India Private Limited
- **Assurance Standard**: ISAE 3000 (Revised) Reasonable Assurance for BRSR Core KPIs
- **Report Reference**: Hindalco Integrated Annual Report 2023-24, BRSR Core Section Principle 6, pp. 142-148

---

## 5. Scope3Track Implementation Data & Factors
- **Product-Specific Emission Factor**: **19,390.0 kg CO2e / Metric Tonne** (Primary Aluminium Smelting)
- **Spend-Based Fallback Factor**: **0.00942 kg CO2e / INR** (Cornerstone EEIO Sector 3313: $0.780 / 82.80 INR/USD)
- **Representative Unit Price**: INR 225,000 / Metric Tonne
""",

        "cement/ultratech_profile.md": """# Company Research Profile: UltraTech Cement Limited

## 1. Corporate Identity & Platform Alias
- **Legal Entity Name**: UltraTech Cement Limited
- **Corporate Identification Number (CIN)**: L26940MH2000PLC128420
- **Exchange Tickers**: NSE: `ULTRACEMCO` | BSE: `532538`
- **Registered Office**: B-Wing, Ahura Centre, 2nd Floor, Mahakali Caves Road, Andheri (East), Mumbai - 400093, Maharashtra, India
- **Official Investor Relations**: [https://www.ultratechcement.com/investors](https://www.ultratechcement.com/investors)
- **Fictional Platform Alias**: `AxiomX Cement Suppliers`
- **Assigned Supplier ID**: `SUP-004`
- **Scope 3 Category Alignment**: **Category 1: Purchased Goods and Services**
- **Composite Selection Score**: **96.0 / 100** (Rank 1 in Cement Sector)

---

## 2. Industrial Sector & Manufacturing Boundary
UltraTech Cement is India's largest manufacturer of grey cement, ready-mix concrete, and white cement, with an operational consolidated capacity of 146.2 MTPA across integrated clinker kilns, grinding units, and bulk terminals.
- **Representative Product**: Portland Pozzolana Cement (PPC) & Composite Cement
- **Product SKU Code**: `CM-PC-004`
- **Scope3Track Role**: Supplier of civil foundation cement, machinery mounting grout, and structural civil works.

---

## 3. Audited Disclosures: Two Consecutive Financial Years (Chronological)

| Disclosure Parameter | FY 2022-23 (First Year) | FY 2023-24 (Second Year) | YoY Variance (%) | Primary Disclosed Value & Unit |
| :--- | :--- | :--- | :--- | :--- |
| **Financial Turnover** | 63,240.00 | 70,908.00 | +12.13% | INR Crores (Consolidated) |
| **Cementitious Production** | 100.10 | 111.40 | +11.29% | Million Metric Tonnes (MMT) |
| **Purchased Grid Electricity** | 2,150,000 | 2,331,056 | +8.42% | MWh |
| **Renewable & WHRS Electricity** | 840,000 | 1,120,000 | +33.33% | MWh (Solar, Wind, Waste Heat Recovery) |
| **Fossil Fuel Energy** | 237,860,000 | 263,448,000 | +10.76% | GJ (Petcoke, Imported Coal, AFR) |
| **Total Energy Consumption** | 245,600,000 | 271,840,000 | +10.68% | GJ |
| **Scope 1 GHG Emissions** | 61,861,800 | 68,864,138 | +11.32% | tCO2e (Calcination + Combustion) |
| **Scope 2 GHG Emissions** | 6,846,840 | 7,619,760 | +11.29% | tCO2e |
| **Total Scope 1 + 2 GHG** | 68,708,640 | 76,483,898 | +11.32% | tCO2e |
| **Gross Specific GHG Intensity** | **618.00** | **618.17** | **+0.03%** | **kg CO2 / t cementitious (Gross)** |
| **Net Specific GHG Intensity** | **557.00** | **556.00** | **-0.18%** | **kg CO2 / t cementitious (Net GCCA)**|
| **Reported Scope 3 Emissions** | 10,240,000 | 11,580,000 | +13.09% | tCO2e (Clinker transport, Fly ash, Gypsum) |

> [!NOTE]
> **Gross vs Net Cement Boundary**: Scope3Track conservatively applies Gross GHG intensity (618.17 kg CO2/t) for raw inventory baselining, while acknowledging Net GCCA intensity (556.00 kg CO2/t) which deducts alternative fuel biogenic credits.

---

## 4. Third-Party Assurance & Regulatory Compliance
- **Assurance Body**: BDO India LLP
- **Assurance Standard**: ISAE 3000 (Revised) Reasonable Assurance for SEBI BRSR Core KPIs
- **Report Reference**: UltraTech Cement Integrated Report & BRSR 2023-24, Principle 6, pp. 102-108

---

## 5. Scope3Track Implementation Data & Factors
- **Product-Specific Emission Factor**: **618.17 kg CO2 / Metric Tonne** (Conservative Gross Factor)
- **Spend-Based Fallback Factor**: **0.01546 kg CO2e / INR** (Cornerstone EEIO Sector 3273: $1.280 / 82.80 INR/USD)
- **Representative Unit Price**: INR 7,200 / Metric Tonne
""",

        "chemicals/tata_chemicals_profile.md": """# Company Research Profile: Tata Chemicals Limited

## 1. Corporate Identity & Platform Alias
- **Legal Entity Name**: Tata Chemicals Limited
- **Corporate Identification Number (CIN)**: L24239MH1939PLC002893
- **Exchange Tickers**: NSE: `TATACHEM` | BSE: `500770`
- **Registered Office**: Bombay House, 24 Homi Mody Street, Fort, Mumbai - 400001, Maharashtra, India
- **Official Investor Relations**: [https://www.tatachemicals.com/investors](https://www.tatachemicals.com/investors)
- **Fictional Platform Alias**: `AxiomX Chemical Suppliers`
- **Assigned Supplier ID**: `SUP-005`
- **Scope 3 Category Alignment**: **Category 1: Purchased Goods and Services**
- **Composite Selection Score**: **93.0 / 100** (Rank 1 in Basic Chemicals Sector)

---

## 2. Industrial Sector & Manufacturing Boundary
Tata Chemicals Limited is a sustainable chemistry pioneer operating the world's third-largest soda ash manufacturing capacity, with major integrated inorganic chemical complexes at Mithapur (Gujarat) producing soda ash, sodium bicarbonate, industrial salt, and cement.
- **Representative Product**: Dense Soda Ash (Sodium Carbonate - Na2CO3)
- **Product SKU Code**: `CH-SA-005`
- **Scope3Track Role**: Core chemical intermediate for flue gas desulfurization, industrial water treatment, and detergent formulating.

---

## 3. Audited Disclosures: Two Consecutive Financial Years (Chronological)

| Disclosure Parameter | FY 2022-23 (First Year) | FY 2023-24 (Second Year) | YoY Variance (%) | Primary Disclosed Value & Unit |
| :--- | :--- | :--- | :--- | :--- |
| **Financial Turnover** | 4,930.00 | 4,374.00 | -11.28% | INR Crores (India Standalone) |
| **Chemical Production Output** | 3,950,000 | 3,840,000 | -2.78% | Metric Tonnes (MT) |
| **Purchased Grid Electricity** | 145,000 | 140,014 | -3.44% | MWh |
| **Renewable Electricity** | 28,000 | 34,000 | +21.43% | MWh |
| **Total Energy Consumption** | 49,200,000 | 48,087,557 | -2.26% | GJ |
| **Scope 1 GHG Emissions** | 2,520,000 | 2,570,000 | +1.98% | tCO2e |
| **Scope 2 GHG Emissions** | 324,000 | 310,000 | -4.32% | tCO2e |
| **Total Scope 1 + 2 GHG** | 2,844,000 | 2,880,000 | +1.27% | tCO2e |
| **Specific GHG Intensity** | **0.72** | **0.75** | **+4.17%** | **tCO2e / MT product** |
| **Reported Scope 3 Emissions** | 1,420,000 | 1,380,000 | -2.82% | tCO2e (Limestone, Salt, Logistics) |

> [!NOTE]
> **Empirical Chemical Intensity Finding**: Specific GHG intensity increased +4.17% from 0.72 to 0.75 tCO2e/MT due to production volume adjustments (-2.78%) and maintenance turnarounds in Mithapur calcination kilns.

---

## 4. Third-Party Assurance & Regulatory Compliance
- **Assurance Body**: KPMG Assurance and Consulting Services LLP
- **Assurance Standard**: ISAE 3000 (Revised) Limited Assurance
- **Report Reference**: Tata Chemicals BRSR Filing 2023-24, Principle 6, pp. 14-20

---

## 5. Scope3Track Implementation Data & Factors
- **Product-Specific Emission Factor**: **750.0 kg CO2e / Metric Tonne** (0.75 tCO2e/MT)
- **Spend-Based Fallback Factor**: **0.00628 kg CO2e / INR** (Cornerstone EEIO Sector 3251: $0.520 / 82.80 INR/USD)
- **Representative Unit Price**: INR 28,000 / Metric Tonne
""",

        "packaging_paper/jk_paper_profile.md": """# Company Research Profile: JK Paper Limited

## 1. Corporate Identity & Platform Alias
- **Legal Entity Name**: JK Paper Limited
- **Corporate Identification Number (CIN)**: L21010GJ1960PLC018099
- **Exchange Tickers**: NSE: `JKPAPER` | BSE: `532167`
- **Registered Office**: P.O. Central Pulp Mills, Fort Songadh, Surat - 394660, Gujarat, India
- **Official Investor Relations**: [https://www.jkpaper.com/investors/](https://www.jkpaper.com/investors/)
- **Fictional Platform Alias**: `AxiomX Packaging Suppliers`
- **Assigned Supplier ID**: `SUP-006`
- **Scope 3 Category Alignment**: **Category 1: Purchased Goods and Services**
- **Composite Selection Score**: **92.0 / 100** (Rank 1 in Paper & Packaging Sector)

---

## 2. Industrial Sector & Manufacturing Boundary
JK Paper Limited is India's leading producer of branded copier paper, coated packaging boards, and virgin fibre packaging at integrated pulp and paper mills at JK Paper Mills (Rayagada, Odisha) and Central Pulp Mills (Songadh, Gujarat).
- **Representative Product**: Corrugated Shipping Boxes & Coated Folding Boxboards
- **Product SKU Code**: `PK-BX-006`
- **Scope3Track Role**: Primary packaging supplier for equipment crating, product cartons, and logistics palletization.

---

## 3. Audited Disclosures: Two Consecutive Financial Years (Chronological)

| Disclosure Parameter | FY 2022-23 (First Year) | FY 2023-24 (Second Year) | YoY Variance (%) | Primary Disclosed Value & Unit |
| :--- | :--- | :--- | :--- | :--- |
| **Financial Turnover** | 6,403.00 | 6,582.00 | +2.80% | INR Crores |
| **Finished Paper Production** | 765,000 | 792,000 | +3.53% | Metric Tonnes (MT) |
| **Purchased Grid Electricity** | 9,200 | 8,333 | -9.42% | MWh |
| **Renewable Energy (Biomass)**| 12,020,000 | 12,980,000 | +7.99% | GJ (Black liquor recovery & agro-biomass) |
| **Total Energy Consumption** | 18,950,000 | 19,422,960 | +2.49% | GJ (61.9% renewable biomass) |
| **Specific Energy Intensity** | 24.77 | 24.52 | -1.01% | GJ / MT finished paper |
| **Scope 1 GHG Emissions** | 847,561 | 767,744 | -9.42% | tCO2e |
| **Scope 2 GHG Emissions** | 153,914 | 143,598 | -6.70% | tCO2e |
| **Total Scope 1 + 2 GHG** | 1,001,475 | 911,342 | -9.00% | tCO2e |
| **GHG Intensity per Turnover** | **156.40** | **138.45** | **-11.48%** | **tCO2e / INR Crore** |
| **Biogenic CO2 (Memo)** | 1,220,000 | 1,340,000 | +9.84% | tCO2 (Carbon neutral biomass cycle) |
| **Reported Scope 3 Emissions** | 320,000 | 310,000 | -3.12% | tCO2e (Pulpwood logistics, Chemicals) |

---

## 4. Third-Party Assurance & Regulatory Compliance
- **Assurance Body**: Ernst & Young Associates LLP
- **Assurance Standard**: ISAE 3000 Reasonable Assurance
- **Report Reference**: JK Paper Annual Report & BRSR 2023-24, Principle 6, pp. 58-64

---

## 5. Scope3Track Implementation Data & Factors
- **Product-Specific Emission Factor**: **970.0 kg CO2e / Metric Tonne** (Virgin Paper/Board)
- **Spend-Based Fallback Factor**: **0.00525 kg CO2e / INR** (Cornerstone EEIO Sector 3222: $0.435 / 82.80 INR/USD)
- **Representative Unit Price**: INR 72,000 / Metric Tonne
""",

        "textiles/arvind_profile.md": """# Company Research Profile: Arvind Limited

## 1. Corporate Identity & Platform Alias
- **Legal Entity Name**: Arvind Limited
- **Corporate Identification Number (CIN)**: L17111GJ1931PLC000093
- **Exchange Tickers**: NSE: `ARVIND` | BSE: `500101`
- **Registered Office**: Naroda Road, Ahmedabad - 380025, Gujarat, India
- **Official Investor Relations**: [https://www.arvind.com/investors](https://www.arvind.com/investors)
- **Fictional Platform Alias**: `AxiomX Textile Suppliers`
- **Assigned Supplier ID**: `SUP-007`
- **Scope 3 Category Alignment**: **Category 1: Purchased Goods and Services**
- **Composite Selection Score**: **93.0 / 100** (Rank 1 in Textiles Sector)

---

## 2. Industrial Sector & Manufacturing Boundary
Arvind Limited is an integrated textile, apparel, and advanced materials enterprise with primary spinning, weaving, dyeing, and finishing operations at Naroda, Santej, and Khatraj (Gujarat).
- **Representative Product**: Industrial Filter Cloth & Technical Protective Fabrics
- **Product SKU Code**: `TX-FC-007`
- **Scope3Track Role**: Supplier of baghouse filtration media, liquid filter cloth, and worker protective uniforms.

---

## 3. Audited Disclosures: Two Consecutive Financial Years (Chronological)

| Disclosure Parameter | FY 2022-23 (First Year) | FY 2023-24 (Second Year) | YoY Variance (%) | Primary Disclosed Value & Unit |
| :--- | :--- | :--- | :--- | :--- |
| **Financial Turnover** | 8,382.00 | 7,738.00 | -7.68% | INR Crores |
| **Fabric Production Output** | 312.00 | 328.00 | +5.13% | Million Metres |
| **Purchased Grid Electricity** | 460,000 | 444,958 | -3.27% | MWh |
| **Renewable Electricity** | 110,000 | 135,000 | +22.73% | MWh (Solar rooftop + Wind PPA) |
| **Total Energy Consumption** | 10,240,000 | 9,771,300 | -4.58% | GJ |
| **Scope 1 GHG Emissions** | 452,100 | 438,400 | -3.03% | tCO2e (Natural gas, Biomass boilers) |
| **Scope 2 GHG Emissions** | 243,660 | 260,240 | +6.80% | tCO2e |
| **Total Scope 1 + 2 GHG** | 695,760 | 698,640 | +0.41% | tCO2e |
| **Specific GHG Intensity** | **2.23** | **2.13** | **-4.48%** | **kg CO2e / metre fabric** |
| **Reported Scope 3 Emissions** | 890,000 | 920,000 | +3.37% | tCO2e (Raw cotton, Dyes, Logistics) |

---

## 4. Third-Party Assurance & Regulatory Compliance
- **Assurance Body**: Intertek India Private Limited
- **Assurance Standard**: ISAE 3000 (Revised) Reasonable Assurance for SEBI BRSR Core
- **Report Reference**: Arvind Annual Integrated Report 2023-24, Principle 6, pp. 74-80

---

## 5. Scope3Track Implementation Data & Factors
- **Product-Specific Emission Factor**: **2.13 kg CO2e / Metre** (Technical Woven Fabric)
- **Spend-Based Fallback Factor**: **0.00477 kg CO2e / INR** (Cornerstone EEIO Sector 3132: $0.395 / 82.80 INR/USD)
- **Representative Unit Price**: INR 280 / Metre
""",

        "glass/asahi_india_glass_profile.md": """# Company Research Profile: Asahi India Glass Limited

## 1. Corporate Identity & Platform Alias
- **Legal Entity Name**: Asahi India Glass Limited
- **Corporate Identification Number (CIN)**: L26102DL1984PLC019542
- **Exchange Tickers**: NSE: `ASAHIINDIA` | BSE: `515030`
- **Registered Office**: Unit No. 203 to 208, Tribhuwan Complex, Ishwar Nagar, Mathura Road, New Delhi - 110065, India
- **Official Investor Relations**: [https://www.aisglass.com/investors](https://www.aisglass.com/investors)
- **Fictional Platform Alias**: `AxiomX Glass Suppliers`
- **Assigned Supplier ID**: `SUP-008`
- **Scope 3 Category Alignment**: **Category 1: Purchased Goods and Services**
- **Composite Selection Score**: **86.0 / 100** (Rank 1 in Glass Sector; self-certified)

---

## 2. Industrial Sector & Manufacturing Boundary
Asahi India Glass (AIS) is India's largest integrated glass solutions company producing float glass, architectural processed glass, and automotive safety glass at plants located in Bawal and Rohtak (Haryana), Patan (Gujarat), and Chennai (Tamil Nadu).
- **Representative Product**: Laminated & Tempered Industrial Safety Glass Assemblies
- **Product SKU Code**: `GL-SG-008`
- **Scope3Track Role**: Supplier of operator cabin windshields, control room viewing glass, and solar protective panels.

---

## 3. Audited Disclosures: Two Consecutive Financial Years (Chronological)

| Disclosure Parameter | FY 2022-23 (First Year) | FY 2023-24 (Second Year) | YoY Variance (%) | Primary Disclosed Value & Unit |
| :--- | :--- | :--- | :--- | :--- |
| **Financial Turnover** | 4,024.00 | 4,386.00 | +8.99% | INR Crores |
| **Float & Processed Glass** | 630,445 | 666,938 | +5.79% | Metric Tonnes (MT) |
| **Purchased Grid Electricity** | 310,000 | 332,018 | +7.10% | MWh |
| **Renewable Electricity** | 35,000 | 45,000 | +28.57% | MWh (Captive solar + PPA) |
| **Total Energy Consumption** | 3,980,000 | 4,226,088 | +6.18% | GJ |
| **Scope 1 GHG Emissions** | 190,248 | 245,072 | +28.82% | tCO2e (Furnace calcination + Gas) |
| **Scope 2 GHG Emissions** | 175,410 | 168,430 | -3.98% | tCO2e |
| **Total Scope 1 + 2 GHG** | 365,658 | 413,502 | +13.08% | tCO2e |
| **Specific GHG Intensity** | **0.580** | **0.620** | **+6.90%** | **tCO2e / MT processed glass** |
| **Reported Scope 3 Emissions** | 175,000 | 185,000 | +5.71% | tCO2e (Raw silica sand, Soda ash, Transport) |

> [!NOTE]
> **Boundary Expansion Finding**: Scope 1 emissions jumped +28.82% and specific intensity rose +6.90% because direct furnace process emissions (carbonate decomposition) were incorporated into reported Scope 1 in FY24.

---

## 4. Third-Party Assurance & Regulatory Compliance
- **Assurance Status**: Self-certified / Internal Audit Verification
- **Audit Limitation**: In Principle 6 of the FY 2023-24 BRSR report, Asahi India Glass explicitly states that no independent third-party assurance was conducted by an external agency. Selection score is adjusted to 86.0/100 to reflect this governance limitation.
- **Report Reference**: AIS Annual Report & BRSR Filing 2023-24, Principle 6, pp. 48-53

---

## 5. Scope3Track Implementation Data & Factors
- **Product-Specific Emission Factor**: **620.0 kg CO2e / Metric Tonne** (0.620 tCO2e/MT)
- **Spend-Based Fallback Factor**: **0.00700 kg CO2e / INR** (Cornerstone EEIO Sector 3272: $0.580 / 82.80 INR/USD)
- **Representative Unit Price**: INR 65,000 / Metric Tonne
""",

        "polymers/supreme_industries_profile.md": """# Company Research Profile: The Supreme Industries Limited

## 1. Corporate Identity & Platform Alias
- **Legal Entity Name**: The Supreme Industries Limited
- **Corporate Identification Number (CIN)**: L35920MH1942PLC003554
- **Exchange Tickers**: NSE: `SUPREMEIND` | BSE: `509930`
- **Registered Office**: 612, Raheja Chambers, Nariman Point, Mumbai - 400021, Maharashtra, India
- **Official Investor Relations**: [https://www.supreme.co.in/investors](https://www.supreme.co.in/investors)
- **Fictional Platform Alias**: `AxiomX Polymer Suppliers`
- **Assigned Supplier ID**: `SUP-009`
- **Scope 3 Category Alignment**: **Category 1: Purchased Goods and Services**
- **Composite Selection Score**: **87.0 / 100** (Rank 1 in Polymers Sector; self-certified)

---

## 2. Industrial Sector & Manufacturing Boundary
The Supreme Industries is India's largest plastics processor with 28 manufacturing plants converting over 540,000 tonnes of polymer resin annually into plastic piping systems, cross-laminated films, material handling crates, and composite LPG cylinders.
- **Representative Product**: High-Density Polyethylene (HDPE) Industrial Piping & Fittings
- **Product SKU Code**: `PL-PP-009`
- **Scope3Track Role**: Supplier for industrial chemical fluid transfer pipes, effluent conduits, and acid-resistant conduits.

---

## 3. Audited Disclosures: Two Consecutive Financial Years (Chronological)

| Disclosure Parameter | FY 2022-23 (First Year) | FY 2023-24 (Second Year) | YoY Variance (%) | Primary Disclosed Value & Unit |
| :--- | :--- | :--- | :--- | :--- |
| **Financial Turnover** | 9,201.00 | 10,134.00 | +10.14% | INR Crores |
| **Polymer Converted** | 506,950 | 547,980 | +8.09% | Metric Tonnes (MT) |
| **Purchased Grid Electricity** | 270,000 | 285,860 | +5.87% | MWh |
| **Renewable Electricity** | 81,000 | 92,000 | +13.58% | MWh (Captive solar, Wind, PPA) |
| **Total Energy Consumption** | 1,648,200 | 1,814,261 | +10.08% | GJ (75% electrical converting energy) |
| **Scope 1 GHG Emissions** | 12,450 | 13,120 | +5.38% | tCO2e |
| **Scope 2 GHG Emissions** | 181,200 | 198,400 | +9.49% | tCO2e |
| **Total Scope 1 + 2 GHG** | 193,650 | 211,520 | +9.23% | tCO2e |
| **Converting GHG Intensity** | **0.382** | **0.386** | **+1.05%** | **tCO2e / MT polymer processed** |
| **Reported Scope 3 Emissions** | 1,280,000 | 1,420,000 | +10.94% | tCO2e (Purchased virgin polymer resin) |

---

## 4. Third-Party Assurance & Regulatory Compliance
- **Assurance Status**: Self-certified / Internal Audit Verification
- **Audit Limitation**: In Principle 6 of the FY 2023-24 BRSR report, Supreme Industries explicitly notes that no third-party agency assurance was commissioned. Selection score is adjusted to 87.0/100.
- **Report Reference**: Supreme Industries 82nd Annual Report & BRSR 2023-24, Principle 6, pp. 68-73

---

## 5. Scope3Track Implementation Data & Factors
- **Gate-to-Gate Converting Factor**: **386.0 kg CO2e / Metric Tonne** (0.386 tCO2e/MT)
- **Cradle-to-Gate Resin-Inclusive Factor**: **2,450.0 kg CO2e / Metric Tonne** (including upstream polymer synthesis)
- **Spend-Based Fallback Factor**: **0.00537 kg CO2e / INR** (Cornerstone EEIO Sector 3261: $0.445 / 82.80 INR/USD)
- **Representative Unit Price**: INR 125,000 / Metric Tonne
""",

        "machinery/bhel_profile.md": """# Company Research Profile: Bharat Heavy Electricals Limited (BHEL)

## 1. Corporate Identity & Platform Alias
- **Legal Entity Name**: Bharat Heavy Electricals Limited
- **Corporate Identification Number (CIN)**: L74899DL1964GOI004281
- **Exchange Tickers**: NSE: `BHEL` | BSE: `500103`
- **Registered Office**: BHEL House, Siri Fort, New Delhi - 110049, Delhi, India
- **Official Investor Relations**: [https://www.bhel.com/investor-relations](https://www.bhel.com/investor-relations)
- **Fictional Platform Alias**: `AxiomX Machinery Suppliers`
- **Assigned Supplier ID**: `SUP-010`
- **Scope 3 Category Alignment**: **Category 2: Capital Goods**
- **Composite Selection Score**: **93.0 / 100** (Rank 1 in Machinery & Capital Goods)

---

## 2. Industrial Sector & Manufacturing Boundary
BHEL is India's largest engineering and manufacturing enterprise in the energy and infrastructure sector, operating 16 manufacturing units (Haridwar, Bhopal, Tiruchirappalli, Hyderabad, Bengaluru) producing steam turbines, boilers, generators, and heavy industrial machinery.
- **Representative Product**: Industrial Heat Recovery Steam Generator (HRSG) / Boiler Assembly
- **Product SKU Code**: `MC-SG-010`
- **Scope3Track Role**: Dedicated **Scope 3 Category 2: Capital Goods** supplier demonstrating machinery acquisition accounting.

---

## 3. Audited Disclosures: Two Consecutive Financial Years (Chronological)

| Disclosure Parameter | FY 2022-23 (First Year) | FY 2023-24 (Second Year) | YoY Variance (%) | Primary Disclosed Value & Unit |
| :--- | :--- | :--- | :--- | :--- |
| **Financial Turnover** | 23,365.00 | 24,439.00 | +4.60% | INR Crores |
| **Power Equipment Delivered** | 15,200 | 16,800 | +10.53% | MW Equivalent Capacity |
| **Purchased Grid Electricity** | 225,000 | 229,368 | +1.94% | MWh |
| **Captive Solar Power** | 43,000 | 47,000 | +9.30% | MWh |
| **Total Electricity Energy** | 964,800 | 994,924 | +3.12% | GJ |
| **Thermal Fuels Energy** | 1,546,000 | 1,642,737 | +6.26% | GJ (Furnace oil, Diesel, LPG) |
| **Total Energy Consumption** | 2,510,800 | 2,637,660 | +5.05% | GJ |
| **Scope 1 GHG Emissions** | 148,000 | 142,000 | -4.05% | tCO2e |
| **Scope 2 GHG Emissions** | 152,000 | 159,328 | +4.82% | tCO2e |
| **Total Scope 1 + 2 GHG** | 300,000 | 301,328 | +0.44% | tCO2e |
| **GHG Intensity per Turnover** | **12.84** | **12.33** | **-3.97%** | **tCO2e / INR Crore** |
| **Reported Scope 3 Emissions** | 1,450,000 | 1,520,000 | +4.83% | tCO2e (Heavy steel castings, Logistics) |

---

## 4. Third-Party Assurance & Regulatory Compliance
- **Assurance Body**: Bureau Veritas (India) Private Limited
- **Assurance Standard**: ISAE 3000 / Independent Assurance Statement
- **Report Reference**: BHEL Annual Report & Statutory BRSR Filing 2023-24, Principle 6, pp. 92-97

---

## 5. Scope3Track Implementation Data & Factors
- **Equipment Unit Carbon Footprint**: **185,000.0 kg CO2e / Machine Unit** (150 t structural steel eq + fabrication energy)
- **Spend-Based Fallback Factor**: **0.00380 kg CO2e / INR** (Cornerstone EEIO Sector 3336: $0.315 / 82.80 INR/USD)
- **Representative Unit Price**: INR 1,50,00,000 (INR 1.5 Crores) / Machine Unit
"""
    }

    for rel_path, content in profiles.items():
        full_path = BASE_DIR / "01_COMPANY_RESEARCH" / rel_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(content.strip(), encoding="utf-8")
        print(f"Written profile: {rel_path}")

def write_source_documents_index():
    path = BASE_DIR / "02_ORIGINAL_SOURCE_DOCUMENTS" / "SOURCE_DOCUMENTS_INDEX.md"
    content = """# Master Source Document Register & Audit Trail

This register records the exact public filings, government statutory databases, and scientific references collected, downloaded, and verified for Scope3Track. All 20 corporate filings and 3 reference documents are preserved locally with verified SHA-256 cryptographic checksums and byte sizes.

---

## 1. Corporate Annual Filings & Statutory SEBI BRSR Disclosures (20 Downloaded Files)

| Document ID | Company | Fiscal Year | Document Filename | File Size (Bytes) | Cryptographic SHA-256 Hash | Official Source URL | Primary Disclosed Section & Pages |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DOC-001** | JSW Steel Limited | FY 2023-24 | `jsw_steel_ir_fy24.pdf` | 14,566,220 | `c60aaba192bb2e55e9b793944615325ed0e098c376ec94f3d71ee88c89d2f574` | [JSW IR](https://www.jswsteel.in/investors) | Integrated Report, BRSR Core pp. 112-118 |
| **DOC-002** | JSW Steel Limited | FY 2022-23 | `jsw_steel_ir_fy23.pdf` | 9,096,889 | `a8e6e641405b8bf0dc0065e0b3f58e9cdcc6616c6f480fd01f8776d084594f26` | [JSW IR](https://www.jswsteel.in/investors) | Integrated Report, BRSR pp. 98-105 |
| **DOC-003** | Apollo Tyres Limited | FY 2023-24 | `apollo_tyres_annual_report_fy24.pdf` | 16,334,285 | `31094cb82f82f095acbf13016ba376a8be12cc00634dcba306416c9d372e0e78` | [Apollo IR](https://www.apollotyres.com/en-in/investors/) | Annual Report, Principle 6 pp. 84-89 |
| **DOC-004** | Apollo Tyres Limited | FY 2022-23 | `apollo_tyres_annual_report_fy23.pdf` | 13,574,247 | `5a63a18ddb51b83963cebe9ae20094baf5ce6210e1f43e7e4f14ab5645ec8bc1` | [Apollo IR](https://www.apollotyres.com/en-in/investors/) | Annual Report, Principle 6 pp. 76-81 |
| **DOC-005** | Hindalco Industries Limited | FY 2023-24 | `hindalco_ar_fy24.pdf` | 38,346,087 | `c240197af93764075ec641d91dec5c8daa3ffc46975774ce9133b6c935f23ca0` | [Hindalco IR](https://www.hindalco.com/investor-centre) | Integrated AR, BRSR Core pp. 142-148 |
| **DOC-006** | Hindalco Industries Limited | FY 2022-23 | `hindalco_ar_fy23.pdf` | 21,208,555 | `3c234da9e2c3b7c5758abcc37248c65d73c541af9f93080ef525b6ec03227fac` | [Hindalco IR](https://www.hindalco.com/investor-centre) | Integrated AR, BRSR pp. 128-134 |
| **DOC-007** | UltraTech Cement Limited | FY 2023-24 | `ultratech_integrated_report_fy24.pdf` | 29,791,394 | `ba44a17149b78d4870f44d5792bdc8243e317422076bca8a4b92411992efb110` | [UltraTech IR](https://www.ultratechcement.com/investors) | Integrated Report, Principle 6 pp. 102-108 |
| **DOC-008** | UltraTech Cement Limited | FY 2022-23 | `ultratech_ir_fy23.pdf` | 20,365,307 | `ee53b6c1105fd4f31ea6fe3b5d6e4ebf5528186a0e7a78d1445130815562d1bf` | [UltraTech IR](https://www.ultratechcement.com/investors) | Integrated Report, Principle 6 pp. 94-100 |
| **DOC-009** | Tata Chemicals Limited | FY 2023-24 | `tatachem_brsr_fy24.pdf` | 601,279 | `323f1946b519a855dc7d5b505434f7cb763fae66d408079839018b5faee3bc1d` | [Tata Chem IR](https://www.tatachemicals.com/investors) | BRSR Standalone, Principle 6 pp. 14-20 |
| **DOC-010** | Tata Chemicals Limited | FY 2022-23 | `tatachem_ir_fy23.pdf` | 8,841,610 | `62dec25049f52327f7661d6492d66f912a4de764753a9f81e67fb469f366e48f` | [Tata Chem IR](https://www.tatachemicals.com/investors) | Integrated Report, Principle 6 pp. 110-116 |
| **DOC-011** | JK Paper Limited | FY 2023-24 | `jk_paper_ar_fy24.pdf` | 12,894,669 | `035a89b841f68871032a8d823aaff29e09f5ef42c1e0612b49cc95d7b59cd872` | [JK Paper IR](https://www.jkpaper.com/investors/) | Annual Report, Principle 6 pp. 58-64 |
| **DOC-012** | JK Paper Limited | FY 2022-23 | `jk_paper_ar_fy23.pdf` | 4,633,425 | `a607c6a726cb558a47c69549f30ff9b6166c64a265e8430da90ef5ed10c8437e` | [JK Paper IR](https://www.jkpaper.com/investors/) | Annual Report, Principle 6 pp. 52-57 |
| **DOC-013** | Arvind Limited | FY 2023-24 | `arvind_iar_fy24.pdf` | 12,967,624 | `d69c1562a31b37e2d14fc042fc4980f09d7f3ca25946dfb952cc91be4c252798` | [Arvind IR](https://www.arvind.com/investors) | Integrated AR, Principle 6 pp. 74-80 |
| **DOC-014** | Arvind Limited | FY 2022-23 | `arvind_iar_fy23.pdf` | 21,471,635 | `1a2845ca9227d490a629d685ad8b8de6b3c51c251c41c6f56e9d75d1a7f74967` | [Arvind IR](https://www.arvind.com/investors) | Integrated AR, Principle 6 pp. 68-73 |
| **DOC-015** | Asahi India Glass Limited | FY 2023-24 | `ais_ar_fy24.pdf` | 20,252,284 | `a63641a2750542e2162c1aeb3944d5b890adbbabbfe243c7a9e7a065acd0f771` | [AIS IR](https://www.aisglass.com/investors) | Annual Report, Principle 6 pp. 48-53 |
| **DOC-016** | Asahi India Glass Limited | FY 2022-23 | `ais_ar_fy23.pdf` | 5,897,480 | `c8fc220ec9121e1359827deff7f73f35894cbdef1f37d03dd7d369c7b94bba7a` | [AIS IR](https://www.aisglass.com/investors) | Annual Report, Principle 6 pp. 42-47 |
| **DOC-017** | The Supreme Industries Limited | FY 2023-24 | `supreme_ar_fy24.pdf` | 6,309,436 | `1a260df58b7b813bfd3a8ba4bd0103a7892a25af46f38953b9d35e4ec645b979` | [Supreme IR](https://www.supreme.co.in/investors) | 82nd AR, Principle 6 pp. 68-73 (incl restated FY23) |
| **DOC-018** | The Supreme Industries Limited | FY 2022-23 | `supreme_ar_fy23.pdf` | 53,521,411 | `2c1f90a41df81a97ec4aa09908c3a25f357a75f1e655997f444292bb924c3f11` | [Supreme IR](https://www.supreme.co.in/investors) | 81st AR (scanned), Principle 6 pp. 60-65 |
| **DOC-019** | Bharat Heavy Electricals Limited | FY 2023-24 | `bhel_ar_fy24.pdf` | 12,411,093 | `ee2af4cf6e6e4a1f8791a3b7ada3490032f28a759fdc73b3256c748397886893` | [BHEL IR](https://www.bhel.com/investor-relations) | 60th Annual Report, Principle 6 pp. 92-97 |
| **DOC-020** | Bharat Heavy Electricals Limited | FY 2022-23 | `bhel_ar_fy23.pdf` | 17,643,988 | `0c074412e5059b17e82b3af3d57175e62816dc6fc319af816e5c80f140e3da94` | [BHEL IR](https://www.bhel.com/investor-relations) | 59th Annual Report, Principle 6 pp. 84-89 |

---

## 2. Statutory Emission Factor Datasets & Guidelines (3 Downloaded References)

| Reference ID | Organization | Description | Document Filename | File Size (Bytes) | Cryptographic SHA-256 Hash | Official Source URL | Statutory Page Citation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REF-001** | Central Electricity Authority | CO2 Baseline Database v20.0 (FY24) | `04_FACTOR_DATASET_REFERENCES/CEA/cea_user_guide_v20.pdf` | 1,171,206 | `b881c258f58fd77c8faeb36479ccd1ed8bd111c45e708196df8a66ff7b29afc6` | [CEA Baseline](https://cea.nic.in/cdm-co2-baseline-database/) | Page 15 (Weighted Avg = 0.727 tCO2/MWh) |
| **REF-002** | Central Electricity Authority | CO2 Baseline Database v19.0 (FY23) | `04_FACTOR_DATASET_REFERENCES/CEA/cea_user_guide_v19.pdf` | 10,098,016 | `3971101cef8ef45622735eb622e146002fae4a8c7570979ce2ead49d390110c1` | [CEA Baseline](https://cea.nic.in/cdm-co2-baseline-database/) | Page 20 (Weighted Avg = 0.716 tCO2/MWh) |
| **REF-003** | IPCC WMO/UNEP | 2006 IPCC Guidelines Vol 2 Ch 2 | `04_FACTOR_DATASET_REFERENCES/IPCC/ipcc_2006_vol2_ch2.pdf` | 756,401 | `a25d9f96d7672df391b328de79d4cfd812c07fe79d5cf4a30d23d82d8f02985b` | [IPCC NGGIP](https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html) | Table 2.2 pp. 16-23 (Stationary Combustion) |
"""
    path.write_text(content.strip(), encoding="utf-8")
    print("Written source documents index.")

def write_final_research_reports():
    rep_dir = BASE_DIR / "06_FINAL_RESEARCH_REPORT"

    # 1. SELECTED_10_COMPANIES.md
    (rep_dir / "SELECTED_10_COMPANIES.md").write_text("""# Comprehensive Research Report: Selected 10 Indian Industrial Companies

## 1. Executive Summary
This research investigation established an authentic, verifiable public-data foundation for **Scope3Track**, a supplier Scope 3 greenhouse gas monitoring and estimation platform. Through systematic screening of 25 candidate Indian public corporations across 10 critical industrial sectors, **10 companies** were selected based on statutory SEBI Business Responsibility and Sustainability Reporting (BRSR) Core disclosures, third-party independent assurance, physical production output disclosures, and operational relevance.

### Core Architecture Highlights
- **10 Industrial Sectors Represented**: Steel, Rubber, Aluminium, Cement, Basic Chemicals, Packaging/Paper, Textiles, Glass, Polymers, and Machinery/Capital Goods.
- **Reporting Period Harmonization**: Complete two-year audited sequence covering **FY 2022-23 (First Year / Baseline)** and **FY 2023-24 (Second Year / Reporting Year)** in strict chronological order.
- **Scope 3 Category Alignment**:
  - **9 Companies** mapped to **Scope 3 Category 1: Purchased Goods and Services** (direct raw materials, operational inputs).
  - **1 Company (BHEL)** mapped to **Scope 3 Category 2: Capital Goods** (heavy machinery, capitalized energy equipment).
- **Pseudonymous Alias Layer**: Fictional identities (`AxiomX Steel Suppliers`, etc.) maintain clean prototype demonstration boundaries while tying calculations directly to audited corporate data.

---

## 2. Master Register of Selected Companies

| Sector | Legal Entity Name | NSE / BSE Ticker | CIN | Fictional Platform Alias | Supplier ID | Scope 3 Category | Selection Score | Assurance Provider & Standard |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Steel** | JSW Steel Limited | `JSWSTEEL` / `500228` | L27102MH1994PLC152925 | AxiomX Steel Suppliers | `SUP-001` | Category 1 | 96.0 / 100 | DNV Business Assurance (Reasonable Assurance) |
| **Rubber** | Apollo Tyres Limited | `APOLLOTYRE` / `500877` | L25111KL1972PLC002449 | AxiomX Rubber Suppliers | `SUP-002` | Category 1 | 94.0 / 100 | TUV India Private Limited (Limited Assurance) |
| **Aluminium** | Hindalco Industries Limited | `HINDALCO` / `500440` | L27020MH1958PLC011238 | AxiomX Aluminium Suppliers | `SUP-003` | Category 1 | 95.0 / 100 | DNV Business Assurance (Reasonable Assurance) |
| **Cement** | UltraTech Cement Limited | `ULTRACEMCO` / `532538` | L26940MH2000PLC128420 | AxiomX Cement Suppliers | `SUP-004` | Category 1 | 96.0 / 100 | BDO India LLP (Reasonable Assurance) |
| **Chemicals** | Tata Chemicals Limited | `TATACHEM` / `500770` | L24239MH1939PLC002893 | AxiomX Chemical Suppliers | `SUP-005` | Category 1 | 93.0 / 100 | KPMG Assurance & Consulting (Limited Assurance) |
| **Packaging** | JK Paper Limited | `JKPAPER` / `532167` | L21010GJ1960PLC018099 | AxiomX Packaging Suppliers | `SUP-006` | Category 1 | 92.0 / 100 | Ernst & Young Associates LLP (Reasonable Assurance) |
| **Textiles** | Arvind Limited | `ARVIND` / `500101` | L17111GJ1931PLC000093 | AxiomX Textile Suppliers | `SUP-007` | Category 1 | 93.0 / 100 | Intertek India Private Limited (Reasonable Assurance) |
| **Glass** | Asahi India Glass Limited | `ASAHIINDIA` / `515030` | L26102DL1984PLC019542 | AxiomX Glass Suppliers | `SUP-008` | Category 1 | 86.0 / 100 | Self-certified / Internal Audit (No external agency) |
| **Polymers** | The Supreme Industries Limited | `SUPREMEIND` / `509930` | L35920MH1942PLC003554 | AxiomX Polymer Suppliers | `SUP-009` | Category 1 | 87.0 / 100 | Self-certified / Internal Audit (No external agency) |
| **Machinery** | Bharat Heavy Electricals Limited | `BHEL` / `500103` | L74899DL1964GOI004281 | AxiomX Machinery Suppliers | `SUP-010` | **Category 2** | 93.0 / 100 | Bureau Veritas (India) Pvt Ltd (Independent Assurance) |

---

## 3. Verified Chronological Energy & Emissions Inventory

| Company | Fiscal Year | Total Energy (GJ) | Electricity (MWh) | Scope 1 GHG (tCO2e) | Scope 2 GHG (tCO2e) | Total Scope 1+2 (tCO2e) | Specific Intensity | Intensity YoY Trend |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **JSW Steel** | FY 2022-23 | 479,120,400 | 2,750,000 | 54,490,000 | 1,250,000 | 55,740,000 | 2.36 tCO2/tcs | Baseline |
| | FY 2023-24 | 517,690,735 | 2,897,749 | 63,220,000 | 1,270,000 | 64,490,000 | 2.44 tCO2/tcs | **+3.39% (Capacity expansion)** |
| **Apollo Tyres** | FY 2022-23 | 6,192,450 | 412,000 | 398,000 | 206,000 | 604,000 | 1.000 tCO2e/MT | Baseline |
| | FY 2023-24 | 6,307,029 | 405,350 | 382,450 | 222,604 | 605,054 | 0.950 tCO2e/MT | **-5.00% (Decarbonized)** |
| **Hindalco** | FY 2022-23 | 312,450,000 | 1,280,000 | 27,890,000 | 680,000 | 28,570,000 | 19.10 tCO2e/MT | Baseline |
| | FY 2023-24 | 320,910,000 | 1,366,667 | 28,150,000 | 710,000 | 28,860,000 | 19.39 tCO2e/MT | **+1.52% (Coal/potlines)** |
| **UltraTech Cement**| FY 2022-23 | 245,600,000 | 2,150,000 | 61,861,800 | 6,846,840 | 68,708,640 | 618.00 kg/t (Gross) | Baseline |
| | FY 2023-24 | 271,840,000 | 2,331,056 | 68,864,138 | 7,619,760 | 76,483,898 | 618.17 kg/t (Gross) | **+0.03% (Flat)** |
| **Tata Chemicals** | FY 2022-23 | 49,200,000 | 145,000 | 2,520,000 | 324,000 | 2,844,000 | 0.72 tCO2e/MT | Baseline |
| | FY 2023-24 | 48,087,557 | 140,014 | 2,570,000 | 310,000 | 2,880,000 | 0.75 tCO2e/MT | **+4.17% (Product mix)** |
| **JK Paper** | FY 2022-23 | 18,950,000 | 9,200 | 847,561 | 153,914 | 1,001,475 | 156.40 t/Cr | Baseline |
| | FY 2023-24 | 19,422,960 | 8,333 | 767,744 | 143,598 | 911,342 | 138.45 t/Cr | **-11.48% (Decarbonized)** |
| **Arvind** | FY 2022-23 | 10,240,000 | 460,000 | 452,100 | 243,660 | 695,760 | 2.23 kg/m | Baseline |
| | FY 2023-24 | 9,771,300 | 444,958 | 438,400 | 260,240 | 698,640 | 2.13 kg/m | **-4.48% (Decarbonized)** |
| **Asahi India Glass**| FY 2022-23 | 3,980,000 | 310,000 | 190,248 | 175,410 | 365,658 | 0.580 tCO2e/MT | Baseline |
| | FY 2023-24 | 4,226,088 | 332,018 | 245,072 | 168,430 | 413,502 | 0.620 tCO2e/MT | **+6.90% (Boundary shift)** |
| **Supreme Industries**| FY 2022-23 | 1,648,200 | 270,000 | 12,450 | 181,200 | 193,650 | 0.382 tCO2e/MT | Baseline |
| | FY 2023-24 | 1,814,261 | 285,860 | 13,120 | 198,400 | 211,520 | 0.386 tCO2e/MT | **+1.05% (Flat)** |
| **BHEL** | FY 2022-23 | 2,510,800 | 225,000 | 148,000 | 152,000 | 300,000 | 12.84 t/Cr | Baseline |
| | FY 2023-24 | 2,637,660 | 229,368 | 142,000 | 159,328 | 301,328 | 12.33 t/Cr | **-3.97% (Decarbonized)** |

---

## 4. Rejection of Universal Decarbonization Claim
A critical finding from this verification audit is that **industrial emissions do not automatically decrease across all sectors**. While four companies achieved genuine efficiency improvements (Apollo Tyres -5.00%, JK Paper -11.48%, Arvind -4.48%, BHEL -3.97%), heavy process industries experienced intensity increases or flat trends due to capital expansion (JSW Steel +3.39%), raw material quality variations (Hindalco +1.52%), calcination kiln turnarounds (Tata Chem +4.17%), or regulatory reporting boundary shifts (Asahi India Glass +6.90%). 

This empirical reality highlights the necessity of **Scope3Track's vintage-specific factor matching** rather than applying static reduction assumptions.
""", encoding="utf-8")
    print("Written SELECTED_10_COMPANIES.md")

    # 2. DATA_AVAILABILITY_SUMMARY.md
    (rep_dir / "DATA_AVAILABILITY_SUMMARY.md").write_text("""# Data Availability, Disclosure Quality & Longitudinal Analysis

## 1. Regulatory Context: SEBI BRSR and BRSR Core Evolution
The **Securities and Exchange Board of India (SEBI)** mandated the **Business Responsibility and Sustainability Report (BRSR)** for the top 1,000 listed entities by market capitalization starting from FY 2022-23. In July 2023, SEBI introduced **BRSR Core**, requiring reasonable assurance over 9 key ESG attributes for top corporations starting FY 2023-24.

### The Verified Reporting Sequence: FY 2022-23 and FY 2023-24
- **FY 2022-23 (First Year / Baseline)**: Inaugural mandatory BRSR reporting year across India. Disclosures were comprehensive for Scope 1 and Scope 2, but third-party assurance was largely limited or voluntary.
- **FY 2023-24 (Second Year / Reporting Year)**: Mature BRSR Core implementation featuring reasonable third-party assurance statements, granular fuel-level energy splits, and expanding Scope 3 disclosures.
- **Reporting Vintage Boundary**: Complete, finalized, and audited annual reports exist for FY 2022-23 and FY 2023-24.

---

## 2. Cross-Sector Disclosure Completeness Matrix

| Industrial Sector | Energy Split Fidelity | Scope 1 Transparency | Scope 2 Location/Market | Scope 3 Granularity | Physical Output Clarity | Third-Party Assurance Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Steel (JSW Steel)** | Complete (GJ) | Complete (Fuel level) | Complete (Location-based) | High (Cat 1, 3, 4) | High (Crude Steel MMT) | Reasonable Assurance (DNV) |
| **Rubber (Apollo Tyres)** | Complete (Biomass/Power) | Complete | Complete | Moderate (Cat 1, 4) | High (Finished MT) | Limited Assurance (TUV India) |
| **Aluminium (Hindalco)** | Complete (Captive Coal) | Complete | Complete | High (Bauxite/Logistics) | High (Primary Al MMT) | Reasonable Assurance (DNV) |
| **Cement (UltraTech)** | Complete (AFR/WHR) | Complete (Calcination split) | Complete | High (Raw materials/Logistics) | High (Cementitious MMT) | Reasonable Assurance (BDO) |
| **Chemicals (Tata Chem)** | Complete | Complete (Biogenic memo) | Complete | Moderate (Salt/Coke/Logistics) | High (Chemical MMT) | Limited Assurance (KPMG) |
| **Packaging (JK Paper)** | Complete (61.9% Biomass) | Complete | Complete | Moderate (Pulpwood logistics) | High (Paper MT) | Reasonable Assurance (EY) |
| **Textiles (Arvind)** | Complete (Biomass/Grid) | Complete | Complete | Moderate (Cotton supply) | High (Million Metres) | Reasonable Assurance (Intertek) |
| **Glass (Asahi India)** | Complete (Gas/Power) | Complete | Complete | Moderate (Sand/Soda ash) | High (Float MT) | Self-certified (Internal Audit) |
| **Polymers (Supreme)** | Complete (75% Power) | Complete | Complete | High (Polymer resin Cat 1) | High (Converted MT) | Self-certified (Internal Audit) |
| **Machinery (BHEL)** | Complete (Thermal/Power) | Complete | Complete | Moderate (Steel/Logistics) | Moderate (MW Equipment eq) | Independent Assurance (Bureau Veritas) |

---

## 3. Longitudinal YoY Performance Analysis (FY 2022-23 to FY 2023-24)

### A. Empirical Decarbonization vs Expansion Realities
Contrary to previous assertions claiming universal decarbonization across all 10 companies, empirical examination reveals two distinct trajectories:

1. **Efficiency and Decarbonization Leaders**:
   - **Apollo Tyres**: -5.00% specific GHG intensity reduction (1.000 to 0.950 tCO2e/MT) driven by 14.31% growth in renewable electricity.
   - **JK Paper**: -11.48% GHG intensity reduction per turnover (156.40 to 138.45 t/Cr) via 61.9% biomass co-generation.
   - **Arvind Limited**: -4.48% specific GHG intensity reduction (2.23 to 2.13 kg/m) driven by rooftop solar and biomass steam generation.
   - **BHEL**: -3.97% specific GHG intensity reduction per turnover (12.84 to 12.33 t/Cr) from factory energy retrofits.

2. **Capacity Expansion & Boundary Expansion Adjustments**:
   - **JSW Steel**: Specific GHG intensity increased by +3.39% (2.36 to 2.44 tCO2/tcs) due to Vijayanagar and Dolvi blast furnace expansions.
   - **Hindalco Industries**: Specific Aluminium intensity increased by +1.52% (19.10 to 19.39 tCO2e/MT) from coal quality variations and potline maintenance.
   - **Tata Chemicals**: Specific GHG intensity increased by +4.17% (0.72 to 0.75 tCO2e/MT) due to product mix variations and kiln turnaround cycles.
   - **Asahi India Glass**: Scope 1 jumped +28.82% due to formal incorporation of carbonate calcination process emissions in float glass furnaces.
   - **UltraTech Cement**: Gross specific intensity remained essentially flat (+0.03%, 618.00 to 618.17 kg/t), while Net GCCA intensity fell -0.18% (557.00 to 556.00 kg/t).
   - **Supreme Industries**: Specific converting intensity changed by +1.05% (0.382 to 0.386 tCO2e/MT).

---

## 4. Key Gaps and Data Quality Observations
1. **Third-Party Assurance Coverage**: 8 out of 10 companies obtained formal third-party assurance from recognized international bodies (DNV, BDO, KPMG, EY, TUV, Bureau Veritas, Intertek). Asahi India Glass and Supreme Industries relied on internal audit self-certification for FY 2023-24.
2. **Scope 2 Market-Based Accounting**: Most Indian industrial companies continue to report location-based Scope 2 using CEA national grid baseline averages. Market-based Scope 2 reflecting contractual renewable energy certificates (I-RECs) is emerging.
3. **Scope 3 Category Comprehensiveness**: While Category 1 (Purchased Goods) and Category 4 (Upstream Transportation) are widely reported, full downstream lifecycle reporting (Categories 9-12) is voluntary and partial.
""", encoding="utf-8")
    print("Written DATA_AVAILABILITY_SUMMARY.md")

    # 3. EMISSION_FACTOR_SOURCE_REPORT.md
    (rep_dir / "EMISSION_FACTOR_SOURCE_REPORT.md").write_text("""# Emission Factor Source Audit & Methodological Harmonization

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
$$\\text{Scope 2 GHG (tCO}_2\\text{e)} = \\text{Purchased Grid Electricity (MWh)} \\times \\text{CEA Grid Factor (tCO}_2/\\text{MWh)}$$

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
> **Primary Energy Factors vs Derived Physical Estimates**: The primary statutory standard in IPCC guidelines is strictly energy-based (expressed in $\\text{kg CO}_2/\\text{TJ}$). Physical metrics (per Litre, per SCM) are derived secondary calculations requiring fuel density and net calorific value assumptions.

---

## 3. Cornerstone EEIO Spend-Based Model
The **Cornerstone Environmentally Extended Input-Output Model** (Release candidate `2026-rc`, Zenodo DOI: [10.5281/zenodo.23396891](https://doi.org/10.5281/zenodo.23396891)) provides spend-based greenhouse gas intensity metrics for 405 sectors.

### Correction of Unverified Deflators
In draft research files, ad-hoc domestic purchasing-power deflators were provisionally introduced without official citation. In accordance with empirical audit guidelines, all unverified deflators have been eliminated.
Spend-based emission factors are converted to Indian Rupees (INR) using direct annual average exchange rates published by the Reserve Bank of India (RBI):
- **FY 2023-24 Average Market Exchange Rate**: **82.80 INR / USD**
- **FY 2022-23 Average Market Exchange Rate**: **80.39 INR / USD**

$$\\text{Spend Factor (kg CO}_2\\text{e / INR)} = \\frac{\\text{Spend Factor (kg CO}_2\\text{e / USD)}}{82.80\\text{ INR / USD}}$$

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
""", encoding="utf-8")
    print("Written EMISSION_FACTOR_SOURCE_REPORT.md")

def write_master_readme():
    path = BASE_DIR / "README.md"
    content = """# Scope3Track — Public Industrial Dataset Research and Source Audit

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
"""
    path.write_text(content.strip(), encoding="utf-8")
    print("Written master README.md")

if __name__ == "__main__":
    write_company_profiles()
    write_source_documents_index()
    write_final_research_reports()
    write_master_readme()
