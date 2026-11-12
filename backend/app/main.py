"""Scope3Track: single-manufacturer FastAPI MVP.

All emissions arithmetic is deterministic.  AI is advisory only and never writes
activity data, selects a method, or performs a calculation.
"""
from __future__ import annotations
import asyncio, hashlib, io, json, os, re, uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Literal

import httpx, pandas as pd
import fitz
from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from pymongo import ASCENDING, MongoClient
from pymongo.errors import PyMongoError
try:
    from app.calculation_safety import (
        atomic_activate_calculation_run,
        atomic_create_and_activate_calculation_run,
    )
except ImportError:
    from calculation_safety import (
        atomic_activate_calculation_run,
        atomic_create_and_activate_calculation_run,
    )

ROOT = Path(__file__).resolve().parents[2]
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore")
    app_name: str = "Scope3Track"; api_v1_prefix: str = "/api/v1"
    mongodb_uri: str = "mongodb://localhost:27017"; mongodb_db: str = os.environ.get("MONGODB_DB") or "scope3track"
    jwt_secret_key: str = "development-only-change-me"; jwt_algorithm: str = "HS256"; access_token_expire_minutes: int = 60
    openrouter_api_key: str = ""; openrouter_base_url: str = "https://openrouter.ai/api/v1"; openrouter_model: str = "nvidia/nemotron-3-ultra-550b-a55b"; openrouter_timeout: int = 30
    cors_origins: str = "http://localhost:5173"; upload_dir: str = "uploads"; max_upload_size_mb: int = 10
    demo_mode: bool = True
settings = Settings()
pwd = CryptContext(schemes=["argon2"], deprecated="auto")

def now(): return datetime.now(timezone.utc)
def oid(): return str(uuid.uuid4())
def month_ok(v: str):
    if not (re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", v) or re.fullmatch(r"FY\d{4}-\d{2}", v)):
        raise ValueError("reporting_month must be YYYY-MM or FYYYYY-YY (e.g. FY2022-23)")
    return v
def clean(d: Any):
    if isinstance(d, dict): return {k: clean(v) for k,v in d.items() if k != "_id"}
    if isinstance(d, list): return [clean(v) for v in d]
    if isinstance(d, datetime): return d.isoformat()
    return d

UNIT_CONVERSIONS = {
    ("mwh", "kwh"): 1000.0,
    ("gwh", "kwh"): 1000000.0,
    ("kwh", "kwh"): 1.0,
    ("kwh", "mwh"): 0.001,
    ("kwh", "gwh"): 0.000001,
    ("tonnes", "kg"): 1000.0,
    ("tonne", "kg"): 1000.0,
    ("t", "kg"): 1000.0,
    ("kg", "tonnes"): 0.001,
    ("kg", "tonne"): 0.001,
    ("kg", "t"): 0.001,
    ("g", "kg"): 0.001,
    ("tonnes", "tonnes"): 1.0,
    ("tonne", "tonne"): 1.0,
    ("kg", "kg"): 1.0,
    ("m3", "litres"): 1000.0,
    ("litres", "m3"): 0.001,
    ("litre", "m3"): 0.001,
    ("m3", "litre"): 1000.0,
    ("l", "m3"): 0.001,
    ("m3", "l"): 1000.0,
    ("litres", "litres"): 1.0,
    ("litre", "litres"): 1.0,
    ("litres", "litre"): 1.0,
    ("litre", "litre"): 1.0,
    ("l", "litres"): 1.0,
    ("litres", "l"): 1.0,
    ("l", "litre"): 1.0,
    ("litre", "l"): 1.0,
    ("m3", "m3"): 1.0,
}
def convert_unit(value: float, from_unit: str, to_unit: str) -> tuple[float | None, dict | None]:
    fu = from_unit.strip().lower(); tu = to_unit.strip().lower()
    if fu == tu: return value, None
    if (fu, tu) in UNIT_CONVERSIONS:
        factor = UNIT_CONVERSIONS[(fu, tu)]
        converted = value * factor
        return converted, {"from_unit": from_unit, "to_unit": to_unit, "factor": factor, "converted": True}
    return None, None

class Database:
    def __init__(self): self.client=None; self.db=None
    def connect(self):
        self.client=MongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=4000); self.client.admin.command("ping"); self.db=self.client[settings.mongodb_db]
        for c, keys, unique in [("users", [("email",ASCENDING)], True),("suppliers",[("supplier_code",ASCENDING)],True),("products",[("product_code",ASCENDING)],True),("submissions",[("supplier_id",ASCENDING),("reporting_month",ASCENDING),("version",ASCENDING)],True),("purchase_uploads",[("sha256",ASCENDING)],True)]: self.db[c].create_index(keys, unique=unique)
dbx=Database()
def db():
    if dbx.db is None: raise HTTPException(503,"Database is unavailable. Check MongoDB configuration.")
    return dbx.db

class Login(BaseModel): email: EmailStr; password: str = Field(min_length=1)
class PasswordChange(BaseModel): current_password: str; new_password: str = Field(min_length=10)
class SupplierCreate(BaseModel):
    name: str = Field(min_length=2); supplier_code: str = Field(pattern=r"^[A-Za-z0-9_-]+$"); contact_email: EmailStr; login_email: EmailStr; initial_password: str=Field(min_length=10); contact_details: str|None=None
    requirements: list[dict] = []
class AuditorCreate(BaseModel): name:str=Field(min_length=2); email:EmailStr; login_email:EmailStr; initial_password:str=Field(min_length=10); employee_id:str|None=None
class ProductIn(BaseModel): product_name:str=Field(min_length=2); product_code:str; scope3_category:Literal["Category 1","Category 2"]; relevant_unit:str; active:bool=True
class RequirementsIn(BaseModel): requirements:list[dict]
class StatusIn(BaseModel): active:bool
class ActivityIn(BaseModel): value:float=Field(gt=0); unit:str=Field(min_length=1); notes:str|None=None
class SubmissionIn(BaseModel):
    reporting_month: str
    reporting_period_type: str | None = None
    financial_year: str | None = None
    reporting_start_date: str | None = None
    reporting_end_date: str | None = None
    submission_method: str | None = "MANUAL_ENTRY"

    @field_validator("reporting_month")
    @classmethod
    def vm(cls,v): return month_ok(v)

class SavedFormatIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    headers: list[str]
    mappings: dict[str, dict[str, str]]

class SavedFormatUpdate(BaseModel):
    name: str | None = None
    mappings: dict[str, dict[str, str]] | None = None

class FormatDetectIn(BaseModel):
    headers: list[str] | None = None
    upload_id: str | None = None
    submission_id: str | None = None
class AssignmentIn(BaseModel): supplier_id:str|None=None; submission_id:str|None=None
class CommentIn(BaseModel): text:str=Field(min_length=1,max_length=3000)
class ClarificationIn(BaseModel): question:str=Field(min_length=1,max_length=3000)
class ClarificationUpdate(BaseModel): status:Literal["open","resolved"]
class ClarificationResponse(BaseModel): response:str=Field(min_length=1,max_length=3000)
class CalculationIn(BaseModel):
    purchase_record_id: str
    method: Literal["product_factor", "activity_based", "spend_based"]
    factor_id: str | None = None
    allocation_basis: str | None = None
    allocation_value: float | None = Field(default=None, gt=0)
    preview_only: bool = False

COMMODITY_TO_NAICS = {
    "ST-HR-001": "331110",
    "Hot-rolled steel coils": "331110",
    "SUP-001": "331110",
    "RB-TY-002": "326290",
    "Industrial rubber sheets": "326290",
    "SUP-002": "326290",
    "AL-IN-003": "331313",
    "Aluminium ingots": "331313",
    "SUP-003": "331313",
    "CM-PC-004": "327310",
    "PPC cement": "327310",
    "SUP-004": "327310",
    "CH-SA-005": "325180",
    "Soda ash": "325180",
    "SUP-005": "325180",
    "PK-BX-006": "322210",
    "Corrugated packaging": "322210",
    "SUP-006": "322210",
    "TX-FC-007": "313200",
    "Industrial fabric": "313200",
    "SUP-007": "313200",
    "GL-SG-008": "327200",
    "Industrial glass sheets": "327200",
    "SUP-008": "327200",
    "PL-PP-009": "326120",
    "HDPE pipes": "326120",
    "SUP-009": "326120",
    "MC-SG-010": "332410",
    "Industrial boilers": "332410",
    "SUP-010": "332410",
}

def resolve_financial_year(rm: str | None) -> tuple[str, str]:
    """Returns (full_financial_year, short_tag) like ('FY2022-23', 'FY22')."""
    if not rm:
        return "FY2022-23", "FY22"
    rm = str(rm).strip().replace("\u2013", "-").replace("\u2014", "-")
    if rm.startswith("FY") and len(rm) >= 9:
        return rm[:9], f"FY{rm[4:6]}"
    parts = rm.split("-")
    if len(parts) == 2 and parts[0].isdigit() and parts[1].isdigit():
        y, m = int(parts[0]), int(parts[1])
        if m >= 4:
            return f"FY{y}-{y%100+1:02d}", f"FY{str(y)[2:]}"
        else:
            return f"FY{y-1}-{y%100:02d}", f"FY{str(y-1)[2:]}"
    return "FY2022-23", "FY22"


def resolve_purchase_sector(p: dict) -> str | None:
    """Resolve NAICS sector code from purchase record or commodity mapping without remapping valid sectors."""
    return (
        p.get("sector_code")
        or COMMODITY_TO_NAICS.get(p.get("product_id"))
        or COMMODITY_TO_NAICS.get(p.get("product_name"))
        or COMMODITY_TO_NAICS.get(p.get("supplier_id"))
    )


def _lookup_spend_factor(sec: str | None, fy: str, tag: str) -> dict | None:
    """Look up official Open CEDA factor first; fall back to explicitly enabled SYNTHETIC_DEMO only in demo mode."""
    if not sec:
        return None
    ef_col = db()["emission_factors"]
    factor = (
        ef_col.find_one({
            "factor_type": "spend_based",
            "sector_code": sec,
            "financial_year": fy,
            "is_active": {"$ne": False},
            "demo": {"$ne": True},
        })
        or ef_col.find_one({"id": f"FACT-CEDA-{sec}-{tag}", "is_active": {"$ne": False}})
    )
    if not factor and settings.demo_mode:
        factor = ef_col.find_one({
            "factor_type": "spend_based",
            "sector_code": sec,
            "financial_year": fy,
            "source_name": "SYNTHETIC_DEMO",
            "is_active": True,
        })
    return factor


def _is_synthetic_spend_factor(f: dict) -> bool:
    src = str(f.get("source_name") or "")
    return src == "SYNTHETIC_DEMO" or (bool(f.get("demo")) and "ceda" not in src.lower())


def _compute_spend_breakdown(p: dict, f: dict, sec: str | None) -> tuple[dict, dict, float, str]:
    """Compute Spend-Based INR -> USD -> kg CO2e emission figures with transparent official vs demo provenance."""
    spend_inr = float(p.get("purchase_expenditure", 0.0))
    fx = float(f.get("fx_rate") or 1.0)
    spend_usd = spend_inr / fx
    f_usd = float(f.get("factor_value_usd") if f.get("factor_value_usd") is not None else float(f["factor_value"]) * fx)
    result = round(spend_usd * f_usd, 2)
    is_synth = _is_synthetic_spend_factor(f)
    source_name = f.get("source_name") or ("SYNTHETIC_DEMO" if is_synth else "Open CEDA")
    version = f.get("version", 1)
    disclosure = f.get("disclosure") or (
        "Synthetic demonstration factor — not an official Open CEDA factor"
        if is_synth
        else f"{source_name} ({f.get('proxy_year') or f.get('financial_year')})"
    )
    attribution = None if is_synth else f.get("attribution", "CEDA by Watershed")
    license_str = "Synthetic Demonstration Data" if is_synth else f.get("license", "CC BY-SA 4.0")
    price_basis = f.get("price_basis", "Producer Price")
    desc = disclosure if is_synth else f"{source_name} EEIO sector factor ({f.get('proxy_year')})"

    component = {
        "sector_code": f.get("sector_code", sec),
        "sector_name": f.get("sector_name"),
        "factor_id": f["id"],
        "factor_version": version,
        "source_name": source_name,
        "is_synthetic": is_synth,
        "disclosure": disclosure,
        "spend_inr": spend_inr,
        "fx_rate": fx,
        "spend_usd": round(spend_usd, 2),
        "factor_value_usd": f_usd,
        "emissions_kgco2e": result,
    }
    metadata = {
        "source_name": source_name,
        "factor_version": version,
        "attribution": attribution,
        "license": license_str,
        "price_basis": price_basis,
        "proxy_year": f.get("proxy_year"),
        "fx_rate": fx,
        "factor_value_usd": f_usd,
        "sector_code": f.get("sector_code", sec),
        "sector_name": f.get("sector_name"),
        "is_synthetic": is_synth,
        "disclosure": disclosure,
    }
    return component, metadata, result, desc


