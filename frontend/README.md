# Scope3Track — Modern Frontend Portal
> **"Supplier Carbon Data. Simplified."**

Scope3Track is a production-grade enterprise carbon accounting web application designed to track, normalize, calculate, and audit Scope 3 GHG emissions across **Category 1 (Purchased Goods & Services)** and **Category 2 (Capital Goods)**.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **FastAPI Backend**: Running at `http://127.0.0.1:8000`

### 1. Installation
Navigate into the `frontend` folder:
```bash
cd frontend
npm install
```

### 2. Environment Configuration
The project comes pre-configured to connect to the local FastAPI backend.
If you need to customize the backend URL, create `.env.local`:
```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```
> **Security Note**: Vite environment variables are public to the browser. Never place database strings or backend secret keys inside frontend `.env` files.

### 3. Run Development Server
```bash
npm run dev
```
The application will launch at:
👉 **`http://localhost:5173`** (or next available port)

### 4. Build for Production
To generate an optimized production bundle:
```bash
npm run build
npm run preview
```

---

## 👥 Demo Personas & Preloaded Credentials

The login screen features **one-click Quick Demo Personas** that pre-fill authorized credentials:

| Persona | Role | Email | Password | Primary Jurisdiction |
| :--- | :--- | :--- | :--- | :--- |
| **ABC Manufacturing** | Manufacturer | `manufacturer@scope3track.demo` | `ManufacturerDemo123!` | Enterprise Scope 3 Inventory |
| **XYZ Steel** | Supplier | `xyz.steel@scope3track.demo` | `SupplierDemo123!` | Electricity, diesel & production reporting |
| **Green Aluminium** | Supplier | `green.aluminium@scope3track.demo` | `SupplierDemo123!` | Gas & clean manufacturing metrics |
| **Auditor One** | Auditor | `auditor.xyz@scope3track.demo` | `AuditorDemo123!` | Third-party verification & quality assurance |
| **Auditor Two** | Auditor | `auditor.green@scope3track.demo` | `AuditorDemo123!` | Verification & invoice cross-referencing |

---

## 🏛️ Platform Architecture & Workspaces

### 1. 🏭 Enterprise Manufacturer Workspace (`/manufacturer/*`)
- **Emissions Intelligence Dashboard**:
  - Live aggregated footprint metrics (Total Scope 3, Category 1, Category 2).
  - Interactive Chart.js Doughnut for GHG Protocol distribution.
  - Horizontal Bar Chart of emissions by upstream supplier.
  - Monthly reporting cycle filter (`2025-01`, `2025-02`, `2025-03`, or All Months).
- **Supplier Relationship & Governance**:
  - Maintain supplier profiles, contact emails, and operating countries.
  - **Dynamic Activity Requirements**: Configure mandated metrics (`activity_id`, `expected_unit`, `aggregation_rule: sum | average | last`).
- **Auditor Allocation**:
  - Register independent sustainability verifiers.
  - Formally bind auditors to supplier portfolios with audit trails.
- **Product Catalog & Emission Factors**:
  - Product specifications, default units, and Scope 3 classification.
  - Centralized Factor Library: Product-Factor, Activity-Based, and Spend-Based intensities.
  - Standardized Activity Taxonomy Library (`electricity_grid`, `diesel_stationary`, `natural_gas`, etc.).
- **Procurement Ledger Ingestion**:
  - **Download Fixed-Format Template**: Download certified `Scope3Track_Purchase_Template.xlsx`.
  - **Ledger Upload & Pre-Ingestion Validation**: Strict schema verification against 7 mandatory columns (`supplier_id`, `product_name`, `reporting_month`, `purchased_quantity`, `quantity_unit`, `purchase_expenditure`, `currency`).
  - Row-level error reporting, duplicate detection, and batch confirmation.
- **Emissions Calculation Engine**:
  - Supports 3 certified methodologies:
    1. **Product-Factor**: `Emissions = Quantity × Factor_Value`
    2. **Activity-Based**: `Emissions = (Reported Supplier Activities × Factors) × Allocation_Value`
    3. **Spend-Based**: `Emissions = Expenditure × Factor_Value`
  - **Verifiable Audit Receipt**: Full cryptographic transparency modal including formula, raw inputs, applied factors, allocation fraction, and SHA-256 hash.
- **Compliance & ESG Reports**:
  - Exportable CSV reports for CSRD, SEC Climate, and BRSR disclosures.

---

### 2. ⚡ Supplier Carbon Portal (`/supplier/*`)
- **Supplier Dashboard**:
  - Metrics tracking mandated activities, submission status, and pending inquiries.
- **Mandated Reporting Requirements**:
  - Clear overview of required energy and fuel streams with automatic unit normalization notes.
