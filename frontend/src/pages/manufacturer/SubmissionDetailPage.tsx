import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { StatusBadge } from '../../components/common/StatusBadge';
import { manufacturerService } from '../../services/manufacturer.service';
import { Submission, ActivityLibraryItem, ActivityValue, EvidenceDocument } from '../../types';
import { formatNumber, formatBytes, formatDate } from '../../utils/formatters';
import {
  ArrowLeft,
  FileCheck2,
  Paperclip,
  HelpCircle,
  Activity,
  Layers,
} from 'lucide-react';

export const SubmissionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [library, setLibrary] = useState<ActivityLibraryItem[]>([]);
  const [evidenceList, setEvidenceList] = useState<EvidenceDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [subData, libData, evData] = await Promise.all([
        manufacturerService.getSubmission(id),
        manufacturerService.getActivityLibrary(),
        manufacturerService.getSubmissionEvidence(id),
      ]);
      setSubmission(subData);
      setLibrary(libData);
      setEvidenceList(evData);
    } catch (err: any) {
      setError(err.message || 'Failed to load submission details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (isLoading) {
    return <LoadingSpinner text="Loading submission data..." />;
  }

  if (error || !submission) {
    return <ErrorState message={error || 'Submission not found'} onRetry={fetchData} />;
  }

  const activityList: ActivityValue[] = Array.isArray(submission.activities)
    ? submission.activities
    : Object.entries(submission.activities || {}).map(([aid, act]: [string, any]) => ({
        activity_id: aid,
        ...(typeof act === 'object' ? act : { value: act, unit: '' }),
      }));
  const clarificationsList = (submission as any).clarifications || [];

  return (
    <div className="space-y-6">
      <Link
        to="/manufacturer/submissions"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Submissions
      </Link>

      <PageHeader
        title={`Submission: ${submission.supplier_name || submission.supplier_id}`}
        subtitle={`Period: ${submission.reporting_month} • ID: ${submission.id}`}
      >
        <StatusBadge status={submission.status} />
      </PageHeader>

      {/* Reported Activities Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Activity className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-slate-900 text-sm">
            Primary Activity Data ({activityList.length} metrics)
          </h3>
        </div>

        {activityList.length === 0 ? (
          <p className="text-sm text-slate-400 py-4">No activities reported yet in this draft.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Activity Metric</th>
                  <th className="px-4 py-3 font-semibold">Reported Quantity</th>
                  <th className="px-4 py-3 font-semibold">Normalized Value (Scope 3 Engine)</th>
                  <th className="px-4 py-3 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activityList.map((act) => {
                  const key = act.activity_id;
                  const libItem = library.find((l) => l.id === key);
                  return (
                    <tr key={key} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <div>
                          <span>{libItem?.name || key}</span>
                          <span className="block text-[11px] font-mono text-slate-400 font-normal">
                            {key}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-slate-800">
                        {formatNumber(act.value)} {act.unit}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-emerald-700 bg-emerald-50/30">
                        {act.normalised_value !== undefined ? (
                          <span className="font-semibold">
                            {formatNumber(act.normalised_value)} {act.normalised_unit || act.unit}
                          </span>
                        ) : (
                          `${formatNumber(act.value)} ${act.unit}`
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {act.notes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Uploaded Evidence Documents */}
        <div id="evidence" className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Paperclip className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-900 text-sm">
              Supporting Evidence ({evidenceList.length})
            </h3>
          </div>

          {evidenceList.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">No audit evidence files attached.</p>
          ) : (
            <div className="space-y-2">
              {evidenceList.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50 text-xs"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Paperclip className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div className="truncate">
                      <span className="font-semibold text-slate-800 block truncate">
                        {ev.filename}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {formatBytes(ev.size)} • {formatDate(ev.uploaded_at)}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded border">
                    {ev.filename.split('.').pop()?.toUpperCase() || 'FILE'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clarification History */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <HelpCircle className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-slate-900 text-sm">
              Auditor Clarification Trail ({clarificationsList.length})
            </h3>
          </div>

          {clarificationsList.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">No auditor clarifications raised.</p>
          ) : (
            <div className="space-y-3">
              {clarificationsList.map((cl: any) => (
                <div key={cl.id} className="p-3.5 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Question</span>
                    <StatusBadge status={cl.status} size="sm" />
                  </div>
                  <p className="text-xs text-slate-800 bg-slate-50 p-2.5 rounded-md">
                    {cl.question}
                  </p>
                  {cl.response ? (
                    <div className="pt-1">
                      <span className="text-[11px] font-semibold text-emerald-700 block mb-1">
                        Supplier Response:
                      </span>
                      <p className="text-xs text-slate-700 bg-emerald-50/60 border border-emerald-100 p-2.5 rounded-md">
                        {cl.response}
                      </p>
                    </div>
                  ) : (
                    <span className="text-[11px] text-amber-600 italic">
                      Awaiting supplier response...
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
