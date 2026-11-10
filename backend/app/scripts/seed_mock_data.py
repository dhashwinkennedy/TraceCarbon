"""Idempotent synthetic DEMO data seed. Run: python -m app.scripts.seed_mock_data"""
from app.main import dbx, db, now, oid, pwd

def put(coll, query, doc): db()[coll].update_one(query,{"$setOnInsert":doc},upsert=True)
def main():
    dbx.connect()
    put("manufacturer",{"id":"manufacturer-1"},{"id":"manufacturer-1","name":"ABC Manufacturing","demo":True,"created_at":now()})
    users=[("manufacturer@scope3track.demo","ManufacturerDemo123!","manufacturer","manufacturer-1"), ("xyz.steel@scope3track.demo","SupplierDemo123!","supplier","supplier-xyz"), ("green.aluminium@scope3track.demo","SupplierDemo123!","supplier","supplier-green"), ("auditor.xyz@scope3track.demo","AuditorDemo123!","auditor","auditor-xyz"), ("auditor.green@scope3track.demo","AuditorDemo123!","auditor","auditor-green")]
    for email,password,role,pid in users: put("users",{"email":email},{"id":oid(),"email":email,"password_hash":pwd.hash(password),"role":role,"profile_id":pid,"active":True,"created_at":now()})
    put("suppliers",{"id":"supplier-xyz"},{"id":"supplier-xyz","name":"XYZ Steel","supplier_code":"SUP001","contact_email":"xyz.steel@scope3track.demo","active":True,"demo":True,"created_at":now()})
    put("suppliers",{"id":"supplier-green"},{"id":"supplier-green","name":"Green Aluminium","supplier_code":"SUP002","contact_email":"green.aluminium@scope3track.demo","active":True,"demo":True,"created_at":now()})
    for sid, aid, unit in [("supplier-xyz","electricity","kWh"),("supplier-xyz","diesel","litres"),("supplier-xyz","production","tonnes"),("supplier-xyz","raw_material","tonnes"),("supplier-green","electricity","kWh"),("supplier-green","natural_gas","m3"),("supplier-green","production","tonnes")]: put("supplier_requirements",{"supplier_id":sid,"activity_id":aid},{"id":oid(),"supplier_id":sid,"activity_id":aid,"expected_unit":unit,"created_at":now()})
    for aid,name in [("auditor-xyz","Auditor One"),("auditor-green","Auditor Two")]: put("auditors",{"id":aid},{"id":aid,"name":name,"email":f"{aid}@scope3track.demo","active":True,"created_at":now()})
    for aid,sid in [("auditor-xyz","supplier-xyz"),("auditor-green","supplier-green")]: put("auditor_assignments",{"auditor_id":aid,"supplier_id":sid},{"id":oid(),"auditor_id":aid,"supplier_id":sid,"created_at":now()})
    products=[("product-steel","Steel sheets","STL-001","Category 1","tonnes"),("product-machine","Production machinery","MAC-001","Category 2","unit"),("product-aluminium","Aluminium products","ALU-001","Category 1","tonnes")]
    for i,n,c,cat,unit in products: put("products",{"id":i},{"id":i,"product_name":n,"product_code":c,"scope3_category":cat,"relevant_unit":unit,"active":True,"demo":True,"created_at":now()})
    factors=[("factor-steel","product_factor",2.1,"tonnes",None),("factor-electricity","activity_based",0.4,"kWh","electricity"),("factor-diesel","activity_based",2.68,"litres","diesel"),("factor-spend","spend_based",0.2,"INR",None)]
    for i,t,val,den,activity in factors: put("emission_factors",{"id":i},{"id":i,"name":"DEMO illustrative factor — not for real reporting","factor_type":t,"factor_value":val,"denominator_unit":den,"applicable_activity":activity,"currency":"INR" if t=="spend_based" else None,"source_name":"DEMO synthetic illustrative data; not an official source","demo":True,"version":1,"created_at":now()})
    xyz={"id":"submission-xyz-2026-01","supplier_id":"supplier-xyz","reporting_month":"2026-01","status":"submitted","version":1,"activities":[{"activity_id":"electricity","value":100000,"unit":"kWh"},{"activity_id":"diesel","value":2000,"unit":"litres"},{"activity_id":"production","value":500,"unit":"tonnes"},{"activity_id":"raw_material","value":600,"unit":"tonnes"}],"demo":True,"created_at":now()}; put("submissions",{"id":xyz["id"]},xyz)
    green={"id":"submission-green-2026-01","supplier_id":"supplier-green","reporting_month":"2026-01","status":"draft","version":1,"activities":[{"activity_id":"electricity","value":20000,"unit":"kWh"}],"demo":True,"created_at":now()}; put("submissions",{"id":green["id"]},green)
    pr={"id":"purchase-xyz-steel-2026-01","supplier_id":"supplier-xyz","product_id":"product-steel","reporting_month":"2026-01","purchased_quantity":100.0,"quantity_unit":"tonnes","purchase_expenditure":1000000.0,"currency":"INR","fingerprint":"demo-xyz-steel","demo":True,"created_at":now()}; put("purchase_records",{"id":pr["id"]},pr)
    print("Seeded one manufacturer and synthetic DEMO records.")
if __name__=="__main__": main()
