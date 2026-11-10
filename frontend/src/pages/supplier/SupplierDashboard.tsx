import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { MetricCard } from '../../components/common/MetricCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { supplierService } from '../../services/supplier.service';
import { Submission, SupplierRequirement, Supplier } from '../../types';
import { formatDate } from '../../utils/formatters';
import {
  FileCheck2,
  FileText,
  UploadCloud,
  HelpCircle,
  Lightbulb,
  ArrowRight,
  Plus,
  Building2,
  Paperclip,
} from 'lucide-react';

export const SupplierDashboard: React.FC = () => {
  const [profile, setProfile] = useState<Supplier | null>(null);
  const [requirements, setRequirements] = useState<SupplierRequirement[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [periodInfo, setPeriodInfo] = useState<{ frequency: string; format: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [profData, reqData, subData, periodData] = await Promise.all([
        supplierService.getProfile(),
        supplierService.getRequirements(),
        supplierService.getSubmissions(),
        supplierService.getReportingPeriods(),
      ]);
      setProfile(profData);
      setRequirements(reqData);
      setSubmissions(subData);
      setPeriodInfo(periodData);
    } catch (err: any) {
      setError(err.message || 'Failed to load supplier dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading) {
    return <LoadingSpinner text="Connecting to supplier portal..." />;
  }

  const pendingClarifications = submissions.reduce(
    (acc, s) => acc + (s.status === 'clarification_requested' ? 1 : 0),
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Supplier Carbon Portal — ${profile?.name || 'Dashboard'}`}
        subtitle={`Partner ID: ${profile?.id} • Country: ${profile?.country || 'India'}`}
      >
        <Link
          to="/supplier/submissions"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Monthly Report
        </Link>
      </PageHeader>

      {error && <ErrorState message={error} onRetry={fetchData} />}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Mandated Metrics"
          value={requirements.length}
          subtitle="Required energy & activity types"
          color="emerald"
          icon={<FileText className="w-6 h-6" />}
        />
        <MetricCard
          title="Monthly Reports"
          value={submissions.length}
          subtitle={`${periodInfo?.frequency || 'Monthly'} cadence (${periodInfo?.format || 'YYYY-MM'})`}
          color="blue"
          icon={<FileCheck2 className="w-6 h-6" />}
        />
        <MetricCard
          title="Clarification Actions"
          value={pendingClarifications}
          subtitle="Pending auditor inquiries"
          color="amber"
          icon={<HelpCircle className="w-6 h-6" />}
        />
        <MetricCard
          title="Decarbonization Engine"
          value="AI Active"
          subtitle="Reduction suggestions enabled"
          color="purple"
          icon={<Lightbulb className="w-6 h-6" />}
        />
      </div>

      {/* Operational Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/supplier/submissions"
          className="group p-5 bg-white rounded-xl border border-slate-200/80 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all flex items-start gap-4"
        >
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 text-sm group-hover:text-emerald-600 transition-colors">
              Monthly Carbon Reports
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              Submit monthly activity data via manual form or spreadsheet upload with saved formats
            </p>
          </div>
        </Link>

        <Link
          to="/supplier/requirements"
          className="group p-5 bg-white rounded-xl border border-slate-200/80 shadow-sm hover:border-blue-500 hover:shadow-md transition-all flex items-start gap-4"
        >
          <div className="p-3 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
              Reporting Requirements
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              Review manufacturer-mandated activity metrics, expected units, and aggregation rules
            </p>
          </div>
        </Link>

        <Link
          to="/supplier/reductions"
          className="group p-5 bg-white rounded-xl border border-slate-200/80 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all flex items-start gap-4"
        >
          <div className="p-3 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 text-sm group-hover:text-purple-600 transition-colors">
              Reduction Suggestions
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              Explore AI-generated facility efficiency and renewable energy initiatives
            </p>
          </div>
        </Link>
      </div>

      {/* Recent Submissions List */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Your Reporting Submissions</h3>
            <p className="text-xs text-slate-500">Monthly activity batches tracked by manufacturer</p>
          </div>
          <Link
            to="/supplier/submissions"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            View All
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {submissions.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">
            No submissions created yet. Start a new monthly report to submit energy data.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Reporting Month</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Reported Activities</th>
                  <th className="px-4 py-3 font-semibold">Evidence Attached</th>
                  <th className="px-4 py-3 font-semibold">Last Updated</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.slice(0, 5).map((sub) => {
                  const actCount = Object.keys(sub.activities || {}).length;
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {sub.reporting_month}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={sub.status} />
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="font-semibold text-slate-800">{actCount}</span> activities
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        <Link
                          to={`/supplier/submissions/${sub.id}#evidence`}
                          className="inline-flex items-center gap-1 hover:text-emerald-700 transition-colors"
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
                          to={`/supplier/submissions/${sub.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                        >
                          Open Report
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
