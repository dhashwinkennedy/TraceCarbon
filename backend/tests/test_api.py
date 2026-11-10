"""Route-level tests using an isolated Mongo-compatible database."""
import mongomock
import pytest
from fastapi import HTTPException
from app import main
from app.scripts.seed_mock_data import main as seed

main.dbx.client=mongomock.MongoClient(); main.dbx.db=main.dbx.client["scope3track_test"]; main.dbx.connect=lambda: None
seed()
def user(email,password): return main.login(main.Login(email=email,password=password))["user"]
def test_health_and_auth():
    assert main.health()["status"]=="ok"
    assert user("manufacturer@scope3track.demo","ManufacturerDemo123!")["role"]=="manufacturer"
    with pytest.raises(HTTPException) as e: main.login(main.Login(email="manufacturer@scope3track.demo",password="wrong"))
    assert e.value.status_code==401
def test_supplier_access_control_and_submission():
    u=user("xyz.steel@scope3track.demo","SupplierDemo123!")
    with pytest.raises(HTTPException) as e: main.sub_get("submission-green-2026-01",u)
    assert e.value.status_code==403
    s=main.sub_create(main.SubmissionIn(reporting_month="2026-02"),u)
    for a,v,unit in [("electricity",1,"kWh"),("diesel",1,"litres"),("production",1,"tonnes"),("raw_material",1,"tonnes")]: main.activity_put(s["id"],a,main.ActivityIn(value=v,unit=unit),u)
    assert main.submit(s["id"],u)["status"]=="submitted"
def test_auditor_assignment_enforced():
    u=user("auditor.xyz@scope3track.demo","AuditorDemo123!")
    assert main.auditor_sub("submission-xyz-2026-01",u)["id"]=="submission-xyz-2026-01"
    with pytest.raises(HTTPException) as e: main.auditor_sub("submission-green-2026-01",u)
    assert e.value.status_code==403
def test_deterministic_product_factor_calculation():
    u=user("manufacturer@scope3track.demo","ManufacturerDemo123!")
    r=main.calculate(main.CalculationIn(purchase_record_id="purchase-xyz-steel-2026-01",factor_id="factor-steel",method="product_factor"),u)
    assert r["result_value"]==210.0
