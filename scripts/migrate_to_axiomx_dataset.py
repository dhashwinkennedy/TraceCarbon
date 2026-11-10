"""
MIGRATION AND SEEDING SCRIPT: AxiomX Two-Year Synthetic Dataset
Applies demo reset and dataset import into Scope3Track MongoDB.
Can target scope3track_final_qa (for QA testing) or scope3track (primary demo).

Enforces:
- 1 preserved ABC Manufacturing company
- 1 preserved manufacturer admin user
- Exactly 2 preserved auditor accounts (auditor-xyz and auditor-green)
- 10 new AxiomX supplier accounts (SUP-001 to SUP-010)
- Exactly 15 imported annual reports (10 FY22-23, 5 FY23-24)
- Exactly 5 withheld workbooks in MANUAL_UPLOAD_HOLDOUT_5/ (unsubmitted)
- Idempotency via batch_id: AXIOMX_ANNUAL_DEMO_2022_2024_V1
"""

import os
import sys
import uuid
from pathlib import Path
from datetime import datetime, timezone
import openpyxl
import pymongo
from passlib.context import CryptContext
from dotenv import load_dotenv

load_dotenv()

pwd = CryptContext(schemes=["argon2"], deprecated="auto")

def now():
    return datetime.now(timezone.utc)

BATCH_ID = "AXIOMX_ANNUAL_DEMO_2022_2024_V1"
DATASET_ROOT = Path(r"C:\dhash\hackathon n events\INDUSTRIX\backend codex\SUPPLIER_ANNUAL_DATASETS_2Y")
PRELOAD_FY23 = DATASET_ROOT / "PRELOAD_DATA" / "FY2022-23"
PRELOAD_FY24 = DATASET_ROOT / "PRELOAD_DATA" / "FY2023-24"
HOLDOUT_DIR = DATASET_ROOT / "MANUAL_UPLOAD_HOLDOUT_5"

AXIOMX_SUPPLIERS = [
    {
        "supplier_id": "SUP-001",
        "supplier_name": "AxiomX Steel Suppliers",
        "industry": "Steel",
        "main_product": "Hot-rolled steel coils",
        "sku": "ST-HR-001",
        "category": "Category 1",
        "unit": "tonnes",
        "price_inr": 55000.0,
        "location": "Vijayanagar Industrial Cluster, Karnataka",
        "contact_person": "Dr. Rajesh Varma (Chief Metallurgist)",
        "email": "supplier.steel@axiomx.demo",
        "password": "AxiomX!Steel#2026",
        "cornerstone_code": "3311"
    },
    {
        "supplier_id": "SUP-002",
        "supplier_name": "AxiomX Rubber Suppliers",
        "industry": "Rubber",
        "main_product": "Industrial rubber sheets",
        "sku": "RB-TY-002",
        "category": "Category 1",
        "unit": "tonnes",
        "price_inr": 185000.0,
        "location": "Limda Industrial Area, Vadodara, Gujarat",
        "contact_person": "Priya Nambiar (Plant Operations VP)",
        "email": "supplier.rubber@axiomx.demo",
        "password": "AxiomX!Rubber#2026",
        "cornerstone_code": "3262"
    },
    {
        "supplier_id": "SUP-003",
        "supplier_name": "AxiomX Aluminium Suppliers",
        "industry": "Aluminium",
        "main_product": "Aluminium ingots",
        "sku": "AL-IN-003",
        "category": "Category 1",
        "unit": "tonnes",
        "price_inr": 230000.0,
        "location": "Renukoot Smelter Complex, Uttar Pradesh",
        "contact_person": "Amitabh Sengupta (Works Director)",
        "email": "supplier.aluminium@axiomx.demo",
        "password": "AxiomX!Aluminium#2026",
        "cornerstone_code": "3313"
    },
    {
        "supplier_id": "SUP-004",
        "supplier_name": "AxiomX Cement Suppliers",
        "industry": "Cement",
        "main_product": "PPC cement",
        "sku": "CM-PC-004",
        "category": "Category 1",
        "unit": "tonnes",
        "price_inr": 7300.0,
        "location": "Kotputli Clinker & Grinding Works, Rajasthan",
        "contact_person": "Sunil Somani (Technical Head)",
        "email": "supplier.cement@axiomx.demo",
        "password": "AxiomX!Cement#2026",
        "cornerstone_code": "3273"
    },
    {
        "supplier_id": "SUP-005",
        "supplier_name": "AxiomX Chemical Suppliers",
        "industry": "Chemicals",
        "main_product": "Soda ash",
        "sku": "CH-SA-005",
        "category": "Category 1",
        "unit": "tonnes",
        "price_inr": 28500.0,
        "location": "Mithapur Marine Chemical Complex, Gujarat",
        "contact_person": "Dr. Ananya Trivedi (Process Chemistry Lead)",
        "email": "supplier.chemical@axiomx.demo",
        "password": "AxiomX!Chemical#2026",
        "cornerstone_code": "3251"
    },
    {
        "supplier_id": "SUP-006",
        "supplier_name": "AxiomX Packaging Suppliers",
        "industry": "Packaging",
        "main_product": "Corrugated packaging",
        "sku": "PK-BX-006",
        "category": "Category 1",
        "unit": "tonnes",
        "price_inr": 73000.0,
        "location": "Songadh Integrated Pulp & Paper Mill, Gujarat",
        "contact_person": "Vikas Singhania (General Manager Packaging)",
        "email": "supplier.packaging@axiomx.demo",
        "password": "AxiomX!Packaging#2026",
        "cornerstone_code": "3222"
    },
    {
        "supplier_id": "SUP-007",
        "supplier_name": "AxiomX Textile Suppliers",
        "industry": "Textiles",
        "main_product": "Industrial fabric",
        "sku": "TX-FC-007",
        "category": "Category 1",
        "unit": "tonnes",
        "price_inr": 285000.0,
        "location": "Santej Textile Processing Hub, Gujarat",
        "contact_person": "Kavita Shah (Sustainability Director)",
        "email": "supplier.textile@axiomx.demo",
        "password": "AxiomX!Textile#2026",
        "cornerstone_code": "3132"
    },
    {
        "supplier_id": "SUP-008",
        "supplier_name": "AxiomX Glass Suppliers",
        "industry": "Glass",
        "main_product": "Industrial glass sheets",
        "sku": "GL-SG-008",
        "category": "Category 1",
        "unit": "tonnes",
        "price_inr": 66000.0,
        "location": "Bawal Float Glass Industrial Park, Haryana",
        "contact_person": "Rohan Mehra (VP Glass Operations)",
        "email": "supplier.glass@axiomx.demo",
        "password": "AxiomX!Glass#2026",
        "cornerstone_code": "3272"
    },
    {
        "supplier_id": "SUP-009",
        "supplier_name": "AxiomX Polymer Suppliers",
        "industry": "Polymers",
        "main_product": "HDPE pipes",
        "sku": "PL-PP-009",
        "category": "Category 1",
        "unit": "tonnes",
        "price_inr": 127000.0,
        "location": "Jalgaon Polymer Extrusion Complex, Maharashtra",
        "contact_person": "Manoj Taparia (Plant Engineering VP)",
        "email": "supplier.polymer@axiomx.demo",
        "password": "AxiomX!Polymer#2026",
        "cornerstone_code": "3261"
    },
    {
        "supplier_id": "SUP-010",
        "supplier_name": "AxiomX Machinery Suppliers",
        "industry": "Machinery",
        "main_product": "Industrial boilers",
        "sku": "MC-SG-010",
        "category": "Category 2",
        "unit": "unit",
        "price_inr": 15000000.0,
        "location": "Haridwar Heavy Electrical & Boiler Complex, Uttarakhand",
        "contact_person": "Col. Sanjeev Kaul (Retd.) (Director Capital Machinery)",
        "email": "supplier.machinery@axiomx.demo",
        "password": "AxiomX!Machinery#2026",
        "cornerstone_code": "3336"
    }
]

