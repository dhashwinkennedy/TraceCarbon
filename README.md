# TraceCarbon

**Trace. Measure. Improve.**

AI-Assisted Scope 3 Supplier Emissions Management and Analytics Platform.

---

## 1. Project Overview

**TraceCarbon** is an enterprise-grade Greenhouse Gas (GHG) accounting and value-chain decarbonization platform built to solve the upstream Scope 3 reporting challenge.

In modern manufacturing, indirect emissions arising from purchased goods, services, and capital equipment (Scope 3 Categories 1 and 2) typically represent **75% to 92%** of a company's total climate footprint. However, corporate disclosures frequently rely on coarse spend-based macroeconomic averages because primary supplier engagement is hindered by non-standard spreadsheets, incompatible units of measure, and missing audit evidence.

TraceCarbon bridges this gap by enabling manufacturing enterprises (represented by **ABC Manufacturing Ltd**) to:
- Collect heterogeneous operational spreadsheets from multi-tier industrial suppliers.
- Map custom supplier spreadsheet formats automatically via **agentic Large Language Models**.
- Compute Scope 3 emissions across **all three GHG Protocol calculation tiers** (Product-Factor, Spend-Based Open CEDA, and Activity-Based Supplier Allocation).
- Provide independent ESG auditors with an isolated verification console featuring secure, in-memory Blob-streamed evidence inspection.
- Perform automated **AI Report Quality & Completeness Scans** to audit emissions disclosures prior to statutory submission under SEBI BRSR Core, EU CSRD, or SEC frameworks.

---

## 2. Core Features

- **Executive Manufacturer Dashboard**: High-level portfolio KPI cards, method distribution tracking, and year-over-year comparison bars.
- **Ten Synthetic Industrial Suppliers**: Covers steel, rubber, aluminium, cement, chemicals, packaging, textiles, glass, polymers, and heavy machinery.
- **Supplier Annual Reporting**: Multi-period reporting with preloaded baselines (FY22-23) and live reporting uploads (FY23-24).
- **Excel & CSV Ingestion**: Robust handling of `.xlsx` and `.csv` files with multiple header structures and mixed unit representations.
- **AI-Assisted Spreadsheet Column Mapping**: Autonomous schema inference powered by NVIDIA Nemotron 3 Ultra via OpenRouter.
- **Supplier Mapping Confirmation**: Transparent human-in-the-loop review interface allowing suppliers to verify or manually adjust detected columns.
- **Three Emissions Calculation Methodologies**:
  1. *Product-Factor Method* (Cradle-to-gate intensity factor multiplication).
  2. *Spend-Based Method* (Macroeconomic EEIO modeling via Open CEDA by Watershed under CC BY-SA 4.0).
  3. *Activity-Based Method* (Supplier facility Scope 1 & 2 operational energy allocation).
- **AI Report Quality & Completeness Scan**: Pre-audit gap analysis evaluating data completeness, energy intensity ratios, and compliance.
- **Supporting Evidence Attachment**: Direct upload and storage of primary PDF invoices, weighbridge slips, and utility electricity bills.
- **Secure Auditor Evidence Preview**: Phase 2.10 secure binary Blob streaming utilizing short-lived browser Object URLs (`URL.createObjectURL()`) with zero query-token exposure.
- **Auditor Verification & Clarification**: Multi-stage review workflows with approval, rejection, and immutable signed audit receipts.
- **Supplier-Wise Analytics**: Granular vendor emissions profiling, method breakdown, and supplier emissions intensity rankings.
- **Category-Wise Analytics**: Clear segregation between Category 1 (*Purchased Goods and Services*) and Category 2 (*Capital Goods*).
- **Financial Year-over-Year (YoY) Dynamics**: Side-by-side comparison of FY 2022–23 baseline versus FY 2023–24 reporting periods.
- **Emissions Portfolio Reporting**: Reconciled analytical reporting exports in multi-tab Excel (`.xlsx`) and print-ready PDF formats.

---

## 3. Emissions Calculation Methodologies

TraceCarbon implements all three calculation approaches defined in the GHG Protocol *Corporate Value Chain (Scope 3) Standard*:

### 3.1 Product-Factor Method
- **Formula**:
  $$\text{Emissions (kg CO}_2\text{e)} = \text{Purchased Quantity} \times \text{Product Emission Factor}$$
- **Source**: Industry-average cradle-to-gate life cycle assessments (LCA) reflecting secondary emission intensities.
- **Boundary**: Raw material extraction through final factory gate.

