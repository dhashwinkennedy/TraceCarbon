import React, { useState, useEffect, useRef } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { StatusBadge } from '../../components/common/StatusBadge';
import { CalculationReceiptModal } from './CalculationReceiptModal';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { manufacturerService } from '../../services/manufacturer.service';
import {
  CalculationRun,
  PurchaseRecord,
  EmissionFactor,
  PurchaseMethodOptionsResponse,
} from '../../types';
import {
  formatKgCO2e,
  formatDate,
  formatNumber,
  formatCurrency,
} from '../../utils/formatters';
import {
  Calculator,
  Receipt,
  CheckCircle2,
  Filter,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Info,
  Layers,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Zap,
  Fuel,
  DollarSign,
  Package,
} from 'lucide-react';

export const CalculationsPage: React.FC = () => {
  const [calculations, setCalculations] = useState<CalculationRun[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [factors, setFactors] = useState<EmissionFactor[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Method Selection & Preview Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState('');
  const [methodOptions, setMethodOptions] = useState<PurchaseMethodOptionsResponse | null>(null);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'product_factor' | 'activity_based' | 'spend_based'>('product_factor');
  const [previewData, setPreviewData] = useState<CalculationRun | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  // Receipt Modal State
  const [activeReceipt, setActiveReceipt] = useState<Record<string, any> | null>(null);
  const [isSelecting, setIsSelecting] = useState<string | null>(null);

  const handleSelectActive = async (cid: string) => {
    setIsSelecting(cid);
    try {
      await manufacturerService.selectActiveCalculation(cid);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to set active calculation method');
    } finally {
      setIsSelecting(null);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [calcData, purData, facData] = await Promise.all([
        manufacturerService.getCalculations(),
        manufacturerService.getPurchases(),
        manufacturerService.getEmissionFactors(),
      ]);
      setCalculations(calcData);
      setPurchases(purData);
      setFactors(facData);

      // Collect available months dynamically from records
      const months = new Set<string>();
      purData.forEach((p) => p.reporting_month && months.add(p.reporting_month));
      calcData.forEach((c) => c.reporting_month && months.add(c.reporting_month));
      setAvailableMonths((prev) => {
        const merged = new Set([...prev, ...months]);
        return Array.from(merged).sort().reverse();
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load calculations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredCalculations = calculations.filter(
    (c) => !selectedMonth || c.reporting_month === selectedMonth
  );

  const activePurchaseRef = useRef<string>('');
  const activePreviewRef = useRef<string>('');

  // Fetch method options when purchase is selected
  const fetchMethodOptions = async (purchaseId: string) => {
    activePurchaseRef.current = purchaseId;
    setIsLoadingOptions(true);
    setMethodOptions(null);
    setPreviewData(null);
    try {
      const res = await manufacturerService.getPurchaseMethodOptions(purchaseId);
      if (activePurchaseRef.current !== purchaseId) return;
      setMethodOptions(res);

      const targetPurchase = purchases.find((p) => p.id === purchaseId);
      const activeMethod = targetPurchase?.active_method as any;

      // Select active method if eligible, else default to first eligible
      let chosenMethod: 'product_factor' | 'activity_based' | 'spend_based' = 'product_factor';
      if (activeMethod && res.methods[activeMethod as keyof typeof res.methods]?.eligible) {
        chosenMethod = activeMethod;
      } else if (res.methods.product_factor?.eligible) {
        chosenMethod = 'product_factor';
      } else if (res.methods.spend_based?.eligible) {
        chosenMethod = 'spend_based';
      } else if (res.methods.activity_based?.eligible) {
        chosenMethod = 'activity_based';
      }

      setSelectedMethod(chosenMethod);
      if (res.methods[chosenMethod]?.eligible) {
        fetchPreview(purchaseId, chosenMethod);
      }
    } catch (err: any) {
      if (activePurchaseRef.current === purchaseId) {
        console.error('Failed to load method options:', err);
      }
    } finally {
      if (activePurchaseRef.current === purchaseId) {
        setIsLoadingOptions(false);
      }
    }
  };

  // Fetch calculation preview
  const fetchPreview = async (
    purchaseId: string,
    methodName: 'product_factor' | 'activity_based' | 'spend_based'
  ) => {
    const previewKey = `${purchaseId}:${methodName}`;
    activePreviewRef.current = previewKey;
    setIsLoadingPreview(true);
    setPreviewData(null);
    try {
      const res = await manufacturerService.previewCalculation({
        purchase_record_id: purchaseId,
        method: methodName,
      });
      if (activePreviewRef.current !== previewKey) return;
      setPreviewData(res);
    } catch (err: any) {
      if (activePreviewRef.current === previewKey) {
        console.error('Failed to preview calculation:', err);
        setPreviewData(null);
      }
    } finally {
      if (activePreviewRef.current === previewKey) {
        setIsLoadingPreview(false);
      }
    }
  };

  const openCalculateModal = (purchaseId?: string) => {
    let targetPid = purchaseId;
    if (!targetPid && purchases.length > 0) {
      const uncalc = purchases.find((p) => !p.calculated) || purchases[0];
      targetPid = uncalc.id;
    }

    if (targetPid) {
      setSelectedPurchaseId(targetPid);
      fetchMethodOptions(targetPid);
    }
    setIsModalOpen(true);
  };

  const handlePurchaseChange = (newPid: string) => {
    setSelectedPurchaseId(newPid);
    fetchMethodOptions(newPid);
  };

  const handleMethodSelect = (methodName: 'product_factor' | 'activity_based' | 'spend_based') => {
    if (!methodOptions?.methods[methodName]?.eligible) return;
    setSelectedMethod(methodName);
    fetchPreview(selectedPurchaseId, methodName);
  };

  const handleExecuteConfirmed = async () => {
    if (!selectedPurchaseId || !selectedMethod) return;

    setIsExecuting(true);
    try {
      const res = await manufacturerService.executeCalculation({
        purchase_record_id: selectedPurchaseId,
        method: selectedMethod,
      });

      setShowConfirmModal(false);
      setIsModalOpen(false);
      await fetchData();
      // Automatically display verified receipt modal
      setActiveReceipt(res);
    } catch (err: any) {
      alert(err.message || 'Failed to execute calculation');
    } finally {
      setIsExecuting(false);
    }
  };

  const currentPurchase = purchases.find((p) => p.id === selectedPurchaseId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emissions Calculation Engine"
        subtitle="GHG Protocol-aligned Scope 3 emissions estimation comparing Product-Factor, Activity-Based, and Spend-Based methods with cryptographic audit receipts"
      >
        <button
          onClick={() => openCalculateModal()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
        >
          <Calculator className="w-4 h-4" />
          Run / Compare Methods
        </button>
      </PageHeader>

      {error && <ErrorState message={error} onRetry={fetchData} />}

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden p-5 space-y-4">
        {/* Anti-double-counting inventory note */}
        <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-lg flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Calculation Inventory Protection:</strong> Exactly one primary calculation methodology is active in your inventory per purchase record. Alternative estimation runs are preserved as audit receipts without double-counting.
            </span>
          </div>
          <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
            DEMO DATA — SYNTHETIC
          </span>
        </div>

        {/* Filter bar */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700">Filter History:</span>
          </div>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Reporting Months</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <LoadingSpinner text="Loading calculations history..." />
        ) : filteredCalculations.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No emissions calculations completed yet. Click "Run / Compare Methods" to calculate footprints.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Purchase Reference</th>
                  <th className="px-4 py-3 font-semibold">Methodology</th>
                  <th className="px-4 py-3 font-semibold">GHG Protocol</th>
                  <th className="px-4 py-3 font-semibold">Emissions</th>
                  <th className="px-4 py-3 font-semibold">Inventory Status</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCalculations.map((c) => {
                  const pur = purchases.find((p) => p.id === c.purchase_record_id);
                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-50/50 ${c.is_active ? 'bg-emerald-50/30' : ''}`}
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <div>
                          <span>{pur?.product_name || 'Procurement Item'}</span>
                          <span className="block text-[11px] font-mono text-slate-400 font-normal">
                            PO: {c.purchase_record_id} • Month: {c.reporting_month || '—'} • Qty:{' '}
                            {pur ? `${formatNumber(pur.purchased_quantity)} ${pur.quantity_unit}` : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={c.method} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={c.scope3_category} />
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 font-mono">
                        <div>{formatKgCO2e(c.result_value)}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {(Number(c.result_value) / 1000).toFixed(4)} t CO₂e
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {c.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Active in Inventory
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200"
                            title="Historical receipt preserved for audit trail. Superseded by newer or alternative active run."
                          >
                            Superseded Run
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                        {formatDate(c.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2 justify-end">
                          <button
                            onClick={() => openCalculateModal(c.purchase_record_id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
                            title="Compare or change calculation methodology"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                            Methods
                          </button>
                          {!c.is_active && (
                            <button
                              onClick={() => handleSelectActive(c.id)}
                              disabled={isSelecting === c.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 rounded-lg transition-colors border border-indigo-200"
                              title="Set this calculation as active in your Scope 3 inventory"
                            >
                              {isSelecting === c.id ? 'Activating...' : 'Set Active'}
                            </button>
                          )}
                          <button
                            onClick={() => setActiveReceipt(c)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            Receipt
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Method Selection, Preview & Execution Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-scale-up custom-scrollbar">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Multi-Method Calculation Selection & Preview
                  </h3>
                  <p className="text-xs text-slate-500">
                    GHG Protocol Scope 3 Tier 1, Tier 2 & Tier 3 Accounting
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Purchase Selection Box */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Select Purchase Record
                </label>
                <select
                  id="modal-purchase-select"
                  data-testid="modal-purchase-select"
                  value={selectedPurchaseId}
                  onChange={(e) => handlePurchaseChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  {purchases.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} — {p.product_name} ({p.reporting_month}) • Qty: {formatNumber(p.purchased_quantity)} {p.quantity_unit} • Spend: {p.currency} {formatNumber(p.purchase_expenditure)}
                    </option>
                  ))}
                </select>

                {currentPurchase && (
                  <div className="mt-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
                    <div>
                      <span className="font-semibold text-slate-800">Supplier: </span>
                      <span className="font-mono">{currentPurchase.supplier_id}</span>
                      <span className="mx-2">•</span>
                      <span className="font-semibold text-slate-800">Period: </span>
                      <span className="font-mono">{currentPurchase.reporting_month}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800">Currently Active: </span>
                      {currentPurchase.active_method ? (
                        <span className="font-semibold text-emerald-700 uppercase font-mono">
                          {currentPurchase.active_method}
                        </span>
                      ) : (
                        <span className="text-slate-400">None yet</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Method Selection Cards */}
              {isLoadingOptions ? (
                <LoadingSpinner text="Evaluating methodology options and eligibility..." />
              ) : methodOptions ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Methodology Comparison Options
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Target FY: {methodOptions.financial_year}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Method A: Product-Factor */}
                    {(() => {
                      const pcf = methodOptions.methods.product_factor;
                      const isActive = currentPurchase?.active_method === 'product_factor';
                      const isSelected = selectedMethod === 'product_factor';
                      return (
                        <div
                          data-testid="method-card-product_factor"
                          onClick={() => pcf.eligible && handleMethodSelect('product_factor')}
                          className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                            !pcf.eligible
                              ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                              : isSelected
                              ? 'bg-teal-50/70 border-teal-500 shadow-sm ring-2 ring-teal-500/20 cursor-pointer'
                              : 'bg-white border-slate-200 hover:border-teal-300 cursor-pointer'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-slate-800">Product-Factor</span>
                              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-teal-100 text-teal-800">
                                Tier 1
                              </span>
                            </div>

                            {isActive && (
                              <div className="mb-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Active in Inventory
                              </div>
                            )}

                            {pcf.eligible ? (
                              <div className="space-y-2 text-xs">
                                <div>
                                  <span className="text-slate-400 block text-[11px]">Product Factor:</span>
                                  <span className="font-mono font-bold text-slate-800">
                                    {pcf.factor_value} kg CO₂e / {pcf.denominator_unit || 'tonne'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[11px]">Purchased Volume:</span>
                                  <span className="font-mono text-slate-800">
                                    {formatNumber(currentPurchase?.purchased_quantity)} {currentPurchase?.quantity_unit}
                                  </span>
                                </div>
                                <div className="pt-2 border-t border-slate-200/60">
                                  <span className="text-slate-500 block text-[11px]">Calculated Emissions:</span>
                                  <span className="text-base font-extrabold text-teal-900 font-mono">
                                    {formatKgCO2e(pcf.precomputed_emissions_kgco2e)}
                                  </span>
                                  <span className="text-[11px] text-slate-500 block">
                                    ({pcf.precomputed_emissions_tco2e} t CO₂e)
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="p-2 rounded bg-amber-50 text-amber-900 text-xs space-y-1">
                                <span className="font-bold block text-[11px] uppercase text-amber-800">
                                  Ineligible
                                </span>
                                <p className="text-[11px]">{pcf.reason}</p>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 pt-2 border-t border-slate-100">
                            {pcf.eligible ? (
                              <span
                                className={`text-xs font-semibold block text-center py-1.5 rounded-lg ${
                                  isSelected
                                    ? 'bg-teal-600 text-white'
                                    : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                                }`}
                              >
                                {isSelected ? 'Selected' : 'Select Method'}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 text-center block py-1.5">
                                Method Unavailable
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Method B: Activity-Based */}
                    {(() => {
                      const act = methodOptions.methods.activity_based;
                      const isActive = currentPurchase?.active_method === 'activity_based';
                      const isSelected = selectedMethod === 'activity_based';
                      return (
                        <div
                          data-testid="method-card-activity_based"
                          onClick={() => act.eligible && handleMethodSelect('activity_based')}
                          className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                            !act.eligible
                              ? 'bg-slate-50 border-slate-200 opacity-80 cursor-not-allowed'
                              : isSelected
                              ? 'bg-blue-50/70 border-blue-500 shadow-sm ring-2 ring-blue-500/20 cursor-pointer'
                              : 'bg-white border-slate-200 hover:border-blue-300 cursor-pointer'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-slate-800">Activity-Based</span>
                              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                                Tier 2
                              </span>
                            </div>

                            {isActive && (
                              <div className="mb-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Active in Inventory
                              </div>
                            )}

                            {act.eligible ? (
                              <div className="space-y-2 text-xs">
                                <div>
                                  <span className="text-slate-400 block text-[11px]">Facility Energy Emissions:</span>
                                  <span className="font-mono font-bold text-slate-800">
                                    {(Number(act.facility_emissions_kgco2e) / 1000).toLocaleString('en-US', {
                                      maximumFractionDigits: 2,
                                    })}{' '}
                                    t CO₂e
                                  </span>
                                  {(act.electricity_emissions_kgco2e !== undefined || act.diesel_emissions_kgco2e !== undefined) && (
                                    <span className="text-[10px] text-slate-500 block font-mono">
                                      Elec: {formatKgCO2e(act.electricity_emissions_kgco2e)} • Diesel: {formatKgCO2e(act.diesel_emissions_kgco2e)}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-500 block">
                                    CEA Grid: {act.grid_factor_value} • Derived Diesel: {act.diesel_factor_value}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[11px]">Allocation Fraction (α):</span>
                                  <span className="font-mono text-slate-800">
                                    {act.allocation_fraction_pct}% (
                                    {formatNumber(act.purchased_quantity)} / {formatNumber(act.annual_production)} t)
                                  </span>
                                </div>
                                <div className="pt-2 border-t border-slate-200/60">
                                  <span className="text-slate-500 block text-[11px]">Calculated Emissions:</span>
                                  <span className="text-base font-extrabold text-blue-900 font-mono">
                                    {formatKgCO2e(act.precomputed_emissions_kgco2e)}
                                  </span>
                                  <span className="text-[11px] text-slate-500 block">
                                    ({act.precomputed_emissions_tco2e} t CO₂e)
                                  </span>
                                </div>
                                <div className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200/70 rounded p-1.5 leading-snug">
                                  Diesel factor is project-derived (IPCC-based assumptions). Supplier energy inputs are synthetic demonstration data.
                                </div>
                              </div>
                            ) : (
                              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                                <div className="flex items-center gap-1 text-[11px] font-bold uppercase text-amber-800">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Ineligible: {act.reason_code}</span>
                                </div>
                                <p className="text-[11px] leading-relaxed">{act.reason}</p>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 pt-2 border-t border-slate-100">
                            {act.eligible ? (
                              <span
                                className={`text-xs font-semibold block text-center py-1.5 rounded-lg ${
                                  isSelected
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                }`}
                              >
                                {isSelected ? 'Selected' : 'Select Method'}
                              </span>
                            ) : (
                              <span className="text-xs text-amber-700 font-semibold text-center block py-1.5 bg-amber-50/50 rounded">
                                Calculation Blocked
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Method C: Spend-Based */}
                    {(() => {
                      const spd = methodOptions.methods.spend_based;
                      const isActive = currentPurchase?.active_method === 'spend_based';
                      const isSelected = selectedMethod === 'spend_based';
                      return (
                        <div
                          data-testid="method-card-spend_based"
                          onClick={() => spd.eligible && handleMethodSelect('spend_based')}
                          className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                            !spd.eligible
                              ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                              : isSelected
                              ? 'bg-indigo-50/70 border-indigo-500 shadow-sm ring-2 ring-indigo-500/20 cursor-pointer'
                              : 'bg-white border-slate-200 hover:border-indigo-300 cursor-pointer'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-slate-800">Spend-Based</span>
                              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                                Tier 3
                              </span>
                            </div>

                            {isActive && (
                              <div className="mb-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Active in Inventory
                              </div>
                            )}

                            {spd.eligible ? (
                              <div className="space-y-2 text-xs">
                                <div>
                                  <span className="text-slate-400 block text-[11px]">NAICS Sector:</span>
                                  <span className="font-mono font-medium text-slate-800 text-[11px]">
                                    {spd.sector_code} — {spd.sector_name}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[11px]">Expenditure & FX:</span>
                                  <span className="font-mono text-slate-800 text-[11px]">
                                    {formatCurrency(spd.spend_inr, 'INR')} ÷ {spd.fx_rate} = {formatCurrency(spd.spend_usd, 'USD')}
                                  </span>
                                </div>
                                <div className="pt-2 border-t border-slate-200/60">
                                  <span className="text-slate-500 block text-[11px]">
                                    {spd.is_synthetic ? 'Synthetic Demo Factor & Emissions:' : 'Open CEDA Factor & Emissions:'}
                                  </span>
                                  <span className="text-base font-extrabold text-indigo-900 font-mono">
                                    {formatKgCO2e(spd.precomputed_emissions_kgco2e)}
                                  </span>
                                  <span className="text-[11px] text-slate-500 block">
                                    ({spd.precomputed_emissions_tco2e} t CO₂e @ {spd.factor_value_usd} kg/$)
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-600 block">
                                    Source: {spd.source_name || 'Open CEDA'} (v{spd.factor_version || 1})
                                  </span>
                                </div>
                                {spd.is_synthetic ? (
                                  <div className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded p-1.5 font-medium">
                                    {spd.disclosure || 'Synthetic demonstration factor — not an official Open CEDA factor'}
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-indigo-700 italic">
                                    Official Reference • {spd.attribution || 'CEDA by Watershed'} • {spd.license || 'CC BY-SA 4.0'}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="p-2 rounded bg-amber-50 text-amber-900 text-xs space-y-1">
                                <span className="font-bold block text-[11px] uppercase text-amber-800">
                                  Ineligible
                                </span>
                                <p className="text-[11px]">{spd.reason}</p>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 pt-2 border-t border-slate-100">
                            {spd.eligible ? (
                              <span
                                className={`text-xs font-semibold block text-center py-1.5 rounded-lg ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                                }`}
                              >
                                {isSelected ? 'Selected' : 'Select Method'}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 text-center block py-1.5">
                                Method Unavailable
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Preview Section */}
                  {isLoadingPreview ? (
                    <LoadingSpinner text="Computing transactional receipt preview..." />
                  ) : previewData ? (
                    <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                            Calculation Preview (preview_only: true)
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Zero Database Writes
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[11px] mb-1">Accounting Formula:</span>
                          <code className="text-emerald-400 font-mono text-[11px] block bg-slate-950 p-2 rounded">
                            {previewData.formula}
                          </code>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px] mb-1">Expected Active Footprint:</span>
                          <div className="text-xl font-black text-emerald-400 font-mono">
                            {formatKgCO2e(previewData.result_value)}
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {(Number(previewData.result_value) / 1000).toFixed(4)} t CO₂e (Scope 3 {previewData.scope3_category})
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => setShowConfirmModal(true)}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-md"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Execute Calculation & Activate in Inventory
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Close Button */}
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50"
                >
                  Close Modal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onCancel={() => setShowConfirmModal(false)}
        onConfirm={handleExecuteConfirmed}
        title="Execute Scope 3 Calculation"
        message={`Are you sure you want to execute and activate the ${selectedMethod.toUpperCase()} methodology for purchase record ${selectedPurchaseId}? This will atomically update your active Scope 3 inventory and preserve existing runs in audit history.`}
        confirmText={isExecuting ? 'Executing...' : 'Confirm & Execute'}
        isLoading={isExecuting}
        confirmVariant="primary"
      />

      {/* Audit Receipt Modal */}
      <CalculationReceiptModal
        isOpen={!!activeReceipt}
        onClose={() => setActiveReceipt(null)}
        receiptData={activeReceipt}
      />
    </div>
  );
};