# Purchases for ABC Manufacturing
PURCHASES = [
    # FY2022-23 (10 Purchases: 9 Cat 1, 1 Cat 2)
    {"purchase_id": "PO-2022-001", "purchaser": "ABC Manufacturing Ltd", "supplier_id": "SUP-001", "supplier_name": "AxiomX Steel Suppliers", "product_id": "ST-HR-001", "product_name": "Hot-rolled steel coils", "financial_year": "FY2022-23", "reporting_month": "FY2022-23", "quantity": 1200.0, "unit": "tonnes", "expenditure_inr": 66000000.0, "category": "Category 1", "method": "product_factor"},
    {"purchase_id": "PO-2022-002", "purchaser": "ABC Manufacturing Ltd", "supplier_id": "SUP-002", "supplier_name": "AxiomX Rubber Suppliers", "product_id": "RB-TY-002", "product_name": "Industrial rubber sheets", "financial_year": "FY2022-23", "reporting_month": "FY2022-23", "quantity": 80.0, "unit": "tonnes", "expenditure_inr": 14800000.0, "category": "Category 1", "method": "product_factor"},
    {"purchase_id": "PO-2022-003", "purchaser": "ABC Manufacturing Ltd", "supplier_id": "SUP-003", "supplier_name": "AxiomX Aluminium Suppliers", "product_id": "AL-IN-003", "product_name": "Aluminium ingots", "financial_year": "FY2022-23", "reporting_month": "FY2022-23", "quantity": 150.0, "unit": "tonnes", "expenditure_inr": 34500000.0, "category": "Category 1", "method": "product_factor"},
    {"purchase_id": "PO-2022-004", "purchaser": "ABC Manufacturing Ltd", "supplier_id": "SUP-004", "supplier_name": "AxiomX Cement Suppliers", "product_id": "CM-PC-004", "product_name": "PPC cement", "financial_year": "FY2022-23", "reporting_month": "FY2022-23", "quantity": 2500.0, "unit": "tonnes", "expenditure_inr": 18250000.0, "category": "Category 1", "method": "product_factor"},
    {"purchase_id": "PO-2022-005", "purchaser": "ABC Manufacturing Ltd", "supplier_id": "SUP-005", "supplier_name": "AxiomX Chemical Suppliers", "product_id": "CH-SA-005", "product_name": "Soda ash", "financial_year": "FY2022-23", "reporting_month": "FY2022-23", "quantity": 350.0, "unit": "tonnes", "expenditure_inr": 9975000.0, "category": "Category 1", "method": "product_factor"},
    {"purchase_id": "PO-2022-006", "purchaser": "ABC Manufacturing Ltd", "supplier_id": "SUP-006", "supplier_name": "AxiomX Packaging Suppliers", "product_id": "PK-BX-006", "product_name": "Corrugated packaging", "financial_year": "FY2022-23", "reporting_month": "FY2022-23", "quantity": 200.0, "unit": "tonnes", "expenditure_inr": 14600000.0, "category": "Category 1", "method": "product_factor"},
    {"purchase_id": "PO-2022-007", "purchaser": "ABC Manufacturing Ltd", "supplier_id": "SUP-007", "supplier_name": "AxiomX Textile Suppliers", "product_id": "TX-FC-007", "product_name": "Industrial fabric", "financial_year": "FY2022-23", "reporting_month": "FY2022-23", "quantity": 90.0, "unit": "tonnes", "expenditure_inr": 25650000.0, "category": "Category 1", "method": "product_factor"},
    {"purchase_id": "PO-2022-008", "purchaser": "ABC Manufacturing Ltd", "supplier_id": "SUP-008", "supplier_name": "AxiomX Glass Suppliers", "product_id": "GL-SG-008", "product_name": "Industrial glass sheets", "financial_year": "FY2022-23", "reporting_month": "FY2022-23", "quantity": 180.0, "unit": "tonnes", "expenditure_inr": 11880000.0, "category": "Category 1", "method": "product_factor"},
    {"purchase_id": "PO-2022-009", "purchaser": "ABC Manufacturing Ltd", "supplier_id": "SUP-009", "supplier_name": "AxiomX Polymer Suppliers", "product_id": "PL-PP-009", "product_name": "HDPE pipes", "financial_year": "FY2022-23", "reporting_month": "FY2022-23", "quantity": 220.0, "unit": "tonnes", "expenditure_inr": 27940000.0, "category": "Category 1", "method": "product_factor"},
    {"purchase_id": "PO-2022-010", "purchaser": "ABC Manufacturing Ltd", "supplier_id": "SUP-010", "supplier_name": "AxiomX Machinery Suppliers", "product_id": "MC-SG-010", "product_name": "Industrial boilers", "financial_year": "FY2022-23", "reporting_month": "FY2022-23", "quantity": 2.0, "unit": "unit", "expenditure_inr": 30000000.0, "category": "Category 2", "method": "product_factor"},

    # FY2023-24 (10 Purchases: 9 Cat 1, 1 Cat 2)
    {"purchase_id": "PO-2023-001", "purchaser": "ABC Manufacturing Ltd", "supplier_id": "SUP-001", "supplier_name": "AxiomX Steel Suppliers", "product_id": "ST-HR-001", "product_name": "Hot-rolled steel coils", "financial_year": "FY2023-24", "reporting_month": "FY2023-24", "quantity": 1400.0, "unit": "tonnes", "expenditure_inr": 77000000.0, "category": "Category 1", "method": "product_factor"},
    {"purchase_id": "PO-2023-002", "purchaser": "ABC Manufacturing Ltd", "supplier_id": "SUP-002", "supplier_name": "AxiomX Rubber Suppliers", "product_id": "RB-TY-002", "product_name": "Industrial rubber sheets", "financial_year": "FY2023-24", "reporting_month": "FY2023-24", "quantity": 95.0, "unit": "tonnes", "expenditure_inr": 17575000.0, "category": "Category 1", "method": "product_factor"},
    {"purchase_id": "PO-2023-003", "purchaser": "ABC Manufacturing Ltd", "supplier_id": "SUP-003", "supplier_name": "AxiomX Aluminium Suppliers", "product_id": "AL-IN-003", "product_name": "Aluminium ingots", "financial_year": "FY2023-24", "reporting_month": "FY2023-24", "quantity": 180.0, "unit": "tonnes", "expenditure_inr": 41400000.0, "category": "Category 1", "method": "product_factor"},
    {"purchase_id": "PO-2023-004", "purchaser": "ABC Manufacturing Ltd", "supplier_id": "SUP-004", "supplier_name": "AxiomX Cement Suppliers", "product_id": "CM-PC-004", "product_name": "PPC cement", "financial_year": "FY2023-24", "reporting_month": "FY2023-24", "quantity": 2800.0, "unit": "tonnes", "expenditure_inr": 20440000.0, "category": "Category 1", "method": "product_factor"},
    {"purchase_id": "PO-2023-005", "purchaser": "ABC Manufacturing Ltd", "supplier_id": "SUP-005", "supplier_name": "AxiomX Chemical Suppliers", "product_id": "CH-SA-005", "product_name": "Soda ash", "financial_year": "FY2023-24", "reporting_month": "FY2023-24", "quantity": 400.0, "unit": "tonnes", "expenditure_inr": 11400000.0, "category": "Category 1", "method": "product_factor"},
    {"purchase_id": "PO-2023-006", "purchaser": "ABC Manufacturing Ltd", "supplier_id": "SUP-006", "supplier_name": "AxiomX Packaging Suppliers", "product_id": "PK-BX-006", "product_name": "Corrugated packaging", "financial_year": "FY2023-24", "reporting_month": "FY2023-24", "quantity": 240.0, "unit": "tonnes", "expenditure_inr": 17520000.0, "category": "Category 1", "method": "product_factor"},
    {"purchase_id": "PO-2023-007", "purchaser": "ABC Manufacturing Ltd", "supplier_id": "SUP-007", "supplier_name": "AxiomX Textile Suppliers", "product_id": "TX-FC-007", "product_name": "Industrial fabric", "financial_year": "FY2023-24", "reporting_month": "FY2023-24", "quantity": 105.0, "unit": "tonnes", "expenditure_inr": 29925000.0, "category": "Category 1", "method": "product_factor"},
    {"purchase_id": "PO-2023-008", "purchaser": "ABC Manufacturing Ltd", "supplier_id": "SUP-008", "supplier_name": "AxiomX Glass Suppliers", "product_id": "GL-SG-008", "product_name": "Industrial glass sheets", "financial_year": "FY2023-24", "reporting_month": "FY2023-24", "quantity": 210.0, "unit": "tonnes", "expenditure_inr": 13860000.0, "category": "Category 1", "method": "product_factor"},
    {"purchase_id": "PO-2023-009", "purchaser": "ABC Manufacturing Ltd", "supplier_id": "SUP-009", "supplier_name": "AxiomX Polymer Suppliers", "product_id": "PL-PP-009", "product_name": "HDPE pipes", "financial_year": "FY2023-24", "reporting_month": "FY2023-24", "quantity": 250.0, "unit": "tonnes", "expenditure_inr": 31750000.0, "category": "Category 1", "method": "product_factor"},
    {"purchase_id": "PO-2023-010", "purchaser": "ABC Manufacturing Ltd", "supplier_id": "SUP-010", "supplier_name": "AxiomX Machinery Suppliers", "product_id": "MC-SG-010", "product_name": "Industrial boilers", "financial_year": "FY2023-24", "reporting_month": "FY2023-24", "quantity": 3.0, "unit": "unit", "expenditure_inr": 46500000.0, "category": "Category 2", "method": "product_factor"}
]

