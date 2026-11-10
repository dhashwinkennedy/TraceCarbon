# TraceCarbon — Technical Architecture & Component Specifications

**Platform**: TraceCarbon Scope 3 Management System  
**Organization**: ABC Manufacturing Ltd  
**Version**: v2.10.1  
**Status**: Production & QA Multi-Method Release  

---

## 1. Architectural Overview

TraceCarbon is designed as a modular monorepo containing a modern client SPA (React 19 + TypeScript + Tailwind CSS), a high-concurrency asynchronous API backend (FastAPI + Pydantic + PyMongo), and an enterprise cloud document store (MongoDB Atlas).

### System Topology

```mermaid
flowchart TB
    subgraph ClientTier ["Client Tier (Browser SPA)"]
        UI["React 19 + TypeScript SPA"]
        Axios["Authenticated Axios Client (Bearer JWT)"]
        BlobView["Secure Blob Evidence Viewer (Object URLs)"]
        UI --> Axios
        UI --> BlobView
    end

    subgraph APITier ["Application API Tier (FastAPI)"]
        Router["FastAPI REST Router (main.py)"]
        AuthGuards["JWT Auth & Role-Based Access Guards"]
        Engine["Scope 3 Multi-Method Engine"]
        AISvc["OpenRouter AI Service (Nemotron 3 Ultra)"]
        FileSec["Resolved-Path Containment Streamer"]
        
        Router --> AuthGuards
        AuthGuards --> Engine
        AuthGuards --> AISvc
        AuthGuards --> FileSec
    end

    subgraph DataTier ["Persistence Tier (MongoDB Atlas & Storage)"]
        MongoDB[("MongoDB Atlas Clusters\nscope3track / scope3track_final_qa")]
        EvidenceFS[("Local Secure Evidence Store\nuploads/")]
        
        Engine --> MongoDB
        AISvc --> MongoDB
        FileSec --> EvidenceFS
    end

    subgraph ExternalFeeds ["Statutory & External Climate Standards"]
        CEA["Central Electricity Authority (v19/v20)"]
        IPCC["2006 IPCC Stationary Combustion"]
        CEDA["Open CEDA by Watershed (USEEIO v2.0.1)"]
        ORGateway["OpenRouter AI Gateway"]
        
        Engine -.-> CEA
        Engine -.-> IPCC
        Engine -.-> CEDA
        AISvc -.-> ORGateway
    end

    Axios ==>|"REST JSON / HTTPS"| Router
    BlobView ==>|"Binary Stream / Bearer Header"| FileSec
```

---

## 2. Multi-Method Calculation Pipeline

```mermaid
flowchart TD
    Req["Calculation Request (Purchase ID, Method)"] --> Check{"Method Selector"}
    
    Check -->|"product_factor"| PF["Lookup Product Life-Cycle Factor\nNormalize Units (t/units)\nFormula: Qty × Product_Factor"]
    
    Check -->|"spend_based"| SB["Lookup CEDA Factor (kg/USD)\nApply RBI FX Rate (INR to USD)\nFormula: (Spend_INR / FX) × CEDA_Factor"]
    
    Check -->|"activity_based"| AB["Fetch Verified Supplier Submission\nScope 1 = Diesel_L × 2.6853 kg/L\nScope 2 = Grid_kWh × CEA_Factor\nalpha = Qty_purchased / Annual_Prod\nValidate: alpha <= 1.0\nFormula: alpha × (Scope 1 + Scope 2)"]
    
    PF --> Snapshot["Assemble Calculation Record\nInclude Parameter Snapshot & Method Tag"]
    SB --> Snapshot
    AB --> Snapshot
    
    Snapshot --> Archive["Archive prior calculation to 'historical'"]
    Archive --> WriteDB["Save active calculation to MongoDB"]
```

---

## 3. Security & Evidence Management Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor Supplier as Industrial Supplier
    participant App as FastAPI Backend
    participant Store as Secure Evidence Store
    actor Auditor as ESG Auditor
    participant Client as React 19 Frontend

    Supplier->>App: POST /submissions/{id}/evidence (Upload PDF/Image)
    App->>Store: Write file with UUID filename (Sanitize Name)
    App-->>Supplier: Return evidence file metadata
    Supplier->>App: POST /submissions/{id}/submit (Confirm Activity)
    
    Note over App, Auditor: Auditor Verification Phase
    Auditor->>Client: Open Assigned Submission View
    Client->>App: GET /submissions/{id}/evidence (Bearer JWT Header)
    App->>Store: Resolve Canonical Path (relative_to check)
    Store-->>App: Read binary file stream
    App-->>Client: Stream binary Blob (application/pdf)
    Client->>Client: URL.createObjectURL(blob)
    Client-->>Auditor: Render embedded PDF document in memory
    Auditor->>Client: Verify numbers & Click 'Approve Submission'
    Client->>App: POST /submissions/{id}/verify
    App-->>Client: Submission locked as 'verified'
    Client->>Client: URL.revokeObjectURL() (Release memory)
```

---

## 4. Key Component Responsibilities

1. **`backend/app/main.py`**: Primary entry point containing all REST endpoints, calculation logic, security containment, and OpenRouter integration.
2. **`frontend/src/`**: React 19 application organizing components by domain:
   - `pages/`: Dashboard, Purchases, Suppliers, Submissions, Analytics, Login.
   - `components/`: EvidenceViewerModal, AIMappingModal, QuickPersonaCards, Navbar.
   - `services/api.ts`: Central Axios client configured with Bearer token interceptor and 120s timeout.
3. **`SUPPLIER_ANNUAL_DATASETS_2Y/`**: Standalone repository of 20 supplier-year activity workbooks.
4. **`PUBLIC_DATASET_RESEARCH/`**: Empirical research documentation, generation scripts, and corporate filings.
5. **`docs/reports/`**: Full suite of statutory reports, analytics spreadsheets, and historical verification audits.
