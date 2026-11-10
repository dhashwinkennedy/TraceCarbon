from dotenv import load_dotenv
import os, pymongo

load_dotenv()
client = pymongo.MongoClient(os.getenv('MONGODB_URI'))
db = client['scope3track_final_qa']

PROPOSED_ASSIGNMENTS = {
    'PO-2022-001': 'product_factor',
    'PO-2022-002': 'product_factor',
    'PO-2022-003': 'product_factor',
    'PO-2022-004': 'product_factor',
    'PO-2022-005': 'product_factor',
    'PO-2022-010': 'product_factor',
    'PO-2023-001': 'product_factor',
    'PO-2023-002': 'product_factor',
    'PO-2023-003': 'product_factor',
    'PO-2023-004': 'product_factor',
    'PO-2023-009': 'product_factor',
    'PO-2023-010': 'product_factor',
    'PO-2022-008': 'activity_based',
    'PO-2022-009': 'activity_based',
    'PO-2023-005': 'activity_based',
    'PO-2023-008': 'activity_based',
    'PO-2022-006': 'spend_based',
    'PO-2022-007': 'spend_based',
    'PO-2023-006': 'spend_based',
    'PO-2023-007': 'spend_based',
}

COMMODITY_TO_NAICS = {
    'Corrugated packaging': '322210',
    'PK-BX-006': '322210',
    'SUP-006': '322210',
    'Industrial fabric': '313200',
    'TX-FC-007': '313200',
    'SUP-007': '313200',
}

cat1_unrounded = 0.0
cat2_unrounded = 0.0
cat1_kg_stored = 0.0
cat2_kg_stored = 0.0

method_totals = {'product_factor': 0.0, 'activity_based': 0.0, 'spend_based': 0.0}

print('=== 20-PURCHASE FULL PRECISION AUDIT ===')
for pid in sorted(PROPOSED_ASSIGNMENTS.keys()):
    p = db.purchase_records.find_one({'id': pid})
    method = PROPOSED_ASSIGNMENTS[pid]
    cat = p.get('scope3_category')
    fy = p.get('financial_year') or p.get('reporting_month')
    tag = 'FY22' if '2022' in fy else 'FY23'
    pname = p.get('product_name')
    
    val_unrounded = 0.0
    val_stored = 0.0
    
    if method == 'product_factor':
        run = db.calculation_runs.find_one({'purchase_record_id': pid, 'is_active': True})
        f = db.emission_factors.find_one({'id': run['factor_id']})
        qty = float(p['purchased_quantity'])
        f_val = float(f['factor_value'])
        val_unrounded = qty * f_val
        val_stored = float(run['result_value'])
    elif method == 'activity_based':
        sub = db.submissions.find_one({'supplier_id': p['supplier_id'], 'reporting_month': fy, 'status': {'$in': ['submitted', 'closed', 'response_submitted']}})
        activities = sub.get('activities', [])
        elec = next(a for a in activities if a.get('activity_id') in ('electricity', 'grid_electricity'))
        diesel = next(a for a in activities if a.get('activity_id') in ('diesel', 'diesel_fuel'))
        prod = next(a for a in activities if a.get('activity_id') in ('production', 'production_volume'))
        cea = db.emission_factors.find_one({'factor_type': 'activity_based', 'applicable_activity': 'electricity', '$or': [{'financial_year': fy}, {'id': f'FACT-CEA-GRID-{tag}'}]})
        ipcc = db.emission_factors.find_one({'factor_type': 'activity_based', 'applicable_activity': 'diesel', 'id': 'FACT-IPCC-DIESEL'})
        elec_kwh = float(elec['value'])
        diesel_l = float(diesel['value'])
        annual_prod = float(prod['value'])
        purchased_qty = float(p['purchased_quantity'])
        alpha = purchased_qty / annual_prod
        fac_kg = elec_kwh * float(cea['factor_value']) + diesel_l * float(ipcc['factor_value'])
        val_unrounded = fac_kg * alpha
        val_stored = round(val_unrounded, 2)
    elif method == 'spend_based':
        sec = COMMODITY_TO_NAICS.get(p.get('product_name')) or COMMODITY_TO_NAICS.get(p.get('product_id'))
        f = db.emission_factors.find_one({'factor_type': 'spend_based', 'sector_code': sec, 'financial_year': fy}) or db.emission_factors.find_one({'id': f'FACT-CEDA-{sec}-{tag}'})
        spend_inr = float(p['purchase_expenditure'])
        fx = float(f.get('fx_rate', 1.0))
        spend_usd = spend_inr / fx
        f_usd = float(f.get('factor_value_usd', f['factor_value'] * fx))
        val_unrounded = spend_usd * f_usd
        val_stored = round(val_unrounded, 2)
        
    method_totals[method] += val_stored
    if cat == 'Category 2':
        cat2_unrounded += val_unrounded
        cat2_kg_stored += val_stored
    else:
        cat1_unrounded += val_unrounded
        cat1_kg_stored += val_stored
        
    print(f'[{pid}] {pname:25} | {method:15} | {cat:10} | Unrounded: {val_unrounded:13.4f} kg ({val_unrounded/1000:9.4f} t) | Stored: {val_stored:10.2f} kg ({val_stored/1000:7.4f} t)')

print('\n=== SUMMARY RECONCILIATION ===')
print(f'Product-Factor: {method_totals["product_factor"]:12.2f} kg ({method_totals["product_factor"]/1000:.4f} t)')
print(f'Activity-Based: {method_totals["activity_based"]:12.2f} kg ({method_totals["activity_based"]/1000:.4f} t)')
print(f'Spend-Based   : {method_totals["spend_based"]:12.2f} kg ({method_totals["spend_based"]/1000:.4f} t)')
comb_stored = sum(method_totals.values())
print(f'Total Stored  : {comb_stored:12.2f} kg ({comb_stored/1000:.4f} t)')

print(f'\nCategory 1 Stored: {cat1_kg_stored:12.2f} kg ({cat1_kg_stored/1000:.4f} t)')
print(f'Category 2 Stored: {cat2_kg_stored:12.2f} kg ({cat2_kg_stored/1000:.4f} t)')
print(f'Sum of Stored Cat: {cat1_kg_stored + cat2_kg_stored:12.2f} kg ({(cat1_kg_stored + cat2_kg_stored)/1000:.4f} t)')

print(f'\nCategory 1 Unrounded: {cat1_unrounded:14.6f} kg ({cat1_unrounded/1000:.6f} t)')
print(f'Category 2 Unrounded: {cat2_unrounded:14.6f} kg ({cat2_unrounded/1000:.6f} t)')
print(f'Sum of Unrounded Cat: {cat1_unrounded + cat2_unrounded:14.6f} kg ({(cat1_unrounded + cat2_unrounded)/1000:.6f} t)')
