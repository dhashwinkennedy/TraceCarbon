import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { StatusBadge } from '../../components/common/StatusBadge';
import { CalculationReceiptModal } from './CalculationReceiptModal';
import { manufacturerService } from '../../services/manufacturer.service';
import { EmissionsReportRow, SupplierReportRow } from '../../types';
import { formatKgCO2e, formatNumber, formatDate } from '../../utils/formatters';
import {
  Download,
  Filter,
  FileSpreadsheet,
  Users,
  ShieldCheck,
  Receipt,
  Info,
  AlertCircle,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'emissions' | 'suppliers'>('emissions');
  const [emissionsData, setEmissionsData] = useState<EmissionsReportRow[]>([]);
  const [suppliersData, setSuppliersData] = useState<SupplierReportRow[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Receipt Modal State
  const [activeReceipt, setActiveReceipt] = useState<Record<string, any> | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (activeTab === 'emissions') {
        const data = await manufacturerService.getEmissionsReport({
          reporting_month: selectedMonth || undefined,
        });
        setEmissionsData(data);
      } else {
        const data = await manufacturerService.getSuppliersReport({
          reporting_month: selectedMonth || undefined,
        });
        setSuppliersData(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load report data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, selectedMonth]);

  // Extract distinct reporting months from data dynamically
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    emissionsData.forEach((r) => {
      if (r.reporting_month) months.add(r.reporting_month);
    });
    return Array.from(months).sort().reverse();
  }, [emissionsData]);

  const filteredEmissions = useMemo(() => {
    return emissionsData.filter((r) => {
      if (selectedMonth && r.reporting_month !== selectedMonth) return false;
      if (selectedMethod && r.method !== selectedMethod) return false;
      if (activeOnly && !r.is_active) return false;
      return true;
    });
  }, [emissionsData, selectedMonth, selectedMethod, activeOnly]);

  const exportCSV = () => {
    if (activeTab === 'emissions') {
      const headers = [
        'Calculation ID',
        'Purchase Record ID',
        'Supplier ID',
        'Product ID',
        'Reporting Month',
        'Financial Year',
        'Methodology',
        'GHG Scope 3 Category',
        'Emissions Result (kg CO2e)',
        'Emissions Result (t CO2e)',
        'Factor ID',
        'Factor Source',
        'Method Provenance Details',
        'Currency / FX Rate',
        'NAICS Sector',
        'Data Attribution',
        'License',
        'Boundary Disclaimer',
        'Inventory Status',
        'Calculation Timestamp',
      ];

      const rows = filteredEmissions.map((r) => {
        const cid = r.calculation_id || (r as any).id;
        const meta = r.factor_metadata || {};
        const comps = r.components || [];
        const isSpend = r.method === 'spend_based';
        const isAct = r.method === 'activity_based';

        let methodDetails = 'Standard product carbon footprint';
        let currencyFx = 'INR';
        let naicsSector = '—';
        let attribution = 'AxiomX Catalog';
        let license = 'Demonstration Data';

        if (isSpend) {
          const spendComp = comps[0] || {};
          const fx = spendComp.fx_rate || meta.fx_rate || 78.186062;
          currencyFx = `INR (FX: ${fx} INR/USD)`;
          naicsSector = `${spendComp.sector_code || meta.sector_code || ''} - ${spendComp.sector_name || meta.sector_name || ''}`;
          methodDetails = `EEIO Spend Conversion: INR to USD at ${fx} rate. Price Basis: ${meta.price_basis || 'Producer Price'}`;
          attribution = meta.attribution || 'CEDA by Watershed';
          license = meta.license || 'CC BY-SA 4.0';
        } else if (isAct) {
          const alloc = comps.find((c) => c.activity_id === 'allocation') || {};
          const alphaPct = alloc.allocation_fraction ? (alloc.allocation_fraction * 100).toFixed(4) : '—';
          methodDetails = `Supplier Energy Allocation: alpha=${alphaPct}%, output=${alloc.annual_production || ''}t, purchased=${alloc.purchased_qty || ''}t`;
          attribution = 'Central Electricity Authority (CEA) / IPCC';
          license = 'Public Baseline User Guide';
        }

        const tco2e = (Number(r.result_value) / 1000).toFixed(4);
        const disclaimer = 'Demonstration carbon accounting inventory. Not third-party audited or certified.';

        return [
          `"${cid}"`,
          `"${r.purchase_record_id}"`,
          `"${r.supplier_id}"`,
          `"${r.product_id}"`,
          `"${r.reporting_month}"`,
          `"${r.financial_year || ''}"`,
          `"${r.method}"`,
          `"${r.scope3_category}"`,
          Number(r.result_value).toFixed(2),
          tco2e,
          `"${r.factor_id}"`,
          `"${meta.source_name || r.factor_id}"`,
          `"${methodDetails}"`,
          `"${currencyFx}"`,
          `"${naicsSector}"`,
          `"${attribution}"`,
          `"${license}"`,
          `"${disclaimer}"`,
          `"${r.is_active ? 'Active' : 'Superseded'}"`,
          `"${r.created_at}"`,
        ].join(',');
      });

      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TraceCarbon_Emissions_Inventory_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      const headers = ['Supplier ID', 'Supplier Name', 'Supplier Code', 'Contact Email', 'Active Status'];
      const rows = suppliersData.map(
        (s) =>
          `"${s.supplier_id || (s as any).id}","${s.supplier_name || (s as any).name}","${s.supplier_code || ''}","${s.contact_email}",${s.active !== false}`
      );
      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TraceCarbon_Suppliers_Directory_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emissions & Supplier Reports"
        subtitle="Export comprehensive GHG Protocol Scope 3 inventory reports with transparent factor provenance and methodology attribution"
      >
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Export Report (CSV)
        </button>
      </PageHeader>

      {/* Synthetic Data & Boundary Disclaimer */}
      <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start gap-3 text-xs text-amber-900">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block">Methodology & Demonstration Boundary Notice:</span>
          <span>
            Emissions inventories are generated from synthetic supplier activity models and public reference factors (CEA, IPCC, Open CEDA by Watershed under CC BY-SA 4.0). Results are intended for internal carbon accounting demonstrations and are not third-party certified or audited.
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('emissions')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-semibold transition-colors ${
            activeTab === 'emissions'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Emissions Inventory Report
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-semibold transition-colors ${
            activeTab === 'suppliers'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Supplier Directory Report
        </button>
      </div>

      {error && <ErrorState message={error} onRetry={fetchData} />}

      {activeTab === 'emissions' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden p-5 space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-700">Filter Inventory:</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
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

              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Methodologies</option>
                <option value="product_factor">Product-Factor (Tier 1)</option>
                <option value="activity_based">Activity-Based (Tier 2)</option>
                <option value="spend_based">Spend-Based (Tier 3)</option>
              </select>

              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={activeOnly}
                  onChange={(e) => setActiveOnly(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                Active Only
              </label>
            </div>
          </div>

          {isLoading ? (
            <LoadingSpinner text="Generating emissions inventory..." />
          ) : filteredEmissions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No emissions records match the selected report criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Purchase & Supplier</th>
                    <th className="px-4 py-3 font-semibold">Period</th>
                    <th className="px-4 py-3 font-semibold">Methodology</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Provenance & Attribution</th>
                    <th className="px-4 py-3 font-semibold">Inventory Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Result Footprint</th>
                    <th className="px-4 py-3 font-semibold text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmissions.map((row) => {
                    const cid = row.calculation_id || (row as any).id;
                    const meta = row.factor_metadata || {};
                    const isSpend = row.method === 'spend_based';
                    const isAct = row.method === 'activity_based';

                    return (
                      <tr
                        key={cid}
                        className={`hover:bg-slate-50/50 ${row.is_active ? 'bg-emerald-50/20' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{row.purchase_record_id}</div>
                          <div className="text-[11px] font-mono text-slate-400">
                            Supplier: {row.supplier_id} • Product: {row.product_id}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs font-bold text-slate-800">
                          {row.reporting_month}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={row.method} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={row.scope3_category} />
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {isSpend && (
                            <div>
                              <span className="font-semibold text-indigo-900 block">Open CEDA EEIO</span>
                              <span className="text-[11px] text-slate-500 block">CEDA by Watershed • CC BY-SA 4.0</span>
                            </div>
                          )}
                          {isAct && (
                            <div>
                              <span className="font-semibold text-blue-900 block">CEA / IPCC Allocation</span>
                              <span className="text-[11px] text-slate-500 block">Synthetic demonstration activity</span>
                            </div>
                          )}
                          {!isSpend && !isAct && (
                            <div>
                              <span className="font-semibold text-teal-900 block">PCF Catalog Factor</span>
                              <span className="text-[11px] text-slate-500 block">{meta.source_name || row.factor_id}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {row.is_active ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Active in Inventory
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                              Superseded Run
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 text-right">
                          <div>{formatKgCO2e(row.result_value)}</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {(Number(row.result_value) / 1000).toFixed(4)} t CO₂e
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setActiveReceipt(row as any)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                            title="Inspect cryptographically verified receipt"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            Receipt
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'suppliers' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden p-5">
          {isLoading ? (
            <LoadingSpinner text="Generating supplier directory..." />
          ) : suppliersData.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No supplier directory records available.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Supplier Name</th>
                    <th className="px-4 py-3 font-semibold">Supplier Code</th>
                    <th className="px-4 py-3 font-semibold">Contact Email</th>
                    <th className="px-4 py-3 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {suppliersData.map((s) => (
                    <tr key={s.supplier_id || (s as any).id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {s.supplier_name || (s as any).name}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {s.supplier_code || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{s.contact_email}</td>
                      <td className="px-4 py-3 text-right">
                        {s.active !== false ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600">
                            Inactive
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Audit Receipt Modal */}
      <CalculationReceiptModal
        isOpen={!!activeReceipt}
        onClose={() => setActiveReceipt(null)}
        receiptData={activeReceipt}
      />
    </div>
  );
};
