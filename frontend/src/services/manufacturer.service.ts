import apiClient from './api';
import {
  ManufacturerProfile,
  Supplier,
  SupplierRequirement,
  Auditor,
  AuditorAssignment,
  Product,
  EmissionFactor,
  ActivityLibraryItem,
  PurchaseRecord,
  PurchaseUploadSummary,
  Submission,
  EvidenceDocument,
  CalculationRun,
  DashboardSummary,
  EmissionsReportRow,
  SupplierReportRow,
  PurchaseMethodOptionsResponse,
} from '../types';

export const manufacturerService = {
  // Profile (GET / PATCH)
  async getProfile(): Promise<ManufacturerProfile> {
    return apiClient.get('/manufacturer/profile');
  },
  async updateProfile(data: { name?: string; contact_email?: string; reporting_currency?: string }): Promise<ManufacturerProfile> {
    return apiClient.patch('/manufacturer/profile', data);
  },

  // Suppliers
  async getSuppliers(): Promise<Supplier[]> {
    const res = await apiClient.get<any>('/manufacturer/suppliers');
    return (res as any).items || res;
  },
  async getSupplier(id: string): Promise<Supplier> {
    return apiClient.get(`/manufacturer/suppliers/${id}`);
  },
  async createSupplier(data: {
    name: string;
    supplier_code: string;
    contact_email: string;
    login_email: string;
    initial_password: string;
    contact_details?: string;
    requirements?: SupplierRequirement[];
  }): Promise<Supplier> {
    return apiClient.post('/manufacturer/suppliers', data);
  },
  async updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier> {
    return apiClient.patch(`/manufacturer/suppliers/${id}`, data);
  },
  async setSupplierStatus(id: string, active: boolean): Promise<Supplier> {
    return apiClient.patch(`/manufacturer/suppliers/${id}/status`, { active });
  },

  // Supplier Requirements
  async getSupplierRequirements(sid: string): Promise<SupplierRequirement[]> {
    const res = await apiClient.get<any>(`/manufacturer/suppliers/${sid}/requirements`);
    return (res as any).items || res;
  },
  async setSupplierRequirements(sid: string, requirements: SupplierRequirement[]): Promise<SupplierRequirement[]> {
    const res = await apiClient.put<any>(`/manufacturer/suppliers/${sid}/requirements`, { requirements });
    return (res as any).items || res;
  },

  // Internal Auditors & Assignments
  async getAuditors(): Promise<Auditor[]> {
    const res = await apiClient.get<any>('/manufacturer/auditors');
    return (res as any).items || res;
  },
  async getAuditor(aid: string): Promise<Auditor> {
    return apiClient.get(`/manufacturer/auditors/${aid}`);
  },
  async createAuditor(data: {
    name: string;
    email: string;
    login_email: string;
    initial_password: string;
    employee_id?: string;
  }): Promise<Auditor> {
    return apiClient.post('/manufacturer/auditors', data);
  },
  async setAuditorStatus(aid: string, active: boolean): Promise<Auditor> {
    return apiClient.patch(`/manufacturer/auditors/${aid}/status`, { active });
  },
  async getAuditorAssignments(aid: string): Promise<AuditorAssignment[]> {
    const res = await apiClient.get<any>(`/manufacturer/auditors/${aid}/assignments`);
    return (res as any).items || res;
  },
  async createAuditorAssignment(aid: string, data: { supplier_id?: string; submission_id?: string }): Promise<AuditorAssignment> {
    return apiClient.post(`/manufacturer/auditors/${aid}/assignments`, data);
  },
  async deleteAuditorAssignment(aid: string, assignmentId: string): Promise<void> {
    return apiClient.delete(`/manufacturer/auditors/${aid}/assignments/${assignmentId}`);
  },

  // Products
  async getProducts(active?: boolean): Promise<Product[]> {
    const res = await apiClient.get<any>('/manufacturer/products', { params: active !== undefined ? { active } : undefined });
    return (res as any).items || res;
  },
  async createProduct(data: {
    product_name: string;
    product_code: string;
    scope3_category: string;
    relevant_unit: string;
    active?: boolean;
  }): Promise<Product> {
    return apiClient.post('/manufacturer/products', data);
  },
  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    return apiClient.patch(`/manufacturer/products/${id}`, data);
  },
  async setProductStatus(id: string, active: boolean): Promise<Product> {
    return apiClient.patch(`/manufacturer/products/${id}/status`, { active });
  },

  // Emission Factors & Activity Library
  async getEmissionFactors(type?: string): Promise<EmissionFactor[]> {
    const res = await apiClient.get<any>('/manufacturer/emission-factors', { params: type ? { factor_type: type } : undefined });
    return (res as any).items || res;
  },
  async getActivityLibrary(): Promise<ActivityLibraryItem[]> {
    const res = await apiClient.get<any>('/manufacturer/activity-library');
    return (res as any).items || res;
  },

  // Purchase Records
  async downloadPurchaseTemplate(): Promise<Blob> {
    const res = await apiClient.get('/manufacturer/purchase-records/template', {
      responseType: 'blob',
    });
    return res as unknown as Blob;
  },
  async uploadPurchases(file: File): Promise<PurchaseUploadSummary> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/manufacturer/purchase-records/uploads', formData);
  },
  async getPurchaseUploadPreview(uid: string): Promise<PurchaseUploadSummary> {
    return apiClient.get(`/manufacturer/purchase-records/uploads/${uid}`);
  },
  async confirmPurchases(uid: string): Promise<{ confirmed: boolean; purchase_records: any[] }> {
    return apiClient.post(`/manufacturer/purchase-records/uploads/${uid}/confirm`);
  },
  async getPurchases(params?: { reporting_month?: string; supplier_id?: string }): Promise<PurchaseRecord[]> {
    const res = await apiClient.get<any>('/manufacturer/purchase-records', { params });
    return (res as any).items || res;
  },

  // Submissions
  async getSubmissions(params?: { reporting_month?: string }): Promise<Submission[]> {
    const res = await apiClient.get<any>('/manufacturer/submissions', { params });
    return (res as any).items || res;
  },
  async getSubmission(id: string): Promise<Submission> {
    return apiClient.get(`/manufacturer/submissions/${id}`);
  },
  async getSubmissionEvidence(sid: string): Promise<EvidenceDocument[]> {
    const res = await apiClient.get<any>(`/manufacturer/submissions/${sid}/evidence`);
    return (res as any).items || res;
  },

  // Calculations
  async getPurchaseMethodOptions(pid: string): Promise<PurchaseMethodOptionsResponse> {
    return apiClient.get(`/manufacturer/purchases/${pid}/method-options`);
  },
  async previewCalculation(data: {
    purchase_record_id: string;
    method: 'product_factor' | 'activity_based' | 'spend_based';
    factor_id?: string;
    allocation_basis?: string;
    allocation_value?: number;
  }): Promise<CalculationRun> {
    return apiClient.post('/manufacturer/calculations', { ...data, preview_only: true });
  },
  async executeCalculation(data: {
    purchase_record_id: string;
    method: 'product_factor' | 'activity_based' | 'spend_based';
    factor_id?: string;
    allocation_basis?: string;
    allocation_value?: number;
  }): Promise<CalculationRun> {
    return apiClient.post('/manufacturer/calculations', { ...data, preview_only: false });
  },
  async runCalculation(data: {
    purchase_record_id: string;
    factor_id: string;
    method: 'product_factor' | 'activity_based' | 'spend_based';
    allocation_basis?: string;
    allocation_value?: number;
  }): Promise<CalculationRun> {
    return apiClient.post('/manufacturer/calculations', data);
  },
  async getCalculations(params?: { method?: string }): Promise<CalculationRun[]> {
    const res = await apiClient.get<any>('/manufacturer/calculations', { params });
    return (res as any).items || res;
  },
  async getCalculationReceipt(id: string): Promise<CalculationRun> {
    return apiClient.get(`/manufacturer/calculations/${id}/receipt`);
  },
  async selectActiveCalculation(id: string): Promise<CalculationRun> {
    return apiClient.post(`/manufacturer/calculations/${id}/select`);
  },

  // Dashboard Summary & Reports
  async getDashboard(reportingMonth?: string): Promise<DashboardSummary> {
    return apiClient.get('/manufacturer/dashboard/summary', {
      params: reportingMonth ? { reporting_month: reportingMonth } : undefined,
    });
  },
  async getEmissionsReport(params?: { reporting_month?: string }): Promise<EmissionsReportRow[]> {
    const res = await apiClient.get<any>('/manufacturer/reports/emissions', { params });
    return (res as any).items || res;
  },
  async getSuppliersReport(params?: { reporting_month?: string }): Promise<SupplierReportRow[]> {
    const res = await apiClient.get<any>('/manufacturer/reports/suppliers', { params });
    return (res as any).items || res;
  },
};
