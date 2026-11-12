// Scope3Track Core TypeScript Definitions matching FastAPI OpenAPI schema

export type UserRole = 'manufacturer' | 'supplier' | 'auditor';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  profile_id: string;
  active: boolean;
  created_at?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ManufacturerProfile {
  id: string;
  name: string;
  contact_email?: string;
  reporting_currency?: string;
  created_at?: string;
}

export interface SupplierRequirement {
  id?: string;
  supplier_id?: string;
  activity_id: string;
  expected_unit: string;
  aggregation_rule: 'sum'; // Only 'sum' is supported by backend
  description?: string;
  created_at?: string;
}

export interface Supplier {
  id: string;
  name: string;
  supplier_code?: string;
  contact_email: string;
  country?: string;
  contact_details?: string;
  active?: boolean;
  demo?: boolean;
  created_at?: string;
  reporting_requirements?: SupplierRequirement[];
}

export interface Auditor {
  id: string;
  name: string;
  email: string;
  employee_id?: string;
  active?: boolean;
  demo?: boolean;
  created_at?: string;
}

export interface AuditorAssignment {
  id: string;
  auditor_id: string;
  supplier_id?: string;
  submission_id?: string;
  created_at?: string;
  auditor_name?: string;
  supplier_name?: string;
}

export interface Product {
  id: string;
  product_name: string;
  product_code: string;
  scope3_category: string;
  relevant_unit: string;
  active: boolean;
  description?: string;
  created_at?: string;
}

export interface EmissionFactor {
  id: string;
  factor_type: 'spend_based' | 'activity_based' | 'product_factor';
  name?: string;
  factor_value: number;
  factor_value_usd?: number;
  fx_rate?: number;
  denominator_unit: string;
  applicable_activity?: string | null;
  currency?: string | null;
  financial_year?: string | null;
  sector_code?: string | null;
  source_name?: string;
  factor_version?: string;
  data_classification?: string;
  is_project_derived?: boolean;
  disclosure?: string;
  version?: number;
  demo?: boolean;
  created_at?: string;
}

export interface ActivityLibraryItem {
  id: string;
  name: string;
  unit: string;
  category?: string;
  description?: string;
}

export interface PurchaseRecord {
  id: string;
  supplier_id: string;
  product_id?: string;
  product_name?: string;
  reporting_month: string;
  purchased_quantity: number;
  quantity_unit: string;
  purchase_expenditure: number;
  currency: string;
  fingerprint?: string;
  calculated?: boolean;
  active_calculation_id?: string;
  active_method?: string;
  demo?: boolean;
  created_at?: string;
}

export interface PurchaseUploadError {
  row: number;
  errors: string[];
}

export interface PurchaseUploadSummary {
  id: string;
  filename: string;
  sha256: string;
  total_rows: number;
  valid_rows: any[];
  invalid_rows: PurchaseUploadError[];
  confirmed: boolean;
  created_at: string;
}

export type SubmissionStatus =
  | 'draft'
  | 'submitted'
  | 'clarification_requested'
  | 'response_submitted'
  | 'reviewed'
  | 'closed';

export interface ActivityValue {
  activity_id: string;
  value: number;
  unit: string;
  notes?: string;
  original_value?: number;
  original_unit?: string;
  normalised_value?: number;
  normalised_unit?: string;
  conversion_metadata?: {
    scale?: number;
    description?: string;
  };
  updated_at?: string;
}