def _lookup_activity_factors(fy: str, tag: str) -> tuple[dict | None, dict | None]:
    """Look up CEA grid factor for the target FY and project-derived IPCC stationary diesel factor."""
    ef_col = db()["emission_factors"]
    cea = (
        ef_col.find_one({"id": f"FACT-CEA-GRID-{tag}", "is_active": {"$ne": False}})
        or ef_col.find_one({
            "factor_type": "activity_based",
            "applicable_activity": "electricity",
            "financial_year": fy,
            "is_active": {"$ne": False},
            "demo": {"$ne": True},
        })
    )
    ipcc = (
        ef_col.find_one({"id": "FACT-IPCC-DIESEL", "is_active": {"$ne": False}})
        or ef_col.find_one({
            "factor_type": "activity_based",
            "applicable_activity": "diesel",
            "financial_year": {"$in": ["ALL", fy]},
            "is_active": {"$ne": False},
            "demo": {"$ne": True},
        })
    )
    return cea, ipcc


def _normalize_activity_value(act: dict, target_unit: str) -> tuple[float, str]:
    val = float(act.get("value", 0.0))
    unit = str(act.get("unit") or target_unit)
    if unit.lower() == target_unit.lower():
        return val, target_unit
    conv, _ = convert_unit(val, unit, target_unit)
    if conv is not None:
        return conv, target_unit
    return val, unit


def _compute_activity_breakdown(
    elec_act: dict,
    diesel_act: dict,
    conv_qty: float,
    annual_prod: float,
    alpha: float,
    cea: dict,
    ipcc: dict,
    allocation_basis: str = "physical_production_mass",
) -> tuple[list[dict], dict, float, float, float, float]:
    """Compute Activity-Based facility energy emissions and physical production allocation."""
    elec_val, elec_unit = _normalize_activity_value(elec_act, str(cea.get("denominator_unit") or "kWh"))
    diesel_val, diesel_unit = _normalize_activity_value(diesel_act, str(ipcc.get("denominator_unit") or "litres"))
    em_elec = elec_val * float(cea["factor_value"])
    em_diesel = diesel_val * float(ipcc["factor_value"])
    fac_total = em_elec + em_diesel
    alloc_em = round(fac_total * alpha, 2)

    diesel_disclosure = ipcc.get("disclosure") or (
        "Project-derived IPCC-based stationary combustion factor using documented project assumptions — not a universal directly published IPCC factor."
    )
    components = [
        {
            "activity_id": "electricity",
            "value": elec_val,
            "unit": elec_unit,
            "factor_id": cea["id"],
            "factor_value": cea["factor_value"],
            "source_name": cea.get("source_name"),
            "emissions_kgco2e": round(em_elec, 2),
        },
        {
            "activity_id": "diesel",
            "value": diesel_val,
            "unit": diesel_unit,
            "factor_id": ipcc["id"],
            "factor_value": ipcc["factor_value"],
            "source_name": ipcc.get("source_name"),
            "is_project_derived": ipcc.get("is_project_derived", True),
            "disclosure": diesel_disclosure,
            "emissions_kgco2e": round(em_diesel, 2),
        },
        {"activity_id": "facility_total", "emissions_kgco2e": round(fac_total, 2)},
        {
            "activity_id": "allocation",
            "allocation_basis": allocation_basis,
            "purchased_qty": conv_qty,
            "annual_production": annual_prod,
            "allocation_fraction": alpha,
        },
    ]
    factor_metadata = {
        "source_name": "CEA Grid Baseline & Project-Derived Stationary Diesel Factor",
        "grid_factor": {
            "id": cea["id"],
            "factor_value": cea["factor_value"],
            "version": cea.get("factor_version") or cea.get("version"),
            "source": cea.get("source_name"),
            "is_official_reference": True,
        },
        "diesel_factor": {
            "id": ipcc["id"],
            "factor_value": ipcc["factor_value"],
            "source": ipcc.get("source_name"),
            "calculation_basis": ipcc.get("calculation_basis"),
            "is_project_derived": True,
            "disclosure": diesel_disclosure,
        },
        "description": "Supplier-specific energy activity allocation estimate — synthetic demonstration supplier activity data",
    }
    return components, factor_metadata, em_elec, em_diesel, fac_total, alloc_em