- **Monthly Carbon Submissions**:
  - Create and manage monthly reporting drafts.
  - **Manual Metric Logging**: Input figures with unit conversion engine (e.g., inputting `100 MWh` automatically normalizes to `100,000 kWh`).
  - **Audit Evidence Vault**: Upload supporting invoices, utility bills, and meter photos (`.pdf`, `.xlsx`, `.csv`).
- **Spreadsheet Ingestion Wizard**:
  - **Step 1**: Target Report Selection & File Upload.
  - **Step 2**: OpenRouter AI Column Mapping (advisory suggestions with rationale and confidence).
  - **Step 3**: Supplier Review & Alignment Confirmation.
  - **Step 4**: Schema & Data Integrity Validation Preview.
  - **Step 5**: Automatic Extraction & Ingestion into Monthly Report.
- **Auditor Inquiries & Clarifications**:
  - Review questions raised by third-party auditors and submit written explanations.
- **AI Carbon Reduction Opportunities**:
  - Abatement cards synthesizing energy efficiency, renewable energy, and process improvements with estimated capex, timeline, and reduction percentages.

---

### 3. 🔍 Auditor Verification Desk (`/auditor/*`)
- **Portfolio Jurisdiction**:
  - Inspect allocated suppliers and submissions ready for audit.
- **Independent Verification Workspace**:
  - Inspect primary reported activities alongside normalized conversion units.
  - Record formal **Audit Findings & Verification Notes**.
  - Raise formal **Clarification Requests** directly to the supplier.
  - Resolve clarification inquiries once satisfied with supplier explanations.
  - **AI Report Quality Scan**: Multi-criteria evaluation assessing report completeness, unit consistency, and anomaly detection.
  - **AI Evidence Cross-Referencing**: PyMuPDF-backed numerical extraction cross-referencing attached PDF invoices against reported values, reporting variance percentages.
  - *(Strictly adheres to verification standards with no arbitrary approve/reject toggles)*.

---

## 📂 Project Directory Structure

```text
frontend/
├── dist/                      # Production build assets
├── public/                    # Static assets
├── src/
│   ├── components/
│   │   ├── charts/            # CategoryDoughnut, SupplierEmissionsBar, MethodBreakdownChart
│   │   ├── common/            # MetricCard, StatusBadge, PageHeader, LoadingSpinner, ConfirmationModal, ProtectedRoute
│   │   └── layout/            # Sidebar, Topbar, AppLayout
│   ├── context/
│   │   └── AuthContext.tsx    # Session-backed JWT authentication state & role checking
│   ├── pages/
│   │   ├── auth/              # LoginPage, ChangePasswordPage
│   │   ├── manufacturer/      # 10 pages: Dashboard, Suppliers, Detail, Auditors, Products, Factors, Purchases, Submissions, Detail, Calculations, Reports, Profile
│   │   ├── supplier/          # 8 pages: Dashboard, Profile, Requirements, MonthlyReports, Detail, SpreadsheetWizard, Clarifications, Reductions
│   │   └── auditor/           # 4 pages: Dashboard, Assignments, Submissions, SubmissionReview
│   ├── services/
│   │   ├── api.ts             # Central Axios instance with Bearer interceptor & error handling
│   │   ├── auth.service.ts    # Login, password change, me
│   │   ├── manufacturer.service.ts
│   │   ├── supplier.service.ts
│   │   └── auditor.service.ts
│   ├── types/
│   │   └── index.ts           # Strict TypeScript contracts matching backend OpenAPI schema
│   ├── utils/
│   │   ├── chartConfig.ts     # Chart.js registered modules
│   │   └── formatters.ts      # formatKgCO2e, formatCurrency, formatDate, formatNumber
│   ├── App.tsx                # Client-side router configuration with role-based routing
│   ├── index.css              # Tailwind CSS directives & scrollbar styles
│   ├── main.tsx               # React root entry point
│   └── vite-env.d.ts          # Vite client types & environment interfaces
├── index.html                 # Scope3Track HTML container
├── package.json               # Dependencies & build scripts
├── postcss.config.js          # PostCSS configuration
├── tailwind.config.js         # Brand theme (emerald, slate, responsive breakpoints)
├── tsconfig.json              # TypeScript compilation configuration
└── vite.config.ts             # Vite bundler configuration with @ path alias & proxy
```

---

## 🛡️ Security & Privacy Guardrails

1. **No Backend Secrets in Frontend**: Database connection strings, Atlas credentials, and OpenRouter API keys are **never** present in frontend code or Vite builds.
2. **Session-Scoped Tokens**: JWT tokens are maintained in `sessionStorage`, ensuring clean session clearing on browser close.
3. **Role-Based Guards**: Protected routes enforce strict access control based on user role (`manufacturer`, `supplier`, `auditor`).
4. **Non-Destructive Operations**: High-impact actions require explicit confirmation modals with clear impact explanations.
