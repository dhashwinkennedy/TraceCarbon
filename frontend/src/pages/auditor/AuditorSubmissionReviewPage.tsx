import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { StatusBadge } from '../../components/common/StatusBadge';
import { auditorService } from '../../services/auditor.service';
import {
  Submission,
  SubmissionComment,
  Clarification,
  EvidenceDocument,
  AIReportQualityResult,
  AIEvidenceReviewResult,
  ActivityValue,
} from '../../types';
import { formatNumber, formatBytes, formatDate } from '../../utils/formatters';
import {
  ArrowLeft,
  FileCheck2,
  MessageSquare,
  HelpCircle,
  Sparkles,
  Paperclip,
  Send,
  CheckCircle2,
  AlertTriangle,
  FileSearch,
  Check,
  ShieldCheck,
  Eye,
  Download,
  X,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  Clock,
  RefreshCw,
  Loader2,
} from 'lucide-react';

export type QualityScanStage =
  | 'idle'
  | 'preparing'
  | 'analyzing'
  | 'validating'
  | 'completed'
  | 'error';

export const AuditorSubmissionReviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [comments, setComments] = useState<SubmissionComment[]>([]);
  const [clarifications, setClarifications] = useState<Clarification[]>([]);
  const [evidenceList, setEvidenceList] = useState<EvidenceDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Comment state
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  // New Clarification state
  const [newQuestion, setNewQuestion] = useState('');
  const [isPostingClarification, setIsPostingClarification] = useState(false);

  // AI Quality Tool state
  const [qualityResult, setQualityResult] = useState<AIReportQualityResult | null>(null);
  const [isRunningQuality, setIsRunningQuality] = useState(false);
  const [qualityScanStage, setQualityScanStage] = useState<QualityScanStage>('idle');
  const [qualityElapsedSeconds, setQualityElapsedSeconds] = useState(0);
  const [qualityScanError, setQualityScanError] = useState<{
    title: string;
    message: string;
    code?: string | number;
  } | null>(null);

  // AI Evidence Tool state
  const [evidenceResult, setEvidenceResult] = useState<AIEvidenceReviewResult | null>(null);
  const [isRunningEvidence, setIsRunningEvidence] = useState(false);

  // Evidence viewer state
  const [viewingEvidence, setViewingEvidence] = useState<EvidenceDocument | null>(null);
  const [viewerBlobUrl, setViewerBlobUrl] = useState<string | null>(null);
  const [isLoadingBlob, setIsLoadingBlob] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (viewerBlobUrl) {
        URL.revokeObjectURL(viewerBlobUrl);
      }
    };
  }, [viewerBlobUrl]);

  useEffect(() => {
    let interval: any = null;
    if (isRunningQuality) {
      interval = setInterval(() => {
        setQualityElapsedSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunningQuality]);

  const handleViewEvidence = async (ev: EvidenceDocument) => {
    if (!id) return;
    setViewingEvidence(ev);
    setIsLoadingBlob(true);
    setViewerError(null);
    if (viewerBlobUrl) {
      URL.revokeObjectURL(viewerBlobUrl);
      setViewerBlobUrl(null);
    }
    try {
      const blob = await auditorService.getEvidenceFileBlob(id, ev.id);
      const url = URL.createObjectURL(blob);
      setViewerBlobUrl(url);
    } catch (err: any) {
      setViewerError(err?.message || 'Failed to load document. The file may be missing or inaccessible.');
    } finally {
      setIsLoadingBlob(false);
    }
  };

  const handleCloseViewer = () => {
    if (viewerBlobUrl) {
      URL.revokeObjectURL(viewerBlobUrl);
      setViewerBlobUrl(null);
    }
    setViewingEvidence(null);
    setViewerError(null);
    setIsLoadingBlob(false);
  };

  const handleDownloadEvidence = async (ev: EvidenceDocument) => {
    if (!id) return;
    try {
      await auditorService.downloadEvidenceFile(id, ev.id, ev.filename);
    } catch (err: any) {
      alert('Failed to download evidence file: ' + (err?.message || 'Unknown error'));
    }
  };

  const fetchData = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [subData, comData, clarData, evData, assessmentsData] = await Promise.all([
        auditorService.getSubmission(id),
        auditorService.getComments(id),
        auditorService.getClarifications(id),
        auditorService.getSubmissionEvidence(id),
        auditorService.getAIAssessments(id).catch(() => []),
      ]);
      setSubmission(subData);
      setComments(comData);
      setClarifications(clarData);
      setEvidenceList(evData);

      const items = Array.isArray(assessmentsData) ? assessmentsData : (assessmentsData as any)?.items || [];
      const latestQuality = items
        .filter((a: any) => a.type === 'report_quality')
        .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0];
      if (latestQuality?.result) {
        setQualityResult(latestQuality.result);
        setQualityScanStage('completed');
      }

      const latestEvidence = items
        .filter((a: any) => a.type === 'evidence_review')
        .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0];
      if (latestEvidence?.result) {
        setEvidenceResult(latestEvidence.result);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load submission audit workspace');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  // Comment submit
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newComment.trim()) return;
    setIsPostingComment(true);
    try {
      await auditorService.addComment(id, newComment.trim());
      setNewComment('');
      const updatedComments = await auditorService.getComments(id);
      setComments(updatedComments);
    } catch (err: any) {
      alert(err.message || 'Failed to post audit comment');
    } finally {
      setIsPostingComment(false);
    }
  };

  // Clarification submit
  const handleCreateClarification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newQuestion.trim()) return;
    setIsPostingClarification(true);
    try {
      await auditorService.createClarification(id, newQuestion.trim());
      setNewQuestion('');
      const updatedClarifications = await auditorService.getClarifications(id);
      setClarifications(updatedClarifications);
      const sub = await auditorService.getSubmission(id);
      setSubmission(sub);
    } catch (err: any) {
      alert(err.message || 'Failed to raise clarification inquiry');
    } finally {
      setIsPostingClarification(false);
    }
  };

  // Resolve clarification
  const handleResolveClarification = async (clarificationId: string) => {
    if (!id) return;
    try {
      await auditorService.updateClarificationStatus(clarificationId, 'resolved');
      const updated = await auditorService.getClarifications(id);
      setClarifications(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to resolve clarification');
    }
  };

  // Run AI Quality Scan
  const handleRunQualityScan = async () => {
    if (!id || isRunningQuality) return;
    setIsRunningQuality(true);
    setQualityScanStage('preparing');
    setQualityElapsedSeconds(0);
    setQualityScanError(null);

    const prepTimer = setTimeout(() => {
      setQualityScanStage('analyzing');
    }, 450);

    try {
      const res = await auditorService.runAIReportQuality(id);
      clearTimeout(prepTimer);
      setQualityScanStage('validating');
      await new Promise((r) => setTimeout(r, 250));
      setQualityResult(res);
      setQualityScanStage('completed');
    } catch (err: any) {
      clearTimeout(prepTimer);
      setQualityScanStage('error');
      const isTimeout =
        err?.code === 'ECONNABORTED' ||
        err?.message?.toLowerCase().includes('timeout') ||
        err?.response?.status === 504;
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;

      if (isTimeout) {
        setQualityScanError({
          title: 'AI Analysis Timeout',
          message:
            'The AI quality analysis request exceeded the timeout limit (120 seconds). The upstream model may be experiencing high demand. Please try again.',
          code: 504,
        });
      } else if (status === 429) {
        setQualityScanError({
          title: 'Rate Limit Reached',
          message:
            'The AI service is temporarily experiencing high request volume. Please wait a moment before trying again.',
          code: 429,
        });
      } else if (status === 503) {
        setQualityScanError({
          title: 'AI Provider Unavailable',
          message:
            'The AI provider service is temporarily unavailable or undergoing maintenance. Please retry in a few moments.',
          code: 503,
        });
      } else if (status === 401 || status === 403) {
        setQualityScanError({
          title: 'Authentication Error',
          message: 'Unable to authenticate with AI service. Please verify system credentials.',
          code: status,
        });
      } else if (status === 402) {
        setQualityScanError({
          title: 'Credits Exceeded',
          message: 'The AI service quota or balance has been exhausted. Please contact system administration.',
          code: 402,
        });
      } else if (status === 502) {
        setQualityScanError({
          title: 'Invalid AI Model Response',
          message:
            typeof detail === 'string'
              ? detail
              : 'The AI model returned an unparseable response structure. Please retry the analysis.',
          code: 502,
        });
      } else {
        setQualityScanError({
          title: 'AI Analysis Failed',
          message:
            typeof detail === 'string'
              ? detail
              : err?.message || 'An unexpected error occurred while analyzing the report.',
          code: status || 'ERROR',
        });
      }
    } finally {
      setIsRunningQuality(false);
    }
  };

  // Run AI Evidence Review
  const handleRunEvidenceReview = async () => {
    if (!id) return;
    setIsRunningEvidence(true);
    try {
      const res = await auditorService.runAIEvidenceReview(id);
      setEvidenceResult(res);
    } catch (err: any) {
      alert(err.message || 'AI Evidence review failed');
    } finally {
      setIsRunningEvidence(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Opening auditor verification workspace..." />;
  }

  if (error || !submission) {
    return <ErrorState message={error || 'Submission not found'} onRetry={fetchData} />;
  }

  // Normalize activities array or object
  const rawActivities = submission.activities || [];
  const activitiesList: ActivityValue[] = Array.isArray(rawActivities)
    ? rawActivities
    : Object.entries(rawActivities).map(([key, val]: [string, any]) => ({
        activity_id: key,
        value: typeof val === 'object' ? val.value : val,
        unit: typeof val === 'object' ? val.unit : 'unit',
        notes: typeof val === 'object' ? val.notes : undefined,
        normalised_value: typeof val === 'object' ? val.normalised_value : undefined,
        normalised_unit: typeof val === 'object' ? val.normalised_unit : undefined,
      }));

  return (
    <div className="space-y-6">
      <Link
        to="/auditor/submissions"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Submissions
      </Link>

      <PageHeader
        title={`Audit Verification: ${submission.supplier_name || submission.supplier_id}`}
        subtitle={`Period: ${submission.reporting_month} • Submission ID: ${submission.id}`}
      >
        <StatusBadge status={submission.status} />
      </PageHeader>

      {/* Section 1: Reported Activity Stream */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-semibold text-slate-900 text-sm">
            Primary Reported Activities ({activitiesList.length})
          </h3>
          <span className="text-xs text-slate-400">GHG Scope 1 & 2 Inputs</span>
        </div>

        {activitiesList.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No activity figures logged.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 uppercase text-[10px] tracking-wider text-slate-500 border-b">
                <tr>
                  <th className="px-4 py-3 font-semibold">Activity Metric Key</th>
                  <th className="px-4 py-3 font-semibold">Reported Quantity</th>
                  <th className="px-4 py-3 font-semibold">Normalized Value</th>
                  <th className="px-4 py-3 font-semibold">Supplier Field Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activitiesList.map((act) => (
                  <tr key={act.activity_id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{act.activity_id}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                      {formatNumber(act.original_value ?? act.value)} {act.original_unit ?? act.unit}
                    </td>
                    <td className="px-4 py-3 font-mono text-emerald-700 bg-emerald-50/30">
                      {act.normalised_value !== undefined ? (
                        <span className="font-semibold">
                          {formatNumber(act.normalised_value)} {act.normalised_unit || act.unit}
                        </span>
                      ) : (
                        `${formatNumber(act.value)} ${act.unit}`
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{act.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grid: Comments & Clarifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Verification Comments */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <MessageSquare className="w-4 h-4 text-purple-600" />
              <h3 className="font-semibold text-slate-900 text-sm">
                Internal Audit Findings & Notes ({comments.length})
              </h3>
            </div>

            {comments.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No audit findings recorded yet.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-56 overflow-y-auto custom-scrollbar">
                {comments.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-purple-900">
                        {c.auditor_name || c.auditor_id}
                      </span>
                      <span className="text-[10px] text-slate-400">{formatDate(c.created_at)}</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{c.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleAddComment} className="pt-3 border-t border-slate-100 space-y-2">
            <textarea
              rows={2}
              required
              placeholder="Record verification observation, data reference, or methodology check..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isPostingComment}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {isPostingComment ? 'Saving...' : 'Add Audit Finding'}
              </button>
            </div>
          </form>
        </div>

        {/* Clarification Inquiries */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <HelpCircle className="w-4 h-4 text-amber-600" />
              <h3 className="font-semibold text-slate-900 text-sm">
                Clarification Inquiries ({clarifications.length})
              </h3>
            </div>

            {clarifications.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No formal clarifications raised.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-56 overflow-y-auto custom-scrollbar">
                {clarifications.map((cl) => (
                  <div
                    key={cl.id}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">Question</span>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={cl.status} size="sm" />
                        {cl.status !== 'resolved' && (
                          <button
                            onClick={() => handleResolveClarification(cl.id)}
                            className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            Mark Resolved
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-slate-700">{cl.question}</p>

                    {cl.response && (
                      <div className="mt-1 p-2 rounded bg-emerald-50 border border-emerald-100 text-[11px] text-emerald-900">
                        <span className="font-semibold block">Supplier Response:</span>
                        {cl.response}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleCreateClarification} className="pt-3 border-t border-slate-100 space-y-2">
            <textarea
              rows={2}
              required
              placeholder="Ask supplier to clarify meter boundaries, fuel conversion factor, or attached bills..."
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isPostingClarification}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                {isPostingClarification ? 'Raising Inquiry...' : 'Raise Clarification Inquiry'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Section 4: AI Report Quality Analysis Tool */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">
                AI Report Quality & Completeness Scan
              </h3>
              <p className="text-xs text-slate-500">
                Automated multi-criteria assessment evaluating data completeness, month consistency, and expected units
              </p>
            </div>
          </div>
          <button
            data-testid="run-quality-scan-btn"
            onClick={handleRunQualityScan}
            disabled={isRunningQuality}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isRunningQuality ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Scanning Completeness... ({qualityElapsedSeconds}s)</span>
              </>
            ) : qualityResult ? (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Re-run Report Quality Scan</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Run Report Quality Scan</span>
              </>
            )}
          </button>
        </div>

        {/* Inline Error State */}
        {qualityScanError && (
          <div
            data-testid="quality-scan-error"
            className="p-4 rounded-xl border border-red-200 bg-red-50/80 text-red-900 space-y-2 animate-scale-up"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <h4 className="font-semibold text-sm text-red-950">{qualityScanError.title}</h4>
                {qualityScanError.code && (
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-200">
                    HTTP {qualityScanError.code}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setQualityScanError(null)}
                className="text-red-400 hover:text-red-700 p-1 transition-colors"
                title="Dismiss error"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-red-700 leading-relaxed">{qualityScanError.message}</p>
            <div className="pt-1 flex items-center gap-3">
              <button
                type="button"
                onClick={handleRunQualityScan}
                disabled={isRunningQuality}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Scan
              </button>
              <button
                type="button"
                onClick={() => setQualityScanError(null)}
                className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-semibold"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Multi-Stage Progress State */}
        {isRunningQuality ? (
          <div
            data-testid="quality-scan-progress"
            className="p-5 rounded-xl border border-purple-200 bg-purple-50/50 space-y-4 animate-scale-up"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-100 pb-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                <span className="font-semibold text-sm text-purple-950">
                  AI Report Quality Scan in Progress
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-purple-200 rounded-full text-xs font-semibold text-purple-700 shadow-sm">
                <Clock className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                <span data-testid="quality-elapsed-timer">Elapsed: {qualityElapsedSeconds}s</span>
                <span className="text-purple-400 font-normal">/ 120s limit</span>
              </div>
            </div>

            {/* Stage Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              {[
                {
                  id: 'preparing',
                  num: '1',
                  label: 'Preparing report data',
                  isDone: ['analyzing', 'validating', 'completed'].includes(qualityScanStage),
                  isActive: qualityScanStage === 'preparing',
                },
                {
                  id: 'analyzing',
                  num: '2',
                  label: 'AI analysis in progress',
                  isDone: ['validating', 'completed'].includes(qualityScanStage),
                  isActive: qualityScanStage === 'analyzing',
                },
                {
                  id: 'validating',
                  num: '3',
                  label: 'Validating AI results',
                  isDone: qualityScanStage === 'completed',
                  isActive: qualityScanStage === 'validating',
                },
                {
                  id: 'completed',
                  num: '4',
                  label: 'Analysis completed',
                  isDone: qualityScanStage === 'completed',
                  isActive: false,
                },
              ].map((st) => (
                <div
                  key={st.id}
                  className={`p-3 rounded-lg border text-xs transition-all flex items-center gap-2.5 ${
                    st.isDone
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900 font-medium'
                      : st.isActive
                      ? 'bg-white border-purple-300 text-purple-950 font-semibold shadow-sm ring-2 ring-purple-100'
                      : 'bg-white/60 border-slate-200 text-slate-400'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      st.isDone
                        ? 'bg-emerald-600 text-white'
                        : st.isActive
                        ? 'bg-purple-600 text-white animate-pulse'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {st.isDone ? <Check className="w-3 h-3" /> : st.num}
                  </div>
                  <span className="truncate">{st.label}</span>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-purple-700/80 leading-normal">
              The AI service is performing deep multi-criteria verification across reporting months, activity values, and measurement consistency. A generous 120-second timeout window is configured to accommodate complex LLM reasoning.
            </p>
          </div>
        ) : qualityResult ? (
          /* Scan Results Presentation */
          <div data-testid="quality-scan-results" className="space-y-4 animate-scale-up">
            <div
              className={`flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border ${
                qualityResult.rating === 'Good'
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : qualityResult.rating === 'Needs attention'
                  ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                  : 'bg-purple-50/70 border-purple-200 text-purple-950'
              }`}
            >
              <div>
                <span className="text-[11px] uppercase font-bold tracking-wider opacity-75 block">
                  Quality Assessment Rating
                </span>
                <span
                  data-testid="quality-assessment-rating"
                  className="text-xl font-black mt-0.5 block"
                >
                  {qualityResult.rating}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-white px-3 py-1 rounded-full border border-slate-200 font-semibold text-slate-700 shadow-xs">
                  Advisory Only
                </span>
                <span className="text-xs bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full font-semibold border border-purple-200">
                  120s Timeout Ready
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Findings */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                  Key Verification Findings
                </span>
                <ul
                  data-testid="quality-findings-list"
                  className="space-y-1.5 text-slate-600 list-disc list-inside leading-relaxed"
                >
                  {qualityResult.findings?.length ? (
                    qualityResult.findings.map((f: any, i: number) => (
                      <li key={i}>
                        {typeof f === 'string' ? f : f.finding || f.explanation}
                      </li>
                    ))
                  ) : (
                    <li className="list-none italic text-slate-400">No specific findings logged</li>
                  )}
                </ul>
              </div>

              {/* Missing Info */}
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2">
                <span className="font-bold text-amber-900 uppercase tracking-wider text-[11px] block">
                  Missing Information
                </span>
                <ul
                  data-testid="quality-missing-info-list"
                  className="space-y-1.5 text-amber-800 list-disc list-inside leading-relaxed"
                >
                  {qualityResult.missing_information?.length ? (
                    qualityResult.missing_information.map((m, i) => <li key={i}>{m}</li>)
                  ) : (
                    <li className="list-none italic text-amber-700">None detected</li>
                  )}
                </ul>
              </div>

              {/* Suggested Questions */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
                <span className="font-bold text-emerald-900 uppercase tracking-wider text-[11px] block">
                  Suggested Clarification Questions
                </span>
                <ul
                  data-testid="quality-questions-list"
                  className="space-y-1.5 text-emerald-800 list-disc list-inside leading-relaxed"
                >
                  {qualityResult.suggested_clarification_questions?.length ? (
                    qualityResult.suggested_clarification_questions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))
                  ) : (
                    <li className="list-none italic text-emerald-700">None suggested</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center space-y-2">
            <p className="text-xs text-slate-500 font-medium">
              Click <strong className="text-purple-700">"Run Report Quality Scan"</strong> to audit the consistency and completeness of this report.
            </p>
            <p className="text-[11px] text-slate-400">
              Configured with a 120-second timeout window to reliably handle in-depth AI reasoning.
            </p>
          </div>
        )}
      </div>

      {/* Section 5: AI Supporting Evidence Review Tool */}
      <div id="evidence" className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
              <FileSearch className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">
                AI Evidence Document Review
              </h3>
              <p className="text-xs text-slate-500">
                PDF text extraction and AI-assisted evidence review comparing attached invoices against reported activity numbers
              </p>
            </div>
          </div>

          <button
            onClick={handleRunEvidenceReview}
            disabled={isRunningEvidence || evidenceList.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <FileSearch className="w-4 h-4" />
            {isRunningEvidence ? 'Analyzing Evidence...' : `Review Evidence (${evidenceList.length} ${evidenceList.length === 1 ? 'file' : 'files'})`}
          </button>
        </div>

        {/* Attached Evidence Files List */}
        {evidenceList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {evidenceList.map((ev) => {
              const ext = ev.filename.split('.').pop()?.toLowerCase() || '';
              const isImg = ['png', 'jpg', 'jpeg'].includes(ext);
              const isPdf = ext === 'pdf';
              return (
                <div
                  key={ev.id}
                  className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors flex flex-col justify-between gap-3 text-xs shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-lg bg-blue-50 text-blue-600 flex-shrink-0">
                        {isImg ? (
                          <ImageIcon className="w-4 h-4" />
                        ) : isPdf ? (
                          <FileText className="w-4 h-4" />
                        ) : (
                          <Paperclip className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-800 block truncate" title={ev.filename}>
                          {ev.filename}
                        </span>
                        <span className="text-slate-400 text-[11px] block">
                          {formatBytes(ev.size)} • {formatDate(ev.uploaded_at)}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border uppercase shrink-0">
                      {ext || 'FILE'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleViewEvidence(ev)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-[11px] transition-colors"
                      title="Open / View document in preview modal"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Open / View
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadEvidence(ev)}
                      className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-[11px] transition-colors"
                      title="Download document"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-3 text-center">
            No supporting evidence files uploaded for this submission.
          </p>
        )}

        {isRunningEvidence ? (
          <LoadingSpinner text="Extracting text layers and verifying reported figures..." />
        ) : evidenceResult ? (
          <div className="space-y-4 animate-scale-up">
            <div className="flex items-center justify-between p-4 bg-blue-50/60 border border-blue-200 rounded-xl">
              <div>
                <span className="text-xs uppercase font-bold text-blue-900 tracking-wider block">
                  Evidence Parity Rating
                </span>
                <span className="text-xl font-black text-blue-950 mt-1 block">
                  {evidenceResult.rating}
                </span>
              </div>
              <span className="text-xs text-blue-700 bg-white px-3 py-1 rounded-full border border-blue-200 font-semibold">
                Advisory Inspection
              </span>
            </div>

            {/* Matched Values from Backend */}
            {evidenceResult.matched_values && evidenceResult.matched_values.length > 0 && (
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                  Extracted Document Parity Matches
                </span>
                <ul className="space-y-1.5 text-slate-700 list-disc list-inside">
                  {evidenceResult.matched_values.map((m, idx) => (
                    <li key={idx} className="font-mono text-slate-800">
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Findings & Limitations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                  Auditor Observations
                </span>
                <ul className="space-y-1 text-slate-600 list-disc list-inside">
                  {evidenceResult.findings?.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                  Extraction Limitations & Missing Info
                </span>
                <ul className="space-y-1 text-slate-600 list-disc list-inside">
                  {evidenceResult.limitations?.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                  {evidenceResult.extraction_limitations?.map((el, i) => (
                    <li key={`el-${i}`}>{el}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : evidenceList.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">
            No supporting evidence files uploaded for this submission.
          </p>
        ) : (
          <p className="text-xs text-slate-400 py-3 text-center">
            Click "Review Evidence" to run advisory AI verification across the {evidenceList.length} attached {evidenceList.length === 1 ? 'document' : 'documents'}.
          </p>
        )}
      </div>
      {/* Interactive Auditor Evidence Viewer Modal */}
      {viewingEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-700 flex-shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm truncate" title={viewingEvidence.filename}>
                      {viewingEvidence.filename}
                    </h3>
                    <span className="font-mono text-[10px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded font-bold uppercase">
                      {viewingEvidence.filename.split('.').pop() || 'DOCUMENT'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {formatBytes(viewingEvidence.size)} • Uploaded {formatDate(viewingEvidence.uploaded_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadEvidence(viewingEvidence)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-sm transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
                <button
                  type="button"
                  onClick={handleCloseViewer}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Close viewer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content Body */}
            <div className="flex-1 p-6 overflow-y-auto bg-slate-100/50 flex flex-col items-center justify-center min-h-[420px]">
              {isLoadingBlob ? (
                <div className="py-12">
                  <LoadingSpinner text="Retrieving verified evidence file..." />
                </div>
              ) : viewerError ? (
                <div className="max-w-md w-full p-6 bg-white rounded-xl border border-rose-200 shadow-sm text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Failed to Open Evidence Document</h4>
                  <p className="text-xs text-slate-600">{viewerError}</p>
                  <div className="pt-2 flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleViewEvidence(viewingEvidence)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseViewer}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                    >
                      Back to Review
                    </button>
                  </div>
                </div>
              ) : viewerBlobUrl ? (
                viewingEvidence.filename.toLowerCase().endsWith('.pdf') ? (
                  <div className="w-full h-[70vh] bg-white rounded-xl border border-slate-200 shadow-inner overflow-hidden">
                    <iframe
                      src={viewerBlobUrl}
                      title={viewingEvidence.filename}
                      className="w-full h-full border-0"
                    />
                  </div>
                ) : viewingEvidence.filename.toLowerCase().match(/\.(png|jpg|jpeg)$/) ? (
                  <div className="w-full flex items-center justify-center p-4 bg-white rounded-xl border border-slate-200 shadow-inner">
                    <img
                      src={viewerBlobUrl}
                      alt={viewingEvidence.filename}
                      className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-sm"
                    />
                  </div>
                ) : (
                  <div className="max-w-lg w-full p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                      <Paperclip className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{viewingEvidence.filename}</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Spreadsheet or tabular data file ({viewingEvidence.filename.split('.').pop()?.toUpperCase()})
                      </p>
                    </div>
                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      This file format is structured for data analysis. Download the file to inspect the original sheets, formulas, or raw activity entries.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleDownloadEvidence(viewingEvidence)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download {viewingEvidence.filename} ({formatBytes(viewingEvidence.size)})
                    </button>
                  </div>
                )
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Auditor Evidence Verification Workspace</span>
              <button
                type="button"
                onClick={handleCloseViewer}
                className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
