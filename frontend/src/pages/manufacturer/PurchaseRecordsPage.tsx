import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { manufacturerService } from '../../services/manufacturer.service';
import { PurchaseRecord, PurchaseUploadSummary, Supplier } from '../../types';
import { formatNumber, formatCurrency } from '../../utils/formatters';
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Calculator,
  Filter,
} from 'lucide-react';

export const PurchaseRecordsPage: React.FC = () => {
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload & validation state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<PurchaseUploadSummary | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [purData, supData] = await Promise.all([
        manufacturerService.getPurchases({
          reporting_month: selectedMonth || undefined,
          supplier_id: selectedSupplier || undefined,
        }),
        manufacturerService.getSuppliers(),
      ]);
      setPurchases(purData);
      setSuppliers(supData);
    } catch (err: any) {
      setError(err.message || 'Failed to load purchase records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedSupplier]);

  // Extract distinct reporting months from purchases dynamically
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    purchases.forEach((p) => {
      if (p.reporting_month) months.add(p.reporting_month);
    });
    return Array.from(months).sort();
  }, [purchases]);

  const handleDownloadTemplate = async () => {
    try {
      const blob = await manufacturerService.downloadPurchaseTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tracecarbon_purchase_records.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Failed to download template');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadSummary(null);
    setConfirmSuccess(null);
    setError(null);

    try {
      const res = await manufacturerService.uploadPurchases(file);
      setUploadSummary(res);
    } catch (err: any) {
      setError(err.message || 'Failed to upload and validate spreadsheet');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!uploadSummary) return;
    setIsConfirming(true);
    try {
      const res = await manufacturerService.confirmPurchases(uploadSummary.id);
      const count = res.purchase_records?.length || uploadSummary.valid_rows?.length || 0;
      setConfirmSuccess(`Successfully ingested ${count} purchase records into system!`);
      setUploadSummary(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to confirm purchase ingestion');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Records & Procurement Ledger"
        subtitle="Fixed-format monthly procurement ledger ingestion and verification"
      >
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
          >
            <Download className="w-4 h-4 text-slate-600" />
            Download Excel Template
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {isUploading ? 'Validating...' : 'Upload Purchase Ledger (.xlsx)'}
          </button>
        </div>
      </PageHeader>

      {confirmSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{confirmSuccess}</span>
          </div>
          <button
            onClick={() => setConfirmSuccess(null)}
            className="text-emerald-700 text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && <ErrorState message={error} onRetry={fetchData} />}

      {/* Validation Preview Card */}
      {uploadSummary && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-md p-6 space-y-5 animate-scale-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Pre-Ingestion Validation Summary
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  File: {uploadSummary.filename} • SHA256: {uploadSummary.sha256?.substring(0, 16)}...
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setUploadSummary(null)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Discard
              </button>
              {uploadSummary.valid_rows?.length > 0 && !uploadSummary.confirmed && (
                <button
                  onClick={handleConfirmImport}
                  disabled={isConfirming}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isConfirming ? 'Ingesting...' : `Confirm & Ingest (${uploadSummary.valid_rows.length} Valid Rows)`}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60 text-center">
              <span className="text-xs text-slate-500 font-medium block">Total Scanned</span>
              <span className="text-xl font-bold text-slate-800">{uploadSummary.total_rows}</span>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-center">
              <span className="text-xs text-emerald-700 font-medium block">Valid Rows</span>
              <span className="text-xl font-bold text-emerald-700">{uploadSummary.valid_rows?.length || 0}</span>
            </div>
            <div className="p-3 bg-rose-50 rounded-lg border border-rose-100 text-center">
              <span className="text-xs text-rose-700 font-medium block">Invalid Rows</span>
              <span className="text-xl font-bold text-rose-700">{uploadSummary.invalid_rows?.length || 0}</span>
            </div>
          </div>

          {/* Errors list if any */}
          {uploadSummary.invalid_rows && uploadSummary.invalid_rows.length > 0 && (
            <div className="p-4 bg-rose-50/60 rounded-lg border border-rose-200/80 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Row-Level Verification Warnings ({uploadSummary.invalid_rows.length}):
              </div>
              <ul className="text-xs text-rose-700 list-disc list-inside space-y-1 max-h-40 overflow-y-auto">
                {uploadSummary.invalid_rows.map((err, i) => (
                  <li key={i}>
                    <span className="font-semibold">Row {err.row}:</span> {Array.isArray(err.errors) ? err.errors.join('; ') : String(err.errors)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Filter and Records Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700">Filter Ledger:</span>
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
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.supplier_code || s.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner text="Fetching purchase records..." />
        ) : purchases.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No purchase records found matching filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Supplier</th>
                  <th className="px-4 py-3 font-semibold">Product Name / ID</th>
                  <th className="px-4 py-3 font-semibold">Month</th>
                  <th className="px-4 py-3 font-semibold">Purchased Qty</th>
                  <th className="px-4 py-3 font-semibold">Expenditure</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchases.map((p) => {
                  const sup = suppliers.find((s) => s.id === p.supplier_id || s.supplier_code === p.supplier_id);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {sup?.name || p.supplier_id}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {p.product_name || p.product_id}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-slate-800">
                        {p.reporting_month}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold">
                        {formatNumber(p.purchased_quantity)} {p.quantity_unit}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {formatCurrency(p.purchase_expenditure, p.currency)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to="/manufacturer/calculations"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                        >
                          <Calculator className="w-3 h-3" />
                          Calculate
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
