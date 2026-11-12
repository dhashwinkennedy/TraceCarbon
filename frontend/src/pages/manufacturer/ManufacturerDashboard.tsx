import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { MetricCard } from '../../components/common/MetricCard';
import { SupplierEmissionsBar } from '../../components/charts/SupplierEmissionsBar';
import { MethodBreakdownChart } from '../../components/charts/MethodBreakdownChart';
import { CategoryDoughnut } from '../../components/charts/CategoryDoughnut';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { manufacturerService } from '../../services/manufacturer.service';
import { DashboardSummary } from '../../types';
import { formatKgCO2e, formatNumber, formatMethodEmissions } from '../../utils/formatters';
import {
  CloudFog,
  Package,
  Layers,
  Users,
  FileSpreadsheet,
  Calculator,
  Calendar,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  HelpCircle,
} from 'lucide-react';

export const ManufacturerDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [supplierChartData, setSupplierChartData] = useState<
    Array<{ supplier_id: string; supplier_name: string; emissions_kgco2e: number }>
  >([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load distinct reporting months dynamically from actual backend records
  useEffect(() => {
    const loadMonths = async () => {
      try {
        const [calcs, purchases, subs] = await Promise.all([
          manufacturerService.getCalculations(),
          manufacturerService.getPurchases(),
          manufacturerService.getSubmissions(),
        ]);
        const months = new Set<string>();
        calcs.forEach((c: any) => c.reporting_month && months.add(c.reporting_month));
        purchases.forEach((p: any) => p.reporting_month && months.add(p.reporting_month));
        subs.forEach((s: any) => s.reporting_month && months.add(s.reporting_month));
        setAvailableMonths(Array.from(months).sort().reverse());
      } catch (err) {
        console.warn('Could not load dynamic reporting months for dashboard:', err);
      }
    };
    loadMonths();
  }, []);

  const fetchDashboard = async (month?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const [summary, supplierReport] = await Promise.all([
        manufacturerService.getDashboard(month || undefined),
        manufacturerService.getSuppliersReport({ reporting_month: month || undefined }),
      ]);
      setData(summary);

      // Parse supplier report rows for chart
      const chartItems = (supplierReport || []).map((item: any) => ({
        supplier_id: item.supplier?.id || item.supplier_id || item.id || '',
        supplier_name: item.supplier?.name || item.supplier_name || item.name || 'Supplier',
        emissions_kgco2e: Number(item.emissions_kgco2e || 0),
      }));
      setSupplierChartData(chartItems);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard(selectedMonth);
  }, [selectedMonth]);

  const cat1Emissions = data?.emissions_kgco2e?.['Category 1'] || 0;
  const cat2Emissions = data?.emissions_kgco2e?.['Category 2'] || 0;
  const totalEmissions = data?.combined_kgco2e ?? (cat1Emissions + cat2Emissions);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emissions Intelligence Dashboard"
        subtitle="Scope 3 Category 1 & Category 2 supply chain carbon accounting"
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">All Reporting Months</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </PageHeader>

      {error && <ErrorState message={error} onRetry={() => fetchDashboard(selectedMonth)} />}

      {isLoading ? (
        <LoadingSpinner text="Aggregating supply chain emissions from live backend..." />
      ) : data ? (
        <>
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Scope 3 Emissions"
              value={formatKgCO2e(totalEmissions)}
              subtitle="Cat 1 + Cat 2 across verified runs"
              color="emerald"
              icon={<CloudFog className="w-6 h-6" />}
            />
            <MetricCard
              title="Category 1: Purchased Goods"
              value={formatKgCO2e(cat1Emissions)}
              subtitle="Upstream raw materials & goods"
              color="teal"
              icon={<Package className="w-6 h-6" />}
            />
            <MetricCard
              title="Category 2: Capital Goods"
              value={formatKgCO2e(cat2Emissions)}
              subtitle={
                cat2Emissions === 0
                  ? 'No calculated Category 2 emissions available for this period'
                  : 'Machinery & capitalized assets'
              }
              color="indigo"
              icon={<Layers className="w-6 h-6" />}
            />
            <MetricCard
              title="Active Suppliers Tracked"
              value={formatNumber(data.supplier_count, 0)}
              subtitle={`${data.submitted_reports} submitted reports`}
              color="blue"
              icon={<Users className="w-6 h-6" />}
            />
          </div>

          {/* Operational Submission Pipeline Status */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="flex items-center gap-3 p-3 bg-emerald-50/50 rounded-lg border border-emerald-100/60">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="text-slate-500 block">Submitted Reports</span>
                <span className="text-base font-bold text-slate-800">
                  {formatNumber(data.submitted_reports, 0)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-amber-50/50 rounded-lg border border-amber-100/60">
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="text-slate-500 block">Draft / In Progress</span>
                <span className="text-base font-bold text-slate-800">
                  {formatNumber(data.pending_reports, 0)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-purple-50/50 rounded-lg border border-purple-100/60">
              <HelpCircle className="w-5 h-5 text-purple-600 shrink-0" />
              <div>
                <span className="text-slate-500 block">Awaiting Clarification</span>
                <span className="text-base font-bold text-slate-800">
                  {formatNumber(data.awaiting_clarification, 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Unrounded Sum Precision Footnote */}
          <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
            <span>
              * Total Scope 3 is computed from unrounded sums ({formatKgCO2e(totalEmissions)}). Category 1 ({formatKgCO2e(cat1Emissions)}) & Category 2 ({formatKgCO2e(cat2Emissions)}) figures reflect independent display rounding.
            </span>
          </div>

          {/* Methodology & Category Charts driven by actual calculation results */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">Emissions by Calculation Method</h3>
                    <p className="text-xs text-slate-500">Live active calculations across Product-Factor, Activity-Based & Spend-Based tiers</p>
                  </div>
                  <Link
                    to="/manufacturer/calculations"
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    Calculations
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <MethodBreakdownChart
                  dataPoints={
                    data.method_breakdown
                      ? [
                          { method: 'product_factor', emissions_kgco2e: data.method_breakdown.product_factor || 0 },
                          { method: 'activity_based', emissions_kgco2e: data.method_breakdown.activity_based || 0 },
                          { method: 'spend_based', emissions_kgco2e: data.method_breakdown.spend_based || 0 },
                        ]
                      : []
                  }
                />
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex flex-wrap justify-between gap-2">
                <span>Aggregated from active calculation runs</span>
                <span className="font-mono">Official public factors + synthetic demo inputs</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">Scope 3 Category Share</h3>
                    <p className="text-xs text-slate-500">Purchased Goods & Services (Cat 1) vs Capital Goods (Cat 2)</p>
                  </div>
                  <Link
                    to="/manufacturer/reports"
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    Reports
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <CategoryDoughnut category1={cat1Emissions} category2={cat2Emissions} />
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex flex-wrap justify-between gap-2">
                <span>Calculated emissions only (demo boundary)</span>
                <span className="font-mono">Unverified supplier demo records</span>
              </div>
            </div>
          </div>

          {/* Supplier Breakdown Bar - Full Width */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">Emissions by Supplier</h3>
                  <p className="text-xs text-slate-500">Calculated footprint per supplier partner</p>
                </div>
                <Link
                  to="/manufacturer/suppliers"
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  Manage
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <SupplierEmissionsBar suppliers={supplierChartData} />
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
              <span>{supplierChartData.length} suppliers reporting</span>
              <span>Sorted by impact</span>
            </div>
          </div>

          {/* Methodology Breakdown from backend */}
          {data.method_breakdown && (
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">Calculation Method Distribution</h3>
                    <p className="text-xs text-slate-500">Active Scope 3 inventory categorized by GHG Protocol methodology</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-amber-50 text-amber-800 border border-amber-200">
                    Synthetic Demonstration Data
                  </span>
                  <span className="text-xs text-slate-400 font-mono hidden md:inline">One active run / purchase</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Product-Factor (Tier 1) */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-700">Product-Factor (Tier 1)</span>
                      <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                        Synthetic PCF
                      </span>
                    </div>
                    <div className={`text-xl font-black ${(data.method_breakdown.product_factor || 0) > 0 ? 'text-slate-900' : 'text-slate-400 font-medium'}`}>
                      {formatMethodEmissions(data.method_breakdown.product_factor)}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Synthetic demonstration PCF factor • calculated emissions</p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 text-[11px] text-slate-500 flex justify-between font-mono">
                    <span>Cat 1: {formatKgCO2e(data.method_breakdown_by_category?.product_factor?.['Category 1'] ?? (data.method_breakdown.product_factor ? cat1Emissions : 0))}</span>
                    <span>Cat 2: {formatKgCO2e(data.method_breakdown_by_category?.product_factor?.['Category 2'] ?? (data.method_breakdown.product_factor ? cat2Emissions : 0))}</span>
                  </div>
                </div>

                {/* Activity-Based (Tier 2) */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-700">Activity-Based (Tier 2)</span>
                      <span className="text-[10px] uppercase font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                        CEA + Derived Diesel
                      </span>
                    </div>
                    <div className={`text-xl font-black ${(data.method_breakdown.activity_based || 0) > 0 ? 'text-slate-900' : 'text-slate-400 font-medium'}`}>
                      {formatMethodEmissions(data.method_breakdown.activity_based)}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Official CEA grid + project-derived diesel factor on synthetic activity</p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 text-[11px] text-slate-500 flex justify-between font-mono">
                    <span>Cat 1: {formatKgCO2e(data.method_breakdown_by_category?.activity_based?.['Category 1'] || 0)}</span>
                    <span>Cat 2: {formatKgCO2e(data.method_breakdown_by_category?.activity_based?.['Category 2'] || 0)}</span>
                  </div>
                </div>

                {/* Spend-Based (Tier 3) */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-700">Spend-Based (Tier 3)</span>
                      <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        Official Open CEDA
                      </span>
                    </div>
                    <div className={`text-xl font-black ${(data.method_breakdown.spend_based || 0) > 0 ? 'text-slate-900' : 'text-slate-400 font-medium'}`}>
                      {formatMethodEmissions(data.method_breakdown.spend_based)}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Official Open CEDA EEIO factors (or flagged synthetic demo) • calculated</p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 text-[11px] text-slate-500 flex justify-between font-mono">
                    <span>Cat 1: {formatKgCO2e(data.method_breakdown_by_category?.spend_based?.['Category 1'] || 0)}</span>
                    <span>Cat 2: {formatKgCO2e(data.method_breakdown_by_category?.spend_based?.['Category 2'] || 0)}</span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 italic">
                * Note: Historical and alternative estimation receipts do not contribute to inventory totals. All metrics reflect currently active database runs.
              </p>
            </div>
          )}

          {/* Operational Shortcuts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/manufacturer/purchases"
              className="group p-5 bg-white rounded-xl border border-slate-200/80 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all flex items-start gap-4"
            >
              <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 text-sm group-hover:text-emerald-600 transition-colors">
                  Ingest Purchase Records
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  Download template, upload monthly spend and product volumes
                </p>
              </div>
            </Link>

            <Link
              to="/manufacturer/submissions"
              className="group p-5 bg-white rounded-xl border border-slate-200/80 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all flex items-start gap-4"
            >
              <div className="p-3 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                  Review Supplier Reports
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  Inspect incoming primary energy, fuel, and material activity data
                </p>
              </div>
            </Link>

            <Link
              to="/manufacturer/calculations"
              className="group p-5 bg-white rounded-xl border border-slate-200/80 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all flex items-start gap-4"
            >
              <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                  Run Emissions Calculations
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  Apply Product-Factor, Activity-Based, or Spend-Based methodology
                </p>
              </div>
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
};
