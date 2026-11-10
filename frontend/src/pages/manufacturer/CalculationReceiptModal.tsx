import React from 'react';
import {
  X,
  ShieldCheck,
  Hash,
  Calculator,
  FileText,
  Zap,
  Fuel,
  Factory,
  DollarSign,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  formatKgCO2e,
  formatDateTime,
  formatNumber,
  formatCurrency,
} from '../../utils/formatters';

interface CalculationReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: Record<string, any> | null;
}

export const CalculationReceiptModal: React.FC<CalculationReceiptModalProps> = ({
  isOpen,
  onClose,
  receiptData,
}) => {
  if (!isOpen || !receiptData) return null;

  const rawInput = receiptData.input || {};
  const factorMeta = receiptData.factor_metadata || {};
  const components: any[] = receiptData.components || [];
  const hash = receiptData.sha256 || receiptData.verification_hash;
  const method = receiptData.method;

  // Extract activity-based components if present
  const elecComp = components.find((c) => c.activity_id === 'electricity');
  const dieselComp = components.find((c) => c.activity_id === 'diesel');
  const facComp = components.find((c) => c.activity_id === 'facility_total');
  const allocComp = components.find((c) => c.activity_id === 'allocation');

  // Extract spend-based component if present
  const spendComp = components.length > 0 && method === 'spend_based' ? components[0] : null;

  // Extract product-factor component if present
  const pcfComp = components.length > 0 && method === 'product_factor' ? components[0] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg tracking-tight">Scope 3 Calculation Receipt</h3>
              <p className="text-xs text-slate-400">Verifiable calculation audit trail and inputs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Main result badge */}
          <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-emerald-800 tracking-wider block">
                Calculated Footprint
              </span>
              <span className="text-2xl font-black text-emerald-900">
                {formatKgCO2e(receiptData.result_value)}
              </span>
            </div>
            <div className="text-right text-xs text-emerald-700">
              <span className="block font-semibold">GHG Category</span>
              <span className="font-mono font-bold">{receiptData.scope3_category || 'Category 1'}</span>
            </div>
          </div>

          {/* Audit Metadata */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
              <span className="text-slate-400 block font-medium">Methodology Applied</span>
              <span className="font-bold text-slate-800 uppercase font-mono mt-0.5 block">
                {method === 'product_factor' && 'Product-Factor (Tier 1)'}
                {method === 'activity_based' && 'Activity-Based (Tier 2)'}
                {method === 'spend_based' && 'Spend-Based (Tier 3)'}
                {!['product_factor', 'activity_based', 'spend_based'].includes(method) && method}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
              <span className="text-slate-400 block font-medium">Calculation Timestamp</span>
              <span className="font-bold text-slate-800 mt-0.5 block">
                {formatDateTime(receiptData.created_at)}
              </span>
            </div>
          </div>

          {/* Receipt ID Reference */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60 text-xs flex justify-between items-center">
            <div>
              <span className="text-slate-400 block font-medium">Receipt ID</span>
              <span className="font-mono text-slate-800 font-semibold">{receiptData.id}</span>
            </div>
            <div>
              {receiptData.is_active ? (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Active in Inventory
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  Superseded Run
                </span>
              )}
            </div>
          </div>

          {/* Formula */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">
              Accounting Formula
            </span>
            <div className="p-3 rounded-lg bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto">
              <code>{receiptData.formula || 'Emissions = Input_Quantity × Factor_Value'}</code>
            </div>
          </div>

          {/* METHOD-SPECIFIC AUDIT BREAKDOWNS */}

          {/* 1. PRODUCT-FACTOR BREAKDOWN */}
          {method === 'product_factor' && (
            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                Product-Factor Methodology Details
              </span>
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">Purchased Quantity</span>
                  <span className="font-mono text-slate-800 font-bold">
                    {formatNumber(rawInput.purchased_quantity ?? pcfComp?.quantity)} {rawInput.quantity_unit || pcfComp?.unit || 'tonnes'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">Product Emission Factor</span>
                  <span className="font-mono text-slate-800 font-bold">
                    {pcfComp?.factor_value ?? receiptData.factor_id} kg CO₂e / {rawInput.quantity_unit || pcfComp?.unit || 'tonne'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">Calculated Emissions</span>
                  <span className="font-mono text-slate-900 font-bold">
                    {formatKgCO2e(receiptData.result_value)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Factor Provenance</span>
                  <span className="font-medium text-slate-700">
                    {factorMeta.source_name || 'AxiomX Supplier PCF Catalog'}
                  </span>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-[11px] flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 text-teal-600 mt-0.5" />
                <span>
                  <strong>Data Classification:</strong> Synthetic demonstration product carbon footprint factor calibrated to verified supplier activities.
                </span>
              </div>
            </div>
          )}

          {/* 2. ACTIVITY-BASED BREAKDOWN */}
          {method === 'activity_based' && (
            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                Supplier Activity & Facility Allocation
              </span>
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2.5 text-xs">
                {elecComp && (
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>Grid Electricity: {formatNumber(elecComp.value)} {elecComp.unit} × {elecComp.factor_value}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-800">{formatKgCO2e(elecComp.emissions_kgco2e)}</span>
                  </div>
                )}
                {dieselComp && (
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/50">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Fuel className="w-3.5 h-3.5 text-blue-500" />
                      <span>Diesel Fuel: {formatNumber(dieselComp.value)} {dieselComp.unit} × {dieselComp.factor_value}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-800">{formatKgCO2e(dieselComp.emissions_kgco2e)}</span>
                  </div>
                )}
                {facComp && (
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/50 bg-slate-100/70 p-2 rounded">
                    <span className="font-semibold text-slate-700">Total Facility Energy Emissions</span>
                    <span className="font-mono font-bold text-slate-900">{formatKgCO2e(facComp.emissions_kgco2e)}</span>
                  </div>
                )}
                {allocComp && (
                  <div className="py-1 border-b border-slate-200/50 space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>Purchased Quantity:</span>
                      <span className="font-mono font-bold">{formatNumber(allocComp.purchased_qty)} tonnes</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Supplier Annual Production Output:</span>
                      <span className="font-mono font-bold">{formatNumber(allocComp.annual_production)} tonnes</span>
                    </div>
                    <div className="flex justify-between text-indigo-700 font-semibold pt-1">
                      <span>Allocation Fraction (α):</span>
                      <span className="font-mono font-bold">{(allocComp.allocation_fraction * 100).toFixed(4)}%</span>
                    </div>
                  </div>
                )}
                <div className="flex justify-between py-1 text-emerald-800 font-bold">
                  <span>Allocated Purchase Emissions</span>
                  <span className="font-mono">{formatKgCO2e(receiptData.result_value)}</span>
                </div>
              </div>

              {/* Mandatory Activity-Based Limitation */}
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <span className="font-bold block">Mandatory Method Limitation:</span>
                  <span>Supplier-specific energy activity allocation estimate — synthetic demonstration data.</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. SPEND-BASED BREAKDOWN */}
          {method === 'spend_based' && (
            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                Spend-Based (EEIO) Methodology Details
              </span>
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">Purchase Amount (INR)</span>
                  <span className="font-mono text-slate-800 font-bold">
                    {formatCurrency(spendComp?.spend_inr ?? rawInput.purchase_expenditure, 'INR')}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">Embedded Exchange Rate</span>
                  <span className="font-mono text-slate-800">
                    {spendComp?.fx_rate ?? factorMeta.fx_rate} INR/USD
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">Converted Spend (USD)</span>
                  <span className="font-mono text-slate-800 font-bold">
                    {formatCurrency(spendComp?.spend_usd, 'USD')}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">NAICS Sector</span>
                  <span className="font-mono text-slate-800 font-medium">
                    {spendComp?.sector_code || factorMeta.sector_code} — {spendComp?.sector_name || factorMeta.sector_name || 'Manufacturing Sector'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">Open CEDA Factor</span>
                  <span className="font-mono text-slate-800 font-bold">
                    {spendComp?.factor_value_usd ?? factorMeta.factor_value_usd} kg CO₂e / USD
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">Price Basis</span>
                  <span className="font-medium text-slate-700">
                    {factorMeta.price_basis || 'Producer Price'}
                  </span>
                </div>
                <div className="flex justify-between py-1 text-emerald-800 font-bold">
                  <span>Calculated Emissions</span>
                  <span className="font-mono">{formatKgCO2e(receiptData.result_value)}</span>
                </div>
              </div>

              {/* CEDA Attribution and CC BY-SA 4.0 Notice */}
              <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 text-indigo-600 mt-0.5" />
                <div>
                  <span className="font-bold block">Data Attribution & License:</span>
                  <span>CEDA by Watershed • Licensed under Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0).</span>
                </div>
              </div>
            </div>
          )}

          {/* Verified Procurement Inputs */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-2">
              Procurement & Activity Inputs
            </span>
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/50">
                <span className="text-slate-500">Purchase Record ID</span>
                <span className="font-mono text-slate-800">{receiptData.purchase_record_id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/50">
                <span className="text-slate-500">Supplier Reference</span>
                <span className="font-mono text-slate-800">{receiptData.supplier_id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/50">
                <span className="text-slate-500">Reporting Month</span>
                <span className="font-mono text-slate-800 font-bold">{receiptData.reporting_month}</span>
              </div>
              {rawInput.purchased_quantity !== undefined && (
                <div className="flex justify-between py-1 border-b border-slate-200/50">
                  <span className="text-slate-500">Purchased Quantity</span>
                  <span className="font-mono text-slate-800 font-bold">
                    {formatNumber(rawInput.purchased_quantity)} {rawInput.quantity_unit}
                  </span>
                </div>
              )}
              {rawInput.purchase_expenditure !== undefined && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Expenditure</span>
                  <span className="font-mono text-slate-800 font-bold">
                    {formatCurrency(rawInput.purchase_expenditure, rawInput.currency || 'INR')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Genuine SHA-256 Hash */}
          {hash && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                Audit Hash (SHA-256)
              </div>
              <div className="p-3 rounded-lg bg-slate-100 text-slate-600 font-mono text-[11px] break-all border border-slate-200">
                {hash}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Close Receipt
          </button>
        </div>
      </div>
    </div>
  );
};
