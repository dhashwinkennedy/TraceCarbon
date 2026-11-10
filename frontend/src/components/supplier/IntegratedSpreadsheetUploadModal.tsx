import React, { useState, useEffect, useRef } from 'react';
import { supplierService } from '../../services/supplier.service';
import {
  SupplierRequirement,
  SpreadsheetPreview,
  AIMappingItem,
  SpreadsheetValidationResult,
  SavedSpreadsheetFormat,
} from '../../types';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorState } from '../common/ErrorState';
import {
  UploadCloud,
  FileSpreadsheet,
  Sparkles,
  Check,
  CheckCheck,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  X,
  Bookmark,
  RefreshCw,
} from 'lucide-react';

interface IntegratedSpreadsheetUploadModalProps {
  submissionId: string;
  reportingMonth: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const IntegratedSpreadsheetUploadModal: React.FC<IntegratedSpreadsheetUploadModalProps> = ({
  submissionId,
  reportingMonth,
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Wizard Steps: 1: Upload, 2: Format & Mapping, 3: Validate & Preview, 4: Save & Import, 5: Completed
  const [step, setStep] = useState<number>(1);

  // Requirements
  const [requirements, setRequirements] = useState<SupplierRequirement[]>([]);
  const [isLoadingReqs, setIsLoadingReqs] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<SpreadsheetPreview | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Step 2: Format Detection & Mapping
  const [detectedFormat, setDetectedFormat] = useState<SavedSpreadsheetFormat | null>(null);
  const [detectConfidence, setDetectConfidence] = useState<number>(0);
  const [isFormatDetected, setIsFormatDetected] = useState<boolean>(false);
  const [isUsingSavedFormat, setIsUsingSavedFormat] = useState<boolean>(false);
  const [activeFormatId, setActiveFormatId] = useState<string | null>(null);

  // AI & Manual Mapping State
  const [aiSuggestions, setAiSuggestions] = useState<AIMappingItem[]>([]);
  const [isAiMapping, setIsAiMapping] = useState<boolean>(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [userMapping, setUserMapping] = useState<Record<string, { column: string; unit: string }>>({});
  const [isConfirmingMapping, setIsConfirmingMapping] = useState<boolean>(false);

  // Step 3: Validation & Preview
  const [validationResult, setValidationResult] = useState<SpreadsheetValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);

  // Step 4: Save Format & Import
  const [saveFormatForFuture, setSaveFormatForFuture] = useState<boolean>(false);
  const [formatName, setFormatName] = useState<string>('');
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Load requirements on open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedFile(null);
      setUploadPreview(null);
      setDetectedFormat(null);
      setIsFormatDetected(false);
      setIsUsingSavedFormat(false);
      setActiveFormatId(null);
      setAiSuggestions([]);
      setAiNotice(null);
      setUserMapping({});
      setValidationResult(null);
      setSaveFormatForFuture(false);
      setFormatName('');
      setError(null);

      const load = async () => {
        setIsLoadingReqs(true);
        try {
          const reqs = await supplierService.getRequirements();
          setRequirements(reqs);
        } catch (err: any) {
          setError(err.message || 'Failed to load supplier requirements');
        } finally {
          setIsLoadingReqs(false);
        }
      };
      load();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Step 1: Upload Handler
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);
    try {
      const preview = await supplierService.uploadSpreadsheet(submissionId, selectedFile);
      setUploadPreview(preview);

      // Initialize mapping object with blank columns
      const initialMap: Record<string, { column: string; unit: string }> = {};
      requirements.forEach((req) => {
        initialMap[req.activity_id] = { column: '', unit: req.expected_unit };
      });

      // Run format detection
      try {
        const detectRes = await supplierService.detectSavedFormat({ headers: preview.headers });
        if (detectRes.matched && detectRes.format) {
          setDetectedFormat(detectRes.format);
          setDetectConfidence(detectRes.confidence);
          setIsFormatDetected(true);
          setActiveFormatId(detectRes.format.id);

          // Pre-populate mapping from detected format
          Object.entries(detectRes.format.mappings || {}).forEach(([actId, m]) => {
            if (initialMap[actId]) {
              initialMap[actId] = { column: m.column, unit: m.unit };
            }
          });
        }
      } catch (detectErr) {
        // Non-blocking detection error
        console.warn('Format auto-detection skipped:', detectErr);
      }

      setUserMapping(initialMap);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Spreadsheet upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Step 2: Use Saved Mapping Quick Handler
  const handleUseSavedMapping = async () => {
    if (!uploadPreview || !detectedFormat) return;
    setIsConfirmingMapping(true);
    setIsUsingSavedFormat(true);
    setError(null);
    try {
      await supplierService.confirmSpreadsheetMapping(
        submissionId,
        uploadPreview.id,
        userMapping
      );
      setStep(3);
      await runValidation(uploadPreview.id);
    } catch (err: any) {
      setError(err.message || 'Failed to apply saved format mapping');
    } finally {
      setIsConfirmingMapping(false);
    }
  };

  // Step 2: AI Mapping Trigger
  const handleRunAiMapping = async () => {
    if (!uploadPreview) return;
    setIsAiMapping(true);
    setAiNotice(null);
    setError(null);
    try {
      const res = await supplierService.getAIMapping(submissionId, uploadPreview.id);
      
      // Robustly extract suggestions list
      const rawSuggestions = res.suggestions || (res as any).mappings || (Array.isArray(res) ? res : []);
      setAiSuggestions(rawSuggestions);

      // Ensure requirements are loaded
      let currentReqs = requirements;
      if (!currentReqs || currentReqs.length === 0) {
        try {
          currentReqs = await supplierService.getRequirements();
          setRequirements(currentReqs);
        } catch (reqErr) {
          console.warn('Could not refresh requirements:', reqErr);
        }
      }

      const validHeaders = uploadPreview.headers || [];

      // Update user mappings with AI recommendations
      const updatedMap = { ...userMapping };
      let validMappedCount = 0;

      rawSuggestions.forEach((sug: any) => {
        if (sug && sug.activity_id) {
          const colName = sug.column && typeof sug.column === 'string' ? sug.column.trim() : '';
          const matchedCol = colName && (validHeaders.includes(colName) || validHeaders.find((h) => h.trim().toLowerCase() === colName.toLowerCase()))
            ? (validHeaders.includes(colName) ? colName : validHeaders.find((h) => h.trim().toLowerCase() === colName.toLowerCase())!)
            : '';

          const reqItem = currentReqs.find((r) => r.activity_id === sug.activity_id);
          const expectedUnit = reqItem?.expected_unit || updatedMap[sug.activity_id]?.unit || '';

          updatedMap[sug.activity_id] = {
            column: matchedCol,
            unit: expectedUnit,
          };

          if (matchedCol) {
            validMappedCount++;
          }
        }
      });

      setUserMapping(updatedMap);

      // Informative user feedback when no valid columns could be mapped
      if (rawSuggestions.length === 0 || validMappedCount === 0) {
        setAiNotice('AI analyzed the spreadsheet headers but could not find high-confidence matches for your mandated activities. Please configure your mappings manually using the column selectors below.');
      } else {
        setAiNotice(null);
        // If a saved format was auto-matched earlier, dismiss its banner since the user explicitly ran AI
        setIsFormatDetected(false);
      }
    } catch (err: any) {
      const status = err.status || err.response?.status;
      const detail = err.response?.data?.detail || err.message;
      let message = 'AI column mapping failed. You can configure your mappings manually using the column selectors below.';

      if (status === 429 || (detail && (detail.includes('429') || detail.toLowerCase().includes('rate limit')))) {
        message = detail || 'AI column mapping is temporarily rate-limited. You can configure your mappings manually using the column selectors below.';
      } else if (status === 504 || (detail && detail.toLowerCase().includes('timeout'))) {
        message = 'AI column mapping request timed out. You can configure your mappings manually using the column selectors below.';
      } else if (status === 401 || status === 402) {
        message = detail || 'AI service authentication or account credit issue. You can configure your mappings manually using the column selectors below.';
      } else if (status === 503 || status === 502 || (detail && (detail.includes('503') || detail.toLowerCase().includes('unavailable')))) {
        message = detail || 'AI service is temporarily unavailable. You can configure your mappings manually using the column selectors below.';
      } else if (detail) {
        message = `${detail}. You can configure your mappings manually using the column selectors below.`;
      }

      setAiNotice(message);
    } finally {
      setIsAiMapping(false);
    }
  };

  // Step 2: Manual Confirm Mapping
  const handleConfirmMapping = async () => {
    if (!uploadPreview) return;
    setIsConfirmingMapping(true);
    setError(null);
    try {
      await supplierService.confirmSpreadsheetMapping(
        submissionId,
        uploadPreview.id,
        userMapping
      );
      setStep(3);
      await runValidation(uploadPreview.id);
    } catch (err: any) {
      setError(err.message || 'Failed to confirm column alignments');
    } finally {
      setIsConfirmingMapping(false);
    }
  };

  // Step 3: Run Validation
  const runValidation = async (uploadId: string) => {
    setIsValidating(true);
    setError(null);
    try {
      const val = await supplierService.validateSpreadsheet(submissionId, uploadId);
      setValidationResult(val);
    } catch (err: any) {
      setError(err.message || 'Schema validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  // Step 4: Final Import
  const handleFinalImport = async () => {
    if (!uploadPreview) return;
    setIsImporting(true);
    setError(null);
    try {
      await supplierService.importSpreadsheet(submissionId, uploadPreview.id, {
        save_format: saveFormatForFuture && !isUsingSavedFormat,
        format_name: formatName.trim(),
        format_id: activeFormatId || undefined,
      });
      setStep(5);
    } catch (err: any) {
      setError(err.message || 'Failed to import activities into monthly report');
    } finally {
      setIsImporting(false);
    }
  };

  const stepsList = [
    { num: 1, label: 'Upload' },
    { num: 2, label: 'Map Columns' },
    { num: 3, label: 'Preview & Verify' },
    { num: 4, label: 'Save & Commit' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Spreadsheet Report Ingestion — {reportingMonth}
              </h3>
              <p className="text-xs text-slate-500">
                Upload facility utility logs, reuse saved formats, or map columns with AI assistance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Step Progress Tracker */}
        {step <= 4 && (
          <div className="px-6 py-3 bg-white border-b border-slate-100">
            <div className="flex items-center justify-between max-w-xl mx-auto">
              {stepsList.map((s, idx) => (
                <React.Fragment key={s.num}>
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                        step > s.num
                          ? 'bg-emerald-600 text-white'
                          : step === s.num
                          ? 'bg-emerald-500 text-white ring-4 ring-emerald-100'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {step > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
                    </div>
                    <span
                      className={`text-[10px] font-semibold tracking-wider uppercase ${
                        step >= s.num ? 'text-slate-800' : 'text-slate-400'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {idx < stepsList.length - 1 && (
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
        )}

        {/* Body Container */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && <ErrorState message={error} />}

          {/* STEP 1: Upload Spreadsheet File */}
          {step === 1 && (
            <div className="space-y-4 animate-scale-up">
              <div className="text-center max-w-md mx-auto space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">
                  Select Utility or Operational Spreadsheet
                </h4>
                <p className="text-xs text-slate-500">
                  Upload an Excel workbook (.xlsx) or CSV file containing your monthly facility logs.
                </p>
              </div>

              <form onSubmit={handleUpload} className="space-y-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors"
                >
                  <FileSpreadsheet className="w-12 h-12 text-emerald-500 mb-2" />
                  <span className="text-sm font-semibold text-slate-800">
                    {selectedFile ? selectedFile.name : 'Click or drag spreadsheet file here'}
                  </span>
                  <span className="text-xs text-slate-400 mt-1">
                    Accepts Microsoft Excel (.xlsx) and Comma-Separated Values (.csv)
                  </span>
                  <input
                    ref={fileInputRef}
                    data-testid="spreadsheet-file-input"
                    type="file"
                    accept=".xlsx,.csv"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    data-testid="upload-spreadsheet-btn"
                    disabled={isUploading || !selectedFile}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                  >
                    {isUploading ? 'Scanning Spreadsheet...' : 'Analyze & Recognize Layout'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 2: Format Recognition & Column Alignment */}
          {step === 2 && (
            <div className="space-y-5 animate-scale-up">
              {/* Detected Format Banner */}
              {isFormatDetected && detectedFormat && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
                        <Bookmark className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-emerald-900 block">
                          Saved Spreadsheet Format Recognized!
                        </span>
                        <span className="text-xs text-emerald-700">
                          Template: <strong>{detectedFormat.name}</strong> ({Math.round(detectConfidence * 100)}% Match)
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Auto-Matched
                    </span>
                  </div>

                  <p className="text-xs text-emerald-800 leading-relaxed">
                    This spreadsheet layout matches your previously saved template. You can apply the saved column alignments immediately or re-map columns manually.
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleUseSavedMapping}
                      disabled={isConfirmingMapping}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {isConfirmingMapping ? 'Applying Template...' : 'Use Saved Mapping & Proceed'}
                    </button>
                    <button
                      onClick={() => setIsFormatDetected(false)}
                      className="px-3 py-2 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100/60 rounded-lg text-xs font-medium transition-colors"
                    >
                      Review / Map Columns Again
                    </button>
                  </div>
                </div>
              )}

              {/* Column Mapping Table */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Column-to-Activity Alignment
                    </h4>
                    <p className="text-xs text-slate-500">
                      Match spreadsheet columns to mandated reporting metrics
                    </p>
                  </div>

                  {/* AI Mapping Button */}
                  <button
                    data-testid="run-ai-mapping-btn"
                    onClick={handleRunAiMapping}
                    disabled={isAiMapping}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isAiMapping ? 'Analyzing with AI...' : 'Suggest Mappings with AI'}
                  </button>
                </div>

                {/* AI Notification Banner */}
                {aiNotice && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span>{aiNotice}</span>
                  </div>
                )}

                {/* Mapping Selectors Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 uppercase text-[10px] tracking-wider text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Mandated Activity</th>
                        <th className="px-4 py-3 font-semibold">Expected Unit</th>
                        <th className="px-4 py-3 font-semibold">Spreadsheet Column Header</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {requirements.map((req) => {
                        const sug = aiSuggestions.find((s) => s.activity_id === req.activity_id);
                        return (
                          <tr key={req.activity_id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3">
                              <span className="font-mono font-bold text-slate-900 block">
                                {req.activity_id}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {req.description || 'Mandated metric'}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono font-semibold text-slate-700">
                              {req.expected_unit}
                            </td>
                            <td className="px-4 py-3 space-y-1">
                              <select
                                data-testid={`mapping-select-${req.activity_id}`}
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
                                className="w-full max-w-xs px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-emerald-500 bg-white"
                              >
                                <option value="">— Select Column —</option>
                                {uploadPreview?.headers.map((h) => (
                                  <option key={h} value={h}>
                                    {h}
                                  </option>
                                ))}
                              </select>
                              {sug && sug.column && (
                                <span className="block text-[10px] text-purple-600 font-medium">
                                  AI Suggested: {sug.column} ({Math.round(sug.confidence * 100)}% match)
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between pt-2 border-t border-slate-100">
                <button
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  data-testid="confirm-mapping-btn"
                  onClick={handleConfirmMapping}
                  disabled={isConfirmingMapping}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {isConfirmingMapping ? 'Verifying Alignment...' : 'Confirm Mapping & Preview Data'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Preview & Schema Validation */}
          {step === 3 && (
            <div className="space-y-4 animate-scale-up">
              {isValidating ? (
                <LoadingSpinner text="Executing schema validation and row analysis..." />
              ) : validationResult ? (
                <>
                  {/* Status Banner */}
                  <div
                    className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
                      validationResult.valid
                        ? 'bg-emerald-50/70 border-emerald-200'
                        : 'bg-rose-50 border-rose-200'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-slate-900 text-sm block">
                        Schema Validation: {validationResult.valid ? 'Passed' : 'Action Required'}
                      </span>
                      <span className="text-slate-600">
                        {validationResult.valid
                          ? 'All mandated activities have valid column mappings and units.'
                          : `Missing alignments for: ${validationResult.unmapped_required_activities?.join(', ')}`}
                      </span>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full font-bold text-xs ${
                        validationResult.valid
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {validationResult.valid ? 'Ready to Import' : 'Unmapped Activities'}
                    </span>
                  </div>

                  {/* Sample Data Preview Table */}
                  <div className="space-y-2">
                    <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                      Extracted Rows Sample Preview
                    </h5>
                    <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-56">
                      <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 uppercase text-[10px] tracking-wider text-slate-500 border-b border-slate-200">
                          <tr>
                            {uploadPreview?.headers.map((h) => (
                              <th key={h} className="px-3 py-2 font-semibold whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          {validationResult.preview?.slice(0, 5).map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              {uploadPreview?.headers.map((h) => (
                                <td key={h} className="px-3 py-2 whitespace-nowrap">
                                  {String(row[h] ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-between pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setStep(2)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Adjust Mappings
                    </button>
                    <button
                      data-testid="proceed-final-import-btn"
                      onClick={() => setStep(4)}
                      disabled={!validationResult.valid}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                    >
                      Proceed to Final Import
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* STEP 4: Save Format Checkbox & Confirm Import */}
          {step === 4 && (
            <div className="space-y-5 animate-scale-up max-w-xl mx-auto">
              <div className="text-center space-y-1">
                <h4 className="font-bold text-slate-900 text-base">
                  Confirm Ingestion & Format Preference
                </h4>
                <p className="text-xs text-slate-500">
                  Ready to calculate and import activities into reporting month {reportingMonth}.
                </p>
              </div>

              {/* Save Format Box */}
              {!isUsingSavedFormat ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      data-testid="save-format-checkbox"
                      checked={saveFormatForFuture}
                      onChange={(e) => setSaveFormatForFuture(e.target.checked)}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 border-slate-300"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-800 block">
                        Save this spreadsheet format for future uploads
                      </span>
                      <span className="text-[11px] text-slate-500 block leading-relaxed">
                        When you upload this file format in future months, TraceCarbon will automatically recognize the headers and apply this mapping.
                      </span>
                    </div>
                  </label>

                  {saveFormatForFuture && (
                    <div className="pt-2 border-t border-slate-200/60 space-y-1 animate-fade-in">
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                        Format Profile Name
                      </label>
                      <input
                        type="text"
                        data-testid="format-name-input"
                        value={formatName}
                        onChange={(e) => setFormatName(e.target.value)}
                        placeholder="e.g. Monthly Plant Energy & Utility Report"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center gap-3">
                  <Bookmark className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div className="text-xs text-emerald-900">
                    <span className="font-bold block">Using Saved Format: {detectedFormat?.name}</span>
                    <span className="text-[11px] text-emerald-700">
                      Last-used timestamp will be refreshed automatically upon import.
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between pt-3 border-t border-slate-100">
                <button
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  data-testid="confirm-final-import-btn"
                  onClick={handleFinalImport}
                  disabled={isImporting || (saveFormatForFuture && !formatName.trim())}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  <CheckCheck className="w-4 h-4" />
                  {isImporting ? 'Ingesting Activities...' : 'Confirm and Import Report'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Success Completion Screen */}
          {step === 5 && (
            <div className="py-8 text-center space-y-4 animate-scale-up">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-inner">
                <CheckCheck className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-slate-900">
                  Spreadsheet Ingested Successfully!
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Activity data from your spreadsheet has been calculated and stored into the {reportingMonth} report draft.
                </p>
              </div>

              <div className="pt-4 flex justify-center gap-3">
                <button
                  data-testid="view-updated-report-btn"
                  onClick={() => {
                    onSuccess();
                    onClose();
                  }}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors inline-flex items-center gap-1.5"
                >
                  View Updated Monthly Report
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
