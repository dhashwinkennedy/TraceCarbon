import mongomock
import pytest
from fastapi import HTTPException
from app import main
from app.scripts.seed_mock_data import main as seed

main.dbx.client=mongomock.MongoClient(); main.dbx.db=main.dbx.client["scope3track_ai_test"]; main.dbx.connect=lambda:None
seed()
def user(email,password): return main.login(main.Login(email=email,password=password))["user"]
def run(coro):
    """Drive mocked async routes without creating a Windows event loop."""
    try: coro.send(None)
    except StopIteration as done: return done.value
    raise AssertionError("Mocked route unexpectedly awaited external I/O")
def test_report_quality_and_supplier_ownership(monkeypatch):
    async def fake(prompt): return {"rating":"Needs attention","findings":[{"finding":"Missing activity","data_reference":"activities","explanation":"Required activity absent"}],"missing_information":["natural gas"],"suggested_clarification_questions":["Please provide natural gas."]}
    monkeypatch.setattr(main,"openrouter_json",fake)
    auditor=user("auditor.xyz@scope3track.demo","AuditorDemo123!")
    result=run(main.quality("submission-xyz-2026-01",auditor)); assert result["result"]["rating"]=="Needs attention"
    other=user("auditor.green@scope3track.demo","AuditorDemo123!")
    with pytest.raises(HTTPException) as e: run(main.quality("submission-xyz-2026-01",other))
    assert e.value.status_code==403
def test_reduction_requires_calculation_and_valid_json(monkeypatch):
    main.db()["calculation_runs"].delete_many({})
    supplier=user("xyz.steel@scope3track.demo","SupplierDemo123!")
    with pytest.raises(HTTPException) as e: run(main.reduction("submission-xyz-2026-01",supplier))
    assert e.value.status_code==422
    manufacturer=user("manufacturer@scope3track.demo","ManufacturerDemo123!")
    main.calculate(main.CalculationIn(purchase_record_id="purchase-xyz-steel-2026-01",factor_id="factor-steel",method="product_factor"),manufacturer)
    async def fake(prompt): return {"suggestions":[{"related_activity":"electricity","observed_value":"Reported electricity activity","suggested_action":"Review equipment operating schedules.","why_it_may_help":"It may reduce avoidable energy use.","expected_direction":"Lower energy consumption.","assumptions_limitations":"Operational context was not provided.","additional_information_required":"Operating hours and equipment data."}]}
    monkeypatch.setattr(main,"openrouter_json",fake); assert run(main.reduction("submission-xyz-2026-01",supplier))["type"]=="reduction_suggestions"
def test_mapping_import_rejects_repeated_without_rule_then_sums():
    supplier=user("xyz.steel@scope3track.demo","SupplierDemo123!")
    sub=main.sub_create(main.SubmissionIn(reporting_month="2026-03"),supplier)
    uid="upload-test"; main.db()["supplier_spreadsheet_uploads"].insert_one({"id":uid,"submission_id":sub["id"],"headers":["elec","diesel","prod","raw"],"sample":[],"rows":[{"elec":"1","diesel":"2","prod":"3","raw":"4"},{"elec":"5","diesel":"6","prod":"7","raw":"8"}],"mapping":{}})
    mapping={"electricity":{"column":"elec","unit":"kWh"},"diesel":{"column":"diesel","unit":"litres"},"production":{"column":"prod","unit":"tonnes"},"raw_material":{"column":"raw","unit":"tonnes"}}
    main.mapping_put(sub["id"],uid,{"mapping":mapping},supplier)
    with pytest.raises(HTTPException) as e: main.mapping_import(sub["id"],uid,supplier)
    assert e.value.status_code==422
    main.db()["supplier_requirements"].update_many({"supplier_id":"supplier-xyz"},{"$set":{"aggregation_rule":"sum"}})
    imported=main.mapping_import(sub["id"],uid,supplier); assert {x["activity_id"]:x["value"] for x in imported["activities"]}["electricity"]==6
def test_all_calculation_methods_and_openrouter_errors(monkeypatch):
    manufacturer=user("manufacturer@scope3track.demo","ManufacturerDemo123!")
    activity=main.calculate(main.CalculationIn(purchase_record_id="purchase-xyz-steel-2026-01",factor_id="factor-electricity",method="activity_based",allocation_basis="documented purchase share",allocation_value=.1),manufacturer)
    assert activity["result_value"]==4536.0
    spend=main.calculate(main.CalculationIn(purchase_record_id="purchase-xyz-steel-2026-01",factor_id="factor-spend",method="spend_based"),manufacturer); assert spend["result_value"]==200000.0
    async def malformed(prompt): raise HTTPException(502,"OpenRouter returned malformed JSON")
    monkeypatch.setattr(main,"openrouter_json",malformed)
    auditor=user("auditor.xyz@scope3track.demo","AuditorDemo123!")
    with pytest.raises(HTTPException) as e: run(main.quality("submission-xyz-2026-01",auditor))
    assert e.value.status_code==502
def test_openrouter_timeout_and_api_error_are_clear(monkeypatch):
    class TimeoutClient:
        async def __aenter__(self): return self
        async def __aexit__(self,*args): return None
        async def post(self,*args,**kwargs): raise main.httpx.TimeoutException("timeout")
    monkeypatch.setattr(main.httpx,"AsyncClient",lambda **kwargs:TimeoutClient())
    with pytest.raises(HTTPException) as e: run(main.openrouter_json("{}"))
    assert e.value.status_code==504
    request=main.httpx.Request("POST","https://example.invalid")
    response=main.httpx.Response(429,request=request)
    class ErrorClient(TimeoutClient):
        async def post(self,*args,**kwargs): raise main.httpx.HTTPStatusError("rate limited",request=request,response=response)
    monkeypatch.setattr(main.httpx,"AsyncClient",lambda **kwargs:ErrorClient())
    with pytest.raises(HTTPException) as e: run(main.openrouter_json("{}"))
    assert e.value.status_code==502 and "429" in e.value.detail
