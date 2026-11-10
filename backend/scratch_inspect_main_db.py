import os
import pymongo
from dotenv import load_dotenv

load_dotenv()
client = pymongo.MongoClient(os.environ['MONGODB_URI'])
db = client['scope3track']

print('=== 1. PRODUCTS IN scope3track ===')
for p in db.products.find():
    print(f"Product: ID={p.get('id')}, Name={p.get('product_name')}, Code={p.get('product_code')}, Cat={p.get('scope3_category')}, Unit={p.get('relevant_unit')}, Active={p.get('active')}")

print('\n=== 2. SUPPLIERS IN scope3track ===')
for s in db.suppliers.find():
    print(f"Supplier: ID={s.get('id')}, Code={s.get('supplier_code')}, Name={s.get('name')}, Active={s.get('active')}")

print('\n=== 3. EMISSION FACTORS IN scope3track ===')
for f in db.emission_factors.find():
    print(f"Factor: ID={f.get('id')}, Name={f.get('name')}, Type={f.get('factor_type')}, Value={f.get('factor_value')}, DenomUnit={f.get('denominator_unit')}, Demo={f.get('demo')}")

print('\n=== 4. EXISTING PURCHASE RECORDS IN scope3track ===')
for pr in db.purchase_records.find():
    print(f"Purchase: ID={pr.get('id')}, Supplier={pr.get('supplier_id')}, Prod={pr.get('product_name')}/{pr.get('product_id')}, Month={pr.get('reporting_month')}, Qty={pr.get('purchased_quantity')} {pr.get('quantity_unit')}, Spend={pr.get('purchase_expenditure')} {pr.get('currency')}, Calc={pr.get('calculated')}")

print('\n=== 5. EXISTING CALCULATIONS IN scope3track ===')
for c in db.calculation_runs.find():
    print(f"Calc: ID={c.get('id')}, PID={c.get('purchase_record_id')}, Method={c.get('method')}, Cat={c.get('scope3_category')}, Result={c.get('result_value')}, Month={c.get('reporting_month')}, Active={c.get('is_active')}")
