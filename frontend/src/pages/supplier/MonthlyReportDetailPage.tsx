import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { supplierService } from '../../services/supplier.service';
import { Submission, SupplierRequirement, EvidenceDocument, ActivityValue } from '../../types';
import { formatNumber, formatBytes, formatDate } from '../../utils/formatters';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Paperclip,
  Send,
  Upload,
  CheckCircle2,
  Sliders,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { IntegratedSpreadsheetUploadModal } from '../../components/supplier/IntegratedSpreadsheetUploadModal';

export const MonthlyReportDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [requirements, setRequirements] = useState<SupplierRequirement[]>([]);
  const [evidenceList, setEvidenceList] = useState<EvidenceDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Manual Activity Form State
  const [activityId, setActivityId] = useState('');
  const [value, setValue] = useState<string>('');
  const [unit, setUnit] = useState('kWh');
  const [notes, setNotes] = useState('');
  const [isSavingActivity, setIsSavingActivity] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Evidence upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);

  // Submit modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Spreadsheet upload modal
  const [isSpreadsheetModalOpen, setIsSpreadsheetModalOpen] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [subData, reqData, evData] = await Promise.all([
        supplierService.getSubmission(id),
        supplierService.getRequirements(),
        supplierService.getEvidence(id),
      ]);
      setSubmission(subData);
      setRequirements(reqData);
      setEvidenceList(evData);
      if (reqData.length > 0 && !activityId) {
        setActivityId(reqData[0].activity_id);
        setUnit(reqData[0].expected_unit);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load submission');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleActivitySelect = (actKey: string) => {
    setActivityId(actKey);
    const req = requirements.find((r) => r.activity_id === actKey);
    if (req) setUnit(req.expected_unit);
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !activityId) return;
    const numVal = parseFloat(value);
    if (isNaN(numVal) || numVal <= 0) {
      setFormError('Reported value must be a positive number greater than 0');
      return;
    }
    setIsSavingActivity(true);
    setSuccess(null);
    setFormError(null);
    try {
      const res = await supplierService.updateActivity(id, activityId, {
        value: numVal,
        unit,
        notes,
      });
      let msg = `Updated activity record: ${activityId}`;
      if (res && res.conversion_metadata) {
        msg += ` (Normalized from ${res.original_value} ${res.original_unit} to ${res.normalised_value} ${res.normalised_unit})`;
      }
      setSuccess(msg);
      setValue('');
      setNotes('');
      await fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save activity');
    } finally {
      setIsSavingActivity(false);
    }
  };

  const handleDeleteActivity = async (actKey: string) => {
    if (!id) return;
    try {
      await supplierService.deleteActivity(id, actKey);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to remove activity');
    }
  };

  const handleUploadEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setIsUploadingEvidence(true);
    setFormError(null);
    try {
      await supplierService.uploadEvidence(id, file);
      setSuccess(`Evidence file "${file.name}" uploaded successfully`);
      await fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to upload evidence');
    } finally {
      setIsUploadingEvidence(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteEvidence = async (evidenceId: string) => {
    if (!id) return;
    try {
      await supplierService.deleteEvidence(id, evidenceId);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to remove evidence file');
    }
  };

  const handleSubmitReport = async () => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      await supplierService.submitReport(id);
      setIsSubmitModalOpen(false);
      setSuccess('Monthly report submitted for internal verification!');
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit monthly report');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading report editor..." />;
  }

  if (error || !submission) {
    return <ErrorState message={error || 'Report not found'} onRetry={fetchData} />;
  }

  // Handle both array and dictionary structures for activities
  const rawActivities = submission.activities || [];
  const activitiesList: ActivityValue[] = Array.isArray(rawActivities)
    ? rawActivities
    : Object.entries(rawActivities).map(([key, val]: [string, any]) => ({
        activity_id: key,
        value: typeof val === 'object' ? val.value : val,
        unit: typeof val === 'object' ? val.unit : 'unit',
        notes: typeof val === 'object' ? val.notes : undefined,
        original_value: typeof val === 'object' ? val.original_value : undefined,
        original_unit: typeof val === 'object' ? val.original_unit : undefined,
        normalised_value: typeof val === 'object' ? val.normalised_value : undefined,
        normalised_unit: typeof val === 'object' ? val.normalised_unit : undefined,
        conversion_metadata: typeof val === 'object' ? val.conversion_metadata : undefined,
      }));

  const canEdit = submission.status === 'draft' || submission.status === 'clarification_requested';

  return (
    <div className="space-y-6">
      <Link
        to="/supplier/submissions"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Monthly Reports
      </Link>

      <PageHeader
        title={`Monthly Report: ${submission.reporting_month}`}
        subtitle={`Report ID: ${submission.id} • ${activitiesList.length} activities logged`}
      >
        <div className="flex items-center gap-2">
          <StatusBadge status={submission.status} />
          {canEdit && (
            <>
              <button
                onClick={() => setIsSpreadsheetModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors shadow-sm"
                title="Upload or re-import a spreadsheet for this month"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Upload Spreadsheet
              </button>
              <button
                data-testid="submit-report-btn"
                onClick={() => setIsSubmitModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                Submit to Auditor
              </button>
            </>
          )}
        </div>
      </PageHeader>

      {success && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {formError && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span>{formError}</span>
        </div>
      )}

      {/* Grid: Manual Form + Activities Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Entry Form */}
        {canEdit && (
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sliders className="w-4 h-4 text-emerald-600" />
              <h3 className="font-semibold text-slate-900 text-sm">Log Activity Metric</h3>
            </div>

            <form onSubmit={handleSaveActivity} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Select Required Activity Metric
                </label>
                <select
                  value={activityId}
                  onChange={(e) => handleActivitySelect(e.target.value)}
                  className="mt-1 w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                  required
                >
                  {requirements.map((req) => (
                    <option key={req.activity_id} value={req.activity_id}>
                      {req.activity_id} (Expected: {req.expected_unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Reported Value
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    required
                    placeholder="0.00"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="mt-1 w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Input Unit
                  </label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="kWh, MWh, L, Gallons"
                    className="mt-1 w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Notes / Source Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Facility Meter #3"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingActivity}
                className="w-full flex justify-center items-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                {isSavingActivity ? 'Saving...' : 'Add / Update Metric'}
              </button>
            </form>
          </div>
        )}

        {/* Current Activities Table */}
        <div
          className={`${
            canEdit ? 'lg:col-span-7' : 'lg:col-span-12'
          } bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 space-y-4`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-semibold text-slate-900 text-sm">
              Recorded Energy & Activities ({activitiesList.length})
            </h3>
            <span className="text-xs text-slate-400">GHG Normalized Data</span>
          </div>

          {activitiesList.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              No activity metrics logged yet. Use the form or spreadsheet wizard to add entries.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 uppercase text-[10px] tracking-wider text-slate-500 border-b">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Activity</th>
                    <th className="px-3 py-2.5 font-semibold">Reported Input</th>
                    <th className="px-3 py-2.5 font-semibold">Normalized Value</th>
                    {canEdit && <th className="px-3 py-2.5 font-semibold text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activitiesList.map((act) => {
                    const hasConversion =
                      act.original_unit &&
                      act.normalised_unit &&
                      act.original_unit.toLowerCase() !== act.normalised_unit.toLowerCase();

                    return (
                      <tr key={act.activity_id} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2.5 font-mono font-bold text-slate-900">
                          {act.activity_id}
                        </td>
                        <td className="px-3 py-2.5 font-mono font-semibold text-slate-800">
                          {formatNumber(act.original_value ?? act.value)} {act.original_unit ?? act.unit}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-emerald-700 bg-emerald-50/30">
                          <div>
                            <span className="font-semibold">
                              {formatNumber(act.normalised_value ?? act.value)} {act.normalised_unit || act.unit}
                            </span>
                            {hasConversion && (
                              <span className="block text-[10px] text-emerald-600 font-sans">
                                (Converted from {act.original_unit})
                              </span>
                            )}
                          </div>
                        </td>
                        {canEdit && (
                          <td className="px-3 py-2.5 text-right">
                            <button
                              onClick={() => handleDeleteActivity(act.activity_id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Supporting Evidence Documents Section */}
      <div id="evidence" className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Paperclip className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">
                Supporting Verification Evidence ({evidenceList.length})
              </h3>
              <p className="text-xs text-slate-500">
                Attach utility bills, meter certifications, or fuel invoices (.pdf, .xlsx, .csv)
              </p>
            </div>
          </div>
          {canEdit && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.xlsx,.csv"
                onChange={handleUploadEvidence}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingEvidence}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                {isUploadingEvidence ? 'Uploading...' : 'Upload Document'}
              </button>
            </div>
          )}
        </div>

        {evidenceList.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            No audit documentation attached yet. Uploading invoices strengthens auditor verification scores.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {evidenceList.map((ev) => (
              <div
                key={ev.id}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Paperclip className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div className="truncate">
                    <span className="font-semibold text-slate-900 block truncate">{ev.filename}</span>
                    <span className="text-[11px] text-slate-400">
                      {formatBytes(ev.size)} • {formatDate(ev.uploaded_at)}
                    </span>
                  </div>
                </div>
                {canEdit && (
                  <button
                    onClick={() => handleDeleteEvidence(ev.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors ml-2"
                    title="Remove file"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isSubmitModalOpen}
        title="Submit Monthly Carbon Report"
        message="Are you sure you want to submit this report? Once submitted, the report status will transition to 'submitted' and be locked for internal verification review."
        confirmText="Confirm & Submit"
        confirmVariant="primary"
        isLoading={isSubmitting}
        onConfirm={handleSubmitReport}
        onCancel={() => setIsSubmitModalOpen(false)}
      />

      {/* Integrated Spreadsheet Upload Modal */}
      {id && submission && (
        <IntegratedSpreadsheetUploadModal
          submissionId={id}
          reportingMonth={submission.reporting_month}
          isOpen={isSpreadsheetModalOpen}
          onClose={() => setIsSpreadsheetModalOpen(false)}
          onSuccess={async () => {
            setIsSpreadsheetModalOpen(false);
            await fetchData();
          }}
        />
      )}
    </div>
  );
};
