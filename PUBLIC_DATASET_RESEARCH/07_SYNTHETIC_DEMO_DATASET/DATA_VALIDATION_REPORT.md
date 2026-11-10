# Scope3Track — Synthetic Demonstration Dataset Validation Report

**Audit Timestamp**: November 8, 2026
**Validation Scope**: `PUBLIC_DATASET_RESEARCH/07_SYNTHETIC_DEMO_DATASET/`
**Audit Status**: **PASSED (100%)** (12/12 Checks Passed)

> [!IMPORTANT]
> **DATA CLASSIFICATION**: SYNTHETIC DEMONSTRATION DATA — NOT ACTUAL COMPANY DISCLOSURES

---

## 1. Executive Summary of Local File-Based Validation
Before finalizing the synthetic dataset package, a comprehensive automated verification audit was executed against all generated workbooks, CSV files, and directory trees. The audit verified structure, integrity, completeness, and mathematical reproducibility.

---

## 2. Audit Verification Matrix

| Check ID | Requirement Description | Verification Details | Status |
| :--- | :--- | :--- | :---: |
| **CHK-001** | Exactly 10 supplier master records in Supplier_Master.xlsx | Found 10 suppliers (SUP-001 to SUP-010). | **[PASS]** |
| **CHK-002** | Exactly 20 annual activity records in master dataset (Annual_Supplier_Activities.xlsx / .csv) | Found 20 records (10 for FY2022-23, 10 for FY2023-24). | **[PASS]** |
| **CHK-003** | Exactly 17 preload records in 02_PRELOAD_DATA/ package | Found 17 preload records (10 in FY22-23, 7 in FY23-24). | **[PASS]** |
| **CHK-004** | Exactly 3 manual upload records in 03_MANUAL_UPLOAD_FILES/ package | Found 3 manual records (SUP-001 Steel, SUP-004 Cement, SUP-005 Chemicals). | **[PASS]** |
| **CHK-005** | Each of the 10 suppliers has exactly one FY2022-23 record | All 10 suppliers have verified FY2022-23 baseline activity records. | **[PASS]** |
| **CHK-006** | Seven non-demonstration suppliers have preloaded FY2023-24 records | Preloaded FY24 suppliers: ['SUP-002', 'SUP-003', 'SUP-006', 'SUP-007', 'SUP-008', 'SUP-009', 'SUP-010']. | **[PASS]** |
| **CHK-007** | Three demonstration suppliers exist in manual upload package (Steel, Cement, Chemicals) | Manual demonstration suppliers: ['SUP-001', 'SUP-004', 'SUP-005']. | **[PASS]** |
| **CHK-008** | All three manual upload files match corresponding master activity records byte-for-byte in values | Steel matched: True; Cement matched: True; Chemicals matched: True. | **[PASS]** |
| **CHK-009** | Activity units and definitions are consistent across all suppliers and years | All 20 records strictly use kWh (electricity), Litres (diesel), Tonnes (production & raw material). | **[PASS]** |
| **CHK-010** | All activity values are positive, valid, and non-negative (missing distinct from zero) | 100% of activity consumption metrics exceed zero and adhere to realistic physical plant scales. | **[PASS]** |
| **CHK-011** | Calculated emissions are 100% mathematically reproducible from inputs and statutory factors | Scope 1, Scope 2, Total GHG, and specific intensities match deterministic formulas across all 20 records. | **[PASS]** |
| **CHK-012** | Manufacturer purchases correctly segregated into Category 1 (goods) and Category 2 (capital machinery) | 18 Category 1 operational purchases and 2 Category 2 capital goods purchases (SUP-010 boilers) verified. | **[PASS]** |

---

## 3. Dataset Integrity & Reproducibility Guarantees
1. **Deterministic Parametric Construction**: All activity figures, specific consumption ratios, and raw material yields were generated via deterministic parametric rules.
2. **Strict Chronological Sequence**: All datasets enforce **FY 2022-23 (First Year / Baseline)** and **FY 2023-24 (Second Year / Reporting Year)**.
3. **Zero Cross-Contamination**: The 17 preloaded records in `02_PRELOAD_DATA/` and the 3 manual demonstration records in `03_MANUAL_UPLOAD_FILES/` are strictly partitioned.
4. **No Prototype Modifications**: Verified zero changes to Scope3Track backend, frontend, MongoDB databases, or `.env` files.

---

## 4. Final Verification Sign-Off
All 12 validation criteria have been verified and confirmed. The Phase 1 dataset package is assembled and ready for Phase 2 integration upon approval.