### 3.2 Activity-Based Method (Supplier-Specific Operational Allocation)
- **Formula**:
  $$\text{Scope 1} = \text{Diesel Litres} \times 2.6853 \text{ kg CO}_2\text{e/L}$$
  $$\text{Scope 2} = \text{Grid Electricity (kWh)} \times \text{CEA Grid Factor}$$
  $$\text{Facility Energy Emissions} = \text{Scope 1} + \text{Scope 2}$$
  $$\alpha = \frac{\text{Purchased Quantity}}{\text{Annual Facility Production}}$$
  $$\text{Allocated Emissions} = \alpha \times \text{Facility Energy Emissions}$$
- **Statutory Factors**:
  - Central Electricity Authority (CEA) of India: Version 19.0 ($0.716 \text{ kg/kWh}$ for FY23) and Version 20.0 ($0.727 \text{ kg/kWh}$ for FY24).
  - 2006 IPCC Guidelines Vol. 2 Ch. 2 Table 2.2: Commercial diesel combustion ($2.6853 \text{ kg CO}_2\text{e/L}$ at density $0.840 \text{ kg/L}$).
- **Boundary & Guardrail**: Covers supplier gate-to-gate operational energy. Strictly enforces the validation constraint $\alpha \le 1.0$.

### 3.3 Spend-Based Method (Open CEDA by Watershed)
- **Formula**:
  $$\text{Emissions (kg CO}_2\text{e)} = \left(\frac{\text{Procurement Spend (INR)}}{\text{RBI FX Rate (INR/USD)}}\right) \times \text{CEDA Factor (kg CO}_2\text{e/USD)}$$
- **Statutory Factors**:
  - Open CEDA by Watershed (USEEIO v2.0.1 model), released under CC BY-SA 4.0.
  - Reserve Bank of India (RBI) Reference Rates: ₹78.186062 (FY22-23) and ₹82.481132 (FY23-24).
- **Boundary**: Macroeconomic supply-chain cradle-to-gate environmental impact.

---

## 4. Dataset and Mock Data Transparency

> [!IMPORTANT]
> **SYNTHETIC DEMONSTRATION DISCLOSURE**:  
> *"Synthetic demonstration datasets informed by publicly available industrial benchmarks and statutory emission factors. Not actual company disclosures."*

TraceCarbon uses fictional **AxiomX** supplier entities and simulated procurement records designed to represent the supply chain of ABC Manufacturing Ltd without disclosing confidential corporate secrets:

| Supplier ID | Fictional Legal Entity | Primary Industry | Benchmark Reference Company | Benchmark Reference Disclosures |
| :--- | :--- | :--- | :--- | :--- |
| **SUP-001** | AxiomX Steel Suppliers | Steel & Ferrous Metals | JSW Steel Limited | Audited SEBI BRSR FY23/FY24 Principle 6 |
| **SUP-002** | AxiomX Rubber Suppliers | Industrial Rubber | Apollo Tyres Limited | Audited SEBI BRSR FY23/FY24 Principle 6 |
| **SUP-003** | AxiomX Aluminium Suppliers | Non-Ferrous Metals | Hindalco Industries Limited | Audited SEBI BRSR FY23/FY24 Principle 6 |
| **SUP-004** | AxiomX Cement Suppliers | Cement & Concrete | UltraTech Cement Limited | Audited SEBI BRSR FY23/FY24 Principle 6 |
| **SUP-005** | AxiomX Chemical Suppliers | Basic Chemicals | Tata Chemicals Limited | Audited SEBI BRSR FY23/FY24 Principle 6 |
| **SUP-006** | AxiomX Packaging Suppliers | Paper & Packaging | JK Paper Limited | Audited SEBI BRSR FY23/FY24 Principle 6 |
| **SUP-007** | AxiomX Textile Suppliers | Technical Textiles | Arvind Limited | Audited SEBI BRSR FY23/FY24 Principle 6 |
| **SUP-008** | AxiomX Glass Suppliers | Glass & Silicates | Asahi India Glass Limited | Audited SEBI BRSR FY23/FY24 Principle 6 |
| **SUP-009** | AxiomX Polymer Suppliers | Polymers & Plastics | Supreme Industries Limited | Audited SEBI BRSR FY23/FY24 Principle 6 |
| **SUP-010** | AxiomX Machinery Suppliers | Heavy Capital Goods | BHEL | Audited SEBI BRSR FY23/FY24 Principle 6 |

