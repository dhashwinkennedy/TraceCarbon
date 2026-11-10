"""Seed script for dedicated isolated E2E test database scope3track_e2e_test on MongoDB Atlas."""
import os
import sys
from pathlib import Path

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parents[2]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Force database name to scope3track_e2e_test
os.environ["MONGODB_DB"] = "scope3track_e2e_test"

from app.main import settings, now, oid, pwd
from pymongo import MongoClient, ASCENDING

def main():
    print(f"Connecting to MongoDB Atlas for E2E test DB: {settings.mongodb_db}...")
    client = MongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=5000)
    
    # Drop test DB for fresh reproducible test baseline
    client.drop_database("scope3track_e2e_test")
    print("Dropped scope3track_e2e_test for clean baseline.")
    
    db = client["scope3track_e2e_test"]

    def put(coll, q, doc):
        db[coll].update_one(q, {"$set": doc}, upsert=True)

    # 1. Manufacturer
    put("manufacturer", {"id": "manufacturer-1"}, {
        "id": "manufacturer-1",
        "name": "ABC Manufacturing",
        "contact_email": "manufacturer@scope3track.demo",
        "reporting_currency": "INR",
        "demo": True,
        "created_at": now(),
        "updated_at": now()
    })

    # 2. Users (1 manufacturer, 2 suppliers, 2 auditors)
    users = [
        ("manufacturer@scope3track.demo", "ManufacturerDemo123!", "manufacturer", "manufacturer-1"),
        ("xyz.steel@scope3track.demo", "SupplierDemo123!", "supplier", "supplier-xyz"),
        ("green.aluminium@scope3track.demo", "SupplierDemo123!", "supplier", "supplier-green"),
        ("auditor.xyz@scope3track.demo", "AuditorDemo123!", "auditor", "auditor-xyz"),
        ("auditor.green@scope3track.demo", "AuditorDemo123!", "auditor", "auditor-green")
    ]
    for email, password, role, pid in users:
        put("users", {"email": email}, {
            "id": oid(),
            "email": email,
            "password_hash": pwd.hash(password),
            "role": role,
            "profile_id": pid,
            "active": True,
            "created_at": now()
        })

    # 3. Suppliers
    put("suppliers", {"id": "supplier-xyz"}, {
        "id": "supplier-xyz",
        "name": "XYZ Steel",
        "supplier_code": "SUP001",
        "contact_email": "xyz.steel@scope3track.demo",
        "active": True,
        "demo": True,
        "created_at": now(),
        "updated_at": now()
    })
    put("suppliers", {"id": "supplier-green"}, {
        "id": "supplier-green",
        "name": "Green Aluminium",
        "supplier_code": "SUP002",
        "contact_email": "green.aluminium@scope3track.demo",
        "active": True,
        "demo": True,
        "created_at": now(),
        "updated_at": now()
    })

    # 4. Supplier Requirements
    reqs = [
        ("supplier-xyz", "electricity", "kWh"),
        ("supplier-xyz", "diesel", "litres"),
        ("supplier-xyz", "production", "tonnes"),
        ("supplier-xyz", "raw_material", "tonnes"),
        ("supplier-green", "electricity", "kWh"),
        ("supplier-green", "natural_gas", "m3"),
        ("supplier-green", "production", "tonnes")
    ]
    for sid, aid, unit in reqs:
        put("supplier_requirements", {"supplier_id": sid, "activity_id": aid}, {
            "id": oid(),
            "supplier_id": sid,
            "activity_id": aid,
            "expected_unit": unit,
            "aggregation_rule": "sum",
            "created_at": now()
        })

    # 5. Auditors
    for aid, name in [("auditor-xyz", "Auditor One"), ("auditor-green", "Auditor Two")]:
        put("auditors", {"id": aid}, {
            "id": aid,
            "name": name,
            "email": f"{aid}@scope3track.demo",
            "employee_id": f"AUD-{aid[-3:].upper()}",
            "active": True,
            "created_at": now()
        })

    # 6. Auditor Assignments
    for aid, sid in [("auditor-xyz", "supplier-xyz"), ("auditor-green", "supplier-green")]:
        put("auditor_assignments", {"auditor_id": aid, "supplier_id": sid}, {
            "id": oid(),
            "auditor_id": aid,
            "supplier_id": sid,
            "created_at": now()
        })

    # 7. Products
    products = [
        ("product-steel", "Steel sheets", "STL-001", "Category 1", "tonnes"),
        ("product-machine", "Production machinery", "MAC-001", "Category 2", "unit"),
        ("product-aluminium", "Aluminium products", "ALU-001", "Category 1", "tonnes")
    ]
    for i, n, c, cat, unit in products:
        put("products", {"id": i}, {
            "id": i,
            "product_name": n,
            "product_code": c,
            "scope3_category": cat,
            "relevant_unit": unit,
            "active": True,
            "demo": True,
            "created_at": now(),
            "updated_at": now()
        })

    # 8. Emission factors
    factors = [
        ("factor-steel", "product_factor", 2.1, "tonnes", None),
        ("factor-steel-12", "product_factor", 1.2, "tonnes", None),
        ("factor-electricity", "activity_based", 0.4, "kWh", "electricity"),
        ("factor-diesel", "activity_based", 2.68, "litres", "diesel"),
        ("factor-spend", "spend_based", 0.2, "INR", None)
    ]
    for i, t, val, den, act in factors:
        put("emission_factors", {"id": i}, {
            "id": i,
            "name": f"DEMO illustrative factor ({t})",
            "factor_type": t,
            "factor_value": val,
            "denominator_unit": den,
            "applicable_activity": act,
            "currency": "INR" if t == "spend_based" else None,
            "source_name": "DEMO synthetic illustrative factor; not an official source",
            "demo": True,
            "version": 1,
            "created_at": now()
        })

    # 9. Activity Library
    acts = [
        ("electricity", "Electricity consumption", "Purchased energy", "kWh"),
        ("diesel", "Diesel fuel combustion", "Stationary / Mobile fuel", "litres"),
        ("natural_gas", "Natural gas combustion", "Stationary fuel", "m3"),
        ("production", "Total manufactured production", "Production output", "tonnes"),
        ("raw_material", "Raw material consumption", "Material inputs", "tonnes")
    ]
    for aid, name, cat, unit in acts:
        put("activity_library", {"id": aid}, {
            "id": aid,
            "name": name,
            "category": cat,
            "default_unit": unit,
            "created_at": now()
        })

    # 10. Submissions
    put("submissions", {"id": "submission-xyz-2026-01"}, {
        "id": "submission-xyz-2026-01",
        "supplier_id": "supplier-xyz",
        "reporting_month": "2026-01",
        "status": "submitted",
        "version": 1,
        "activities": [
            {"activity_id": "electricity", "value": 100000.0, "unit": "kWh", "original_value": 100000.0, "original_unit": "kWh"},
            {"activity_id": "diesel", "value": 2000.0, "unit": "litres", "original_value": 2000.0, "original_unit": "litres"},
            {"activity_id": "production", "value": 500.0, "unit": "tonnes", "original_value": 500.0, "original_unit": "tonnes"},
            {"activity_id": "raw_material", "value": 600.0, "unit": "tonnes", "original_value": 600.0, "original_unit": "tonnes"}
        ],
        "demo": True,
        "created_at": now(),
        "updated_at": now()
    })
    put("submissions", {"id": "submission-green-2026-01"}, {
        "id": "submission-green-2026-01",
        "supplier_id": "supplier-green",
        "reporting_month": "2026-01",
        "status": "draft",
        "version": 1,
        "activities": [
            {"activity_id": "electricity", "value": 20000.0, "unit": "kWh", "original_value": 20000.0, "original_unit": "kWh"}
        ],
        "demo": True,
        "created_at": now(),
        "updated_at": now()
    })

    # 11. Purchase record
    put("purchase_records", {"id": "purchase-xyz-steel-2026-01"}, {
        "id": "purchase-xyz-steel-2026-01",
        "supplier_id": "supplier-xyz",
        "product_id": "product-steel",
        "reporting_month": "2026-01",
        "purchased_quantity": 100.0,
        "quantity_unit": "tonnes",
        "purchase_expenditure": 1000000.0,
        "currency": "INR",
        "fingerprint": "demo-xyz-steel-e2e",
        "demo": True,
        "created_at": now()
    })

    # 12. Indexes
    for c, keys, unique in [
        ("users", [("email", ASCENDING)], True),
        ("suppliers", [("supplier_code", ASCENDING)], True),
        ("products", [("product_code", ASCENDING)], True),
        ("submissions", [("supplier_id", ASCENDING), ("reporting_month", ASCENDING), ("version", ASCENDING)], True),
        ("purchase_uploads", [("sha256", ASCENDING)], True)
    ]:
        db[c].create_index(keys, unique=unique)

    print("scope3track_e2e_test seeded successfully!")
    print("Collections:", db.list_collection_names())

if __name__ == "__main__":
    main()
