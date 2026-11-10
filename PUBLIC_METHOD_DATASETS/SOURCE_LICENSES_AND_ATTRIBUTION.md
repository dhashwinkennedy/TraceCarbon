# Scope3Track — Source Licenses, Intellectual Property & Attribution Notice

This document establishes the formal licensing, copyright permissions, data provenance citations, and attribution requirements for all public reference datasets, statutory databases, emission factors, and economic models referenced in the Scope3Track Activity-Based and Spend-Based research packages.

---

## 1. Open CEDA (Climate and Economic Detailed Assessment)

- **Source Organization:** Watershed Climate Inc. (`https://watershed.com`)
- **Dataset Title:** Open CEDA: Open-access Environmentally-Extended Input-Output (EEIO) greenhouse gas emission factors
- **Versions Consulted:** 
  - Open CEDA 2024 (Base Year 2022, Released May 22, 2025)
  - Open CEDA 2025 (Base Year 2023, Released May 22, 2025)
- **Distribution Channel:** AWS Open Data Sponsorship Program (`s3://open-ceda/data/`) and direct HTTPS distribution
- **Governing License:** Creative Commons Attribution-ShareAlike 4.0 International Public License ([CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/))

### Exact Source Attribution Requirement
In accordance with the notice included within the official Open CEDA workbook (`Open_CEDA_2024_Original.xlsx`, row 17):
> *"Open CEDA users agree to prominently include the attribution 'CEDA by Watershed' (a) wherever Scope 3 emissions calculations are generated, including Emissions Reports and excerpts; (b) on users marketing sites where emission factors are mentioned; and (c) on any part of users' platform, such as websites, web portals, or other applications where Scope 3 calculations are generated."*

### Application Integration Requirements (Future Phase 2)
1. Any future Scope3Track application endpoint, report export, calculation modal, or dashboard card presenting Open CEDA-derived spend-based calculations must prominently display the attribution badge:  
   **`CEDA by Watershed`** (linked to `https://watershed.com` and referencing CC BY-SA 4.0).
2. All cryptographic calculation receipts generated for spend-based calculations preserve `"attribution": "CEDA by Watershed"` and `"license": "CC BY-SA 4.0"` in their immutable metadata.
3. Pricing Basis Disclosure: Open CEDA factors are published in **Producer Price** (`kg CO2e / USD`). The Scope3Track implementation assumes procurement expenditure represents factory-gate / ex-works value; if purchaser invoice values (inclusive of wholesale margins, GST, and transport) are supplied, the boundary mismatch must be noted.

---

## 2. Central Electricity Authority (CEA) — CO₂ Baseline Database

- **Source Organization:** Central Electricity Authority (CEA), Ministry of Power, Government of India (`https://cea.nic.in`)
- **Database Title:** *Central Electricity Authority — CO₂ Baseline Database for the Indian Power Sector*
- **Source Classification:** Public government technical database published under the National Data Sharing and Accessibility Policy (NDSAP). It is an authoritative government baseline calculation reference; it is not described as a statutory legal standard unless explicitly enacted in specific environmental regulations.
- **Factor Basis & Documented Versions:**
  - **FY 2022–23 (Version 19.0, Published March 2024):**
    - Factor: **`0.716 kg CO₂ / kWh`** (`0.716 t CO₂ / MWh`)
    - Basis: **Weighted-average Indian national grid emission factor including renewable energy generation and captive power injection into the grid** (User Guide Section 3 / Table 1).
  - **FY 2023–24 (Version 20.0, Published December 2024):**
    - Factor: **`0.727 kg CO₂ / kWh`** (`0.727 t CO₂ / MWh`)
    - Basis: **Weighted-average Indian national grid emission factor including renewable energy generation and captive power injection into the grid** (User Guide Section 3 / Table 1).
  - **Version 22.0 Retrospective Time-Series Disclosure:**
    - The continuous time-series database Version 22.0 (published January 2026) reports retrospective updated figures of `0.7191 kg CO₂ / kWh` (FY22-23) and `0.7289 kg CO₂ / kWh` (FY23-24).
    - Scope3Track records the contemporary annual guide values (`0.716` and `0.727`) as the primary reporting-year baselines, while explicitly disclosing the Version 22 time-series values for full transparency. Version 19/20 values and Version 22 values are separated and never mixed.

---

## 3. Intergovernmental Panel on Climate Change (IPCC)

- **Source Organization:** Intergovernmental Panel on Climate Change (IPCC), World Meteorological Organization (WMO) / United Nations Environment Programme (UNEP) (`https://www.ipcc.ch`)
- **Publication Reference:** *2006 IPCC Guidelines for National Greenhouse Gas Inventories*, Volume 2: Energy, Chapter 1 (General Guidance) and Chapter 2 (Stationary Combustion); and *2019 Refinement to the 2006 IPCC Guidelines*.
- **Copyright & Reproduction Policy:**
  - IPCC publications are protected by copyright under international conventions.
  - Materials may be browsed, downloaded, and cited for personal, academic, and non-commercial educational purposes.
  - Reproduction of substantial extracts, redistribution of official PDFs, or commercial dissemination requires formal written permission from the IPCC Secretariat.
  - Accordingly, Scope3Track provides concise citations and numerical parameter references without unauthorized redistribution of copyrighted IPCC publications.
