"""
Scope3Track / TraceCarbon: Seed Public Reference Emission Factors (Phase 2.2).
Seeds the 23 verified research factors into the isolated QA database ('scope3track_final_qa'):
- 2 CEA Grid Electricity Factors (FY2022-23 and FY2023-24)
- 1 IPCC Stationary Diesel Fuel Combustion Factor
- 20 Open CEDA Sector Emission Factors (10 Sectors x 2 Financial Years)

Strict Safety:
- Only connects to 'scope3track_final_qa'
- Never overwrites or modifies existing Product-Factor records
- Idempotent upserts via document ID
"""
import os
import sys
from pathlib import Path
from datetime import datetime, timezone
from dotenv import load_dotenv
from pymongo import MongoClient

# Ensure backend directory is in sys.path
backend_dir = str(Path(__file__).resolve().parent.parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Load environment
root_env = Path(__file__).resolve().parent.parent.parent.parent / ".env"
load_dotenv(root_env if root_env.exists() else None)

TARGET_DB_NAME = "scope3track_final_qa"

def get_qa_db():
    uri = os.environ.get("MONGODB_URI")
    if not uri:
        raise RuntimeError("MONGODB_URI environment variable is missing")
    client = MongoClient(uri)
    db = client[TARGET_DB_NAME]
    assert db.name == TARGET_DB_NAME, f"Safety violation: Target database is {db.name}, expected {TARGET_DB_NAME}"
    return client, db


def get_public_factors():
    now_utc = datetime.now(timezone.utc)
    factors = []

    # 1. CEA Grid Electricity Factors (Central Electricity Authority, Ministry of Power, GoI)
    factors.append({
        "id": "FACT-CEA-GRID-FY22",
        "name": "Indian National Grid Electricity Factor FY2022-23",
        "factor_type": "activity_based",
        "applicable_activity": "electricity",
        "financial_year": "FY2022-23",
        "factor_value": 0.716,
        "denominator_unit": "kWh",
        "source_name": "Central Electricity Authority (CEA), Baseline Database User Guide v19.0",
        "attribution": "Central Electricity Authority",
        "data_classification": "PUBLIC FACTOR REFERENCE",
        "demo": False,
        "is_active": True,
        "version": 1,
        "created_at": now_utc,
        "updated_at": now_utc
    })

    factors.append({
        "id": "FACT-CEA-GRID-FY23",
        "name": "Indian National Grid Electricity Factor FY2023-24",
        "factor_type": "activity_based",
        "applicable_activity": "electricity",
        "financial_year": "FY2023-24",
        "factor_value": 0.727,
        "denominator_unit": "kWh",
        "source_name": "Central Electricity Authority (CEA), Baseline Database User Guide v20.0",
        "attribution": "Central Electricity Authority",
        "data_classification": "PUBLIC FACTOR REFERENCE",
        "demo": False,
        "is_active": True,
        "version": 1,
        "created_at": now_utc,
        "updated_at": now_utc
    })

    # 2. IPCC Stationary Diesel Factor
    factors.append({
        "id": "FACT-IPCC-DIESEL",
        "name": "Stationary Diesel Fuel Combustion Factor",
        "factor_type": "activity_based",
        "applicable_activity": "diesel",
        "financial_year": "ALL",
        "factor_value": 2.6853,
        "denominator_unit": "litres",
        "calculation_basis": "NCV 43.0 MJ/kg, Density 0.840 kg/L, 74,100 kg CO2/TJ, AR5 100-yr GWP",
        "source_name": "IPCC 2006 Guidelines Vol 2 Ch 2 Table 2.3 & BIS IS 1460:2017",
        "attribution": "IPCC NGGIP / BIS",
        "data_classification": "PUBLIC FACTOR REFERENCE",
        "demo": False,
        "is_active": True,
        "version": 1,
        "created_at": now_utc,
        "updated_at": now_utc
    })

    # 3. Open CEDA India Sector Emission Factors (10 Sectors x 2 Financial Years)
    ceda_sectors = [
        {
            "sector_code": "331110",
            "sector_name": "Iron and steel mills and ferroalloy manufacturing",
            "mapped_commodity": "Hot-rolled steel coils",
            "supplier_id": "SUP-001",
            "fy22_usd": 5.189019,
            "fy23_usd": 5.976869
        },
        {
            "sector_code": "326290",
            "sector_name": "Other rubber product manufacturing",
            "mapped_commodity": "Industrial rubber sheets",
            "supplier_id": "SUP-002",
            "fy22_usd": 1.707897,
            "fy23_usd": 1.575139
        },
        {
            "sector_code": "331313",
            "sector_name": "Alumina refining and primary aluminum production",
            "mapped_commodity": "Aluminium ingots",
            "supplier_id": "SUP-003",
            "fy22_usd": 2.710521,
            "fy23_usd": 2.525320
        },
        {
            "sector_code": "327310",
            "sector_name": "Cement manufacturing",
            "mapped_commodity": "PPC cement",
            "supplier_id": "SUP-004",
            "fy22_usd": 10.498445,
            "fy23_usd": 9.321503
        },
        {
            "sector_code": "325180",
            "sector_name": "Other Basic Inorganic Chemical Manufacturing",
            "mapped_commodity": "Soda ash",
            "supplier_id": "SUP-005",
            "fy22_usd": 1.046134,
            "fy23_usd": 0.994175
        },
        {
            "sector_code": "322210",
            "sector_name": "Paperboard container manufacturing",
            "mapped_commodity": "Corrugated packaging",
            "supplier_id": "SUP-006",
            "fy22_usd": 1.189885,
            "fy23_usd": 1.127227
        },
        {
            "sector_code": "313200",
            "sector_name": "Fabric mills",
            "mapped_commodity": "Industrial fabric",
            "supplier_id": "SUP-007",
            "fy22_usd": 0.924629,
            "fy23_usd": 0.832374
        },
        {
            "sector_code": "327200",
            "sector_name": "Glass and glass product manufacturing",
            "mapped_commodity": "Industrial glass sheets",
            "supplier_id": "SUP-008",
            "fy22_usd": 1.254113,
            "fy23_usd": 1.150881
        },
        {
            "sector_code": "326120",
            "sector_name": "Plastics pipe, pipe fitting, and unlaminated profile shape manufacturing",
            "mapped_commodity": "HDPE pipes",
            "supplier_id": "SUP-009",
            "fy22_usd": 1.067384,
            "fy23_usd": 0.977843
        },
        {
            "sector_code": "332410",
            "sector_name": "Power boiler and heat exchanger manufacturing",
            "mapped_commodity": "Industrial boilers",
            "supplier_id": "SUP-010",
            "fy22_usd": 1.311412,
            "fy23_usd": 1.168301
        }
    ]

    fx_rates = {
        "FY2022-23": {"fx": 78.186062, "proxy": "CY2022 (Proxy)", "source": "Open CEDA v2024", "tag": "FY22"},
        "FY2023-24": {"fx": 82.481132, "proxy": "CY2023 (Proxy)", "source": "Open CEDA v2025", "tag": "FY23"}
    }

    price_basis_note = "Assumes procurement spend reflects producer (factory-gate) valuation. Purchaser invoice price includes wholesale margins/taxes."

    for sec in ceda_sectors:
        code = sec["sector_code"]
        name = sec["sector_name"]
        commodity = sec["mapped_commodity"]
        sup_id = sec["supplier_id"]

        for fy, meta in fx_rates.items():
            tag = meta["tag"]
            fx = meta["fx"]
            usd_factor = sec[f"{tag.lower()}_usd"]
            eff_inr_factor = usd_factor / fx

            factor_id = f"FACT-CEDA-{code}-{tag}"
            factors.append({
                "id": factor_id,
                "name": f"{name} ({meta['source']} {meta['proxy']})",
                "factor_type": "spend_based",
                "sector_code": code,
                "sector_name": name,
                "mapped_commodity": commodity,
                "applicable_supplier_id": sup_id,
                "proxy_year": meta["proxy"],
                "financial_year": fy,
                "factor_value": round(eff_inr_factor, 6),
                "factor_value_usd": usd_factor,
                "fx_rate": fx,
                "price_basis": "Producer Price",
                "currency": "INR",
                "denominator_unit": "INR",
                "source_name": meta["source"],
                "license": "CC BY-SA 4.0",
                "attribution": "CEDA by Watershed",
                "notes": price_basis_note,
                "data_classification": "PUBLIC FACTOR REFERENCE",
                "demo": False,
                "is_active": True,
                "version": 1,
                "created_at": now_utc,
                "updated_at": now_utc
            })

    return factors


def seed_public_factors():
    client, db = get_qa_db()
    print(f"\n[SECURITY CHECK] Connected to target database: {db.name}")
    assert db.name == TARGET_DB_NAME, f"Safety violation: Aborting! Attempted to seed {db.name}"

    factors = get_public_factors()
    print(f"[PREFLIGHT] Prepared {len(factors)} public factors for seeding (2 CEA, 1 IPCC, 20 Open CEDA).")

    # Check for duplicates in factor IDs
    ids = [f["id"] for f in factors]
    assert len(ids) == len(set(ids)), f"Duplicate factor IDs detected in prepared list: {ids}"

    # Verify existing Product-Factor factors remain untouched
    existing_pcf = list(db.emission_factors.find({"factor_type": "product_factor"}))
    pcf_ids = {f["id"] for f in existing_pcf}
    print(f"[PREFLIGHT] Found {len(existing_pcf)} existing Product-Factor factors. None will be overwritten.")

    upserted_count = 0
    for f in factors:
        assert f["id"] not in pcf_ids, f"Collision error: Public factor {f['id']} matches an existing PCF factor!"
        res = db.emission_factors.update_one(
            {"id": f["id"]},
            {"$set": f},
            upsert=True
        )
        if res.upserted_id or res.modified_count:
            upserted_count += 1

    total_factors = db.emission_factors.count_documents({})
    public_factors_count = db.emission_factors.count_documents({"data_classification": "PUBLIC FACTOR REFERENCE"})
    
    print(f"\n[SEED COMPLETE] Successfully seeded/updated {len(factors)} public factors.")
    print(f"  Total emission factors in {db.name}: {total_factors}")
    print(f"  Public factors count: {public_factors_count}")
    assert public_factors_count == 23, f"Expected 23 public factors, found {public_factors_count}"
    
    # Assert Product-Factor baseline factors intact
    after_pcf_count = db.emission_factors.count_documents({"factor_type": "product_factor"})
    assert after_pcf_count == len(existing_pcf), f"PCF factor count changed from {len(existing_pcf)} to {after_pcf_count}"
    print(f"  Product-Factor baseline count intact: {after_pcf_count}")

    client.close()


if __name__ == "__main__":
    seed_public_factors()