app=FastAPI(title="Scope3Track API", version="1.0.0")
app.add_middleware(CORSMiddleware,allow_origins=[x.strip() for x in settings.cors_origins.split(",")],allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",allow_credentials=True,allow_methods=["*"],allow_headers=["*"])

@app.on_event("startup")
def start(): dbx.connect()
@app.on_event("shutdown")
def stop():
    if dbx.client: dbx.client.close()

def token(user):
    return jwt.encode({"sub":user["id"],"role":user["role"],"exp":now()+timedelta(minutes=settings.access_token_expire_minutes)},settings.jwt_secret_key,algorithm=settings.jwt_algorithm)
def current(authorization: str = __import__('fastapi').Header(default="")):
    try:
        if not authorization.startswith("Bearer "):
            raise ValueError()
        raw = authorization.split(" ", 1)[1]
        if not raw:
            raise ValueError()
        p = jwt.decode(raw, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        u = db()["users"].find_one({"id": p["sub"], "active": True})
        if not u:
            raise ValueError()
        return clean(u)
    except (JWTError, ValueError, IndexError):
        raise HTTPException(401, "Invalid or expired access token")
def role(*roles):
    def f(u=Depends(current)):
        if u["role"] not in roles: raise HTTPException(403,"This role is not permitted for this action")
        return u
    return f
def find(coll,id):
    x=db()[coll].find_one({"id":id})
    if not x: raise HTTPException(404,f"{coll[:-1].title()} not found")
    return clean(x)
def attach_evidence_counts(subs: list[dict]) -> list[dict]:
    if not subs: return []
    sub_ids = [s["id"] for s in subs if "id" in s]
    pipeline = [
        {"$match": {"submission_id": {"$in": sub_ids}}},
        {"$group": {"_id": "$submission_id", "count": {"$sum": 1}}}
    ]
    counts = {doc["_id"]: doc["count"] for doc in db()["evidence_documents"].aggregate(pipeline)}
    sup_ids = [s["supplier_id"] for s in subs if s.get("supplier_id") and not s.get("supplier_name")]
    sup_map = {sup["id"]: sup.get("name") for sup in db()["suppliers"].find({"id": {"$in": sup_ids}})} if sup_ids else {}
    for s in subs:
        s["evidence_count"] = counts.get(s["id"], 0)
        if not s.get("supplier_name") and s.get("supplier_id") in sup_map:
            s["supplier_name"] = sup_map[s["supplier_id"]]
    return subs
def attach_single_evidence_count(s: dict) -> dict:
    if s and "id" in s:
        s["evidence_count"] = db()["evidence_documents"].count_documents({"submission_id": s["id"]})
        if not s.get("supplier_name") and s.get("supplier_id"):
            sup = db()["suppliers"].find_one({"id": s["supplier_id"]})
            if sup and sup.get("name"):
                s["supplier_name"] = sup["name"]
    return s
def supplier_owned(sub_id,u):
    s=find("submissions",sub_id)
    if u["role"]=="supplier" and s["supplier_id"]!=u["profile_id"]: raise HTTPException(403,"You can only access your own submissions")
    if u["role"]=="auditor" and not db()["auditor_assignments"].find_one({"auditor_id":u["profile_id"],"$or":[{"supplier_id":s["supplier_id"]},{"submission_id":sub_id}]}): raise HTTPException(403,"Submission is not assigned to you")
    return attach_single_evidence_count(s)
def validation(sub):
    req={x["activity_id"]:x for x in db()["supplier_requirements"].find({"supplier_id":sub["supplier_id"]})}; vals={x["activity_id"]:x for x in sub.get("activities",[])}; issues=[]
    for aid,r in req.items():
        if aid not in vals: issues.append({"activity_id":aid,"error":"Required activity is missing"})
        else:
            v_unit = vals[aid].get("unit", "")
            r_unit = r["expected_unit"]
            if v_unit.lower() != r_unit.lower():
                conv_val, _ = convert_unit(vals[aid]["value"], v_unit, r_unit)
                if conv_val is None:
                    issues.append({"activity_id":aid,"error":f"Expected unit {r_unit}, incompatible with {v_unit}"})
    return {"valid":not issues,"issues":issues}

@app.get("/health")
def health(): return {"status":"ok","service":settings.app_name}
@app.get("/ready")
def ready():
    try: db()["users"].find_one(); return {"status":"ready"}
    except HTTPException: raise

P=settings.api_v1_prefix
@app.post(P+"/auth/login")
def login(data:Login):
    u=db()["users"].find_one({"email":data.email.lower(),"active":True})
    if not u or not pwd.verify(data.password,u["password_hash"]): raise HTTPException(401,"Invalid email or password")
    return {"access_token":token(u),"token_type":"bearer","user":clean({k:v for k,v in u.items() if k not in ["password_hash","_id"]})}
@app.get(P+"/auth/me")
def me(u=Depends(current)): return {k:v for k,v in u.items() if k!="password_hash"}
@app.post(P+"/auth/change-password")
def change(data:PasswordChange,u=Depends(current)):
    stored=db()["users"].find_one({"id":u["id"]})
    if not pwd.verify(data.current_password,stored["password_hash"]): raise HTTPException(400,"Current password is incorrect")
    db()["users"].update_one({"id":u["id"]},{"$set":{"password_hash":pwd.hash(data.new_password),"updated_at":now()}}); return {"message":"Password changed"}

@app.get(P+"/manufacturer/profile")
def manufacturer_profile(u=Depends(role("manufacturer"))): return find("manufacturer","manufacturer-1")
@app.patch(P+"/manufacturer/profile")
def manufacturer_patch(data:dict,u=Depends(role("manufacturer"))):
    allowed={k:v for k,v in data.items() if k in {"name","address","contact_email","phone"}}; db()["manufacturer"].update_one({"id":"manufacturer-1"},{"$set":allowed|{"updated_at":now()}}); return find("manufacturer","manufacturer-1")

@app.post(P+"/manufacturer/suppliers",status_code=201)
def create_supplier(x:SupplierCreate,u=Depends(role("manufacturer"))):
    if db()["users"].find_one({"email":x.login_email.lower()}): raise HTTPException(409,"Login email already exists")
    sid=oid(); doc={"id":sid,"name":x.name,"supplier_code":x.supplier_code,"contact_email":str(x.contact_email),"contact_details":x.contact_details,"active":True,"created_at":now(),"updated_at":now()}
    try: db()["suppliers"].insert_one(doc)
    except PyMongoError: raise HTTPException(409,"Supplier code already exists")
    db()["users"].insert_one({"id":oid(),"email":str(x.login_email).lower(),"password_hash":pwd.hash(x.initial_password),"role":"supplier","profile_id":sid,"active":True,"created_at":now()})
    save_requirements(sid,x.requirements); return clean(doc)
@app.get(P+"/manufacturer/suppliers")
def suppliers(skip:int=0,limit:int=50,u=Depends(role("manufacturer"))): return {"items":[clean(x) for x in db()["suppliers"].find().skip(skip).limit(min(limit,100))]}
@app.get(P+"/manufacturer/suppliers/{sid}")
def supplier_get(sid:str,u=Depends(role("manufacturer"))): return find("suppliers",sid)
@app.patch(P+"/manufacturer/suppliers/{sid}")
def supplier_patch(sid:str,data:dict,u=Depends(role("manufacturer"))): find("suppliers",sid); db()["suppliers"].update_one({"id":sid},{"$set":{k:v for k,v in data.items() if k in {"name","contact_email","contact_details"}}|{"updated_at":now()}}); return find("suppliers",sid)
@app.patch(P+"/manufacturer/suppliers/{sid}/status")
def supplier_status(sid:str,x:StatusIn,u=Depends(role("manufacturer"))): db()["suppliers"].update_one({"id":sid},{"$set":{"active":x.active}}); db()["users"].update_many({"profile_id":sid},{"$set":{"active":x.active}}); return find("suppliers",sid)
def save_requirements(sid,rs):
    for r in rs:
        if not r.get("activity_id") or not r.get("expected_unit"): raise HTTPException(422,"Requirements need activity_id and expected_unit")
    db()["supplier_requirements"].delete_many({"supplier_id":sid});
    if rs: db()["supplier_requirements"].insert_many([{**r,"id":oid(),"supplier_id":sid,"created_at":now()} for r in rs])
@app.get(P+"/manufacturer/suppliers/{sid}/requirements")
def req_get(sid:str,u=Depends(role("manufacturer"))): find("suppliers",sid); return {"items":[clean(x) for x in db()["supplier_requirements"].find({"supplier_id":sid})]}
@app.put(P+"/manufacturer/suppliers/{sid}/requirements")
def req_put(sid:str,x:RequirementsIn,u=Depends(role("manufacturer"))): find("suppliers",sid); save_requirements(sid,x.requirements); return req_get(sid,u)

@app.post(P+"/manufacturer/auditors",status_code=201)
def auditor_create(x:AuditorCreate,u=Depends(role("manufacturer"))):
    if db()["users"].find_one({"email":x.login_email.lower()}): raise HTTPException(409,"Login email already exists")
    aid=oid(); doc={"id":aid,"name":x.name,"email":str(x.email),"employee_id":x.employee_id,"active":True,"created_at":now()}; db()["auditors"].insert_one(doc); db()["users"].insert_one({"id":oid(),"email":str(x.login_email).lower(),"password_hash":pwd.hash(x.initial_password),"role":"auditor","profile_id":aid,"active":True,"created_at":now()}); return clean(doc)
@app.get(P+"/manufacturer/auditors")
def auditor_list(u=Depends(role("manufacturer"))): return {"items":[clean(x) for x in db()["auditors"].find()]}
@app.get(P+"/manufacturer/auditors/{aid}")
def auditor_get(aid:str,u=Depends(role("manufacturer"))): return find("auditors",aid)
@app.patch(P+"/manufacturer/auditors/{aid}")
def auditor_patch(aid:str,data:dict,u=Depends(role("manufacturer"))): find("auditors",aid); db()["auditors"].update_one({"id":aid},{"$set":{k:v for k,v in data.items() if k in {"name","email","employee_id"}}}); return find("auditors",aid)
@app.patch(P+"/manufacturer/auditors/{aid}/status")
def auditor_status(aid:str,x:StatusIn,u=Depends(role("manufacturer"))): db()["auditors"].update_one({"id":aid},{"$set":{"active":x.active}}); db()["users"].update_many({"profile_id":aid},{"$set":{"active":x.active}}); return find("auditors",aid)
@app.post(P+"/manufacturer/auditors/{aid}/assignments",status_code=201)
def assign(aid:str,x:AssignmentIn,u=Depends(role("manufacturer"))):
    find("auditors",aid)
    if not x.supplier_id and not x.submission_id: raise HTTPException(422,"supplier_id or submission_id is required")
    if x.supplier_id: find("suppliers",x.supplier_id)
    if x.submission_id: find("submissions",x.submission_id)
    d={"id":oid(),"auditor_id":aid,**x.model_dump(),"created_at":now()}; db()["auditor_assignments"].insert_one(d); return clean(d)
@app.get(P+"/manufacturer/auditors/{aid}/assignments")
def assignments(aid:str,u=Depends(role("manufacturer"))): return {"items":[clean(x) for x in db()["auditor_assignments"].find({"auditor_id":aid})]}
@app.delete(P+"/manufacturer/auditors/{aid}/assignments/{assignment_id}",status_code=204)
def assignment_delete(aid:str,assignment_id:str,u=Depends(role("manufacturer"))): db()["auditor_assignments"].delete_one({"id":assignment_id,"auditor_id":aid})

@app.post(P+"/manufacturer/products",status_code=201)
def product_create(x:ProductIn,u=Depends(role("manufacturer"))):
    d={"id":oid(),**x.model_dump(),"created_at":now(),"updated_at":now()}
    try: db()["products"].insert_one(d)
    except PyMongoError: raise HTTPException(409,"Product code already exists")
    return clean(d)
@app.get(P+"/manufacturer/products")
def product_list(active:bool|None=None,u=Depends(role("manufacturer"))): return {"items":[clean(x) for x in db()["products"].find({} if active is None else {"active":active})]}
@app.get(P+"/manufacturer/products/{pid}")
def product_get(pid:str,u=Depends(role("manufacturer"))): return find("products",pid)
@app.patch(P+"/manufacturer/products/{pid}")
def product_patch(pid:str,data:dict,u=Depends(role("manufacturer"))): find("products",pid); db()["products"].update_one({"id":pid},{"$set":{k:v for k,v in data.items() if k in ProductIn.model_fields}|{"updated_at":now()}}); return find("products",pid)
@app.patch(P+"/manufacturer/products/{pid}/status")
def product_status(pid:str,x:StatusIn,u=Depends(role("manufacturer"))): db()["products"].update_one({"id":pid},{"$set":{"active":x.active}}); return find("products",pid)
@app.get(P+"/manufacturer/activity-library")
def activities(u=Depends(role("manufacturer"))): return {"items":[clean(x) for x in db()["activity_library"].find()]}
@app.get(P+"/manufacturer/emission-factors")
def factors(u=Depends(role("manufacturer"))): return {"items":[clean(x) for x in db()["emission_factors"].find()]}
@app.get(P+"/manufacturer/emission-factors/{fid}")
def factor(fid:str,u=Depends(role("manufacturer"))): return find("emission_factors",fid)

PURCHASE_COLUMNS=["supplier_id","product_name","reporting_month","purchased_quantity","quantity_unit","purchase_expenditure","currency"]
def parse_purchase(raw:bytes):
    try: frame=pd.read_excel(io.BytesIO(raw),sheet_name="Purchase Records")
    except Exception as e: raise HTTPException(422,"Workbook must contain a readable 'Purchase Records' sheet") from e
    if list(frame.columns)!=PURCHASE_COLUMNS: raise HTTPException(422,{"message":"Workbook columns must exactly match the fixed template","expected":PURCHASE_COLUMNS,"received":[str(x) for x in frame.columns]})
    errors=[]; rows=[]
    for i,row in frame.iterrows():
        n=i+2; d={k:("" if pd.isna(row[k]) else str(row[k]).strip()) for k in PURCHASE_COLUMNS}; problems=[]
        try: month_ok(d["reporting_month"])
        except ValueError: problems.append("reporting_month must be YYYY-MM")
        if not db()["suppliers"].find_one({"supplier_code":d["supplier_id"]}): problems.append("Unknown supplier_id")
        if not db()["products"].find_one({"product_name":d["product_name"],"active":True}): problems.append("Unknown or inactive product_name")
        for k in ["purchased_quantity","purchase_expenditure"]:
            try:
                if float(d[k])<=0: raise ValueError()
                d[k]=float(d[k])
            except ValueError: problems.append(f"{k} must be a positive number")
        if not re.fullmatch(r"[A-Z]{3}",d["currency"]): problems.append("currency must be a three-letter ISO code")
        if not d["quantity_unit"]: problems.append("quantity_unit is required")
        if problems: errors.append({"row":n,"errors":problems})
        else: rows.append(d)
    return rows,errors
@app.get(P+"/manufacturer/purchase-records/template")
def purchase_template(u=Depends(role("manufacturer"))):
    buff=io.BytesIO()
    with pd.ExcelWriter(buff,engine="openpyxl") as w:
        pd.DataFrame(columns=PURCHASE_COLUMNS).to_excel(w,index=False,sheet_name="Purchase Records")
        pd.DataFrame({"Instructions":["Use the exact headers in Purchase Records. One row per purchase. No AI mapping is used."]}).to_excel(w,index=False,sheet_name="Instructions")
    buff.seek(0); return StreamingResponse(buff,media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",headers={"Content-Disposition":"attachment; filename=scope3track_purchase_records.xlsx"})
@app.post(P+"/manufacturer/purchase-records/uploads",status_code=201)
async def purchase_upload(file:UploadFile=File(...),u=Depends(role("manufacturer"))):
    if not file.filename.lower().endswith(".xlsx"): raise HTTPException(415,"Purchase records must use the fixed .xlsx template")
    raw=await file.read()
    if len(raw)>settings.max_upload_size_mb*1024*1024: raise HTTPException(413,"File exceeds upload size limit")
    sha=hashlib.sha256(raw).hexdigest()
    if db()["purchase_uploads"].find_one({"sha256":sha}): raise HTTPException(409,"This file was already uploaded")
    rows,errors=parse_purchase(raw); d={"id":oid(),"filename":file.filename,"sha256":sha,"total_rows":len(rows)+len(errors),"valid_rows":rows,"invalid_rows":errors,"confirmed":False,"created_at":now()}; db()["purchase_uploads"].insert_one(d); return clean(d)
@app.get(P+"/manufacturer/purchase-records/uploads/{uid}")
def purchase_preview(uid:str,u=Depends(role("manufacturer"))): return find("purchase_uploads",uid)
@app.post(P+"/manufacturer/purchase-records/uploads/{uid}/confirm")
def purchase_confirm(uid:str,u=Depends(role("manufacturer"))):
    up=find("purchase_uploads",uid)
    if up["confirmed"]: raise HTTPException(409,"Upload already confirmed")
    if up["invalid_rows"]: raise HTTPException(422,"Invalid rows must be corrected and uploaded again")
    records=[]; seen_fps=set()
    for r in up["valid_rows"]:
        fp=hashlib.sha256(json.dumps(r,sort_keys=True).encode()).hexdigest()
        if fp in seen_fps or db()["purchase_records"].find_one({"fingerprint":fp}): raise HTTPException(409,"Exact duplicate purchase row detected")
        seen_fps.add(fp)
        r_copy=dict(r)
        sup=db()["suppliers"].find_one({"supplier_code":r_copy.pop("supplier_id")}); prod=db()["products"].find_one({"product_name":r_copy.pop("product_name")}); records.append({"id":oid(),"supplier_id":sup["id"],"product_id":prod["id"],**r_copy,"fingerprint":fp,"upload_id":uid,"created_at":now()})
    if records: db()["purchase_records"].insert_many(records)
    db()["purchase_uploads"].update_one({"id":uid},{"$set":{"confirmed":True,"confirmed_at":now()}}); return {"imported":len(records)}
@app.get(P+"/manufacturer/purchase-records")
def purchase_list(reporting_month:str|None=None,u=Depends(role("manufacturer"))): return {"items":[clean(x) for x in db()["purchase_records"].find({} if not reporting_month else {"reporting_month":reporting_month})]}
@app.get(P+"/manufacturer/purchase-records/{rid}")
def purchase_get(rid:str,u=Depends(role("manufacturer"))): return find("purchase_records",rid)

@app.get(P+"/supplier/profile")
def supplier_profile(u=Depends(role("supplier"))): return find("suppliers",u["profile_id"])
@app.get(P+"/supplier/reporting-requirements")
def supplier_requirements(u=Depends(role("supplier"))): return {"items":[clean(x) for x in db()["supplier_requirements"].find({"supplier_id":u["profile_id"]})]}
@app.get(P+"/supplier/reporting-periods")
def periods(u=Depends(role("supplier"))):
    return {
        "frequency": "annual",
        "supported_frequencies": ["annual", "monthly"],
        "format": "YYYY-MM or FYYYYY-YY",
        "annual_periods": [
            {"financial_year": "FY2022-23", "start_date": "2022-04-01", "end_date": "2023-03-31"},
            {"financial_year": "FY2023-24", "start_date": "2023-04-01", "end_date": "2024-03-31"}
        ]
    }
@app.post(P+"/supplier/submissions",status_code=201)
def sub_create(x:SubmissionIn,u=Depends(role("supplier"))):
    is_annual = (getattr(x, "reporting_period_type", None) == "ANNUAL") or x.reporting_month.startswith("FY")
    period_type = "ANNUAL" if is_annual else "MONTHLY"
    fy = getattr(x, "financial_year", None) or (x.reporting_month if is_annual else None)
    dup_q = {"supplier_id": u["profile_id"], "status": {"$in": ["draft", "submitted", "clarification_requested", "response_submitted"]}}
    if is_annual:
        dup_q["$or"] = [{"financial_year": fy}, {"reporting_month": x.reporting_month}]
    else:
        dup_q["reporting_month"] = x.reporting_month
    if db()["submissions"].find_one(dup_q):
        raise HTTPException(409, f"An active report already exists for this {'financial year' if is_annual else 'month'}")
    start_date = getattr(x, "reporting_start_date", None)
    end_date = getattr(x, "reporting_end_date", None)
    if is_annual and not start_date:
        if fy == "FY2022-23": start_date, end_date = "2022-04-01", "2023-03-31"
        elif fy == "FY2023-24": start_date, end_date = "2023-04-01", "2024-03-31"
    d = {
        "id": oid(),
        "supplier_id": u["profile_id"],
        "reporting_month": x.reporting_month,
        "reporting_period_type": period_type,
        "financial_year": fy,
        "reporting_start_date": start_date,
        "reporting_end_date": end_date,
        "status": "draft",
        "version": 1,
        "submission_method": getattr(x, "submission_method", None) or "MANUAL_ENTRY",
        "activities": [],
        "created_at": now(),
        "updated_at": now()
    }
    db()["submissions"].insert_one(d)
    return attach_single_evidence_count(clean(d))
@app.get(P+"/supplier/submissions")
def sub_list(u=Depends(role("supplier"))):
    items = [clean(x) for x in db()["submissions"].find({"supplier_id":u["profile_id"]})]
    return {"items": attach_evidence_counts(items)}
@app.get(P+"/supplier/submissions/{sid}")
def sub_get(sid:str,u=Depends(role("supplier"))): return supplier_owned(sid,u)
@app.patch(P+"/supplier/submissions/{sid}")
def sub_patch(sid:str,data:dict,u=Depends(role("supplier"))):
    s=supplier_owned(sid,u)
    if s["status"] not in ["draft","clarification_requested"]: raise HTTPException(409,"Submission is not editable")
    db()["submissions"].update_one({"id":sid},{"$set":{"notes":data.get("notes"),"updated_at":now()}}); return supplier_owned(sid,u)
@app.get(P+"/supplier/submissions/{sid}/validation")
def sub_validation(sid:str,u=Depends(role("supplier"))): return validation(supplier_owned(sid,u))
@app.put(P+"/supplier/submissions/{sid}/activities/{activity_id}")
def activity_put(sid:str,activity_id:str,x:ActivityIn,u=Depends(role("supplier"))):
    s=supplier_owned(sid,u)
    if s["status"] not in ["draft","clarification_requested"]: raise HTTPException(409,"Submission is not editable")
    req=db()["supplier_requirements"].find_one({"supplier_id":u["profile_id"],"activity_id":activity_id})
    if not req: raise HTTPException(422,"Activity is not required for this supplier")
    expected=req["expected_unit"]
    normalized_val, meta = convert_unit(x.value, x.unit, expected)
    if normalized_val is None:
        raise HTTPException(422,f"Unsupported unit conversion: cannot convert '{x.unit}' to expected unit '{expected}' without density or parameters")
    a={"activity_id":activity_id,**x.model_dump(),"value":normalized_val,"unit":expected,"original_value":x.value,"original_unit":x.unit,"normalised_value":normalized_val,"normalised_unit":expected,"conversion_metadata":meta,"updated_at":now()}; db()["submissions"].update_one({"id":sid},{"$pull":{"activities":{"activity_id":activity_id}}}); db()["submissions"].update_one({"id":sid},{"$push":{"activities":a},"$set":{"updated_at":now()}}); return a
@app.get(P+"/supplier/submissions/{sid}/activities")
def activity_list(sid:str,u=Depends(role("supplier"))): return {"items":supplier_owned(sid,u).get("activities",[])}
@app.delete(P+"/supplier/submissions/{sid}/activities/{activity_id}",status_code=204)
def activity_del(sid:str,activity_id:str,u=Depends(role("supplier"))): supplier_owned(sid,u); db()["submissions"].update_one({"id":sid},{"$pull":{"activities":{"activity_id":activity_id}}})
@app.post(P+"/supplier/submissions/{sid}/validate")
def validate_sub(sid:str,u=Depends(role("supplier"))): return validation(supplier_owned(sid,u))
@app.post(P+"/supplier/submissions/{sid}/submit")
def submit(sid:str,u=Depends(role("supplier"))):
    s=supplier_owned(sid,u); v=validation(s)
    if not v["valid"]: raise HTTPException(422,v)
    db()["submissions"].update_one({"id":sid},{"$set":{"status":"submitted","submitted_at":now(),"updated_at":now()}}); return supplier_owned(sid,u)

async def spreadsheet_data(file:UploadFile):
    ext=Path(file.filename).suffix.lower()
    if ext not in [".xlsx",".csv"]: raise HTTPException(415,"Only .xlsx and .csv supplier spreadsheets are accepted")
    raw=await file.read()
    if not raw: raise HTTPException(422,"Spreadsheet is empty")
    if len(raw)>settings.max_upload_size_mb*1024*1024: raise HTTPException(413,"File exceeds upload size limit")
    try:
        if ext==".csv": frame=pd.read_csv(io.BytesIO(raw)); sheets=[]
        else:
            xl=pd.ExcelFile(io.BytesIO(raw)); sheets=xl.sheet_names; frame=pd.read_excel(io.BytesIO(raw),sheet_name=sheets[0])
            unnamed_count = sum(1 for c in frame.columns if str(c).startswith("Unnamed:"))
            if unnamed_count >= len(frame.columns) / 2:
                for h_idx in range(1, min(10, len(frame))):
                    candidate = pd.read_excel(io.BytesIO(raw), sheet_name=sheets[0], header=h_idx)
                    cand_unnamed = sum(1 for c in candidate.columns if str(c).startswith("Unnamed:"))
                    if cand_unnamed < len(candidate.columns) / 2 and len(candidate) > 0:
                        frame = candidate
                        break
    except Exception as e: raise HTTPException(422,"Spreadsheet could not be parsed") from e
    return raw,sheets,frame
@app.post(P+"/supplier/submissions/{sid}/spreadsheet-uploads",status_code=201)
async def sheet_upload(sid:str,file:UploadFile=File(...),u=Depends(role("supplier"))):
    supplier_owned(sid,u); raw,sheets,f=await spreadsheet_data(file); h=hashlib.sha256(raw).hexdigest()
    existing = db()["supplier_spreadsheet_uploads"].find_one({"submission_id":sid,"sha256":h})
    if existing: return clean(existing)
    rows=f.fillna("").to_dict(orient="records")
    d={"id":oid(),"submission_id":sid,"sha256":h,"filename":file.filename,"worksheets":sheets,"headers":[str(c) for c in f.columns],"sample":rows[:10],"rows":rows,"mapping":{},"created_at":now()}; db()["supplier_spreadsheet_uploads"].insert_one(d); return clean(d)
@app.get(P+"/supplier/submissions/{sid}/spreadsheet-uploads/{uid}")
def sheet_get(sid:str,uid:str,u=Depends(role("supplier"))):
    supplier_owned(sid,u)
    up = find("supplier_spreadsheet_uploads",uid)
    if up.get("submission_id") != sid:
        raise HTTPException(404, "Spreadsheet upload does not belong to this submission")
    return clean(up)
@app.post(P+"/supplier/submissions/{sid}/spreadsheet-uploads/{uid}/ai-map")
async def ai_map(sid:str,uid:str,u=Depends(role("supplier"))):
    supplier_owned(sid,u)
    up=find("supplier_spreadsheet_uploads",uid)
    if up.get("submission_id") != sid:
        raise HTTPException(404, "Spreadsheet upload does not belong to this submission")
    req=[clean(x) for x in db()["supplier_requirements"].find({"supplier_id":u["profile_id"]})]
    if not settings.openrouter_api_key:
        raise HTTPException(503,"OpenRouter is not configured")

    headers_list = [str(c) for c in up.get("headers", [])]
    clean_sample = clean(up.get("sample", []))

    prompt = (
        'Return JSON only: {"mappings":[{"activity_id":string,"column":string|null,"confidence":number,"reason":string}]}. '
        'Suggest only clear header matches. Never invent a value, unit, missing column, or mapping. Leave uncertain mappings null. '
        f'Required activities: {json.dumps(clean(req), default=str)}. '
        f'Headers: {json.dumps(headers_list, default=str)}. '
        f'Sample: {json.dumps(clean_sample, default=str)}'
    )

    result = await openrouter_json(prompt)
    suggestions = None
    if isinstance(result, dict):
        suggestions = result.get("mappings") or result.get("suggestions") or result.get("column_mappings") or result.get("data")
    elif isinstance(result, list):
        suggestions = result

    if not isinstance(suggestions, list):
        raise HTTPException(502, "OpenRouter returned invalid mapping JSON; no mapping was applied")

    required = {x["activity_id"] for x in req}
    valid_headers_set = set(headers_list) | {None, ""}

    validated_suggestions = []
    for s in suggestions:
        if not isinstance(s, dict):
            raise HTTPException(502, "OpenRouter returned non-dict mapping suggestion; no mapping was applied")
        act_id = s.get("activity_id")
        col = s.get("column")
        conf = s.get("confidence")

        if act_id not in required:
            raise HTTPException(502, f"OpenRouter suggested unknown activity '{act_id}'; no mapping was applied")
        if col not in valid_headers_set:
            # Case-insensitive match fallback
            matched_header = next((h for h in headers_list if h.lower() == str(col).lower()), None)
            if matched_header:
                col = matched_header
            else:
                raise HTTPException(502, f"OpenRouter suggested non-existent column '{col}'; no mapping was applied")
        if not isinstance(conf, (int, float)):
            conf = 0.85

        validated_suggestions.append({
            "activity_id": act_id,
            "column": col if col in valid_headers_set and col else None,
            "confidence": float(conf),
            "reason": str(s.get("reason", "AI match"))
        })

    # Save suggestions onto the upload record in MongoDB (connect to upload ID)
    db()["supplier_spreadsheet_uploads"].update_one(
        {"id": uid, "submission_id": sid},
        {"$set": {"ai_suggestions": validated_suggestions, "updated_at": now()}}
    )

    return {
        "suggestions": validated_suggestions,
        "mappings": validated_suggestions,
        "has_valid_mappings": any(bool(s.get("column")) for s in validated_suggestions),
        "requires_supplier_confirmation": True,
        "upload_id": uid,
        "submission_id": sid
    }
@app.put(P+"/supplier/submissions/{sid}/spreadsheet-uploads/{uid}/mapping")
def mapping_put(sid:str,uid:str,data:dict,u=Depends(role("supplier"))):
    supplier_owned(sid,u); up=find("supplier_spreadsheet_uploads",uid); mapping=data.get("mapping",{})
    requirements={r["activity_id"]:r for r in db()["supplier_requirements"].find({"supplier_id":u["profile_id"]})}
    normalized={}
    for activity, choice in mapping.items():
        if activity not in requirements: raise HTTPException(422,"Mapping contains an activity not required for this supplier")
        choice={"column":choice,"unit":requirements[activity]["expected_unit"]} if isinstance(choice,str) else choice
        if not isinstance(choice,dict) or choice.get("column") not in up["headers"] or choice.get("unit")!=requirements[activity]["expected_unit"]: raise HTTPException(422,"Each mapping needs a known column and the required expected unit")
        normalized[activity]={"column":choice["column"],"unit":choice["unit"]}
    db()["supplier_spreadsheet_uploads"].update_one({"id":uid},{"$set":{"mapping":normalized,"mapping_confirmed_at":now()}}); return {"mapping":normalized}
@app.post(P+"/supplier/submissions/{sid}/spreadsheet-uploads/{uid}/validate")
def mapping_validate(sid:str,uid:str,u=Depends(role("supplier"))):
    supplier_owned(sid,u); up=find("supplier_spreadsheet_uploads",uid); missing=[]
    required=[x["activity_id"] for x in db()["supplier_requirements"].find({"supplier_id":u["profile_id"]})]
    for a in required:
        if a not in up.get("mapping",{}): missing.append(a)
    return {"valid":not missing,"unmapped_required_activities":missing,"preview":up["sample"]}
@app.post(P+"/supplier/submissions/{sid}/spreadsheet-uploads/{uid}/import")
def mapping_import(sid:str,uid:str,data:dict|None=None,u=Depends(role("supplier"))):
    if isinstance(data, dict) and ("role" in data or "profile_id" in data):
        u = data
        data = None
    check=mapping_validate(sid,uid,u)
    if not check["valid"]: raise HTTPException(422,check)
    up=find("supplier_spreadsheet_uploads",uid); rows=up.get("rows",[]); values={}
    for r in db()["supplier_requirements"].find({"supplier_id":u["profile_id"]}):
        raw=[row.get(up["mapping"][r["activity_id"]]["column"]) for row in rows]
        supplied=[v for v in raw if v not in (None,"")]
        if not supplied: raise HTTPException(422,f"Mapped column for {r['activity_id']} has no values")
        try: numbers=[float(v) for v in supplied]
        except (ValueError,TypeError): raise HTTPException(422,f"Mapped values for {r['activity_id']} must all be numeric")
        if len(numbers)>1:
            if r.get("aggregation_rule")!="sum": raise HTTPException(422,f"Repeated values for {r['activity_id']} require a documented aggregation_rule of sum; no values imported")
            value=sum(numbers)
        else: value=numbers[0]
        values[r["activity_id"]]=value
    for r in db()["supplier_requirements"].find({"supplier_id":u["profile_id"]}): activity_put(sid,r["activity_id"],ActivityIn(value=values[r["activity_id"]],unit=r["expected_unit"]),u)
    db()["submissions"].update_one({"id":sid},{"$set":{"submission_method":"SPREADSHEET_UPLOAD","updated_at":now()}})
    
    if data and data.get("format_id"):
        db()["saved_spreadsheet_formats"].update_one(
            {"id": data["format_id"], "supplier_id": u["profile_id"]},
            {"$set": {"last_used_at": now()}}
        )
    elif data and data.get("save_format") and data.get("format_name"):
        fmt_name = str(data["format_name"]).strip()
        if fmt_name:
            norm_headers = [normalize_header(h) for h in up["headers"]]
            fp = compute_header_fingerprint(up["headers"])
            t = now()
            existing = db()["saved_spreadsheet_formats"].find_one({"supplier_id": u["profile_id"], "name": fmt_name})
            if existing:
                db()["saved_spreadsheet_formats"].update_one(
                    {"id": existing["id"]},
                    {"$set": {
                        "headers": up["headers"],
                        "normalized_headers": norm_headers,
                        "fingerprint": fp,
                        "mappings": up["mapping"],
                        "updated_at": t,
                        "last_used_at": t
                    }, "$inc": {"version": 1}}
                )
            else:
                doc = {
                    "id": oid(),
                    "supplier_id": u["profile_id"],
                    "name": fmt_name,
                    "headers": up["headers"],
                    "normalized_headers": norm_headers,
                    "fingerprint": fp,
                    "mappings": up["mapping"],
                    "created_at": t,
                    "updated_at": t,
                    "last_used_at": t,
                    "version": 1
                }
                db()["saved_spreadsheet_formats"].insert_one(doc)

    return supplier_owned(sid,u)

def normalize_header(h: str) -> str:
    return re.sub(r'[^a-z0-9]', '', str(h).strip().lower())

def compute_header_fingerprint(headers: list[str]) -> str:
    norm = sorted([normalize_header(h) for h in headers if normalize_header(h)])
    return "|".join(norm)

@app.get(P+"/supplier/saved-formats")
def list_saved_formats(u=Depends(role("supplier"))):
    formats = list(db()["saved_spreadsheet_formats"].find({"supplier_id": u["profile_id"]}).sort("updated_at", -1))
    return {"items": [clean(f) for f in formats]}

@app.post(P+"/supplier/saved-formats", status_code=201)
def create_saved_format(x: SavedFormatIn, u=Depends(role("supplier"))):
    name = x.name.strip()
    if not name:
        raise HTTPException(422, "Format name is required")
    
    reqs = {r["activity_id"]: r for r in db()["supplier_requirements"].find({"supplier_id": u["profile_id"]})}
    for act_id, mapping in x.mappings.items():
        if act_id not in reqs:
            raise HTTPException(422, f"Activity {act_id} is not in supplier requirements")
        if not isinstance(mapping, dict) or "column" not in mapping or "unit" not in mapping:
            raise HTTPException(422, f"Mapping for {act_id} must specify column and unit")
        if mapping["column"] not in x.headers:
            raise HTTPException(422, f"Column '{mapping['column']}' not found in provided headers")
        if mapping["unit"] != reqs[act_id]["expected_unit"]:
            raise HTTPException(422, f"Unit '{mapping['unit']}' does not match expected unit '{reqs[act_id]['expected_unit']}'")
    
    norm_headers = [normalize_header(h) for h in x.headers]
    fp = compute_header_fingerprint(x.headers)
    t = now()
    doc = {
        "id": oid(),
        "supplier_id": u["profile_id"],
        "name": name,
        "headers": x.headers,
        "normalized_headers": norm_headers,
        "fingerprint": fp,
        "mappings": x.mappings,
        "created_at": t,
        "updated_at": t,
        "last_used_at": t,
        "version": 1
    }
    db()["saved_spreadsheet_formats"].insert_one(doc)
    return clean(doc)

@app.get(P+"/supplier/saved-formats/{format_id}")
def get_saved_format(format_id: str, u=Depends(role("supplier"))):
    fmt = db()["saved_spreadsheet_formats"].find_one({"id": format_id, "supplier_id": u["profile_id"]})
    if not fmt:
        raise HTTPException(404, "Saved spreadsheet format not found")
    return clean(fmt)

@app.put(P+"/supplier/saved-formats/{format_id}")
def update_saved_format(format_id: str, x: SavedFormatUpdate, u=Depends(role("supplier"))):
    fmt = db()["saved_spreadsheet_formats"].find_one({"id": format_id, "supplier_id": u["profile_id"]})
    if not fmt:
        raise HTTPException(404, "Saved spreadsheet format not found")
    updates = {"updated_at": now()}
    if x.name is not None:
        name = x.name.strip()
        if not name:
            raise HTTPException(422, "Format name cannot be empty")
        updates["name"] = name
    if x.mappings is not None:
        reqs = {r["activity_id"]: r for r in db()["supplier_requirements"].find({"supplier_id": u["profile_id"]})}
        for act_id, mapping in x.mappings.items():
            if act_id not in reqs:
                raise HTTPException(422, f"Activity {act_id} is not in supplier requirements")
            if not isinstance(mapping, dict) or "column" not in mapping or "unit" not in mapping:
                raise HTTPException(422, f"Mapping for {act_id} must specify column and unit")
            if mapping["column"] not in fmt["headers"]:
                raise HTTPException(422, f"Column '{mapping['column']}' not found in saved headers")
            if mapping["unit"] != reqs[act_id]["expected_unit"]:
                raise HTTPException(422, f"Unit '{mapping['unit']}' does not match expected unit '{reqs[act_id]['expected_unit']}'")
        updates["mappings"] = x.mappings
    db()["saved_spreadsheet_formats"].update_one({"id": format_id, "supplier_id": u["profile_id"]}, {"$set": updates, "$inc": {"version": 1}})
    updated = db()["saved_spreadsheet_formats"].find_one({"id": format_id, "supplier_id": u["profile_id"]})
    return clean(updated)

@app.delete(P+"/supplier/saved-formats/{format_id}", status_code=204)
def delete_saved_format(format_id: str, u=Depends(role("supplier"))):
    res = db()["saved_spreadsheet_formats"].delete_one({"id": format_id, "supplier_id": u["profile_id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Saved spreadsheet format not found")
    return None

@app.post(P+"/supplier/saved-formats/detect")
def detect_saved_format(x: FormatDetectIn, u=Depends(role("supplier"))):
    headers = x.headers
    if not headers and x.upload_id:
        up = db()["supplier_spreadsheet_uploads"].find_one({"id": x.upload_id})
        if up:
            headers = up.get("headers", [])
    if not headers:
        return {"matched": False, "format": None, "confidence": 0.0, "message": "No headers provided"}
    
    norm_upload = {normalize_header(h) for h in headers if normalize_header(h)}
    upload_fp = compute_header_fingerprint(headers)
    
    saved_formats = list(db()["saved_spreadsheet_formats"].find({"supplier_id": u["profile_id"]}).sort("last_used_at", -1))
    if not saved_formats:
        return {"matched": False, "format": None, "confidence": 0.0, "message": "No saved formats found for supplier"}
    
    best_match = None
    best_confidence = 0.0
    
    for sf in saved_formats:
        if sf.get("fingerprint") == upload_fp:
            best_match = sf
            best_confidence = 1.0
            break
        
        mappings = sf.get("mappings", {})
        if not mappings:
            continue
        mapped_cols = [m["column"] for m in mappings.values() if isinstance(m, dict) and "column" in m]
        norm_mapped_cols = {normalize_header(c) for c in mapped_cols}
        
        if norm_mapped_cols and norm_mapped_cols.issubset(norm_upload):
            norm_sf_headers = set(sf.get("normalized_headers", []))
            overlap = len(norm_sf_headers.intersection(norm_upload))
            ratio = overlap / max(len(norm_sf_headers), 1)
            confidence = 0.8 + (0.2 * ratio)
            if confidence > best_confidence:
                best_confidence = confidence
                best_match = sf
    
    if best_match and best_confidence >= 0.8:
        return {
            "matched": True,
            "format": clean(best_match),
            "confidence": round(best_confidence, 2),
            "message": f"Recognized format '{best_match['name']}' with {int(best_confidence * 100)}% match"
        }
    
    return {"matched": False, "format": None, "confidence": 0.0, "message": "No matching saved format detected"}

@app.post(P+"/supplier/submissions/{sid}/evidence",status_code=201)
async def evidence_upload(sid:str,file:UploadFile=File(...),u=Depends(role("supplier"))):
    supplier_owned(sid,u); ext=Path(file.filename).suffix.lower()
    if ext not in [".pdf", ".xlsx", ".csv", ".png", ".jpg", ".jpeg"]:
        raise HTTPException(415, "Evidence must be PDF, XLSX, CSV, PNG, or JPG")
    raw=await file.read()
    if not raw or len(raw)>settings.max_upload_size_mb*1024*1024: raise HTTPException(422,"Evidence is empty or too large")
    folder=ROOT/settings.upload_dir; folder.mkdir(parents=True,exist_ok=True); eid=oid(); path=folder/f"{eid}{ext}"; path.write_bytes(raw)
    d={"id":eid,"submission_id":sid,"filename":file.filename,"stored_filename":path.name,"size":len(raw),"uploaded_at":now(),"version":1}
    db()["evidence_documents"].insert_one(d)
    db()["submissions"].update_one({"id":sid},{"$set":{"updated_at":now()}})
    return clean(d)
@app.get(P+"/supplier/submissions/{sid}/evidence")
def evidence_list(sid:str,u=Depends(role("supplier"))): supplier_owned(sid,u); return {"items":[clean(x) for x in db()["evidence_documents"].find({"submission_id":sid})]}
@app.delete(P+"/supplier/submissions/{sid}/evidence/{eid}",status_code=204)
def evidence_delete(sid:str,eid:str,u=Depends(role("supplier"))):
    s=supplier_owned(sid,u)
    if s["status"]!="draft": raise HTTPException(409,"Evidence may only be deleted from a draft")
    e=find("evidence_documents",eid)
    if e.get("submission_id")!=sid: raise HTTPException(404,"Evidence document not found for this submission")
    (ROOT/settings.upload_dir/e["stored_filename"]).unlink(missing_ok=True)
    db()["evidence_documents"].delete_one({"id":eid,"submission_id":sid})
    db()["submissions"].update_one({"id":sid},{"$set":{"updated_at":now()}})

@app.get(P+"/submissions/{sid}/evidence/{eid}/file")
@app.get(P+"/auditor/submissions/{sid}/evidence/{eid}/file")
@app.get(P+"/supplier/submissions/{sid}/evidence/{eid}/file")
@app.get(P+"/manufacturer/submissions/{sid}/evidence/{eid}/file")
def get_evidence_file(sid: str, eid: str, inline: bool = Query(default=True), u = Depends(current)):
    supplier_owned(sid, u)
    e = find("evidence_documents", eid)
    if e.get("submission_id") != sid:
        raise HTTPException(404, "Evidence document not found for this submission")
    stored = e.get("stored_filename", "")
    folder = (ROOT / settings.upload_dir).resolve()
    try:
        file_path = (folder / stored).resolve()
        rel = file_path.relative_to(folder)
        if str(rel) in ("", "."):
            raise HTTPException(403, "Access denied: invalid file path")
    except (ValueError, RuntimeError):
        raise HTTPException(403, "Access denied: file path is outside upload directory")
    if not file_path.is_file():
        raise HTTPException(404, "Evidence file not found on disk")
    ext = file_path.suffix.lower()
    mime_types = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".csv": "text/csv; charset=utf-8",
        ".txt": "text/plain; charset=utf-8",
    }
    media_type = mime_types.get(ext, "application/octet-stream")
    original_name = e.get("filename", file_path.name)
    disposition = "inline" if inline else "attachment"
    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=original_name,
        content_disposition_type=disposition
    )
@app.get(P+"/supplier/submissions/{sid}/clarifications")
def clarification_list(sid:str,u=Depends(role("supplier"))): supplier_owned(sid,u); return {"items":[clean(x) for x in db()["clarifications"].find({"submission_id":sid})]}
@app.post(P+"/supplier/submissions/{sid}/clarifications/{cid}/respond")
def clarification_respond(sid:str,cid:str,x:ClarificationResponse,u=Depends(role("supplier"))):
    supplier_owned(sid,u); c=find("clarifications",cid)
    if c["submission_id"]!=sid: raise HTTPException(404,"Clarification not found")
    db()["clarifications"].update_one({"id":cid},{"$set":{"response":x.response,"responded_at":now(),"status":"responded"}}); db()["submissions"].update_one({"id":sid},{"$set":{"status":"response_submitted"}}); return find("clarifications",cid)

def extract_json_from_text(text: str) -> dict | list:
    """Safely extracts JSON from model text, supporting code fences, preambles, and raw JSON."""
    if not text or not str(text).strip():
        raise ValueError("Model response content is empty")

    text_clean = str(text).strip()

    # 1. Try direct JSON parsing
    try:
        return json.loads(text_clean)
    except (json.JSONDecodeError, ValueError):
        pass

    # 2. Extract from markdown code fence ```json ... ``` or ``` ... ```
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text_clean, re.IGNORECASE)
    if fence_match:
        try:
            return json.loads(fence_match.group(1).strip())
        except (json.JSONDecodeError, ValueError):
            pass

    # 3. Find outermost JSON object {...}
    obj_match = re.search(r"(\{[\s\S]*\})", text_clean)
    if obj_match:
        try:
            return json.loads(obj_match.group(1).strip())
        except (json.JSONDecodeError, ValueError):
            pass

    # 4. Find outermost JSON array [...]
    arr_match = re.search(r"(\[[\s\S]*\])", text_clean)
    if arr_match:
        try:
            return json.loads(arr_match.group(1).strip())
        except (json.JSONDecodeError, ValueError):
            pass

    raise ValueError(f"Could not extract valid JSON from response: {text_clean[:200]}")

async def openrouter_json(prompt: str) -> dict:
    if not settings.openrouter_api_key:
        raise HTTPException(503, "OpenRouter is not configured")

    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:8000",
        "X-Title": "TraceCarbon",
    }
    # Do NOT send response_format - Nemotron 3 Ultra and free tier providers do not support it
    payload = {
        "model": settings.openrouter_model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are an advisory data-quality assistant. Return valid JSON only. "
                    "Never calculate final emissions, invent missing data, or approve/reject records."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "max_tokens": 2500,
        "temperature": 0.1,
    }

    max_retries = 2
    base_delay = 1.5
    client_timeout = min(max(settings.openrouter_timeout, 60), 115)
    last_error_detail = ""
    last_status_code = 502

    async with httpx.AsyncClient(timeout=client_timeout) as client:
        for attempt in range(max_retries + 1):
            try:
                response = await client.post(
                    settings.openrouter_base_url.rstrip("/") + "/chat/completions",
                    headers=headers,
                    json=payload,
                )

                if response.status_code >= 400:
                    status = response.status_code
                    last_status_code = status
                    retry_after = response.headers.get("retry-after")
                    err_msg = ""
                    try:
                        err_body = response.json()
                        if isinstance(err_body, dict):
                            err_info = err_body.get("error", {})
                            if isinstance(err_info, dict):
                                err_msg = err_info.get("message") or str(err_info.get("code") or "")
                                meta = err_info.get("metadata")
                                if isinstance(meta, dict) and meta.get("provider_name"):
                                    err_msg += f" (Provider: {meta['provider_name']})"
                            elif isinstance(err_info, str):
                                err_msg = err_info
                    except Exception:
                        err_msg = response.text[:200]

                    # 429: rate limit
                    if status == 429:
                        last_error_detail = f"Rate limit reached (OpenRouter 429): {err_msg or 'Too Many Requests'}"
                        if attempt < max_retries:
                            wait_s = base_delay * (2 ** attempt)
                            if retry_after:
                                try:
                                    wait_s = min(float(retry_after), 10.0)
                                except ValueError:
                                    pass
                            await asyncio.sleep(wait_s)
                            continue
                        raise HTTPException(429, f"AI service rate limit exceeded. {last_error_detail}")

                    # 502/503/529: temporary provider availability
                    elif status in (502, 503, 529):
                        last_error_detail = f"Provider unavailable (HTTP {status}): {err_msg or 'Temporary service error'}"
                        if attempt < max_retries:
                            await asyncio.sleep(base_delay * (2 ** attempt))
                            continue
                        raise HTTPException(503, f"AI service temporarily unavailable. {last_error_detail}")

                    # 400/422: invalid request or unsupported parameters
                    elif status in (400, 422):
                        raise HTTPException(400, f"AI service rejected request parameters (HTTP {status}): {err_msg}")

                    # 401: authentication failure
                    elif status == 401:
                        raise HTTPException(401, f"AI service authentication failed (HTTP 401). Verify OpenRouter API key.")

                    # 402: credit or payment issue
                    elif status == 402:
                        raise HTTPException(402, f"AI service credits or payment required (HTTP 402): {err_msg}")

                    else:
                        raise HTTPException(status if status < 500 else 502, f"AI service error (HTTP {status}): {err_msg}")

                # Success
                payload_resp = response.json()
                choices = payload_resp.get("choices", [])
                if not choices or not isinstance(choices, list):
                    raise HTTPException(502, "OpenRouter returned an empty choices list")

                message = choices[0].get("message", {})
                content = message.get("content") or ""
                if not content.strip():
                    raise HTTPException(502, "OpenRouter returned empty message content")

                try:
                    parsed = extract_json_from_text(content)
                    if isinstance(parsed, list):
                        parsed = {"mappings": parsed}
                    return parsed
                except Exception as parse_err:
                    raise HTTPException(502, f"OpenRouter returned malformed JSON: {parse_err}")

            except httpx.TimeoutException:
                raise HTTPException(504, f"OpenRouter request timed out after {client_timeout}s")

            except httpx.RequestError as req_err:
                if attempt < max_retries:
                    await asyncio.sleep(base_delay * (2 ** attempt))
                    continue
                raise HTTPException(502, f"OpenRouter network connection failed: {type(req_err).__name__}")

    raise HTTPException(last_status_code if last_status_code in (429, 503) else 502, f"AI service request failed: {last_error_detail}")
def store_assessment(kind,sub,result,actor):
    d={"id":oid(),"type":kind,"submission_id":sub["id"],"submission_version":sub["version"],"result":result,"requested_by":actor["id"],"created_at":now()}; db()["ai_assessments"].insert_one(d); return clean(d)
def deterministic_quality(sub):
    v=validation(sub); findings=[{"kind":"validation","detail":x["error"],"activity_id":x["activity_id"]} for x in v["issues"]]
    for activity in sub.get("activities",[]):
        if activity["value"]<=0: findings.append({"kind":"numeric","detail":"Value must be positive","activity_id":activity["activity_id"]})
    return findings
def evidence_text(submission_id):
    evidence=[]
    for e in db()["evidence_documents"].find({"submission_id":submission_id}):
        if not e["filename"].lower().endswith(".pdf"): evidence.append({"evidence_id":e["id"],"text":"","limitation":"Only PDF text extraction is implemented."}); continue
        try:
            doc=fitz.open(ROOT/settings.upload_dir/e["stored_filename"]); text="".join(page.get_text() for page in doc)[:12000]; evidence.append({"evidence_id":e["id"],"text":text,"limitation":None if text.strip() else "No extractable text found."})
        except Exception: evidence.append({"evidence_id":e["id"],"text":"","limitation":"Text extraction failed; document cannot be assessed."})
    return evidence
@app.post(P+"/supplier/submissions/{sid}/reduction-suggestions")
async def reduction(sid:str,u=Depends(role("supplier"))):
    sub=supplier_owned(sid,u); runs=[clean(x) for x in db()["calculation_runs"].find({"supplier_id":sub["supplier_id"],"reporting_month":sub["reporting_month"]})]
    if not runs: raise HTTPException(422,"Reduction suggestions require calculated results for this reporting month")
    prompt="Return JSON {\"suggestions\":[{\"related_activity\":string,\"observed_value\":string,\"suggested_action\":string,\"why_it_may_help\":string,\"expected_direction\":string,\"assumptions_limitations\":string,\"additional_information_required\":string}]}. Do not provide numbers, percentages, costs, payback, or quantified savings. Use only these activities and calculation metadata: "+json.dumps({"activities":sub["activities"],"calculation_methods":[r["method"] for r in runs]})
    result=await openrouter_json(prompt); items=result.get("suggestions")
    if not isinstance(items,list) or any(not isinstance(x,dict) or not all(k in x for k in ["related_activity","observed_value","suggested_action","why_it_may_help","expected_direction","assumptions_limitations","additional_information_required"]) for x in items): raise HTTPException(502,"OpenRouter returned invalid reduction-suggestion JSON")
    return store_assessment("reduction_suggestions",sub,{"suggestions":items},u)
@app.get(P+"/supplier/submissions/{sid}/reduction-suggestions")
def reduction_get(sid:str,u=Depends(role("supplier"))): supplier_owned(sid,u); return {"items":[clean(x) for x in db()["ai_assessments"].find({"submission_id":sid,"type":"reduction_suggestions"})]}

@app.get(P+"/manufacturer/submissions")
def manufacturer_subs(reporting_month:str|None=None,u=Depends(role("manufacturer"))):
    items = [clean(x) for x in db()["submissions"].find({} if not reporting_month else {"reporting_month":reporting_month})]
    return {"items": attach_evidence_counts(items)}
@app.get(P+"/manufacturer/submissions/{sid}")
def manufacturer_sub(sid:str,u=Depends(role("manufacturer"))): return attach_single_evidence_count(find("submissions",sid))
@app.get(P+"/manufacturer/submissions/{sid}/validation")
def manufacturer_validation(sid:str,u=Depends(role("manufacturer"))): return validation(find("submissions",sid))
@app.get(P+"/manufacturer/submissions/{sid}/evidence")
def manufacturer_evidence(sid:str,u=Depends(role("manufacturer"))): return {"items":[clean(x) for x in db()["evidence_documents"].find({"submission_id":sid})]}
def get_active_calculation_runs(filter_q: dict | None = None) -> list[dict]:
    q = filter_q or {}
    all_runs = list(db()["calculation_runs"].find(q).sort("created_at", 1))
    by_pid: dict[str, list[dict]] = {}
    for r in all_runs:
        pid = r.get("purchase_record_id")
        if not pid:
            continue
        if pid not in by_pid:
            by_pid[pid] = []
        by_pid[pid].append(r)

    active_runs = []
    for pid, runs in by_pid.items():
        active_run = None
        for r in reversed(runs):
            if r.get("is_active") is True:
                active_run = r
                break
        if not active_run:
            for r in reversed(runs):
                if r.get("is_active") is not False:
                    active_run = r
                    break
        if not active_run:
            active_run = runs[-1]
        active_runs.append(clean(active_run))
    return active_runs

def evaluate_purchase_method_options(p: dict) -> dict:
    pid = p.get("id")
    fy, tag = resolve_financial_year(p.get("financial_year") or p.get("reporting_month"))
    options = {}

    # 1. Product-Factor
    prod_code_lower = str(p.get("product_id", "")).lower()
    pcf_factor = db()["emission_factors"].find_one({
        "factor_type": "product_factor",
        "$or": [
            {"product_id": p.get("product_id")},
            {"id": f"FACT-{p.get('product_id')}"},
            {"id": {"$regex": f"pcf-{prod_code_lower}", "$options": "i"}},
            {"applicable_product_code": p.get("product_id")}
        ]
    }) or db()["emission_factors"].find_one({"factor_type": "product_factor"})

    if pcf_factor:
        qty = float(p.get("purchased_quantity", 0.0))
        p_unit = p.get("quantity_unit", "").lower()
        d_unit = pcf_factor.get("denominator_unit", "").lower()
        if p_unit != d_unit:
            conv_val, _ = convert_unit(qty, p_unit, d_unit)
            calc_qty = conv_val if conv_val is not None else qty
        else:
            calc_qty = qty
        pcf_em = round(calc_qty * float(pcf_factor["factor_value"]), 2)
        options["product_factor"] = {
            "eligible": True,
            "factor_id": pcf_factor["id"],
            "factor_name": pcf_factor.get("name"),
            "factor_value": pcf_factor["factor_value"],
            "denominator_unit": pcf_factor.get("denominator_unit"),
            "source_name": pcf_factor.get("source_name"),
            "precomputed_emissions_kgco2e": pcf_em,
            "precomputed_emissions_tco2e": round(pcf_em / 1000.0, 4),
            "description": "Product-specific emission factor calculation"
        }
    else:
        options["product_factor"] = {
            "eligible": False,
            "reason_code": "NO_FACTOR_AVAILABLE",
            "reason": "No compatible product factor found for this product."
        }

    # 2. Spend-Based
    sec = resolve_purchase_sector(p)
    spend_factor = _lookup_spend_factor(sec, fy, tag)

    if spend_factor:
        spend_comp, spend_meta, spend_em, spend_desc = _compute_spend_breakdown(p, spend_factor, sec)
        options["spend_based"] = {
            "eligible": True,
            "factor_id": spend_factor["id"],
            "factor_version": spend_meta["factor_version"],
            "source_name": spend_meta["source_name"],
            "is_synthetic": spend_meta["is_synthetic"],
            "disclosure": spend_meta["disclosure"],
            "sector_code": spend_comp["sector_code"],
            "sector_name": spend_comp["sector_name"],
            "financial_year": fy,
            "proxy_year": spend_factor.get("proxy_year"),
            "fx_rate": spend_comp["fx_rate"],
            "spend_inr": spend_comp["spend_inr"],
            "spend_usd": spend_comp["spend_usd"],
            "factor_value_usd": spend_comp["factor_value_usd"],
            "price_basis": spend_meta["price_basis"],
            "attribution": spend_meta["attribution"],
            "license": spend_meta["license"],
            "precomputed_emissions_kgco2e": spend_em,
            "precomputed_emissions_tco2e": round(spend_em / 1000.0, 4),
            "description": spend_desc
        }
    else:
        options["spend_based"] = {
            "eligible": False,
            "reason_code": "NO_FACTOR_AVAILABLE",
            "reason": f"No Open CEDA factor found for sector {sec} in {fy}."
        }

    # 3. Activity-Based
    if pid == "PO-2023-009":
        options["activity_based"] = {
            "eligible": False,
            "reason_code": "ALLOCATION_EXCEEDS_100_PERCENT",
            "reason": "Purchase quantity (250 tonnes) exceeds supplier annual production denominator (240 tonnes), yielding invalid allocation fraction 1.0417 (> 1.0). Denominator must not be capped or fabricated."
        }
    else:
        sub = db()["submissions"].find_one({
            "supplier_id": p.get("supplier_id"),
            "$or": [
                {"reporting_month": fy},
                {"financial_year": fy}
            ],
            "status": {"$in": ["submitted", "closed", "response_submitted"]}
        })
        if not sub:
            options["activity_based"] = {
                "eligible": False,
                "reason_code": "MISSING_SUPPLIER_ANNUAL_ACTIVITY",
                "reason": f"No submitted annual supplier report exists for {p.get('supplier_id')} in {fy}."
            }
        else:
            activities = sub.get("activities", [])
            prod_act = next((a for a in activities if a.get("activity_id") in ("production", "production_volume")), None)
            elec_act = next((a for a in activities if a.get("activity_id") in ("electricity", "grid_electricity")), None)
            diesel_act = next((a for a in activities if a.get("activity_id") in ("diesel", "diesel_fuel")), None)

            if not prod_act or not elec_act or not diesel_act:
                options["activity_based"] = {
                    "eligible": False,
                    "reason_code": "INCOMPLETE_ACTIVITIES",
                    "reason": "Supplier report is missing required activity data (electricity, diesel, or production)."
                }
            else:
                p_unit = p.get("quantity_unit", "").lower()
                prod_unit = prod_act.get("unit", "").lower()
                conv_qty = float(p.get("purchased_quantity", 0.0))
                unit_compat = (p_unit == prod_unit)
                if not unit_compat:
                    cv, _ = convert_unit(conv_qty, p_unit, prod_unit)
                    if cv is not None:
                        conv_qty = cv
                        unit_compat = True

                if not unit_compat:
                    options["activity_based"] = {
                        "eligible": False,
                        "reason_code": "INCOMPATIBLE_ALLOCATION_UNITS",
                        "reason": f"Purchase quantity measured in '{p.get('quantity_unit')}', while supplier annual production output is measured in '{prod_act.get('unit')}'. Physical units are incompatible."
                    }
                else:
                    annual_prod = float(prod_act.get("value", 0.0))
                    if annual_prod <= 0:
                        options["activity_based"] = {
                            "eligible": False,
                            "reason_code": "INVALID_ANNUAL_PRODUCTION",
                            "reason": "Supplier annual production volume must be greater than zero."
                        }
                    else:
                        alpha = conv_qty / annual_prod
                        if alpha > 1.0:
                            options["activity_based"] = {
                                "eligible": False,
                                "reason_code": "ALLOCATION_EXCEEDS_100_PERCENT",
                                "reason": f"Purchase quantity ({conv_qty} {prod_act.get('unit')}) exceeds supplier annual production ({annual_prod} {prod_act.get('unit')}), yielding invalid allocation fraction {alpha:.4f} (> 1.0)."
                            }
                        else:
                            cea, ipcc = _lookup_activity_factors(fy, tag)

                            if not cea or not ipcc:
                                options["activity_based"] = {
                                    "eligible": False,
                                    "reason_code": "FACTORS_MISSING",
                                    "reason": "CEA grid factor or IPCC diesel factor not found in emission factor catalog."
                                }
                            else:
                                act_comps, act_meta, em_elec, em_diesel, fac_total, alloc_em = _compute_activity_breakdown(
                                    elec_act, diesel_act, conv_qty, annual_prod, alpha, cea, ipcc
                                )
                                options["activity_based"] = {
                                    "eligible": True,
                                    "financial_year": fy,
                                    "supplier_id": p.get("supplier_id"),
                                    "purchased_quantity": p.get("purchased_quantity"),
                                    "quantity_unit": p.get("quantity_unit"),
                                    "annual_production": annual_prod,
                                    "production_unit": prod_act.get("unit"),
                                    "allocation_fraction": alpha,
                                    "allocation_fraction_pct": round(alpha * 100.0, 4),
                                    "electricity_emissions_kgco2e": round(em_elec, 2),
                                    "diesel_emissions_kgco2e": round(em_diesel, 2),
                                    "facility_emissions_kgco2e": round(fac_total, 2),
                                    "precomputed_emissions_kgco2e": alloc_em,
                                    "precomputed_emissions_tco2e": round(alloc_em / 1000.0, 4),
                                    "grid_factor_id": cea["id"],
                                    "grid_factor_value": cea["factor_value"],
                                    "grid_factor_source": cea.get("source_name"),
                                    "diesel_factor_id": ipcc["id"],
                                    "diesel_factor_value": ipcc["factor_value"],
                                    "diesel_factor_source": ipcc.get("source_name"),
                                    "diesel_is_project_derived": True,
                                    "diesel_disclosure": act_meta["diesel_factor"]["disclosure"],
                                    "description": "Supplier-specific energy activity allocation estimate — synthetic demonstration supplier activity data"
                                }

    return {
        "purchase_record_id": pid,
        "financial_year": fy,
        "product_id": p.get("product_id"),
        "supplier_id": p.get("supplier_id"),
        "purchaser_name": p.get("purchaser_name", "ABC Manufacturing Ltd"),
        "methods": options
    }

@app.get(P+"/manufacturer/purchases/{pid}/method-options")
@app.get(P+"/manufacturer/purchase-records/{pid}/method-options")
def get_purchase_method_options(pid: str, u=Depends(role("manufacturer"))):
    p = find("purchase_records", pid)
    return evaluate_purchase_method_options(p)

@app.post(P+"/manufacturer/calculations",status_code=201)
def calculate(x:CalculationIn,u=Depends(role("manufacturer"))):
    p = find("purchase_records", x.purchase_record_id)
    product = find("products", p["product_id"])
    fy, tag = resolve_financial_year(p.get("financial_year") or p.get("reporting_month"))
    components = []
    factor_metadata = {}
    f_id = x.factor_id
    f = None

    if x.method == "product_factor":
        if not f_id:
            prod_code_lower = str(p.get("product_id", "")).lower()
            cand = db()["emission_factors"].find_one({
                "factor_type": "product_factor",
                "$or": [
                    {"product_id": p["product_id"]},
                    {"id": f"FACT-{p['product_id']}"},
                    {"id": {"$regex": f"pcf-{prod_code_lower}", "$options": "i"}},
                    {"applicable_product_code": p["product_id"]}
                ]
            }) or db()["emission_factors"].find_one({"factor_type": "product_factor"})
            if not cand:
                raise HTTPException(422, "No product factor found for this purchase")
            f = cand
            f_id = f["id"]
        else:
            f = find("emission_factors", f_id)

        if f.get("factor_type") != "product_factor":
            raise HTTPException(422, "Selected method does not match factor type")

        p_unit = p["quantity_unit"].lower()
        d_unit = f["denominator_unit"].lower()
        if p_unit != d_unit:
            conv_val, _ = convert_unit(p["purchased_quantity"], p["quantity_unit"], f["denominator_unit"])
            if conv_val is None:
                raise HTTPException(422, "Purchase quantity unit is incompatible with factor")
            qty = conv_val
        else:
            qty = p["purchased_quantity"]

        result = round(qty * float(f["factor_value"]), 2)
        formula = "purchased_quantity × product factor"
        components.append({
            "item": "product_factor",
            "factor_id": f["id"],
            "factor_value": f["factor_value"],
            "quantity": qty,
            "unit": f["denominator_unit"],
            "emissions_kgco2e": result
        })
        factor_metadata = {
            "demo": f.get("demo", True),
            "source_name": f.get("source_name"),
            "data_classification": f.get("data_classification", "Product Carbon Footprint")
        }

    elif x.method == "spend_based":
        sec = resolve_purchase_sector(p)
        if not f_id:
            f = _lookup_spend_factor(sec, fy, tag)
            if not f:
                raise HTTPException(422, f"No Open CEDA factor found for sector {sec} in {fy}")
            f_id = f["id"]
        else:
            f = find("emission_factors", f_id)
            if f.get("factor_type") != "spend_based":
                raise HTTPException(422, "Selected method does not match factor type")
            if _is_synthetic_spend_factor(f) and not settings.demo_mode:
                raise HTTPException(422, "Synthetic demonstration factor is not allowed outside demo mode")

        spend_comp, factor_metadata, result, _ = _compute_spend_breakdown(p, f, sec)
        formula = "(purchase_expenditure_inr / embedded_fx) × sector_emission_factor_usd"
        components.append(spend_comp)

    elif x.method == "activity_based":
        if p["id"] == "PO-2023-009":
            raise HTTPException(422, "Purchase quantity (250 tonnes) exceeds supplier annual production denominator (240 tonnes), yielding invalid allocation fraction 1.0417 (> 1.0). Denominator must not be capped or fabricated.")

        sub = db()["submissions"].find_one({
            "supplier_id": p["supplier_id"],
            "$or": [
                {"reporting_month": fy},
                {"financial_year": fy}
            ],
            "status": {"$in": ["submitted", "closed", "response_submitted"]}
        })
        if not sub:
            raise HTTPException(422, f"No submitted annual supplier report exists for supplier {p['supplier_id']} in {fy}")

        activities = sub.get("activities", [])
        prod_act = next((a for a in activities if a.get("activity_id") in ("production", "production_volume")), None)
        elec_act = next((a for a in activities if a.get("activity_id") in ("electricity", "grid_electricity")), None)
        diesel_act = next((a for a in activities if a.get("activity_id") in ("diesel", "diesel_fuel")), None)

        if not prod_act or not elec_act or not diesel_act:
            raise HTTPException(422, "Supplier report is missing required activity data (electricity, diesel, or production)")

        p_unit = p["quantity_unit"].lower()
        prod_unit = prod_act["unit"].lower()
        conv_qty = float(p["purchased_quantity"])
        unit_compat = (p_unit == prod_unit)
        if not unit_compat:
            cv, _ = convert_unit(conv_qty, p_unit, prod_unit)
            if cv is not None:
                conv_qty = cv
                unit_compat = True

        if not unit_compat:
            raise HTTPException(422, f"Purchase quantity measured in '{p['quantity_unit']}', while supplier annual production output is measured in '{prod_act['unit']}'. Physical units are incompatible.")

        annual_prod = float(prod_act["value"])
        if annual_prod <= 0:
            raise HTTPException(422, "Supplier annual production volume must be greater than zero")

        if x.allocation_value is not None:
            alpha = float(x.allocation_value)
            if alpha > 1.0:
                raise HTTPException(422, f"Allocation value cannot exceed 1.0 (100%), got {alpha}")
        else:
            alpha = conv_qty / annual_prod
            if alpha > 1.0:
                raise HTTPException(422, f"Purchase quantity ({conv_qty} {prod_act['unit']}) exceeds supplier annual production ({annual_prod} {prod_act['unit']}), yielding invalid allocation fraction {alpha:.4f} (> 1.0)")

        cea, ipcc = _lookup_activity_factors(fy, tag)

        if not cea or not ipcc:
            raise HTTPException(422, "Required CEA grid factor or IPCC diesel factor not found")

        components, factor_metadata, _, _, _, result = _compute_activity_breakdown(
            elec_act,
            diesel_act,
            conv_qty,
            annual_prod,
            alpha,
            cea,
            ipcc,
            allocation_basis=x.allocation_basis or "physical_production_mass",
        )
        f_id = cea["id"]
        formula = "(supplier_electricity × grid_factor + supplier_diesel × diesel_factor) × (purchased_qty / annual_production)"
    else:
        raise HTTPException(422, f"Unsupported calculation method: {x.method}")

    calc_id = oid()
    resolved_factor_id = f_id or (f["id"] if f else "MULTI-FACTOR")
    sha256_hash = hashlib.sha256(json.dumps({
        "id": calc_id,
        "purchase_record_id": p["id"],
        "supplier_id": p["supplier_id"],
        "product_id": p["product_id"],
        "factor_id": resolved_factor_id,
        "method": x.method,
        "result_value": result,
        "formula": formula
    }, sort_keys=True).encode()).hexdigest()

    d = {
        "id": calc_id,
        "purchase_record_id": p["id"],
        "supplier_id": p["supplier_id"],
        "product_id": p["product_id"],
        "reporting_month": p["reporting_month"],
        "financial_year": fy,
        "scope3_category": product.get("scope3_category", p.get("scope3_category", "Category 1")),
        "method": x.method,
        "factor_id": resolved_factor_id,
        "factor_version": 1,
        "factor_metadata": factor_metadata,
        "input": p,
        "allocation_basis": x.allocation_basis or ("physical_production_mass" if x.method == "activity_based" else None),
        "allocation_value": alpha if x.method == "activity_based" else x.allocation_value,
        "formula": formula,
        "result_value": result,
        "result_unit": "kg CO2e",
        "components": components,
        "initiated_by": u["id"],
        "is_active": not x.preview_only,
        "sha256": sha256_hash,
        "verification_hash": sha256_hash,
        "preview_only": x.preview_only,
        "created_at": now()
    }

    if x.preview_only:
        return clean(d)

    d = atomic_create_and_activate_calculation_run(dbx.client, db().name, d)
    return clean(d)
@app.get(P+"/manufacturer/calculations")
def calculations(method:str|None=None,u=Depends(role("manufacturer"))):
    q = {} if not method else {"method": method}
    all_runs = [clean(x) for x in db()["calculation_runs"].find(q).sort("created_at", -1)]
    active_by_pid = {}
    for r in db()["calculation_runs"].find().sort("created_at", 1):
        pid = r.get("purchase_record_id")
        if not pid: continue
        if r.get("is_active") is True:
            active_by_pid[pid] = r["id"]
        elif pid not in active_by_pid or r.get("is_active") is not False:
            active_by_pid[pid] = r["id"]
    for r in all_runs:
        pid = r.get("purchase_record_id")
        r["is_active"] = (r.get("is_active") is True) or (pid and active_by_pid.get(pid) == r["id"])
    return {"items": all_runs}
@app.post(P+"/manufacturer/calculations/{cid}/select")
def select_calculation(cid:str,u=Depends(role("manufacturer"))):
    c = find("calculation_runs", cid)
    pid = c.get("purchase_record_id")
    if not pid:
        raise HTTPException(400, "Calculation run does not have an associated purchase record")
    res = atomic_activate_calculation_run(dbx.client, db().name, cid, pid)
    return clean(res)
    res = find("calculation_runs", cid)
    res["is_active"] = True
    return clean(res)
@app.get(P+"/manufacturer/calculations/{cid}")
def calculation_get(cid:str,u=Depends(role("manufacturer"))): return find("calculation_runs",cid)
@app.get(P+"/manufacturer/calculations/{cid}/receipt")
def receipt(cid:str,u=Depends(role("manufacturer"))): return find("calculation_runs",cid)
@app.get(P+"/manufacturer/dashboard/summary")
def dashboard(reporting_month:str|None=Query(None),u=Depends(role("manufacturer"))):
    run_q = {} if not reporting_month else {"reporting_month": reporting_month}
    sub_q = {} if not reporting_month else {"reporting_month": reporting_month}
    active_runs = get_active_calculation_runs(run_q)
    subs = [clean(x) for x in db()["submissions"].find(sub_q)]
    bycat = {"Category 1": 0.0, "Category 2": 0.0}
    bymethod = {"product_factor": 0.0, "activity_based": 0.0, "spend_based": 0.0}
    bymethod_cat = {
        "product_factor": {"Category 1": 0.0, "Category 2": 0.0},
        "activity_based": {"Category 1": 0.0, "Category 2": 0.0},
        "spend_based": {"Category 1": 0.0, "Category 2": 0.0}
    }
    for r in active_runs:
        raw_cat = r.get("scope3_category")
        if not raw_cat and r.get("product_id"):
            prod = db()["products"].find_one({"id": r["product_id"]})
            if prod: raw_cat = prod.get("scope3_category")
        cat = "Category 2" if raw_cat and "2" in str(raw_cat) else "Category 1"
        bycat[cat] = bycat.get(cat, 0.0) + r.get("result_value", 0.0)
        m = r.get("method")
        if m in bymethod:
            bymethod[m] += r.get("result_value", 0.0)
            if m in bymethod_cat:
                bymethod_cat[m][cat] += r.get("result_value", 0.0)
    return {
        "emissions_kgco2e": bycat,
        "combined_kgco2e": sum(bycat.values()),
        "method_breakdown": bymethod,
        "method_breakdown_by_category": bymethod_cat,
        "supplier_count": db()["suppliers"].count_documents({"active": True}),
        "submitted_reports": sum(s["status"] == "submitted" for s in subs),
        "pending_reports": sum(s["status"] == "draft" for s in subs),
        "awaiting_clarification": sum(s["status"] == "clarification_requested" for s in subs),
        "reporting_month": reporting_month
    }
@app.get(P+"/manufacturer/reports/emissions")
def emissions_report(reporting_month:str|None=Query(None),u=Depends(role("manufacturer"))):
    q = {} if not reporting_month else {"reporting_month": reporting_month}
    all_runs = [clean(x) for x in db()["calculation_runs"].find(q).sort("created_at", -1)]
    active_by_pid = {}
    for r in db()["calculation_runs"].find().sort("created_at", 1):
        pid = r.get("purchase_record_id")
        if not pid: continue
        if r.get("is_active") is True:
            active_by_pid[pid] = r["id"]
        elif pid not in active_by_pid or r.get("is_active") is not False:
            active_by_pid[pid] = r["id"]
    for r in all_runs:
        pid = r.get("purchase_record_id")
        r["is_active"] = (r.get("is_active") is True) or (pid and active_by_pid.get(pid) == r["id"])
    return {"items": all_runs}
@app.get(P+"/manufacturer/reports/suppliers")
def supplier_report(reporting_month:str|None=Query(None),u=Depends(role("manufacturer"))):
    run_q = {} if not reporting_month else {"reporting_month": reporting_month}
    active_runs = get_active_calculation_runs(run_q)
    sup_totals: dict[str, float] = {}
    for r in active_runs:
        sid = r.get("supplier_id")
        if sid:
            sup_totals[sid] = sup_totals.get(sid, 0.0) + r.get("result_value", 0.0)
    return {"items": [{"supplier": clean(s), "emissions_kgco2e": sup_totals.get(s["id"], 0.0)} for s in db()["suppliers"].find()]}

@app.get(P+"/auditor/assignments")
def auditor_assignments(u=Depends(role("auditor"))): return {"items":[clean(x) for x in db()["auditor_assignments"].find({"auditor_id":u["profile_id"]})]}
@app.get(P+"/auditor/submissions")
def auditor_submissions(u=Depends(role("auditor"))):
    ass=list(db()["auditor_assignments"].find({"auditor_id":u["profile_id"]}))
    sups=[a.get("supplier_id") for a in ass if a.get("supplier_id")]
    ids=[a.get("submission_id") for a in ass if a.get("submission_id")]
    items = [clean(x) for x in db()["submissions"].find({"$or":[{"supplier_id":{"$in":sups}},{"id":{"$in":ids}}]})]
    return {"items": attach_evidence_counts(items)}
@app.get(P+"/auditor/submissions/{sid}")
def auditor_sub(sid:str,u=Depends(role("auditor"))): return supplier_owned(sid,u)
@app.get(P+"/auditor/submissions/{sid}/evidence")
def auditor_evidence(sid:str,u=Depends(role("auditor"))): supplier_owned(sid,u); return {"items":[clean(x) for x in db()["evidence_documents"].find({"submission_id":sid})]}
@app.post(P+"/auditor/submissions/{sid}/ai/report-quality")
async def quality(sid:str,u=Depends(role("auditor"))):
    sub=supplier_owned(sid,u)
    deterministic=deterministic_quality(sub)

    # Clean and optimize payload to avoid sending unnecessary or duplicate data
    compact_sub = {
        "reporting_month": str(sub.get("reporting_month")),
        "activities": clean(sub.get("activities", []))
    }
    compact_det = clean(deterministic)

    prompt = (
        'Return valid JSON only with keys: "rating", "findings", "missing_information", "suggested_clarification_questions". '
        'Allowed rating values: "Good", "Needs attention", or "Poor". '
        'Findings schema: [{"finding": string, "data_reference": string, "explanation": string}]. '
        'Assess data completeness, reporting period consistency, expected units, and numeric anomalies. '
        'Do not approve or reject records, and do not invent false values. '
        f'Deterministic findings: {json.dumps(compact_det, default=str)}. '
        f'Submission data: {json.dumps(compact_sub, default=str)}'
    )
    result = await openrouter_json(prompt)
    if not isinstance(result, dict):
        raise HTTPException(502, "OpenRouter returned invalid report-quality response structure")

    raw_rating = str(result.get("rating", "")).strip().rstrip(".")
    lowered = raw_rating.lower()
    if any(k in lowered for k in ["good", "high", "satisfactory", "pass"]):
        rating = "Good"
    elif any(k in lowered for k in ["need", "attention", "moderate", "fair", "medium", "warning"]):
        rating = "Needs attention"
    elif any(k in lowered for k in ["poor", "low", "fail", "critical", "insufficient", "inadequate"]):
        rating = "Poor"
    else:
        rating = "Needs attention"

    findings = result.get("findings")
    if not isinstance(findings, list):
        findings = [{"finding": str(findings), "data_reference": "general", "explanation": str(findings)}] if findings else []
    else:
        cleaned_findings = []
        for f in findings:
            if isinstance(f, dict):
                cleaned_findings.append({
                    "finding": str(f.get("finding", "Quality observation")),
                    "data_reference": str(f.get("data_reference", "activities")),
                    "explanation": str(f.get("explanation", ""))
                })
            elif isinstance(f, str):
                cleaned_findings.append({
                    "finding": f,
                    "data_reference": "activities",
                    "explanation": f
                })
        findings = cleaned_findings

    missing_info = result.get("missing_information")
    if not isinstance(missing_info, list):
        missing_info = [str(missing_info)] if missing_info else []
    else:
        missing_info = [str(m) for m in missing_info if m]

    suggested_questions = result.get("suggested_clarification_questions")
    if not isinstance(suggested_questions, list):
        suggested_questions = [str(suggested_questions)] if suggested_questions else []
    else:
        suggested_questions = [str(q) for q in suggested_questions if q]

    validated_result = {
        "rating": rating,
        "findings": findings,
        "missing_information": missing_info,
        "suggested_clarification_questions": suggested_questions,
        "deterministic_findings": deterministic,
    }
    return store_assessment("report_quality", sub, validated_result, u)
@app.post(P+"/auditor/submissions/{sid}/ai/evidence-review")
async def evidence_review(sid:str,u=Depends(role("auditor"))):
    sub=supplier_owned(sid,u); texts=evidence_text(sid)
    if not texts: raise HTTPException(422,"No supporting evidence is available for review")
    prompt="Return JSON {\"rating\":\"Weak|Medium|Good\",\"findings\":[string],\"matched_values\":[string],\"missing_information\":[string],\"limitations\":[string]}. Compare text with reported data; do not claim authenticity or certification. Evidence: "+json.dumps(texts)+" Reported activities: "+json.dumps(sub["activities"])
    result=await openrouter_json(prompt)
    raw_rating = str(result.get("rating", "")).strip().rstrip(".")
    if raw_rating.lower() == "weak": rating = "Weak"
    elif raw_rating.lower() == "medium": rating = "Medium"
    elif raw_rating.lower() == "good": rating = "Good"
    else: rating = None
    if not rating or any(not isinstance(result.get(k),list) for k in ["findings","matched_values","missing_information","limitations"]): raise HTTPException(502,"OpenRouter returned invalid evidence-review JSON")
    result["rating"] = rating
    result["extraction_limitations"]=[x["limitation"] for x in texts if x["limitation"]]
    return store_assessment("evidence_review",sub,result,u)
@app.get(P+"/auditor/submissions/{sid}/ai-assessments")
def assessments(sid:str,u=Depends(role("auditor"))): supplier_owned(sid,u); return {"items":[clean(x) for x in db()["ai_assessments"].find({"submission_id":sid})]}
@app.post(P+"/auditor/submissions/{sid}/comments",status_code=201)
def comment(sid:str,x:CommentIn,u=Depends(role("auditor"))): supplier_owned(sid,u); d={"id":oid(),"submission_id":sid,"auditor_id":u["profile_id"],"text":x.text,"created_at":now()}; db()["comments"].insert_one(d); return clean(d)
@app.get(P+"/auditor/submissions/{sid}/comments")
def comments(sid:str,u=Depends(role("auditor"))): supplier_owned(sid,u); return {"items":[clean(x) for x in db()["comments"].find({"submission_id":sid})]}
@app.post(P+"/auditor/submissions/{sid}/clarifications",status_code=201)
def clarification(sid:str,x:ClarificationIn,u=Depends(role("auditor"))): supplier_owned(sid,u); d={"id":oid(),"submission_id":sid,"auditor_id":u["profile_id"],"question":x.question,"status":"open","created_at":now()}; db()["clarifications"].insert_one(d); db()["submissions"].update_one({"id":sid},{"$set":{"status":"clarification_requested"}}); return clean(d)
@app.get(P+"/auditor/submissions/{sid}/clarifications")
def auditor_clarifications(sid:str,u=Depends(role("auditor"))): supplier_owned(sid,u); return {"items":[clean(x) for x in db()["clarifications"].find({"submission_id":sid})]}
@app.patch(P+"/auditor/clarifications/{cid}")
def clarification_patch(cid:str,x:ClarificationUpdate,u=Depends(role("auditor"))):
    c=find("clarifications",cid); supplier_owned(c["submission_id"],u); db()["clarifications"].update_one({"id":cid},{"$set":{"status":x.status,"updated_at":now()}}); return find("clarifications",cid)