- **Specific Technical Factors Cited:**
  - Volume 2, Chapter 1, Table 1.2: Net Calorific Value (NCV) of Gas/Diesel Oil default $= 43.0\text{ TJ / Gg} = 43.0\text{ MJ / kg}$.
  - Volume 2, Chapter 2, Table 2.3: Stationary Combustion in Manufacturing Industries and Construction default factors:
    - $\text{CO}_2$: $74,100\text{ kg} / \text{TJ}$
    - $\text{CH}_4$: $3.0\text{ kg} / \text{TJ}$
    - $\text{N}_2\text{O}$: $0.6\text{ kg} / \text{TJ}$
  - Global Warming Potentials (GWPs): IPCC Fifth Assessment Report (AR5) 100-year GWP horizon ($\text{CO}_2 = 1, \text{CH}_4 = 28, \text{N}_2\text{O} = 265$).
  - Effective Stationary Diesel Factor: **$2.6853\text{ kg CO}_2\text{e} / \text{litre}$**.

---

## 4. Bureau of Indian Standards (BIS)

- **Source Organization:** Bureau of Indian Standards (BIS), Government of India (`https://standardsbis.bsbedge.com`)
- **Standard Document:** *IS 1460 : 2017 — Automotive Diesel Fuel Specification (Sixth Revision)*
- **Copyright Notice:** Indian Standards are copyrighted technical standards published by BIS. The full standard document is not redistributed within this package.
- **Referenced Density Specification:**
  - Clause 4, Table 1, Item (i) — Density at 15 °C: Permitted specification range is `820 to 845 kg/m³` (`0.820 to 0.845 kg/L`).
  - **Adopted Value:** **$0.840\text{ kg / litre}$**.
  - **Methodological Characterization:** This is a *selected diesel density assumption within the referenced specification range; it is not an empirically established national statistical median*.

---

## 5. Reserve Bank of India (RBI) Reference Rates

- **Source Organization:** Reserve Bank of India (Financial Markets Operations Department) (`https://www.rbi.org.in`)
- **Dataset Reference:** *Handbook of Statistics on the Indian Economy, Table 133: Annual Average Exchange Rates (Financial Year Basis)*
- **Official Table 133 Exchange Rates:**
  - **FY 2022–23 Annual Average:** **$80.3635\text{ INR / USD}$**
  - **FY 2023–24 Annual Average:** **$82.7897\text{ INR / USD}$**
- **Methodological Role:**
  - The primary spend-based calculations utilize Open CEDA's native embedded calendar-year exchange rates ($78.1861\text{ INR/USD}$ for CY2022 proxy and $82.4811\text{ INR/USD}$ for CY2023 proxy) to maintain internal economic consistency with the Open CEDA input-output matrix coefficients.
  - The official RBI Table 133 financial-year rates are maintained strictly for currency sensitivity analysis and statutory financial year reconciliation, and are not substituted into calculations without re-deriving the corresponding sector factor.

---

## 6. Cornerstone EEIO Model (Supplementary Benchmark)

- **Source Organizations:** Watershed Technology, Inc. & Eastern Research Group (ERG)
- **Dataset Title:** *Cornerstone EEIO Spend-Based Greenhouse Gas Emission Factors (Release Candidate 2026-rc)*
- **Zenodo Persistent Identifier:** [DOI: 10.5281/zenodo.23396891](https://doi.org/10.5281/zenodo.23396891)
- **Governing License:** Creative Commons Attribution 4.0 International ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/))
- **Role in Scope3Track:** Evaluated and retained as an optional forward-looking benchmark in `SOURCE_DOWNLOADS/CORNERSTONE_OPTIONAL/`. It is not utilized for historical FY2022–FY2024 calculations because its primary measurement coverage is 2024–2026.

---

## 7. Scope3Track Synthetic Supplier & Purchase Records

- **Nature of Data:** Fictional demonstration data created for the Scope3Track pair programming hackathon evaluation.
- **Product-Factor Characterization:**
  - All product-level carbon footprints are designated as:  
    **`Synthetic demonstration product factor — not independently verified.`**
  - They represent deterministic engineering intensity estimates and **do not constitute an accredited ISO 14067 product life-cycle assessment (LCA)**.
- **Activity Data Characterization:**
  - Facility electricity consumption, diesel volumes, and production quantities are designated as:  
    **`Supplier-specific energy activity allocation estimate — synthetic demonstration data.`**
  - They do not represent audited, third-party verified, or real-world industrial corporate filings.
