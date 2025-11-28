export type FinanceCategory =
  | "Income"
  | "Expense"
  | "Asset"
  | "Liability"
  | (string & Record<never, never>);

export type AccountType = "Bank Account" | "Cash" | "Credit Card" | "Debit Card";

export type TransactionNature = "Debit" | "Credit";

export interface Account {
  account_id: string;
  name: string;
  account_type: AccountType;
  holder_name: string;
  card_number?: string;
  card_expiry?: string;
  card_security_code?: string;
  bank_name?: string;
  ifsc_code?: string;
  branch_name?: string;
  opening_balance: number;
  current_balance: number;
  account_number?: string;
  reference_number?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FinanceType {
  type_id: string;
  name: string;
  category: FinanceCategory;
  transaction_nature: TransactionNature;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  has_transactions?: boolean;
  linked_transaction_count?: number;
}

export interface Department {
  dept_id: string;
  name: string;
  is_active: boolean;
  description?: string;
  assigned_staff_ids?: string[];
  assigned_staff?: Staff[];
  created_at?: string;
  updated_at?: string;
}

export interface Bill {
  bill_id: string;
  transaction_id_link: number;
  type: string;
  vendor_client_name: string;
  file_url: string;
  file_name?: string | null;
  file_mime?: string | null;
  file_size?: number | null;
  uploaded_by?: string | null;
  uploaded_at?: string;
  updated_at?: string;
}

export type Role = "Super Admin" | "Admin" | "Accountant" | "Staff";

export type Gender = "Male" | "Female" | "Other";
export type ContractType = "Full-time" | "Part-time" | "Contract";
export type EmploymentStatus = "Active" | "Terminated" | "On Leave";

export interface Staff {
  staff_id: string;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
  employee_id?: string;
  phone_number?: string;
  aadhaar_number?: string;
  pan_number?: string;
  date_of_birth?: string;
  gender?: Gender | null;
  marital_status?: string;
  nationality?: string;
  address?: string;
  emergency_contact_number?: string;
  join_date?: string;
  date_of_last_promotion?: string | null;
  job_title?: string;
  department_id?: string;
  manager_id?: string;
  job_level?: string;
  contract_type?: ContractType | null;
  probation_end_date?: string | null;
  employment_status?: EmploymentStatus | null;
  date_of_resignation?: string | null;
  last_working_day?: string | null;
  account_number?: string;
  ifsc_code?: string;
  bank_name?: string;
  bank_branch?: string;
  gpay_id?: string;
  salary_paid?: number;
  salary_pending?: number;
  performance_rating?: string;
  training_certifications?: string[];
  skills_competencies?: string[];
  working_days?: number;
  leaves_taken?: number;
  overtime_hours?: number;
  attendance?: string[];
  professional_development?: string[];
  company_equipment_issued?: string[];
  company_equipment_returned?: string[];
  confidentiality_agreement_signed?: boolean;
  offer_letter_url?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TransactionSummary {
  id: number;
  reference: string;
  t_date: string;
  u_date: string;
  transaction_time?: string | null;
  transaction_datetime?: string | null;
  finance_type_id: string;
  finance_type?: {
    id: string;
    name: string | null;
    category: FinanceCategory | null;
  } | null;
  department_id: string;
  department?: {
    id: string;
    name: string | null;
  } | null;
  account_id: string;
  account?: Account | null;
  staff_id: string | null;
  staff?: Staff | null;
  bill_reference_id?: string | null;
  bill?: Bill | null;
  narration: string;
  debit: number;
  credit: number;
  expected_debit: number;
  expected_credit: number;
  running_balance: number;
  created_at?: string;
  updated_at?: string;
}

export type Transaction = TransactionSummary;

export interface Salary {
  salary_id: string;
  staff_id: string;
  pay_month: string;
  gross_salary: number;
  deductions: number;
  net_pay: number;
  transaction_id_link: number | null;
  staff?: Staff;
  transaction?: TransactionSummary;
  created_at?: string;
  updated_at?: string;
}

export type AnalyticsTrendDirection = "up" | "down" | "flat";

export interface AnalyticsKpi {
  label: string;
  value: number;
  previous: number;
  delta: number;
  trend: AnalyticsTrendDirection;
}

export interface AnalyticsTrendPoint {
  period: string;
  label: string;
  income: number;
  expense: number;
  net: number;
}

export interface AnalyticsBreakdownEntry {
  id: string;
  name: string;
  category?: FinanceCategory | null;
  value: number;
  percentage: number;
  count?: number;
}

export interface AnalyticsDepartmentCost {
  id: string;
  name: string;
  value: number;
}

export interface AnalyticsTopSpendCategory {
  id: string;
  name: string;
  category?: FinanceCategory | null;
  value: number;
  count: number;
}

export interface AnalyticsSummary {
  range: {
    start: string;
    end: string;
  };
  previousRange: {
    start: string;
    end: string;
  };
  kpis: {
    totalRevenue: AnalyticsKpi;
    totalExpenditure: AnalyticsKpi;
    netPosition: AnalyticsKpi;
  };
  cashFlowTrend: AnalyticsTrendPoint[];
  incomeVsExpense: AnalyticsTrendPoint[];
  revenueBreakdown: AnalyticsBreakdownEntry[];
  expenditureBreakdown: AnalyticsBreakdownEntry[];
  departmentCosts: AnalyticsDepartmentCost[];
  topSpendCategories: AnalyticsTopSpendCategory[];
}

export interface OpeningBalance {
  ob_id: string;
  entity_name: string;
  balance_date: string;
  balance_amount: number;
  created_by: string;
  transaction_id_link: number | null;
  created_at?: string;
  updated_at?: string;
  transaction?: TransactionSummary;
}

export type AuditActionType = "CREATED" | "UPDATED" | "DELETED";

export type AuditModule = 
  | "Transactions"
  | "Accounts"
  | "Finance Types"
  | "Departments"
  | "Staff & Roles"
  | "Opening Balance";

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action_type: AuditActionType;
  module: AuditModule;
  item_id: string;
  item_name: string;
  details: string;
}

