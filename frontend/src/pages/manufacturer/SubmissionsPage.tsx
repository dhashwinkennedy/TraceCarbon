import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { StatusBadge } from '../../components/common/StatusBadge';
import { manufacturerService } from '../../services/manufacturer.service';
import { Submission, Supplier } from '../../types';
import { formatDate } from '../../utils/formatters';
import { FileCheck2, Filter, Eye, Paperclip, HelpCircle } from 'lucide-react';

export const SubmissionsPage: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [subData, supData] = await Promise.all([
        manufacturerService.getSubmissions({
          reporting_month: selectedMonth || undefined,
        }),
        manufacturerService.getSuppliers(),
      ]);
      setSubmissions(subData);
      setSuppliers(supData);

      // Collect available reporting months dynamically from actual submissions
      const months = new Set<string>();
      subData.forEach((s) => s.reporting_month && months.add(s.reporting_month));
      setAvailableMonths((prev) => {
        const merged = new Set([...prev, ...months]);
        return Array.from(merged).sort().reverse();
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load supplier submissions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const filteredSubmissions = submissions.filter((s) => {
    if (selectedSupplier && s.supplier_id !== selectedSupplier) return false;
    if (selectedStatus && s.status !== selectedStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Submissions"
        subtitle="Review primary energy and activity submissions reported by tier-1 upstream suppliers"
      />

      {error && <ErrorState message={error} onRetry={fetchData} />}

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden p-5 space-y-4">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700">Filters:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Months</option>
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
                  {s.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="clarification_requested">Clarification Requested</option>
              <option value="reviewed">Reviewed</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner text="Fetching submissions..." />
        ) : filteredSubmissions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No supplier submissions found matching filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Supplier</th>
                  <th className="px-4 py-3 font-semibold">Month</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Reported Activities</th>
                  <th className="px-4 py-3 font-semibold">Evidence</th>
                  <th className="px-4 py-3 font-semibold">Updated</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubmissions.map((sub) => {
                  const sup = suppliers.find((s) => s.id === sub.supplier_id);
                  const actCount = Object.keys(sub.activities || {}).length;
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {sup?.name || sub.supplier_name || sub.supplier_id}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{sub.reporting_month}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={sub.status} />
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="font-semibold text-slate-800">{actCount}</span> metric{actCount === 1 ? '' : 's'} reported
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <Link
                          to={`/manufacturer/submissions/${sub.id}#evidence`}
                          className="inline-flex items-center gap-1 text-slate-500 hover:text-emerald-700 transition-colors"
                          title="View supporting evidence documents"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>{sub.evidence_count ?? 0}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {formatDate(sub.updated_at || sub.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/manufacturer/submissions/${sub.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Inspect
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
