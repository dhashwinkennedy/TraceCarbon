import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { StatusBadge } from '../../components/common/StatusBadge';
import { supplierService } from '../../services/supplier.service';
import { Submission } from '../../types';
import { formatDate } from '../../utils/formatters';
import { SavedFormatsManagerModal } from '../../components/supplier/SavedFormatsManagerModal';
import { IntegratedSpreadsheetUploadModal } from '../../components/supplier/IntegratedSpreadsheetUploadModal';
import {
  FileCheck2,
  Plus,
  Paperclip,
  Eye,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  Pencil,
  Bookmark,
  ArrowRight,
  X,
  UploadCloud,
} from 'lucide-react';

export const MonthlyReportsPage: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [periodInfo, setPeriodInfo] = useState<{ frequency: string; format: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default to FY2023-24 for annual, or current month for monthly
  const defaultMonth = new Date().toISOString().slice(0, 7);
  const [periodCadence, setPeriodCadence] = useState<'ANNUAL' | 'MONTHLY'>('ANNUAL');

  // Create submission modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [selectedMonth, setSelectedMonth] = useState('FY2023-24');
  const [isCreating, setIsCreating] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);

  // Saved formats modal
  const [isSavedFormatsModalOpen, setIsSavedFormatsModalOpen] = useState(false);

  // Integrated spreadsheet upload modal
  const [isSpreadsheetModalOpen, setIsSpreadsheetModalOpen] = useState(false);
  const [activeUploadSubmissionId, setActiveUploadSubmissionId] = useState<string | null>(null);
  const [activeUploadMonth, setActiveUploadMonth] = useState<string>('');

  const navigate = useNavigate();

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [subData, perData] = await Promise.all([
        supplierService.getSubmissions(),
        supplierService.getReportingPeriods(),
      ]);
      setSubmissions(subData);
      setPeriodInfo(perData);
    } catch (err: any) {
      setError(err.message || 'Failed to load monthly submissions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openNewReportModal = () => {
    setModalStep(1);
    setSelectedMonth(defaultMonth);
    setCreationError(null);
    setIsModalOpen(true);
  };

  const handleProceedToMethodSelection = (e: React.FormEvent) => {
    e.preventDefault();
    setCreationError(null);

    // Check if an active report already exists
    const existing = submissions.find(
      (s) =>
        s.reporting_month === selectedMonth &&
        ['draft', 'submitted', 'clarification_requested', 'response_submitted'].includes(s.status)
    );
    if (existing) {
      setCreationError(
        `An active report for ${selectedMonth} already exists (${existing.status}). Please open the existing report to update entries.`
      );
      return;
    }

    setModalStep(2);
  };

  const handleSelectManualEntry = async () => {
    setIsCreating(true);
    setCreationError(null);
    try {
      const newSub = await supplierService.createSubmission(selectedMonth, 'MANUAL_ENTRY');
      setIsModalOpen(false);
      navigate(`/supplier/submissions/${newSub.id}`);
    } catch (err: any) {
      setCreationError(err.message || 'Failed to initiate manual report');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectSpreadsheetUpload = async () => {
    setIsCreating(true);
    setCreationError(null);
    try {
      const newSub = await supplierService.createSubmission(selectedMonth, 'SPREADSHEET_UPLOAD');
      setIsModalOpen(false);
      setActiveUploadSubmissionId(newSub.id);
      setActiveUploadMonth(newSub.reporting_month);
      setIsSpreadsheetModalOpen(true);
      await fetchData();
    } catch (err: any) {
      setCreationError(err.message || 'Failed to initiate spreadsheet report');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenSpreadsheetForDraft = (subId: string, month: string) => {
    setActiveUploadSubmissionId(subId);
    setActiveUploadMonth(month);
    setIsSpreadsheetModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monthly Carbon Reporting"
        subtitle="Submit monthly activity data, utility records, and production metrics for audit review"
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsSavedFormatsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors shadow-sm"
          >
            <Bookmark className="w-4 h-4 text-emerald-600" />
            Saved Formats
          </button>
          <button
            onClick={openNewReportModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Monthly Report
          </button>
        </div>
      </PageHeader>

      {error && <ErrorState message={error} onRetry={fetchData} />}

      {isLoading ? (
        <LoadingSpinner text="Fetching monthly reports..." />
      ) : submissions.length === 0 ? (
        <div className="p-8 text-center bg-white border border-dashed border-slate-300 rounded-xl space-y-3">
          <FileCheck2 className="w-10 h-10 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-700">No Monthly Reports Yet</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Initiate a reporting cycle for your facility by entering metrics manually or uploading an existing utility spreadsheet.
            </p>
          </div>
          <button
            onClick={openNewReportModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm"
          >
            Create First Report
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5 font-semibold">Reporting Month</th>
                <th className="px-6 py-3.5 font-semibold">Method</th>
                <th className="px-6 py-3.5 font-semibold">Status</th>
                <th className="px-6 py-3.5 font-semibold">Reported Activities</th>
                <th className="px-6 py-3.5 font-semibold">Evidence Documents</th>
                <th className="px-6 py-3.5 font-semibold">Last Modified</th>
                <th className="px-6 py-3.5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {submissions.map((sub) => {
                const actCount = Array.isArray(sub.activities)
                  ? sub.activities.length
                  : Object.keys(sub.activities || {}).length;
                const isDraft = sub.status === 'draft' || sub.status === 'clarification_requested';

                return (
                  <tr key={sub.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-600" />
                        <span>{sub.reporting_month}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {sub.submission_method === 'SPREADSHEET_UPLOAD' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px]">
                          <FileSpreadsheet className="w-3 h-3" />
                          Spreadsheet
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-200 text-[11px]">
                          <Pencil className="w-3 h-3 text-slate-500" />
                          Manual Entry
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-800">
                      {actCount} metric{actCount === 1 ? '' : 's'} recorded
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <Link
                        to={`/supplier/submissions/${sub.id}#evidence`}
                        className="inline-flex items-center gap-1.5 text-slate-600 hover:text-emerald-700 transition-colors"
                        title="View supporting evidence documents"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {sub.evidence_count ?? 0} {(sub.evidence_count ?? 0) === 1 ? 'file' : 'files'}
                        </span>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {formatDate(sub.updated_at || sub.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        {isDraft && (
                          <button
                            onClick={() => handleOpenSpreadsheetForDraft(sub.id, sub.reporting_month)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                            title="Upload/Import spreadsheet into this draft"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                            Upload Sheet
                          </button>
                        )}
                        <Link
                          to={`/supplier/submissions/${sub.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {isDraft ? 'Edit / Submit' : 'View Report'}
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Initiation Modal (Two Steps: Month -> Choice Cards) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-scale-up">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {modalStep === 1 ? 'Step 1: Select Reporting Period' : 'Step 2: Choose Data Entry Method'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {creationError && (
              <div className="p-4 bg-rose-50 border-b border-rose-100 text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <span>{creationError}</span>
              </div>
            )}

            {modalStep === 1 && (
              <form onSubmit={handleProceedToMethodSelection} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                    Reporting Cadence
                  </label>
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      data-testid="cadence-annual-btn"
                      onClick={() => {
                        setPeriodCadence('ANNUAL');
                        setSelectedMonth('FY2023-24');
                      }}
                      className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border transition-all text-center ${
                        periodCadence === 'ANNUAL'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Annual Financial Year
                    </button>
                    <button
                      type="button"
                      data-testid="cadence-monthly-btn"
                      onClick={() => {
                        setPeriodCadence('MONTHLY');
                        setSelectedMonth(defaultMonth);
                      }}
                      className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border transition-all text-center ${
                        periodCadence === 'MONTHLY'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Monthly Reporting
                    </button>
                  </div>

                  {periodCadence === 'ANNUAL' ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Select Financial Year
                      </label>
                      <select
                        id="period-select-annual"
                        data-testid="period-select-annual"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                      >
                        <option value="FY2023-24">FY2023-24 (April 1, 2023 – March 31, 2024)</option>
                        <option value="FY2022-23">FY2022-23 (April 1, 2022 – March 31, 2023)</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Select Reporting Month (YYYY-MM)
                      </label>
                      <input
                        type="month"
                        required
                        data-testid="period-input-monthly"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                    </div>
                  )}

                  <p className="mt-2 text-[11px] text-slate-500">
                    TraceCarbon supports both Annual Financial Year and Monthly reporting for GHG Protocol emissions accounting.
                  </p>
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    data-testid="continue-to-method-btn"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                  >
                    Continue to Entry Method
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {modalStep === 2 && (
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-slate-500">
                    Target Period: <strong className="text-slate-900 font-mono">{selectedMonth}</strong>
                  </span>
                  <p className="text-xs text-slate-600">
                    Select how you would like to provide your operational and energy data for this period:
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 pt-1">
                  {/* Card A: Enter Manually */}
                  <div
                    data-testid="choice-manual-entry"
                    onClick={handleSelectManualEntry}
                    className="group p-4 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-xl cursor-pointer transition-all flex items-start gap-3.5 shadow-sm"
                  >
                    <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Pencil className="w-5 h-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                          Enter Activities Manually
                        </h4>
                        <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          Direct Entry
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Enter your monthly operational figures directly into a form with automated unit validation and expected metric guidance.
                      </p>
                    </div>
                  </div>

                  {/* Card B: Upload a Spreadsheet */}
                  <div
                    data-testid="choice-spreadsheet-upload"
                    onClick={handleSelectSpreadsheetUpload}
                    className="group p-4 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-xl cursor-pointer transition-all flex items-start gap-3.5 shadow-sm"
                  >
                    <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                          Upload a Spreadsheet
                        </h4>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Automated Extraction
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Upload your existing Excel or CSV report. TraceCarbon will automatically detect saved format profiles or assist you with AI column mapping.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 flex justify-between border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalStep(1)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Saved Formats Modal */}
      <SavedFormatsManagerModal
        isOpen={isSavedFormatsModalOpen}
        onClose={() => setIsSavedFormatsModalOpen(false)}
      />

      {/* Integrated Spreadsheet Upload Modal */}
      {activeUploadSubmissionId && (
        <IntegratedSpreadsheetUploadModal
          submissionId={activeUploadSubmissionId}
          reportingMonth={activeUploadMonth}
          isOpen={isSpreadsheetModalOpen}
          onClose={() => {
            setIsSpreadsheetModalOpen(false);
            setActiveUploadSubmissionId(null);
          }}
          onSuccess={async () => {
            await fetchData();
            navigate(`/supplier/submissions/${activeUploadSubmissionId}`);
          }}
        />
      )}
    </div>
  );
};