Operational intensities (kWh/tonne, diesel litres/tonne, material yields) were calibrated against empirical sector medians from public annual reports. FY 2023–24 activity data reflects realistic industrial efficiency interventions (VFD motor retrofits, rooftop solar, rolling line additions) applied to the FY 2022–23 baseline. Fictional supplier companies are not actual subsidiaries of the benchmark corporations.

---

## 5. Technology Stack

### Frontend
- **Framework**: React 19 (`19.0.0`) with TypeScript (`5.7.2`)
- **Bundler**: Vite (`6.0.7`)
- **Styling**: Tailwind CSS (`3.4.17`)
- **State & Routing**: React Router DOM (`7.1.1`)
- **HTTP Client**: Axios (`1.7.9`) with Bearer token interceptors and 120s timeout
- **Visualizations**: Chart.js (`4.4.7`) & React-Chartjs-2 (`5.3.0`)
- **Icons**: Lucide React (`0.469.0`)

### Backend
- **Framework**: FastAPI (`0.115.6`) running on Uvicorn ASGI
- **Data Validation**: Pydantic (`2.10.4`) & Pydantic-Settings (`2.7.0`)
- **Database Driver**: PyMongo (`4.10.1`) & Motor (`3.6.0`)
- **Authentication**: PyJWT (`2.10.1`) with HS256 algorithm
- **Password Security**: Passlib (`1.7.4`) with Argon2 password hashing
- **Spreadsheet Processing**: openpyxl (`3.1.5`) & pandas (`2.2.3`)

### Database
- **Primary Database**: MongoDB Atlas (v7.0/v8.0)
- **Environments**:
  - `scope3track_final_qa`: QA multi-method validation environment (20 active calculations, 8 historical receipts).
  - `scope3track`: Production baseline environment (20 active calculations, 100% Product-Factor).

### AI Integration
- **Gateway**: OpenRouter API (`https://openrouter.ai/api/v1`)
- **Model**: NVIDIA Nemotron 3 Ultra (`nvidia/nemotron-3-ultra-550b-a55b:free`)
- **Capabilities**: Tabular schema inference, column matching, and pre-audit ESG completeness scanning.

---

## 6. Repository Structure

```text
TraceCarbon/
├── backend/                              # Python FastAPI Application
│   ├── app/
│   │   ├── main.py                       # REST API, routing, calculations & security
│   │   ├── calculation_safety.py         # Multi-method calculation engine & guardrails
│   │   └── scripts/                      # Database seed and factor initialization scripts
│   ├── tests/                            # Automated pytest test suites & fixtures
│   │   ├── fixtures/                     # Test spreadsheets and evidence PDFs
│   │   └── test_*.py                     # Unit, integration, security & regression tests
│   ├── requirements.txt                  # Python runtime dependencies
│   └── .env.example                      # Backend environment template
├── frontend/                             # React 19 + TypeScript Single Page App
│   ├── src/
│   │   ├── components/                   # Modal viewers, persona cards, navigation
│   │   ├── pages/                        # Dashboard, Purchases, Suppliers, Analytics
│   │   ├── services/                     # Axios API client & interceptors
│   │   └── App.tsx                       # Route definitions and auth state
│   ├── package.json                      # Frontend scripts & dependencies
│   ├── tailwind.config.js                # Tailwind CSS design system
│   └── vite.config.ts                    # Vite build configuration
├── docs/                                 # Centralized Documentation & Reports
│   ├── reports/                          # Statutory reports, analytics workbooks & audits
│   │   ├── TRACE_CARBON_COMPLETE_PROJECT_REPORT.md
│   │   ├── TRACE_CARBON_COMPLETE_PROJECT_REPORT.pdf
│   │   ├── TRACE_CARBON_ANALYTICS_REPORT.xlsx
│   │   ├── TRACE_CARBON_DATA_RECONCILIATION.md
│   │   ├── TRACE_CARBON_SUPPLIER_DATA_PROVENANCE_AUDIT.md
│   │   └── [Historical QA & Phase Reports]
│   └── architecture/                     # Architectural diagrams & specifications
│       └── ARCHITECTURE_OVERVIEW.md
├── scripts/                              # Repository migration and audit utilities
│   ├── migrate_to_axiomx_dataset.py      # Master dataset reset & import script
│   └── [Audit & Verification Utilities]
├── SUPPLIER_ANNUAL_DATASETS_2Y/          # 20 Supplier-Year Activity Workbooks (.xlsx)
│   ├── PRELOAD_DATA/                     # 17 Preloaded baseline workbooks
│   ├── MANUAL_UPLOAD_DATA/               # 3 Live-upload demonstration workbooks
│   └── MASTER_DATASET/                   # Consolidated two-year master workbook
├── PUBLIC_DATASET_RESEARCH/              # Empirical Corporate Research & Baselines
│   ├── 01_COMPANY_RESEARCH/              # 10 Corporate profiles from SEBI BRSR filings
│   ├── 02_ORIGINAL_SOURCE_DOCUMENTS/     # Audited annual report filings
│   └── generate_synthetic_demo_dataset.py# Deterministic dataset generation script
├── PUBLIC_METHOD_DATASETS/               # Spend-based & activity-based factor registers
├── uploads/                              # Demonstration evidence storage (PDFs & CSVs)
├── .env.example                          # Root environment configuration template
├── .gitignore                            # Comprehensive Git exclusion rules
└── README.md                             # Repository master documentation
```

