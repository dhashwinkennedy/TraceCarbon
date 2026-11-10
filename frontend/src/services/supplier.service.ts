import apiClient from './api';
import {
  Supplier,
  SupplierRequirement,
  Submission,
  SpreadsheetPreview,
  AIMappingResponse,
  SpreadsheetValidationResult,
  EvidenceDocument,
  Clarification,
  AIReductionSuggestion,
  SavedSpreadsheetFormat,
  FormatDetectResult,
} from '../types';

export const supplierService = {
  // Profile
  async getProfile(): Promise<Supplier> {
    return apiClient.get('/supplier/profile');
  },

  // Requirements & Reporting Periods
  async getRequirements(): Promise<SupplierRequirement[]> {
    const res = await apiClient.get<any>('/supplier/reporting-requirements');
    return (res as any).items || res;
  },
  async getReportingPeriods(): Promise<{ frequency: string; format: string }> {
    return apiClient.get('/supplier/reporting-periods');
  },

  // Submissions
  async getSubmissions(): Promise<Submission[]> {
    const res = await apiClient.get<any>('/supplier/submissions');
    return (res as any).items || res;
  },
  async createSubmission(
    reporting_month: string,
    submission_method: 'MANUAL_ENTRY' | 'SPREADSHEET_UPLOAD' = 'MANUAL_ENTRY'
  ): Promise<Submission> {
    return apiClient.post('/supplier/submissions', { reporting_month, submission_method });
  },
  async getSubmission(id: string): Promise<Submission> {
    return apiClient.get(`/supplier/submissions/${id}`);
  },

  // Manual Activities
  async updateActivity(
    submissionId: string,
    activityId: string,
    data: { value: number; unit: string; notes?: string }
  ): Promise<any> {
    return apiClient.put(`/supplier/submissions/${submissionId}/activities/${activityId}`, data);
  },
  async deleteActivity(submissionId: string, activityId: string): Promise<void> {
    return apiClient.delete(`/supplier/submissions/${submissionId}/activities/${activityId}`);
  },

  // Spreadsheet Ingestion Wizard
  async uploadSpreadsheet(submissionId: string, file: File): Promise<SpreadsheetPreview> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/supplier/submissions/${submissionId}/spreadsheet-uploads`, formData);
  },
  async getAIMapping(submissionId: string, uploadId: string): Promise<AIMappingResponse> {
    return apiClient.post(`/supplier/submissions/${submissionId}/spreadsheet-uploads/${uploadId}/ai-map`, {}, { timeout: 120000 });
  },
  async confirmSpreadsheetMapping(
    submissionId: string,
    uploadId: string,
    mapping: Record<string, { column: string; unit: string }>
  ): Promise<{ mapping: Record<string, { column: string; unit: string }> }> {
    return apiClient.put(
      `/supplier/submissions/${submissionId}/spreadsheet-uploads/${uploadId}/mapping`,
      { mapping }
    );
  },
  async validateSpreadsheet(submissionId: string, uploadId: string): Promise<SpreadsheetValidationResult> {
    return apiClient.post(`/supplier/submissions/${submissionId}/spreadsheet-uploads/${uploadId}/validate`);
  },
  async importSpreadsheet(
    submissionId: string,
    uploadId: string,
    options?: { save_format?: boolean; format_name?: string; format_id?: string }
  ): Promise<Submission> {
    return apiClient.post(
      `/supplier/submissions/${submissionId}/spreadsheet-uploads/${uploadId}/import`,
      options || {}
    );
  },

  // Saved Spreadsheet Formats
  async getSavedFormats(): Promise<SavedSpreadsheetFormat[]> {
    const res = await apiClient.get<any>('/supplier/saved-formats');
    return (res as any).items || res;
  },
  async getSavedFormat(id: string): Promise<SavedSpreadsheetFormat> {
    return apiClient.get(`/supplier/saved-formats/${id}`);
  },
  async createSavedFormat(data: {
    name: string;
    headers: string[];
    mappings: Record<string, { column: string; unit: string }>;
  }): Promise<SavedSpreadsheetFormat> {
    return apiClient.post('/supplier/saved-formats', data);
  },
  async updateSavedFormat(
    id: string,
    data: { name?: string; mappings?: Record<string, { column: string; unit: string }> }
  ): Promise<SavedSpreadsheetFormat> {
    return apiClient.put(`/supplier/saved-formats/${id}`, data);
  },
  async deleteSavedFormat(id: string): Promise<void> {
    return apiClient.delete(`/supplier/saved-formats/${id}`);
  },
  async detectSavedFormat(payload: {
    headers?: string[];
    upload_id?: string;
    submission_id?: string;
  }): Promise<FormatDetectResult> {
    return apiClient.post('/supplier/saved-formats/detect', payload);
  },

  // Evidence
  async uploadEvidence(submissionId: string, file: File): Promise<EvidenceDocument> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/supplier/submissions/${submissionId}/evidence`, formData);
  },
  async getEvidence(submissionId: string): Promise<EvidenceDocument[]> {
    const res = await apiClient.get<any>(`/supplier/submissions/${submissionId}/evidence`);
    return (res as any).items || res;
  },
  async deleteEvidence(submissionId: string, evidenceId: string): Promise<void> {
    return apiClient.delete(`/supplier/submissions/${submissionId}/evidence/${evidenceId}`);
  },

  // Submission Status
  async submitReport(submissionId: string): Promise<Submission> {
    return apiClient.post(`/supplier/submissions/${submissionId}/submit`);
  },

  // Clarifications
  async getClarifications(submissionId: string): Promise<Clarification[]> {
    const res = await apiClient.get<any>(`/supplier/submissions/${submissionId}/clarifications`);
    return (res as any).items || res;
  },
  async respondToClarification(
    submissionId: string,
    clarificationId: string,
    response: string
  ): Promise<Clarification> {
    return apiClient.post(
      `/supplier/submissions/${submissionId}/clarifications/${clarificationId}/respond`,
      { response }
    );
  },

  // AI Reduction Suggestions (Scoped to submission)
  async getReductionSuggestions(submissionId: string): Promise<AIReductionSuggestion[]> {
    const res = await apiClient.get<any>(`/supplier/submissions/${submissionId}/reduction-suggestions`);
    const items = (res as any).items || [];
    if (items.length > 0 && items[0].result?.suggestions) {
      return items[0].result.suggestions;
    }
    return [];
  },
  async generateReductionSuggestions(submissionId: string): Promise<{ suggestions: AIReductionSuggestion[] }> {
    const res: any = await apiClient.post(`/supplier/submissions/${submissionId}/reduction-suggestions`);
    return res?.result || res;
  },
};
