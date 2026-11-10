import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { StatusBadge } from '../../components/common/StatusBadge';
import { supplierService } from '../../services/supplier.service';
import { Submission, Clarification } from '../../types';
import { formatDate } from '../../utils/formatters';
import { HelpCircle, Send, CheckCircle2, MessageSquare, AlertCircle } from 'lucide-react';

interface ClarificationItem extends Clarification {
  submission_month?: string;
}

export const ClarificationsPage: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [clarifications, setClarifications] = useState<ClarificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Response form state
  const [responseTexts, setResponseTexts] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchClarifications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const subs = await supplierService.getSubmissions();
      setSubmissions(subs);

      // Collect clarifications across submissions
      const allClarifications: ClarificationItem[] = [];
      await Promise.all(
        subs.map(async (sub) => {
          try {
            const list = await supplierService.getClarifications(sub.id);
            list.forEach((c) => {
              allClarifications.push({
                ...c,
                submission_month: sub.reporting_month,
              });
            });
          } catch {
            // No clarifications or failed
          }
        })
      );

      setClarifications(allClarifications);
    } catch (err: any) {
      setError(err.message || 'Failed to load clarifications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClarifications();
  }, []);

  const handleSendResponse = async (submissionId: string, clarificationId: string) => {
    const text = responseTexts[clarificationId];
    if (!text) {
      alert('Please enter a response before submitting.');
      return;
    }

    setSubmittingId(clarificationId);
    setSuccess(null);
    try {
      await supplierService.respondToClarification(submissionId, clarificationId, text);
      setSuccess('Response submitted to auditor successfully');
      setResponseTexts({ ...responseTexts, [clarificationId]: '' });
      await fetchClarifications();
    } catch (err: any) {
      alert(err.message || 'Failed to submit response');
    } finally {
      setSubmittingId(null);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Fetching auditor clarifications..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditor Inquiries & Clarifications"
        subtitle="Address compliance and verification questions raised by independent auditors"
      />

      {error && <ErrorState message={error} onRetry={fetchClarifications} />}

      {success && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {clarifications.length === 0 ? (
        <div className="p-8 text-center bg-white border border-dashed border-slate-300 rounded-xl">
          <HelpCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No Pending Clarifications</p>
          <p className="text-xs text-slate-400 mt-1">
            All submitted reports are either under review or have no outstanding inquiries.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {clarifications.map((cl) => {
            const isPending = cl.status === 'pending' || cl.status === 'open';
            return (
              <div
                key={cl.id}
                className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-purple-600" />
                    <span className="font-semibold text-slate-900 text-xs">
                      Report Period: {cl.submission_month || 'Monthly Report'}
                    </span>
                    <span className="text-slate-400 text-xs">•</span>
                    <span className="text-slate-500 text-xs">
                      Auditor: {cl.auditor_name || cl.auditor_id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">{formatDate(cl.created_at)}</span>
                    <StatusBadge status={cl.status} size="sm" />
                  </div>
                </div>

                {/* Question */}
                <div className="p-3 bg-purple-50/50 rounded-lg border border-purple-100 text-xs text-purple-950">
                  <span className="font-bold block mb-1">Auditor Question:</span>
                  <p>{cl.question}</p>
                </div>

                {/* Response */}
                {cl.response ? (
                  <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100 text-xs text-emerald-950">
                    <span className="font-bold block mb-1">Your Submitted Response:</span>
                    <p>{cl.response}</p>
                    {cl.responded_at && (
                      <span className="block text-[10px] text-emerald-600 mt-1 font-mono">
                        Responded on {formatDate(cl.responded_at)}
                      </span>
                    )}
                  </div>
                ) : isPending ? (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Provide Clarification Response:
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Explain the data point, reference attached utility bill, or clarify the calculation..."
                      value={responseTexts[cl.id] || ''}
                      onChange={(e) =>
                        setResponseTexts({ ...responseTexts, [cl.id]: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleSendResponse(cl.submission_id, cl.id)}
                        disabled={submittingId === cl.id}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {submittingId === cl.id ? 'Submitting...' : 'Submit Response'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
