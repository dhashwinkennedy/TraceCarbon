import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { MetricCard } from '../../components/common/MetricCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { auditorService } from '../../services/auditor.service';
import { AuditorAssignment, Submission } from '../../types';
import { formatDate } from '../../utils/formatters';
import {
  ShieldCheck,
  FileCheck2,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Eye,
  CheckCircle2,
  Paperclip,
} from 'lucide-react';

export const AuditorDashboard: React.FC = () => {
  const [assignments, setAssignments] = useState<AuditorAssignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [assignData, subData] = await Promise.all([
        auditorService.getAssignments(),
        auditorService.getSubmissions(),
      ]);
      setAssignments(assignData);
      setSubmissions(subData);
    } catch (err: any) {
      setError(err.message || 'Failed to load auditor desk');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading) {
    return <LoadingSpinner text="Connecting to auditor desk..." />;
  }

  const awaitingReview = submissions.filter((s) => s.status === 'submitted');
  const clarificationReq = submissions.filter((s) => s.status === 'clarification_requested');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditor Verification Desk"
        subtitle="Internal ABC Manufacturing employee verification, evidence cross-referencing, and quality assurance"
      />

      {error && <ErrorState message={error} onRetry={fetchData} />}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Assigned Suppliers"
          value={assignments.length}
          subtitle="Portfolio audit assignments"
          color="purple"
          icon={<ShieldCheck className="w-6 h-6" />}
        />
        <MetricCard
          title="Submissions Ready for Audit"
          value={awaitingReview.length}
          subtitle="Submitted monthly reports"
          color="blue"
          icon={<FileCheck2 className="w-6 h-6" />}
        />
        <MetricCard
          title="Open Clarifications"
          value={clarificationReq.length}
          subtitle="Awaiting supplier responses"
          color="amber"
          icon={<HelpCircle className="w-6 h-6" />}
        />
        <MetricCard
          title="AI Verification Scanner"
          value="Online"
          subtitle="PyMuPDF cross-referencing ready"
          color="emerald"
          icon={<Sparkles className="w-6 h-6" />}
        />
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">
              Submissions in Your Audit Portfolio
            </h3>
            <p className="text-xs text-slate-500">
              Assigned supplier monthly batches available for review
            </p>
          </div>
          <Link
            to="/auditor/submissions"
            className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1"
          >
            View All
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {submissions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No submissions in your assigned audit portfolio yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Supplier</th>
                  <th className="px-4 py-3 font-semibold">Month</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Activities</th>
                  <th className="px-4 py-3 font-semibold">Evidence</th>
                  <th className="px-4 py-3 font-semibold">Submitted</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.slice(0, 6).map((sub) => {
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
                        {actCount} metrics
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        <Link
                          to={`/auditor/submissions/${sub.id}#evidence`}
                          className="inline-flex items-center gap-1 hover:text-purple-700 transition-colors"
                          title="View supporting evidence documents"
                        >
                          <Paperclip className="w-3 h-3 text-slate-400" />
                          <span>{sub.evidence_count ?? 0} {(sub.evidence_count ?? 0) === 1 ? 'file' : 'files'}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {formatDate(sub.updated_at || sub.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/auditor/submissions/${sub.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Review & Verify
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
