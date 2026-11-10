import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/ErrorState';
import { supplierService } from '../../services/supplier.service';
import {
  Submission,
  SupplierRequirement,
  SpreadsheetPreview,
  AIMappingItem,
  SpreadsheetValidationResult,
} from '../../types';
import {
  UploadCloud,
  Sparkles,
  CheckCircle2,
  Sliders,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  FileSpreadsheet,
  Check,
  CheckCheck,
} from 'lucide-react';

export const SpreadsheetImportWizard: React.FC = () => {
  const navigate = useNavigate();

  // Wizard Steps: 1: Upload, 2: AI Mapping, 3: Confirm Mapping, 4: Validate, 5: Complete
  const [step, setStep] = useState<number>(1);

  // Submissions & Requirements
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [requirements, setRequirements] = useState<SupplierRequirement[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>('');
  const [isLoadingInit, setIsLoadingInit] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<SpreadsheetPreview | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Step 2: AI Mapping
  const [aiSuggestions, setAiSuggestions] = useState<AIMappingItem[]>([]);
  const [isAiMapping, setIsAiMapping] = useState<boolean>(false);

  // Step 3: Mapping State
  const [userMapping, setUserMapping] = useState<Record<string, { column: string; unit: string }>>({});
  const [isConfirmingMapping, setIsConfirmingMapping] = useState<boolean>(false);

  // Step 4: Validation
  const [validationResult, setValidationResult] = useState<SpreadsheetValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);

  // Step 5: Import
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Fetch initial submissions and requirements
  useEffect(() => {
    const init = async () => {
      setIsLoadingInit(true);
      setError(null);
      try {
        const [subData, reqData] = await Promise.all([
          supplierService.getSubmissions(),
          supplierService.getRequirements(),
        ]);
        setSubmissions(subData);
        setRequirements(reqData);
        if (subData.length > 0) {
          const draft = subData.find((s) => s.status === 'draft') || subData[0];
          setSelectedSubmissionId(draft.id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to initialize wizard');
      } finally {
        setIsLoadingInit(false);
      }
    };
    init();
  }, []);

  // Step 1: Upload Handler
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmissionId || !selectedFile) {
      alert('Please select both a target report and a spreadsheet file.');
      return;
    }
    setIsUploading(true);
    setError(null);
    try {
      const preview = await supplierService.uploadSpreadsheet(selectedSubmissionId, selectedFile);
      setUploadPreview(preview);
      setStep(2);
      runAIMapping(preview.id);
    } catch (err: any) {
      setError(err.message || 'Spreadsheet upload failed');
      setIsUploading(false);
    }
  };

  // Step 2: AI Mapping Runner
  const runAIMapping = async (uploadId: string) => {
    setIsAiMapping(true);
    setError(null);
    try {
      const res = await supplierService.getAIMapping(selectedSubmissionId, uploadId);
      const rawSuggestions = res.suggestions || (res as any).mappings || (Array.isArray(res) ? res : []);
      setAiSuggestions(rawSuggestions);

      // Initialize user mapping prefilled with AI recommendations
      const initialMap: Record<string, { column: string; unit: string }> = {};
      requirements.forEach((req) => {
        const match = rawSuggestions?.find((s: any) => s.activity_id === req.activity_id);
        initialMap[req.activity_id] = {
          column: match && match.column ? match.column : '',
          unit: req.expected_unit,
        };
      });
      setUserMapping(initialMap);
    } catch (err: any) {
      setError(err.message || 'AI column mapping suggestion failed');
    } finally {
      setIsAiMapping(false);
    }
  };

  // Step 3: Confirm Mapping
  const handleConfirmMapping = async () => {
    if (!selectedSubmissionId || !uploadPreview) return;
    setIsConfirmingMapping(true);
    setError(null);
    try {
      await supplierService.confirmSpreadsheetMapping(
        selectedSubmissionId,
        uploadPreview.id,
        userMapping
      );
      setStep(4);
      runValidation(uploadPreview.id);
    } catch (err: any) {
      setError(err.message || 'Failed to confirm column mapping');
      setIsConfirmingMapping(false);
    }
  };

  // Step 4: Run Validation
  const runValidation = async (uploadId: string) => {
    setIsValidating(true);
    setError(null);
    try {
      const val = await supplierService.validateSpreadsheet(selectedSubmissionId, uploadId);
      setValidationResult(val);
    } catch (err: any) {
      setError(err.message || 'Validation failed');
    } finally {
      setIsValidating(false);
      setIsConfirmingMapping(false);
    }
  };

  // Step 5: Final Import
  const handleFinalImport = async () => {
    if (!selectedSubmissionId || !uploadPreview) return;
    setIsImporting(true);
    setError(null);
    try {
      await supplierService.importSpreadsheet(selectedSubmissionId, uploadPreview.id);
      setStep(5);
    } catch (err: any) {
      setError(err.message || 'Failed to import activities into submission');
    } finally {
      setIsImporting(false);
    }
  };

  if (isLoadingInit) {
    return <LoadingSpinner text="Initializing spreadsheet wizard..." />;
  }

  const stepsHeader = [
    { num: 1, label: 'Upload' },
    { num: 2, label: 'AI Mapping' },
    { num: 3, label: 'Confirm' },
    { num: 4, label: 'Validate' },
    { num: 5, label: 'Imported' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Spreadsheet Ingestion Wizard"
        subtitle="5-step assisted energy data extraction with OpenRouter AI column mapping and schema validation"
      />

      {/* Progress Steps Header */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {stepsHeader.map((s, idx) => (
            <React.Fragment key={s.num}>
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                    step > s.num
                      ? 'bg-emerald-600 text-white'
                      : step === s.num
                      ? 'bg-emerald-500 text-white ring-4 ring-emerald-100'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                </div>
                <span
                  className={`text-[11px] font-semibold tracking-wider uppercase ${
                    step >= s.num ? 'text-slate-800' : 'text-slate-400'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {idx < stepsHeader.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-colors ${
                    step > s.num ? 'bg-emerald-600' : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {error && <ErrorState message={error} />}

      {/* STEP 1: Upload */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-5 animate-scale-up">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">
                Step 1: Select Monthly Report & Upload Spreadsheet
              </h3>
              <p className="text-xs text-slate-500">
                Upload your facility's utility spreadsheet (.xlsx or .csv)
              </p>
            </div>
          </div>

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Target Monthly Report
              </label>
              <select
                value={selectedSubmissionId}
                onChange={(e) => setSelectedSubmissionId(e.target.value)}
                required
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {submissions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.reporting_month} ({s.status}) — ID: {s.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Spreadsheet File (.xlsx or .csv)
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="mt-1 flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors"
              >
                <FileSpreadsheet className="w-10 h-10 text-emerald-500 mb-2" />
                <span className="text-sm font-semibold text-slate-800">
                  {selectedFile ? selectedFile.name : 'Click to select spreadsheet file'}
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  Supports Excel (.xlsx) and Comma-Separated Values (.csv)
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                disabled={isUploading || !selectedFile}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
              >
                {isUploading ? 'Scanning File...' : 'Upload & Analyze Header Schema'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 2: AI Column Mapping Preview */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-6 animate-scale-up">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">
                  Step 2: Advisory AI Column Mapping
                </h3>
                <p className="text-xs text-slate-500">
                  Detected {uploadPreview?.headers.length} headers in spreadsheet
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              OpenRouter Reasoning
            </span>
          </div>

          {isAiMapping ? (
            <LoadingSpinner text="Generating intelligent column mapping recommendations..." />
          ) : (
            <>
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Advisory Mapping Notice:</strong> AI recommendations are non-binding suggestions to save time. You retain full control to confirm or modify mappings in the next step.
                </span>
              </div>

              {/* Suggestions Cards */}
              <div className="space-y-3">
                {aiSuggestions.map((sug, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <span className="font-mono font-bold text-slate-900 text-sm block">
                        {sug.activity_id}
                      </span>
                      {sug.reason && (
                        <p className="text-slate-600 text-xs">{sug.reason}</p>
                      )}
                    </div>

                    <div className="sm:text-right flex-shrink-0">
                      <span className="text-[11px] text-slate-400 block font-medium">Mapped Column</span>
                      <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200 inline-block mt-0.5">
                        {sug.column || 'No Match'}
                      </span>
                      <span className="block text-[10px] text-slate-500 mt-1 font-semibold">
                        Confidence: {Math.round(sug.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  Review & Adjust Mappings
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* STEP 3: Supplier Review & Confirm Mapping */}
      {step === 3 && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-6 animate-scale-up">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">
                Step 3: Confirm Column Alignments
              </h3>
              <p className="text-xs text-slate-500">
                Confirm which spreadsheet column matches each mandated activity metric
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 uppercase text-[10px] tracking-wider text-slate-500 border-b">
                <tr>
                  <th className="px-4 py-3 font-semibold">Mandated Activity</th>
                  <th className="px-4 py-3 font-semibold">Expected Unit</th>
                  <th className="px-4 py-3 font-semibold">Spreadsheet Column Header</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requirements.map((req) => (
                  <tr key={req.activity_id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 text-xs">
                      {req.activity_id}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">
                      {req.expected_unit}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={userMapping[req.activity_id]?.column || ''}
                        onChange={(e) =>
                          setUserMapping({
                            ...userMapping,
                            [req.activity_id]: {
                              column: e.target.value,
                              unit: req.expected_unit,
                            },
                          })
                        }
                        className="w-full max-w-xs px-2.5 py-1.5 border border-slate-300 rounded-md font-mono text-xs focus:ring-2 focus:ring-emerald-500 bg-white"
                      >
                        <option value="">— Select Column —</option>
                        {uploadPreview?.headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={handleConfirmMapping}
              disabled={isConfirmingMapping}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {isConfirmingMapping ? 'Saving Alignment...' : 'Confirm Mapping & Validate'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Validation Preview */}
      {step === 4 && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-6 animate-scale-up">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">
                Step 4: Schema Validation Status
              </h3>
              <p className="text-xs text-slate-500">
                Pre-import verification against required reporting activities
              </p>
            </div>
          </div>

          {isValidating ? (
            <LoadingSpinner text="Executing schema validation..." />
          ) : validationResult ? (
            <>
              <div className="p-4 rounded-xl border flex items-center justify-between text-xs bg-slate-50">
                <div>
                  <span className="font-bold text-slate-800 text-sm block">
                    Validation Status: {validationResult.valid ? 'Passed' : 'Action Required'}
                  </span>
                  <span className="text-slate-500">
                    {validationResult.valid
                      ? 'All mandated activities have mapped columns.'
                      : `Missing mappings for: ${validationResult.unmapped_required_activities?.join(', ')}`}
                  </span>
                </div>
                <span
                  className={`px-3 py-1 rounded-full font-bold text-xs ${
                    validationResult.valid
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {validationResult.valid ? 'Ready to Import' : 'Unmapped Activities'}
                </span>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-between">
                <button
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Adjust Mappings
                </button>
                <button
                  onClick={handleFinalImport}
                  disabled={isImporting || !validationResult.valid}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  <CheckCheck className="w-4 h-4" />
                  {isImporting ? 'Importing Activities...' : 'Complete Ingestion & Commit'}
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* STEP 5: Success / Completed */}
      {step === 5 && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-8 text-center space-y-4 animate-scale-up">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-inner">
            <CheckCheck className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            Spreadsheet Activities Successfully Ingested!
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Your spreadsheet activity records have been aggregated and imported into the monthly report.
          </p>

          <div className="pt-4 flex justify-center gap-3">
            <button
              onClick={() => {
                setStep(1);
                setSelectedFile(null);
                setUploadPreview(null);
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Upload Another Spreadsheet
            </button>
            <Link
              to={`/supplier/submissions/${selectedSubmissionId}`}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors inline-flex items-center gap-1.5"
            >
              Review Monthly Report
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