---

## 7. Prerequisites

Before installing and running TraceCarbon, ensure the following software is installed on your system:

- **Operating System**: Windows 10/11, macOS, or Linux.
- **Python**: Version `3.10`, `3.11`, or `3.12` (Python 3.14 compatible).
- **Node.js**: Version `18.x`, `20.x`, or `22.x` (LTS recommended).
- **Package Manager**: `npm` (v9+) or `pnpm` (v8+).
- **Database**: Access to **MongoDB Atlas** or a local MongoDB server (`v6.0+`).
- **OpenRouter API Key**: Required for AI column mapping and report quality scanning features.

---

## 8. Installation and Setup (Windows PowerShell)

### Step 1: Clone the Repository
```powershell
git clone <repository-url>
cd "backend codex"
```

### Step 2: Configure Environment Variables
Copy the root `.env.example` file to `.env`:
```powershell
Copy-Item .env.example .env
```
Edit `.env` and provide your MongoDB connection string and OpenRouter API key:
```ini
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/
MONGODB_DB=scope3track_final_qa
OPENROUTER_API_KEY=your_openrouter_api_key_here
JWT_SECRET_KEY=generate_a_secure_random_string_minimum_32_chars
```

### Step 3: Backend Setup
Create and activate a Python virtual environment:
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
```

Start the FastAPI application with Uvicorn:
```powershell
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
The REST API will be available at:
- **API Base**: `http://127.0.0.1:8000`
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`

### Step 4: Frontend Setup
In a new terminal window, navigate to `frontend` and install dependencies:
```powershell
cd frontend
npm install
npm run dev
```
The user interface will be available at:
- **Web App**: `http://localhost:5173`

---

## 9. Demo Workflow

The platform includes preloaded **Quick Demo Personas** directly accessible on the login screen:

1. **Log in as Manufacturer**:
   - Email: `manufacturer@example.com` | Password: `password123`
   - Explore the executive portfolio dashboard displaying **3,425.55 t CO2e** active emissions.
   - Filter purchases by Product-Factor, Spend-Based, and Activity-Based methods.
2. **Log in as Supplier (AxiomX Steel)**:
   - Email: `steel@axiomx.com` | Password: `password123`
   - Navigate to the upload portal and upload the FY23-24 holdout workbook:
     `SUPPLIER_ANNUAL_DATASETS_2Y/MANUAL_UPLOAD_DATA/SUP-001_AxiomX_Steel_Suppliers_FY2023-24.xlsx`
3. **AI Column Mapping & Confirmation**:
   - Click **AI Analyse** to trigger semantic column detection via Nemotron 3 Ultra.
   - Confirm the detected mappings in the dropdown selectors.
   - Attach synthetic PDF evidence and submit the report.
4. **Log in as Auditor**:
   - Email: `auditor@example.com` | Password: `password123`
   - Review assigned submissions and click the **View Evidence** button.
   - Inspect the utility bill rendered via secure, temporary in-memory Object URLs (`URL.createObjectURL()`).
   - Click **Approve Submission** to generate an immutable verification receipt.
5. **AI Report Quality Scan**:
   - Return to the Manufacturer view and click **AI Report Quality & Completeness Scan**.
   - Review the automated completeness score, anomaly detection, and ESG regulatory alignment.

---

## 10. Data Directory Documentation

