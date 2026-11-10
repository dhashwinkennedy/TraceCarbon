import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { StatusBadge } from '../../components/common/StatusBadge';
import { auditorService } from '../../services/auditor.service';
import { Submission, AuditorAssignment } from '../../types';
import { formatDate } from '../../utils/formatters';
import { FileCheck2, Filter, Eye, Paperclip, ShieldCheck } from 'lucide-react';

export const AuditorSubmissionsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialSupplierId = searchParams.get('supplier_id') || '';

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [assignments, setAssignments] = useState<AuditorAssignment[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(initialSupplierId);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [subData, assignData] = await Promise.all([
        auditorService.getSubmissions(),
        auditorService.getAssignments(),
      ]);
      setSubmissions(subData);
      setAssignments(assignData);

      // Dynamically collect months from actual audit submissions
      const months = new Set<string>();
      subData.forEach((s) => s.reporting_month && months.add(s.reporting_month));
      setAvailableMonths((prev) => {
        const merged = new Set([...prev, ...months]);
        return Array.from(merged).sort().reverse();
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load submissions for audit');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredSubmissions = submissions.filter((s) => {
    if (selectedMonth && s.reporting_month !== selectedMonth) return false;
    if (selectedSupplier && s.supplier_id !== selectedSupplier) return false;
    if (selectedStatus && s.status !== selectedStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Audit Submissions"
        subtitle="Internal audit review of assigned tier-1 supplier reporting batches (ABC Manufacturing)"
      />

      {error && <ErrorState message={error} onRetry={fetchData} />}

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden p-5 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700">Filter Portfolio:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-purple-500"
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
              className="text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Assigned Suppliers</option>
              {assignments.map((a) => (
                <option key={a.supplier_id} value={a.supplier_id}>
                  {a.supplier_name || a.supplier_id}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs font-medium bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-purple-500"
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
          <LoadingSpinner text="Fetching audit submissions..." />
        ) : filteredSubmissions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No supplier submissions match the current filter selection.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Supplier</th>
                  <th className="px-4 py-3 font-semibold">Month</th>
                  <th className="px-4 py-3 font-semibold">Audit Status</th>
                  <th className="px-4 py-3 font-semibold">Reported Activities</th>
                  <th className="px-4 py-3 font-semibold">Evidence</th>
                  <th className="px-4 py-3 font-semibold">Submitted</th>
                  <th className="px-4 py-3 font-semibold text-right">Audit Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubmissions.map((sub) => {
                  const actCount = Object.keys(sub.activities || {}).length;
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {sub.supplier_name || sub.supplier_id}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{sub.reporting_month}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={sub.status} />
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-800">
                        {actCount} metric{actCount === 1 ? '' : 's'}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <Link
                          to={`/auditor/submissions/${sub.id}#evidence`}
                          className="inline-flex items-center gap-1 text-slate-500 hover:text-purple-700 transition-colors"
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
                          to={`/auditor/submissions/${sub.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Inspect & Verify
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
