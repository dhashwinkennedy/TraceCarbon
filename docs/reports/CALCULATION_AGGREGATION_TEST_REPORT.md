# Scope3Track — Emissions Calculation & Aggregation Verification Report

**Date of Execution**: November 8, 2026  
**Backend Suite**: `backend/tests/test_final_regression_backend.py` (Test 4 & 5)  
**Frontend Suite**: `frontend/tests/15_final_fullstack_regression.spec.ts` (TC-FINAL-02 & TC-FINAL-03)  
**Target Database**: `scope3track_final_qa` (Isolated) & `scope3track` (Verified Demo Read-Only)

---

## 1. Executive Summary

This report verifies two foundational carbon accounting capabilities in Scope3Track:
1. **Category 2 (Capital Goods) Accounting**: Full end-to-end support for machinery, production equipment, and capitalized assets, providing distinct categorization from Category 1 purchased raw materials.
2. **Double-Counting Prevention (GHG Protocol Scope 3 Standard Compliant)**: Ensuring that multiple alternative estimation methodologies executed against the same procurement purchase record preserve complete audit history while identifying **exactly one active calculation methodology in the inventory**.

---

## 2. Category 2 Demonstration Ledger & Verification

### Product Catalog & Procurement Ledger Data
- **Product ID**: `product-machine`
- **Product Name**: `Production machinery`
- **Product Code / SKU**: `MAC-001`
- **Scope 3 Category**: `Category 2`
- **Relevant Unit**: `unit`
- **Status**: `Active`
- **Baseline Purchase Record**:
  - **Purchase ID**: `6a32f3c6-7b6f-4075-add4-67400f739be7`
  - **Supplier**: `supplier-xyz` (`XYZ Steel Ltd`)
  - **Reporting Month**: `2026-05`
  - **Purchased Quantity**: `2.0 unit`
  - **Expenditure**: `INR 5,000,000.00`
  - **Currency**: `INR`

### Calculation Execution & Verifiable Receipt
- **Calculation Run ID**: `877e044e-350b-40f1-b4e6-15d968f684f3`
- **Methodology**: `Product-Factor (Unit-based)`
- **Emission Factor ID**: `factor-machinery-demo`
- **Factor Value**: `12,500.0 kg CO2e / unit`
- **Formula**:
  $$\text{Emissions} = 2.0\text{ units} \times 12,500\text{ kg CO}_2\text{e/unit} = 25,000.00\text{ kg CO}_2\text{e} \quad (25.00\text{ t CO}_2\text{e})$$
- **SHA-256 Calculation Receipt Digest**: Present and verified in modal audit trail (`06_category2_calculation_receipt.png`).

### Dashboard Isolation Verification (Reporting Month: 2026-05)
When filtering by reporting month `2026-05`:
- **Category 2 (Capital Goods)**: `25.00 t CO₂e` ($25,000\text{ kg CO}_2\text{e}$)
- **Category 1 (Purchased Goods)**: `0.00 kg CO₂e` (Unaffected; no bleed between categories)
- **Total Combined Scope 3**: `25.00 t CO₂e` ($25,000\text{ kg CO}_2\text{e}$)
- **Screenshot Proof**: `07_category2_dashboard_result.png`

---

## 3. Double-Counting Prevention & Methodology Switching Test

In carbon accounting, spend-based and product-factor calculations for the same purchase represent alternative estimation approaches. Adding them together creates double-counting and falsifies corporate inventories.

### Test Execution Details
To test this isolation in an unpolluted setting, a test purchase record was created in reporting month `2027-05`:
- **Test Purchase ID**: `test-purchase-dc-01`
- **Purchased Item**: 2 units of machinery
- **Expenditure**: INR 5,000,000.00

### Step-by-Step Execution Matrix

| Step | Action | Methodology | Factor Used | Calculated Value | Inventory Status | Dashboard Cat 2 Emissions | Double Counting Detected? |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **1** | Run initial calculation | Product-Factor | `factor-machinery-demo` ($12,500\text{ kg/unit}$) | **25,000 kg CO2e** | `Active in Inventory` | **25,000 kg CO2e** | **NO** |
| **2** | Recalculate same purchase | Spend-Based | `factor-spend` ($0.2\text{ kg/INR}$) | **1,000,000 kg CO2e** | `Active in Inventory` (Run 1 superseded) | **1,000,000 kg CO2e** | **NO** (If double counted, would be 1,025,000!) |
| **3** | Historical Receipts Check | Database / UI | Both Runs | Both preserved with SHA-256 receipts | Run 1: `Superseded`<br>Run 2: `Active` | **1,000,000 kg CO2e** | **NO** |
| **4** | Dynamic Switching | Click "Set Active" on Run 1 | Switched to Product-Factor | Run 1 activated, Run 2 superseded | Run 1: `Active`<br>Run 2: `Superseded` | **25,000 kg CO2e** | **NO** |

### UI Banner & Guarantee
Calculations UI displays the verified GHG Protocol guarantee banner:
> *"GHG Protocol Accounting Guarantee: Exactly one primary calculation methodology is active in your inventory per purchase record."*

**Screenshot Proof**: `08_double_counting_prevention.png`

---

## 4. Conclusion

1. Category 2 Capital Goods calculations work with complete formula traceability.
2. Dashboard summaries respect Scope 3 category boundaries without cross-category data contamination.
3. The double-counting prevention mechanism protects inventory integrity by guaranteeing exactly one active calculation per procurement batch while preserving 100% of calculation receipts for assurance and auditing.