- **`SUPPLIER_ANNUAL_DATASETS_2Y/`**: Contains the 20 supplier-year workbooks (17 preload + 3 manual upload) with detailed operational metrics and statutory disclaimers.
- **`PUBLIC_DATASET_RESEARCH/`**: Contains empirical research on 10 publicly listed Indian companies, source documents index, and the master dataset generation engine (`generate_synthetic_demo_dataset.py`).
- **`PUBLIC_METHOD_DATASETS/`**: Contains factor registers for spend-based CEDA calculations and stationary diesel combustion parameters.
- **`backend/app/scripts/` & `scripts/`**: Contains automated database seeding and migration scripts.
- **`backend/tests/fixtures/` & `uploads/`**: Contains test fixtures and demonstration PDF utility bills and fuel receipts.
- **`docs/reports/`**: Houses all official reports, including the 25-section complete project report, analytics spreadsheet, data reconciliation, and provenance audit.

---

## 11. Security Considerations

- **Secrets Isolation**: Real credentials, connection strings, and JWT secrets are strictly managed via `.env` and excluded from Git tracking via `.gitignore`.
- **Stateless Bearer JWT**: Authenticated sessions utilize cryptographically signed HS256 tokens carrying role and supplier scopes.
- **Argon2 Password Hashing**: Passwords are protected using memory-hard Argon2 hashing via Passlib.
- **Zero Query-Token Evidence Streaming (Phase 2.10)**: Evidence files are streamed as binary Blobs over authenticated Axios connections and rendered via temporary in-memory Object URLs (`URL.createObjectURL()`), which are revoked immediately upon unmount (`URL.revokeObjectURL()`). Session tokens are never exposed in query strings (`?token=`).
- **Resolved-Path Traversal Containment (Phase 2.10.1)**: The file retrieval endpoint resolves canonical paths using `Path.resolve()` and strictly verifies containment using `Path.relative_to()`, neutralizing `../` traversal attempts and symlink escapes.

---

## 12. Testing

TraceCarbon is backed by an automated testing suite:

### Backend Tests (pytest)
Run the complete backend test suite:
```powershell
pytest backend/tests/ -v
```
Run dedicated security and calculation verification tests:
```powershell
pytest backend/tests/test_evidence_viewer_security.py -v
pytest backend/tests/test_path_traversal_security.py -v
pytest backend/tests/test_phase2_2_multi_method.py -v
```

### Frontend Build Verification
Verify TypeScript compilation and Rollup production bundling:
```powershell
cd frontend
npm run build
```

---

## 13. Project Limitations

1. **Synthetic Supplier Identifies**: Supplier legal entities (`AxiomX Steel`, etc.) and procurement volumes are synthetic demonstration scenarios.
2. **Operational Energy Scope**: The activity-based method allocates gate-to-gate facility Scope 1 and Scope 2 energy emissions. Upstream raw material extraction and process chemical emissions are not dynamically included unless reported by the vendor.
3. **Grid Regionality**: Scope 2 grid electricity calculations apply the national combined margin average from the Central Electricity Authority (CEA) rather than state-specific grid factors.
4. **Inflation Adjustments**: Spend-based CEDA calculations apply annual statutory RBI exchange rates without dynamic quarterly Producer Price Index (PPI) deflators.

---

## 14. License

**License Status**: Not yet specified.  
*The intellectual property and licensing terms of TraceCarbon are subject to decision and determination by the project owner and ABC Manufacturing Ltd.*

---

## 15. References and Attributions

1. **GHG Protocol**: *Corporate Value Chain (Scope 3) Standard*, World Resources Institute (WRI) & World Business Council for Sustainable Development (WBCSD).
2. **Central Electricity Authority (CEA)**: *CO2 Baseline Database for the Indian Power Sector*, Ministry of Power, Govt. of India (User Guide Version 19.0 Dec 2023 & Version 20.0 Dec 2024).
3. **2006 IPCC Guidelines**: Volume 2 (Energy), Chapter 2 (Stationary Combustion), Table 2.2 default parameters for commercial diesel fuel.
4. **Open CEDA by Watershed**: Comprehensive Environmental Data Archive based on the US BEA USEEIO v2.0.1 model, licensed under the Creative Commons Attribution-ShareAlike 4.0 International License (CC BY-SA 4.0).
5. **SEBI BRSR Principle 6 Disclosures**: Audited filings of JSW Steel, Apollo Tyres, Hindalco, UltraTech, Tata Chemicals, JK Paper, Arvind, Asahi Glass, Supreme Industries, and BHEL.