def run_migration(db_name: str):
    uri = os.environ.get("MONGODB_URI")
    client = pymongo.MongoClient(uri)
    db = client[db_name]

    print(f"\n=======================================================")
    print(f"STARTING AXIOMX DATASET MIGRATION ON DATABASE: {db_name}")
    print(f"=======================================================\n")

    # -----------------------------------------------------------------
    # STEP 1: PRESERVATION VERIFICATION
    # -----------------------------------------------------------------
    print("STEP 1: Checking preservation guarantees...")
    mfg = db["manufacturer"].find_one({"id": "manufacturer-1"})
    mfg_user = db["users"].find_one({"role": "manufacturer"})
    auditors_list = list(db["auditors"].find({"active": True}))
    auditor_users = list(db["users"].find({"role": "auditor", "active": True}))

    print(f"  - Manufacturer company: {mfg.get('name') if mfg else 'MISSING'}")
    print(f"  - Manufacturer admin: {mfg_user.get('email') if mfg_user else 'MISSING'}")
    print(f"  - Auditors in auditors collection: {len(auditors_list)} ({[a.get('email') for a in auditors_list]})")
    print(f"  - Auditors in users collection: {len(auditor_users)} ({[u.get('email') for u in auditor_users]})")

    assert mfg is not None, "FATAL: manufacturer-1 missing"
    assert mfg_user is not None, "FATAL: manufacturer user missing"
    assert len(auditors_list) == 2, f"FATAL: Expected exactly 2 auditors in 'auditors', found {len(auditors_list)}"
    assert len(auditor_users) == 2, f"FATAL: Expected exactly 2 auditors in 'users', found {len(auditor_users)}"
    print("  [PASSED] All mandatory entities verified before cleanup.")

    # -----------------------------------------------------------------
    # STEP 2: CLEAN UP OLD DEMO SUPPLIER RECORDS
    # -----------------------------------------------------------------
    print("\nSTEP 2: Cleaning up obsolete demo supplier records...")
    axiomx_emails = {s["email"].lower() for s in AXIOMX_SUPPLIERS}
    axiomx_sup_ids = {s["supplier_id"] for s in AXIOMX_SUPPLIERS}

    # Remove old supplier users (strictly preserve manufacturer & auditors)
    del_users = db["users"].delete_many({
        "role": "supplier",
        "email": {"$nin": list(axiomx_emails)}
    })
    print(f"  - Removed old supplier users: {del_users.deleted_count}")

    # Remove old suppliers
    del_sups = db["suppliers"].delete_many({
        "id": {"$nin": list(axiomx_sup_ids)}
    })
    print(f"  - Removed old suppliers: {del_sups.deleted_count}")

    # Remove old submissions
    del_subs = db["submissions"].delete_many({
        "$or": [
            {"supplier_id": {"$nin": list(axiomx_sup_ids)}},
            {"batch_id": {"$ne": BATCH_ID}}
        ]
    })
    print(f"  - Removed old submissions: {del_subs.deleted_count}")

    # Remove old supplier requirements
    del_reqs = db["supplier_requirements"].delete_many({
        "supplier_id": {"$nin": list(axiomx_sup_ids)}
    })
    print(f"  - Removed old supplier requirements: {del_reqs.deleted_count}")

    # Remove old spreadsheet uploads
    del_uploads = db["supplier_spreadsheet_uploads"].delete_many({})
    print(f"  - Removed old supplier spreadsheet uploads: {del_uploads.deleted_count}")

    # Remove old saved spreadsheet formats
    del_formats = db["saved_spreadsheet_formats"].delete_many({
        "supplier_id": {"$nin": list(axiomx_sup_ids)}
    })
    print(f"  - Removed old saved formats: {del_formats.deleted_count}")

    # Remove old auditor assignments
    del_ass = db["auditor_assignments"].delete_many({
        "supplier_id": {"$nin": list(axiomx_sup_ids)}
    })
    print(f"  - Removed old auditor assignments: {del_ass.deleted_count}")

    # Remove old clarifications, comments, evidence
    del_clar = db["clarifications"].delete_many({})
    del_com = db["comments"].delete_many({})
    del_ev = db["evidence_documents"].delete_many({})
    print(f"  - Removed old clarifications ({del_clar.deleted_count}), comments ({del_com.deleted_count}), evidence ({del_ev.deleted_count})")

    # Remove old purchases and calculations
    del_purchases = db["purchase_records"].delete_many({})
    del_calcs = db["calculation_runs"].delete_many({})
    print(f"  - Removed old purchase records ({del_purchases.deleted_count}) and calculation runs ({del_calcs.deleted_count})")

    # -----------------------------------------------------------------
    # STEP 3: SEED 10 AXIOMX SUPPLIER ACCOUNTS
    # -----------------------------------------------------------------
    print("\nSTEP 3: Seeding 10 AxiomX supplier profiles and credentials...")
    cred_lines = [
        "# Scope3Track — Fictional AxiomX Supplier Login Credentials",
        "# EXCLUDED FROM GIT REPOSITORY VIA .gitignore",
        f"# Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "",
        "| Supplier ID | Supplier Name | Sector | Login Email | Demo Password |",
        "| :--- | :--- | :--- | :--- | :--- |"
    ]

    for s in AXIOMX_SUPPLIERS:
        # Supplier profile
        sup_doc = {
            "id": s["supplier_id"],
            "supplier_code": s["supplier_id"],
            "name": s["supplier_name"],
            "industry": s["industry"],
            "main_product": s["main_product"],
            "sku": s["sku"],
            "scope3_category": s["category"],
            "contact_email": s["email"],
            "contact_details": s["contact_person"],
            "location": s["location"],
            "active": True,
            "demo": True,
            "is_synthetic": True,
            "batch_id": BATCH_ID,
            "created_at": now(),
            "updated_at": now()
        }
        db["suppliers"].update_one(
            {"id": s["supplier_id"]},
            {"$set": sup_doc},
            upsert=True
        )

        # Supplier user account
        user_doc = {
            "email": s["email"].lower(),
            "role": "supplier",
            "profile_id": s["supplier_id"],
            "active": True,
            "demo": True,
            "batch_id": BATCH_ID,
            "created_at": now(),
            "updated_at": now()
        }
        # Check if user already exists
        existing_u = db["users"].find_one({"email": s["email"].lower()})
        if existing_u:
            db["users"].update_one(
                {"email": s["email"].lower()},
                {"$set": {"password_hash": pwd.hash(s["password"]), "profile_id": s["supplier_id"], "active": True}}
            )
        else:
            user_doc["id"] = str(uuid.uuid4())
            user_doc["password_hash"] = pwd.hash(s["password"])
            db["users"].insert_one(user_doc)

        cred_lines.append(f"| `{s['supplier_id']}` | {s['supplier_name']} | {s['industry']} | `{s['email']}` | `{s['password']}` |")

    # Write credentials file to SUPPLIER_ANNUAL_DATASETS_2Y/DEMO_SUPPLIER_CREDENTIALS.txt
    cred_file = DATASET_ROOT / "DEMO_SUPPLIER_CREDENTIALS.txt"
    with open(cred_file, "w", encoding="utf-8") as f:
        f.write("\n".join(cred_lines))
    print(f"  [SAVED] Supplier credentials written to: {cred_file.name} (excluded from Git)")

    # -----------------------------------------------------------------
    # STEP 4: CONFIGURE SUPPLIER REQUIREMENTS (4 Activities Each)
    # -----------------------------------------------------------------
    print("\nSTEP 4: Configuring standardized annual industrial requirements for all 10 suppliers...")
    required_activities = [
        ("electricity", "kWh"),
        ("diesel", "litres"),
        ("production", "tonnes"),
        ("raw_material", "tonnes")
    ]
    req_count = 0
    for s in AXIOMX_SUPPLIERS:
        for aid, unit in required_activities:
            req_doc = {
                "supplier_id": s["supplier_id"],
                "activity_id": aid,
                "expected_unit": unit,
                "aggregation_rule": "sum",
                "batch_id": BATCH_ID,
                "created_at": now()
            }
            db["supplier_requirements"].update_one(
                {"supplier_id": s["supplier_id"], "activity_id": aid},
                {"$set": req_doc, "$setOnInsert": {"id": str(uuid.uuid4())}},
                upsert=True
            )
            req_count += 1
    print(f"  [CONFIGURED] {req_count} supplier requirements (4 per supplier across all 10 suppliers).")

    # -----------------------------------------------------------------
    # STEP 5: SEED 10 PRODUCTS & STATUTORY EMISSION FACTORS
    # -----------------------------------------------------------------
    print("\nSTEP 5: Seeding products and emission factors...")
    for s in AXIOMX_SUPPLIERS:
        prod_doc = {
            "id": s["sku"],
            "product_code": s["sku"],
            "product_name": s["main_product"],
            "supplier_id": s["supplier_id"],
            "supplier_name": s["supplier_name"],
            "industry": s["industry"],
            "scope3_category": s["category"],
            "relevant_unit": s["unit"],
            "price_inr": s["price_inr"],
            "active": True,
            "demo": True,
            "batch_id": BATCH_ID,
            "created_at": now()
        }
        db["products"].update_one({"id": s["sku"]}, {"$set": prod_doc}, upsert=True)

    # Emission factors
    factors = [
        # Statutory Electricity (Scope 2)
        {"id": "factor-electricity-fy23", "name": "CEA National Grid Average CO2 Baseline v19.0 (FY 2022-23)", "factor_type": "activity_based", "factor_value": 0.716, "denominator_unit": "kWh", "applicable_activity": "electricity", "source_name": "Central Electricity Authority Baseline v19.0", "version": 1, "demo": False},
        {"id": "factor-electricity-fy24", "name": "CEA National Grid Average CO2 Baseline v20.0 (FY 2023-24)", "factor_type": "activity_based", "factor_value": 0.727, "denominator_unit": "kWh", "applicable_activity": "electricity", "source_name": "Central Electricity Authority Baseline v20.0", "version": 1, "demo": False},
        # Stationary Diesel (Scope 1)
        {"id": "factor-diesel-ipcc", "name": "IPCC 2006 Stationary Diesel Combustion Factor", "factor_type": "activity_based", "factor_value": 2.680, "denominator_unit": "litres", "applicable_activity": "diesel", "source_name": "2006 IPCC Guidelines Vol 2 Ch 2", "version": 1, "demo": False},
        # Spend factor (INR)
        {"id": "factor-spend-inr-cat1", "name": "Cornerstone EEIO Model Manufacturing Spend Factor (INR)", "factor_type": "spend_based", "factor_value": 0.00775, "denominator_unit": "INR", "currency": "INR", "applicable_activity": None, "source_name": "Cornerstone EEIO Model Converted via RBI Rate", "version": 1, "demo": True},
        {"id": "factor-spend-inr-cat2", "name": "Cornerstone EEIO Model Capital Machinery Spend Factor (INR)", "factor_type": "spend_based", "factor_value": 0.00380, "denominator_unit": "INR", "currency": "INR", "applicable_activity": None, "source_name": "Cornerstone EEIO Model Capital Goods Converted via RBI Rate", "version": 1, "demo": True},
    ]
    # Add plant-specific intensity product factors
    intensity_map_fy23 = {
        "ST-HR-001": 319.740, "RB-TY-002": 675.544, "AL-IN-003": 1396.362, "CM-PC-004": 58.910, "CH-SA-005": 294.440,
        "PK-BX-006": 338.575, "TX-FC-007": 993.388, "GL-SG-008": 483.923, "PL-PP-009": 455.518, "MC-SG-010": 791.956
    }
    for sku, intens in intensity_map_fy23.items():
        factors.append({
            "id": f"factor-pcf-{sku.lower()}-fy23",
            "name": f"Synthetic Plant PCF Intensity FY23 ({sku})",
            "factor_type": "product_factor",
            "factor_value": intens,
            "denominator_unit": "tonnes" if sku != "MC-SG-010" else "unit",
            "applicable_activity": None,
            "source_name": "Scope3Track Plant-Specific Activity Allocation",
            "version": 1,
            "demo": True
        })

    for f_doc in factors:
        f_doc["created_at"] = now()
        db["emission_factors"].update_one({"id": f_doc["id"]}, {"$set": f_doc}, upsert=True)
    print(f"  [CONFIGURED] {len(AXIOMX_SUPPLIERS)} products and {len(factors)} emission factors.")

    # -----------------------------------------------------------------
    # STEP 6: IMPORT EXACTLY 15 ANNUAL WORKBOOKS
    # -----------------------------------------------------------------
    print("\nSTEP 6: Importing exactly 15 annual workbooks...")
    imported_reports = []

    file_code_map = {
        "SUP-001": "Steel",
        "SUP-002": "Rubber",
        "SUP-003": "Aluminium",
        "SUP-004": "Cement",
        "SUP-005": "Chemical",
        "SUP-006": "Packaging",
        "SUP-007": "Textile",
        "SUP-008": "Glass",
        "SUP-009": "Polymer",
        "SUP-010": "Machinery",
    }

    # A. FY2022-23 (10 workbooks from PRELOAD_DATA/FY2022-23/)
    for s in AXIOMX_SUPPLIERS:
        f_code = file_code_map[s["supplier_id"]]
        fname = f"AxiomX_{f_code}_FY2022-23.xlsx"
        fpath = PRELOAD_FY23 / fname
        assert fpath.exists(), f"Missing FY23 workbook: {fpath}"

        wb = openpyxl.load_workbook(fpath, data_only=True)
        ws = wb["Annual_Activity"]
        # Read from row 21 (Tabular summary record)
        sup_id = ws.cell(row=21, column=1).value
        elec = float(ws.cell(row=21, column=8).value)
        diesel = float(ws.cell(row=21, column=9).value)
        prod = float(ws.cell(row=21, column=10).value)
        raw = float(ws.cell(row=21, column=11).value)

        sub_id = f"sub-{s['supplier_id']}-FY2022-23"
        activities = [
            {"activity_id": "electricity", "value": elec, "unit": "kWh", "original_value": elec, "original_unit": "kWh"},
            {"activity_id": "diesel", "value": diesel, "unit": "litres", "original_value": diesel, "original_unit": "litres"},
            {"activity_id": "production", "value": prod, "unit": "tonnes", "original_value": prod, "original_unit": "tonnes"},
            {"activity_id": "raw_material", "value": raw, "unit": "tonnes", "original_value": raw, "original_unit": "tonnes"}
        ]
        sub_doc = {
            "id": sub_id,
            "supplier_id": s["supplier_id"],
            "supplier_name": s["supplier_name"],
            "reporting_month": "FY2022-23",
            "reporting_period_type": "ANNUAL",
            "financial_year": "FY2022-23",
            "reporting_start_date": "2022-04-01",
            "reporting_end_date": "2023-03-31",
            "status": "submitted",
            "version": 1,
            "submission_method": "PRELOADED_DEMO",
            "source_workbook": fname,
            "data_classification": "DEMO DATA — SYNTHETIC",
            "is_synthetic": True,
            "demo": True,
            "batch_id": BATCH_ID,
            "activities": activities,
            "evidence_count": 0,
            "clarification_count": 0,
            "created_at": datetime(2023, 4, 15, 10, 0, 0, tzinfo=timezone.utc),
            "submitted_at": datetime(2023, 4, 15, 10, 30, 0, tzinfo=timezone.utc),
            "updated_at": datetime(2023, 4, 15, 10, 30, 0, tzinfo=timezone.utc)
        }
        db["submissions"].update_one({"id": sub_id}, {"$set": sub_doc}, upsert=True)
        imported_reports.append((s["supplier_id"], "FY2022-23", fname, sub_id))

    # B. FY2023-24 (5 workbooks from PRELOAD_DATA/FY2023-24/)
    fy24_suppliers = [
        s for s in AXIOMX_SUPPLIERS
        if s["supplier_id"] in ["SUP-006", "SUP-007", "SUP-008", "SUP-009", "SUP-010"]
    ]
    for s in fy24_suppliers:
        f_code = file_code_map[s["supplier_id"]]
        fname = f"AxiomX_{f_code}_FY2023-24.xlsx"
        fpath = PRELOAD_FY24 / fname
        assert fpath.exists(), f"Missing FY24 workbook: {fpath}"

        wb = openpyxl.load_workbook(fpath, data_only=True)
        ws = wb["Annual_Activity"]
        sup_id = ws.cell(row=21, column=1).value
        elec = float(ws.cell(row=21, column=8).value)
        diesel = float(ws.cell(row=21, column=9).value)
        prod = float(ws.cell(row=21, column=10).value)
        raw = float(ws.cell(row=21, column=11).value)

        sub_id = f"sub-{s['supplier_id']}-FY2023-24"
        activities = [
            {"activity_id": "electricity", "value": elec, "unit": "kWh", "original_value": elec, "original_unit": "kWh"},
            {"activity_id": "diesel", "value": diesel, "unit": "litres", "original_value": diesel, "original_unit": "litres"},
            {"activity_id": "production", "value": prod, "unit": "tonnes", "original_value": prod, "original_unit": "tonnes"},
            {"activity_id": "raw_material", "value": raw, "unit": "tonnes", "original_value": raw, "original_unit": "tonnes"}
        ]
        sub_doc = {
            "id": sub_id,
            "supplier_id": s["supplier_id"],
            "supplier_name": s["supplier_name"],
            "reporting_month": "FY2023-24",
            "reporting_period_type": "ANNUAL",
            "financial_year": "FY2023-24",
            "reporting_start_date": "2023-04-01",
            "reporting_end_date": "2024-03-31",
            "status": "submitted",
            "version": 1,
            "submission_method": "PRELOADED_DEMO",
            "source_workbook": fname,
            "data_classification": "DEMO DATA — SYNTHETIC",
            "is_synthetic": True,
            "demo": True,
            "batch_id": BATCH_ID,
            "activities": activities,
            "evidence_count": 0,
            "clarification_count": 0,
            "created_at": datetime(2024, 4, 20, 11, 0, 0, tzinfo=timezone.utc),
            "submitted_at": datetime(2024, 4, 20, 11, 45, 0, tzinfo=timezone.utc),
            "updated_at": datetime(2024, 4, 20, 11, 45, 0, tzinfo=timezone.utc)
        }
        db["submissions"].update_one({"id": sub_id}, {"$set": sub_doc}, upsert=True)
        imported_reports.append((s["supplier_id"], "FY2023-24", fname, sub_id))

    print(f"  [IMPORTED] Exactly {len(imported_reports)} annual workbooks:")
    for sup_id, fy, fname, sub_id in imported_reports:
        print(f"    - [{fy}] {sup_id}: {fname} -> {sub_id}")

    # -----------------------------------------------------------------
    # STEP 7: VERIFY THE 5 HOLDOUT WORKBOOKS REMAIN UNCOMMITTED
    # -----------------------------------------------------------------
    print("\nSTEP 7: Verifying 5 holdout files are NOT in the database...")
    holdout_suppliers = ["SUP-001", "SUP-002", "SUP-003", "SUP-004", "SUP-005"]
    for sid in holdout_suppliers:
        sub_fy24 = db["submissions"].find_one({"supplier_id": sid, "reporting_month": "FY2023-24"})
        assert sub_fy24 is None, f"VIOLATION: Found unexpected FY23-24 submission for holdout supplier {sid}"
        print(f"  [VERIFIED OUTSTANDING] {sid} has NO FY2023-24 submission in database.")

    # -----------------------------------------------------------------
    # STEP 8: ASSIGN 15 REPORTS ACROSS 2 EXISTING AUDITORS
    # -----------------------------------------------------------------
    print("\nSTEP 8: Setting up balanced auditor governance assignments...")
    # Auditor One (auditor-xyz): 6 suppliers (SUP-001 to SUP-006) -> 7 submitted reports
    # Auditor Two (auditor-green): 4 suppliers (SUP-007 to SUP-010) -> 8 submitted reports
    auditor_1_sups = ["SUP-001", "SUP-002", "SUP-003", "SUP-004", "SUP-005", "SUP-006"]
    auditor_2_sups = ["SUP-007", "SUP-008", "SUP-009", "SUP-010"]

    for sid in auditor_1_sups:
        db["auditor_assignments"].update_one(
            {"auditor_id": "auditor-xyz", "supplier_id": sid},
            {"$set": {"id": str(uuid.uuid4()), "auditor_id": "auditor-xyz", "supplier_id": sid, "created_at": now()}},
            upsert=True
        )

    for sid in auditor_2_sups:
        db["auditor_assignments"].update_one(
            {"auditor_id": "auditor-green", "supplier_id": sid},
            {"$set": {"id": str(uuid.uuid4()), "auditor_id": "auditor-green", "supplier_id": sid, "created_at": now()}},
            upsert=True
        )

    a1_count = db["submissions"].count_documents({"supplier_id": {"$in": auditor_1_sups}})
    a2_count = db["submissions"].count_documents({"supplier_id": {"$in": auditor_2_sups}})
    print(f"  - Auditor One (auditor-xyz): {len(auditor_1_sups)} assigned suppliers -> {a1_count} submissions visible")
    print(f"  - Auditor Two (auditor-green): {len(auditor_2_sups)} assigned suppliers -> {a2_count} submissions visible")
    print(f"  - Total assignments: {len(auditor_1_sups) + len(auditor_2_sups)} across all 10 suppliers.")

    # -----------------------------------------------------------------
    # STEP 9: SEED PURCHASES & CALCULATIONS FOR ABC MANUFACTURING
    # -----------------------------------------------------------------
    print("\nSTEP 9: Seeding ABC Manufacturing purchases and deterministic calculation runs...")
    cat1_runs = 0
    cat2_runs = 0

    for p in PURCHASES:
        p_doc = {
            "id": p["purchase_id"],
            "purchaser_name": p["purchaser"],
            "supplier_id": p["supplier_id"],
            "supplier_name": p["supplier_name"],
            "product_id": p["product_id"],
            "product_name": p["product_name"],
            "reporting_month": p["reporting_month"],
            "financial_year": p["financial_year"],
            "purchased_quantity": p["quantity"],
            "quantity_unit": p["unit"],
            "purchase_expenditure": p["expenditure_inr"],
            "currency": "INR",
            "scope3_category": p["category"],
            "calculated": True,
            "batch_id": BATCH_ID,
            "created_at": now()
        }
        db["purchase_records"].update_one({"id": p["purchase_id"]}, {"$set": p_doc}, upsert=True)

        # Deterministic Calculation Run
        # Product factor intensity
        factor_val = intensity_map_fy23.get(p["product_id"], 300.0)
        calc_result = p["quantity"] * factor_val # in kg CO2e
        calc_id = f"calc-{p['purchase_id'].lower()}"
        calc_doc = {
            "id": calc_id,
            "purchase_record_id": p["purchase_id"],
            "supplier_id": p["supplier_id"],
            "supplier_name": p["supplier_name"],
            "product_id": p["product_id"],
            "reporting_month": p["reporting_month"],
            "method": "product_factor",
            "scope3_category": p["category"],
            "result_value": calc_result,
            "unit": "kgCO2e",
            "factor_id": f"factor-pcf-{p['product_id'].lower()}-fy23",
            "factor_value": factor_val,
            "is_active": True,
            "batch_id": BATCH_ID,
            "created_at": now()
        }
        db["calculation_runs"].update_one({"id": calc_id}, {"$set": calc_doc}, upsert=True)
        if p["category"] == "Category 2":
            cat2_runs += 1
        else:
            cat1_runs += 1

    print(f"  [SEEDED] {len(PURCHASES)} purchase records with {cat1_runs} Category 1 runs and {cat2_runs} Category 2 runs.")

    # -----------------------------------------------------------------
    # STEP 10: FINAL INVENTORY & RECONCILIATION
    # -----------------------------------------------------------------
    print("\nSTEP 10: Final Database Inventory Verification...")
    counts = {
        "manufacturer": db["manufacturer"].count_documents({}),
        "users": db["users"].count_documents({}),
        "suppliers": db["suppliers"].count_documents({}),
        "auditors": db["auditors"].count_documents({}),
        "auditor_assignments": db["auditor_assignments"].count_documents({}),
        "supplier_requirements": db["supplier_requirements"].count_documents({}),
        "products": db["products"].count_documents({}),
        "emission_factors": db["emission_factors"].count_documents({}),
        "submissions_total": db["submissions"].count_documents({}),
        "submissions_fy23": db["submissions"].count_documents({"reporting_month": "FY2022-23"}),
        "submissions_fy24": db["submissions"].count_documents({"reporting_month": "FY2023-24"}),
        "purchase_records": db["purchase_records"].count_documents({}),
        "calculation_runs": db["calculation_runs"].count_documents({})
    }
    for k, v in counts.items():
        print(f"  - {k}: {v}")

    # Assertions
    assert counts["manufacturer"] == 1, "Expected 1 manufacturer"
    assert counts["suppliers"] == 10, f"Expected 10 suppliers, found {counts['suppliers']}"
    assert counts["auditors"] == 2, f"Expected 2 auditors, found {counts['auditors']}"
    assert counts["submissions_total"] == 15, f"Expected exactly 15 submissions, found {counts['submissions_total']}"
    assert counts["submissions_fy23"] == 10, f"Expected 10 FY23 submissions, found {counts['submissions_fy23']}"
    assert counts["submissions_fy24"] == 5, f"Expected 5 FY24 submissions, found {counts['submissions_fy24']}"
    assert counts["supplier_requirements"] == 40, f"Expected 40 requirements (4 per supplier), found {counts['supplier_requirements']}"

    print(f"\n=======================================================")
    print(f"MIGRATION COMPLETED SUCCESSFULLY ON {db_name}!")
    print(f"=======================================================\n")
    return counts

if __name__ == "__main__":
    target_db = sys.argv[1] if len(sys.argv) > 1 else "scope3track_final_qa"
    run_migration(target_db)
