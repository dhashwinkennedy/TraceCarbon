import apiClient from './api';
import {
  AuditorAssignment,
  Submission,
  SubmissionComment,
  Clarification,
  EvidenceDocument,
  AIReportQualityResult,
  AIEvidenceReviewResult,
} from '../types';

export const auditorService = {
  // Assignments (for logged-in internal auditor)
  async getAssignments(): Promise<AuditorAssignment[]> {
    const res = await apiClient.get<any>('/auditor/assignments');
    return (res as any).items || res;
  },

  // Submissions under assigned jurisdiction
  async getSubmissions(): Promise<Submission[]> {
    const res = await apiClient.get<any>('/auditor/submissions');
    return (res as any).items || res;
  },
  async getSubmission(id: string): Promise<Submission> {
    return apiClient.get(`/auditor/submissions/${id}`);
  },

  // Supporting Evidence Documents
  async getSubmissionEvidence(submissionId: string): Promise<EvidenceDocument[]> {
    const res = await apiClient.get<any>(`/auditor/submissions/${submissionId}/evidence`);
    return (res as any).items || res;
  },
  async getEvidenceFileBlob(submissionId: string, evidenceId: string): Promise<Blob> {
    const res = await apiClient.get<Blob>(
      `/auditor/submissions/${submissionId}/evidence/${evidenceId}/file?inline=true`,
      { responseType: 'blob' }
    );
    return res as unknown as Blob;
  },
  async downloadEvidenceFile(submissionId: string, evidenceId: string, filename: string): Promise<void> {
    const blob = await this.getEvidenceFileBlob(submissionId, evidenceId);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  // Verification Comments
  async getComments(submissionId: string): Promise<SubmissionComment[]> {
    const res = await apiClient.get<any>(`/auditor/submissions/${submissionId}/comments`);
    return (res as any).items || res;
  },
  async addComment(submissionId: string, text: string): Promise<SubmissionComment> {
    return apiClient.post(`/auditor/submissions/${submissionId}/comments`, { text });
  },

  // Clarifications
  async getClarifications(submissionId: string): Promise<Clarification[]> {
    const res = await apiClient.get<any>(`/auditor/submissions/${submissionId}/clarifications`);
    return (res as any).items || res;
  },
  async createClarification(submissionId: string, question: string): Promise<Clarification> {
    return apiClient.post(`/auditor/submissions/${submissionId}/clarifications`, { question });
  },
  async updateClarificationStatus(
    clarificationId: string,
    status: 'open' | 'pending' | 'resolved'
  ): Promise<Clarification> {
    return apiClient.patch(`/auditor/clarifications/${clarificationId}`, { status });
  },

  // AI Quality & Evidence Tools (Advisory review with generous timeout for LLM reasoning)
  async runAIReportQuality(submissionId: string): Promise<AIReportQualityResult> {
    const res: any = await apiClient.post(
      `/auditor/submissions/${submissionId}/ai/report-quality`,
      {},
      { timeout: 120000 }
    );
    return res?.result || res;
  },
  async runAIEvidenceReview(submissionId: string): Promise<AIEvidenceReviewResult> {
    const res: any = await apiClient.post(
      `/auditor/submissions/${submissionId}/ai/evidence-review`,
      {},
      { timeout: 120000 }
    );
    return res?.result || res;
  },
  async getAIAssessments(submissionId: string): Promise<any[]> {
    const res = await apiClient.get<any>(`/auditor/submissions/${submissionId}/ai-assessments`);
    return (res as any).items || res;
  },
};