export interface Submission {
  id: string;
  supplier_id: string;
  supplier_name?: string;
  reporting_month: string;
  reporting_period_type?: 'MONTHLY' | 'ANNUAL';
  financial_year?: string;
  reporting_start_date?: string;
  reporting_end_date?: string;
  status: SubmissionStatus;
  version?: number;
  submission_method?: 'MANUAL_ENTRY' | 'SPREADSHEET_UPLOAD' | 'PRELOADED_DEMO';
  activities: ActivityValue[] | Record<string, any>;
  evidence_count?: number;
  clarification_count?: number;
  is_synthetic?: boolean;
  data_classification?: string;
  source_workbook?: string;
  submitted_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EvidenceDocument {
  id: string;
  submission_id: string;
  filename: string;
  stored_filename?: string;
  size: number;
  uploaded_at: string;
  version?: number;
}

export interface Clarification {
  id: string;
  submission_id: string;
  auditor_id: string;
  auditor_name?: string;
  question: string;
  response?: string;
  status: 'open' | 'pending' | 'resolved';
  created_at: string;
  updated_at?: string;
  responded_at?: string;
}

export interface SubmissionComment {
  id: string;
  submission_id: string;
  auditor_id: string;
  auditor_name?: string;
  text: string;
  created_at: string;
}

export interface SpreadsheetPreview {
  id: string;
  submission_id: string;
  sha256: string;
  filename: string;
  worksheets: string[];
  headers: string[];
  sample: Record<string, any>[];
  rows?: Record<string, any>[];
  mapping?: Record<string, any>;
  created_at: string;
}

export interface AIMappingItem {
  activity_id: string;
  column: string | null;
  confidence: number;
  reason?: string;
}

export interface AIMappingResponse {
  suggestions: AIMappingItem[];
  requires_supplier_confirmation: boolean;
}

export interface SpreadsheetValidationResult {
  valid: boolean;
  unmapped_required_activities: string[];
  preview: Record<string, any>[];
}

export interface SavedSpreadsheetFormat {
  id: string;
  supplier_id: string;
  name: string;
  headers: string[];
  normalized_headers?: string[];
  fingerprint?: string;
  mappings: Record<string, { column: string; unit: string }>;
  created_at: string;
  updated_at: string;
  last_used_at?: string;
  version?: number;
}

export interface FormatDetectResult {
  matched: boolean;
  format: SavedSpreadsheetFormat | null;
  confidence: number;
  message: string;
}

export interface ProductFactorMethodOption {
  eligible: boolean;
  reason_code?: string;
  reason?: string;
  factor_id?: string;
  factor_name?: string;
  factor_value?: number;
  denominator_unit?: string;
  source_name?: string;
  precomputed_emissions_kgco2e?: number;
  precomputed_emissions_tco2e?: number;
  description?: string;
}

export interface ActivityBasedMethodOption {
  eligible: boolean;
  reason_code?: string;
  reason?: string;
  financial_year?: string;
  supplier_id?: string;
  purchased_quantity?: number;
  quantity_unit?: string;
  annual_production?: number;
  production_unit?: string;
  allocation_fraction?: number;
  allocation_fraction_pct?: number;
  electricity_emissions_kgco2e?: number;
  diesel_emissions_kgco2e?: number;
  facility_emissions_kgco2e?: number;
  precomputed_emissions_kgco2e?: number;
  precomputed_emissions_tco2e?: number;
  grid_factor_id?: string;
  grid_factor_value?: number;
  grid_factor_source?: string;
  diesel_factor_id?: string;
  diesel_factor_value?: number;
  diesel_factor_source?: string;
  diesel_is_project_derived?: boolean;
  diesel_disclosure?: string;
  description?: string;
}

export interface SpendBasedMethodOption {
  eligible: boolean;
  reason_code?: string;
  reason?: string;
  factor_id?: string;
  factor_version?: number;
  source_name?: string;
  is_synthetic?: boolean;
  disclosure?: string;
  sector_code?: string;
  sector_name?: string;
  financial_year?: string;
  proxy_year?: string;
  fx_rate?: number;
  spend_inr?: number;
  spend_usd?: number;
  factor_value_usd?: number;
  price_basis?: string;
  attribution?: string | null;
  license?: string;
  precomputed_emissions_kgco2e?: number;
  precomputed_emissions_tco2e?: number;
  description?: string;
}

export interface PurchaseMethodOptionsResponse {
  purchase_record_id: string;
  financial_year: string;
  product_id?: string;
  supplier_id?: string;
  purchaser_name?: string;
  methods: {
    product_factor: ProductFactorMethodOption;
    activity_based: ActivityBasedMethodOption;
    spend_based: SpendBasedMethodOption;
  };
}

export interface CalculationRun {
  id: string;
  purchase_record_id: string;
  supplier_id: string;
  product_id: string;
  reporting_month: string;
  financial_year?: string;
  scope3_category: string;
  method: 'product_factor' | 'activity_based' | 'spend_based';
  factor_id: string;
  factor_version?: number;
  factor_metadata?: {
    demo?: boolean;
    source_name?: string;
    factor_version?: number;
    is_synthetic?: boolean;
    disclosure?: string;
    data_classification?: string;
    attribution?: string | null;
    license?: string;
    price_basis?: string;
    proxy_year?: string;
    fx_rate?: number;
    factor_value_usd?: number;
    sector_code?: string;
    sector_name?: string;
    grid_factor?: { id: string; factor_value: number; version?: string | number; source?: string; is_official_reference?: boolean };
    diesel_factor?: { id: string; factor_value: number; source?: string; calculation_basis?: string; is_project_derived?: boolean; disclosure?: string };
    description?: string;
  };
  input: Record<string, any>;
  allocation_basis?: string;
  allocation_value?: number;
  formula: string;
  result_value: number;
  result_unit: string;
  components?: Array<Record<string, any>>;
  initiated_by?: string;
  is_active?: boolean;
  sha256?: string;
  verification_hash?: string;
  created_at: string;
}

export interface DashboardSummary {
  emissions_kgco2e: {
    'Category 1'?: number;
    'Category 2'?: number;
    [key: string]: number | undefined;
  };
  combined_kgco2e: number;
  method_breakdown: {
    product_factor: number;
    activity_based: number;
    spend_based: number;
  };
  method_breakdown_by_category?: {
    product_factor?: { 'Category 1'?: number; 'Category 2'?: number };
    activity_based?: { 'Category 1'?: number; 'Category 2'?: number };
    spend_based?: { 'Category 1'?: number; 'Category 2'?: number };
  };
  supplier_count: number;
  submitted_reports: number;
  pending_reports: number;
  awaiting_clarification: number;
  reporting_month: string | null;
}

export interface EmissionsReportRow {
  calculation_id: string;
  purchase_record_id: string;
  supplier_id: string;
  supplier_name?: string;
  product_id: string;
  product_name?: string;
  reporting_month: string;
  financial_year?: string;
  scope3_category: string;
  method: string;
  factor_id: string;
  factor_metadata?: Record<string, any>;
  components?: Array<Record<string, any>>;
  allocation_basis?: string;
  allocation_value?: number;
  formula?: string;
  is_active?: boolean;
  result_value: number;
  result_unit: string;
  sha256?: string;
  created_at: string;
}

export interface SupplierReportRow {
  supplier_id: string;
  supplier_name: string;
  supplier_code?: string;
  contact_email: string;
  active: boolean;
  total_calculations?: number;
  total_emissions_kgco2e?: number;
  latest_submission_status?: string;
}

export interface AIReportQualityResult {
  rating: 'Good' | 'Needs attention' | 'Poor';
  findings: Array<{ finding: string; data_reference?: string; explanation?: string } | string>;
  missing_information: string[];
  suggested_clarification_questions: string[];
  deterministic_findings?: Record<string, any>;
  created_at?: string;
}

export interface AIEvidenceReviewResult {
  rating: 'Weak' | 'Medium' | 'Good';
  findings: string[];
  matched_values: string[];
  missing_information: string[];
  limitations: string[];
  extraction_limitations?: string[];
  created_at?: string;
}

// Strictly matches backend prompt and response
export interface AIReductionSuggestion {
  related_activity: string;
  observed_value: string;
  suggested_action: string;
  why_it_may_help: string;
  expected_direction: string;
  assumptions_limitations: string;
  additional_information_required: string;
}
