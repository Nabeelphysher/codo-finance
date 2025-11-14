import {
  differenceInCalendarDays,
  eachMonthOfInterval,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";

import type {
  Account,
  AnalyticsSummary,
  Bill,
  Department,
  FinanceCategory,
  FinanceType,
  OpeningBalance,
  Salary,
  Staff,
  Transaction,
} from "@/types/api";
import type { PaginatedResponse } from "@/lib/api";

const now = new Date();

/***************************************************************
 * Shared Utility
 ***************************************************************/

const randomId = () => Math.random().toString(36).slice(2, 10);

const nextCounter = (() => {
  let counter = 1000;
  return () => ++counter;
})();

const clone = <T>(value: T): T => structuredClone(value);

const paginate = <T>(items: T[], perPage: number, currentPage = 1): PaginatedResponse<T> => {
  const total = items.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(currentPage, 1), lastPage);
  const start = (page - 1) * perPage;
  const data = items.slice(start, start + perPage);

  return {
    data,
    links: {
      first: "1",
      last: String(lastPage),
      prev: page > 1 ? String(page - 1) : null,
      next: page < lastPage ? String(page + 1) : null,
    },
    meta: {
      current_page: page,
      from: data.length ? start + 1 : null,
      last_page: lastPage,
      path: "/transactions",
      per_page: perPage,
      to: data.length ? start + data.length : null,
      total,
    },
  };
};

const simulateAsync = async <T>(result: T, delayMs = 120): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(clone(result)), delayMs));

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
}

const buildAnalyticsSummary = (filters: AnalyticsFilters = {}): AnalyticsSummary => {
  const today = new Date();
  let rangeEnd = filters.endDate ? parseISO(filters.endDate) : today;
  let rangeStart = filters.startDate ? parseISO(filters.startDate) : subMonths(rangeEnd, 5);

  if (rangeStart > rangeEnd) {
    [rangeStart, rangeEnd] = [rangeEnd, rangeStart];
  }

  const normalizedStart = startOfMonth(rangeStart);
  const normalizedEnd = endOfMonth(rangeEnd);

  const rangeDays = Math.max(1, differenceInCalendarDays(rangeEnd, rangeStart) + 1);
  const previousEnd = subDays(rangeStart, 1);
  const previousStart = subDays(rangeStart, rangeDays);

  const financeTypeLookup = new Map(financeTypes.map((type) => [type.type_id, type]));
  const departmentLookup = new Map(departments.map((dept) => [dept.dept_id, dept]));

  const currentTransactions = transactions.filter((txn) => {
    const date = parseISO(txn.t_date);
    return date >= rangeStart && date <= rangeEnd;
  });

  const previousTransactions = transactions.filter((txn) => {
    const date = parseISO(txn.t_date);
    return date >= previousStart && date <= previousEnd;
  });

  const monthlyBuckets = new Map<
    string,
    { key: string; label: string; income: number; expense: number }
  >();

  eachMonthOfInterval({ start: normalizedStart, end: normalizedEnd }).forEach((monthDate) => {
    const key = format(monthDate, "yyyy-MM");
    monthlyBuckets.set(key, {
      key,
      label: format(monthDate, "MMM yyyy"),
      income: 0,
      expense: 0,
    });
  });

  let totalRevenue = 0;
  let totalExpense = 0;

  const incomeBreakdown = new Map<
    string,
    { id: string; name: string; category: FinanceCategory | null; value: number; count: number }
  >();
  const expenseBreakdown = new Map<
    string,
    { id: string; name: string; category: FinanceCategory | null; value: number; count: number }
  >();
  const departmentCosts = new Map<string, { id: string; name: string; value: number }>();

  currentTransactions.forEach((txn) => {
    const txnDate = parseISO(txn.t_date);
    const monthKey = format(txnDate, "yyyy-MM");

    if (!monthlyBuckets.has(monthKey)) {
      monthlyBuckets.set(monthKey, {
        key: monthKey,
        label: format(txnDate, "MMM yyyy"),
        income: 0,
        expense: 0,
      });
    }

    const bucket = monthlyBuckets.get(monthKey)!;
    const financeType = financeTypeLookup.get(txn.finance_type_id) ?? null;
    const financeName = financeType?.name ?? txn.finance_type?.name ?? "Uncategorised";
    const financeCategory = financeType?.category ?? txn.finance_type?.category ?? null;

    if (txn.credit > 0) {
      bucket.income += txn.credit;
      totalRevenue += txn.credit;

      const entry = incomeBreakdown.get(txn.finance_type_id) ?? {
        id: txn.finance_type_id,
        name: financeName,
        category: financeCategory,
        value: 0,
        count: 0,
      };
      entry.value += txn.credit;
      entry.count += 1;
      incomeBreakdown.set(txn.finance_type_id, entry);
    }

    if (txn.debit > 0) {
      bucket.expense += txn.debit;
      totalExpense += txn.debit;

      const entry = expenseBreakdown.get(txn.finance_type_id) ?? {
        id: txn.finance_type_id,
        name: financeName,
        category: financeCategory,
        value: 0,
        count: 0,
      };
      entry.value += txn.debit;
      entry.count += 1;
      expenseBreakdown.set(txn.finance_type_id, entry);

      const department = departmentLookup.get(txn.department_id) ?? null;
      const departmentEntry = departmentCosts.get(txn.department_id) ?? {
        id: txn.department_id,
        name: department?.name ?? txn.department?.name ?? "Unassigned",
        value: 0,
      };
      departmentEntry.value += txn.debit;
      departmentCosts.set(txn.department_id, departmentEntry);
    }
  });

  const previousRevenue = previousTransactions.reduce((sum, txn) => sum + txn.credit, 0);
  const previousExpense = previousTransactions.reduce((sum, txn) => sum + txn.debit, 0);

  const monthlyData = Array.from(monthlyBuckets.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((item) => ({
      period: item.key,
      label: item.label,
      income: item.income,
      expense: item.expense,
      net: item.income - item.expense,
    }));

  const revenueBreakdown = Array.from(incomeBreakdown.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      value: item.value,
      count: item.count,
      percentage: totalRevenue > 0 ? (item.value / totalRevenue) * 100 : 0,
    }));

  const expenditureBreakdown = Array.from(expenseBreakdown.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      value: item.value,
      count: item.count,
      percentage: totalExpense > 0 ? (item.value / totalExpense) * 100 : 0,
    }));

  const topSpendCategories = Array.from(expenseBreakdown.values())
    .sort((a, b) => {
      if (b.value === a.value) {
        return b.count - a.count;
      }
      return b.value - a.value;
    })
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      value: item.value,
      count: item.count,
    }));

  const departmentCostsList = Array.from(departmentCosts.values()).sort(
    (a, b) => b.value - a.value,
  );

  const buildKpi = (label: string, value: number, previous: number) => {
    const delta = value - previous;
    const trend: AnalyticsSummary["kpis"]["totalRevenue"]["trend"] =
      delta > 0 ? "up" : delta < 0 ? "down" : "flat";

    return {
      label,
      value,
      previous,
      delta,
      trend,
    };
  };

  return {
    range: {
      start: format(rangeStart, "yyyy-MM-dd"),
      end: format(rangeEnd, "yyyy-MM-dd"),
    },
    previousRange: {
      start: format(previousStart, "yyyy-MM-dd"),
      end: format(previousEnd, "yyyy-MM-dd"),
    },
    kpis: {
      totalRevenue: buildKpi("Total Revenue", totalRevenue, previousRevenue),
      totalExpenditure: buildKpi("Total Expenditure", totalExpense, previousExpense),
      netPosition: buildKpi(
        "Net Position",
        totalRevenue - totalExpense,
        previousRevenue - previousExpense,
      ),
    },
    cashFlowTrend: monthlyData,
    incomeVsExpense: monthlyData,
    revenueBreakdown,
    expenditureBreakdown,
    departmentCosts: departmentCostsList,
    topSpendCategories,
  };
};

/***************************************************************
 * Finance Types
 ***************************************************************/

export interface FinanceTypePayload {
  type_id?: string;
  name: string;
  category: FinanceType["category"];
  transaction_nature: FinanceType["transaction_nature"];
  is_active?: boolean;
}

let financeCategories: FinanceCategory[] = ["Income", "Expense", "Asset", "Liability"];

const normalizeCategoryName = (name: string) => name.trim();

export const listFinanceCategories = () => clone(financeCategories);

export const createFinanceCategoryRecord = (name: string): FinanceCategory => {
  const normalized = normalizeCategoryName(name);
  if (!normalized) {
    throw new Error("Category name is required");
  }

  const exists = financeCategories.some(
    (category) => category.toLowerCase() === normalized.toLowerCase(),
  );

  if (exists) {
    throw new Error("Category already exists");
  }

  financeCategories = [...financeCategories, normalized as FinanceCategory];
  return normalized as FinanceCategory;
};

let financeTypes: FinanceType[] = [
  {
    type_id: "FT-INCOME-001",
    name: "Consulting Revenue",
    category: "Income",
    transaction_nature: "Credit",
    is_active: true,
    created_at: format(now, "yyyy-MM-dd'T'HH:mm:ssxxx"),
  },
  {
    type_id: "FT-EXPENSE-002",
    name: "Office Supplies",
    category: "Expense",
    transaction_nature: "Debit",
    is_active: true,
    created_at: format(now, "yyyy-MM-dd'T'HH:mm:ssxxx"),
  },
  {
    type_id: "FT-ASSET-003",
    name: "Cash on Hand",
    category: "Asset",
    transaction_nature: "Credit",
    is_active: true,
    created_at: format(now, "yyyy-MM-dd'T'HH:mm:ssxxx"),
  },
];

export const listFinanceTypes = () => clone(financeTypes);

export const createFinanceTypeRecord = (payload: FinanceTypePayload): FinanceType => {
  const type: FinanceType = {
    type_id: payload.type_id ?? `FT-${randomId()}`,
    name: payload.name,
    category: payload.category,
    transaction_nature: payload.transaction_nature,
    is_active: true, // Always true when creating - status can only be changed via edit
    created_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
  };

  if (
    !financeCategories.some(
      (category) => category.toLowerCase() === String(payload.category).toLowerCase(),
    )
  ) {
    financeCategories = [
      ...financeCategories,
      payload.category as FinanceCategory,
    ];
  }

  financeTypes = [type, ...financeTypes];
  return clone(type);
};

export const updateFinanceTypeRecord = (typeId: string, payload: Partial<FinanceTypePayload>): FinanceType => {
  financeTypes = financeTypes.map((type) =>
    type.type_id === typeId
      ? {
          ...type,
          ...payload,
          updated_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
        }
      : type,
  );

  const updated = financeTypes.find((type) => type.type_id === typeId);
  if (!updated) {
    throw new Error(`Finance type ${typeId} not found`);
  }

  return clone(updated);
};

export const deleteFinanceTypeRecord = (typeId: string) => {
  financeTypes = financeTypes.filter((type) => type.type_id !== typeId);
};

/***************************************************************
 * Accounts
 ***************************************************************/

export interface AccountPayload {
  account_id?: string;
  name: string;
  account_type: Account["account_type"];
  holder_name: string;
  card_number?: string;
  card_expiry?: string;
  card_security_code?: string;
  bank_name?: string;
  ifsc_code?: string;
  branch_name?: string;
  opening_balance: number;
  account_number?: string;
  reference_number?: string;
  is_active?: boolean;
}

let accounts: Account[] = [
  {
    account_id: "ACC-001",
    name: "HDFC Bank - Current",
    account_type: "Bank Account",
    holder_name: "CODO Innovations Pvt Ltd",
    bank_name: "HDFC Bank",
    ifsc_code: "HDFC0000123",
    branch_name: "Kozhikode Main",
    opening_balance: 200000,
    current_balance: 212450,
    account_number: "XXXX-4291",
    is_active: true,
    created_at: format(now, "yyyy-MM-dd'T'HH:mm:ssxxx"),
  },
  {
    account_id: "ACC-002",
    name: "Office Petty Cash",
    account_type: "Cash",
    holder_name: "CODO Operations",
    opening_balance: 25000,
    current_balance: 19850,
    reference_number: "PETTY-CASH-01",
    is_active: true,
    created_at: format(now, "yyyy-MM-dd'T'HH:mm:ssxxx"),
  },
  {
    account_id: "ACC-003",
    name: "Axis Corporate Card",
    account_type: "Credit Card",
    holder_name: "CODO Innovations Pvt Ltd",
    opening_balance: 0,
    current_balance: -45500,
    card_number: "XXXX-XXXX-XXXX-7744",
    card_expiry: "09/26",
    reference_number: "AXIS-7744",
    is_active: true,
    created_at: format(now, "yyyy-MM-dd'T'HH:mm:ssxxx"),
  },
];

export const listAccounts = () => clone(accounts);

export const createAccountRecord = (payload: AccountPayload): Account => {
  if (!payload.name.trim()) {
    throw new Error("Account name is required");
  }

  if (!payload.holder_name.trim()) {
    throw new Error("Account holder name is required");
  }

  const timestamp = format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx");
  const account: Account = {
    account_id: payload.account_id ?? `ACC-${randomId()}`,
    name: payload.name.trim(),
    account_type: payload.account_type,
    holder_name: payload.holder_name.trim(),
    bank_name: payload.bank_name?.trim() || undefined,
    ifsc_code: payload.ifsc_code?.trim() || undefined,
    branch_name: payload.branch_name?.trim() || undefined,
    opening_balance: payload.opening_balance,
    current_balance: payload.opening_balance,
    account_number: payload.account_number?.trim() || undefined,
    reference_number: payload.reference_number?.trim() || undefined,
    card_number: payload.card_number?.trim() || undefined,
    card_expiry: payload.card_expiry?.trim() || undefined,
    card_security_code: payload.card_security_code?.trim() || undefined,
    is_active: payload.is_active ?? true,
    created_at: timestamp,
    updated_at: timestamp,
  };

  accounts = [account, ...accounts];
  return clone(account);
};

export const updateAccountRecord = (
  accountId: string,
  payload: Partial<AccountPayload & { current_balance: number }>,
): Account => {
  let updatedAccount: Account | null = null;
  accounts = accounts.map((account) => {
    if (account.account_id !== accountId) {
      return account;
    }
    updatedAccount = {
      ...account,
      ...payload,
      holder_name: payload.holder_name?.trim() ?? account.holder_name,
      bank_name:
        payload.bank_name !== undefined ? payload.bank_name?.trim() || undefined : account.bank_name,
      ifsc_code:
        payload.ifsc_code !== undefined ? payload.ifsc_code?.trim() || undefined : account.ifsc_code,
      branch_name:
        payload.branch_name !== undefined
          ? payload.branch_name?.trim() || undefined
          : account.branch_name,
      name: payload.name?.trim() ?? account.name,
      account_number: payload.account_number?.trim() || account.account_number,
      reference_number:
        payload.reference_number !== undefined
          ? payload.reference_number?.trim() || undefined
          : account.reference_number,
      card_number:
        payload.card_number !== undefined ? payload.card_number?.trim() || undefined : account.card_number,
      card_expiry:
        payload.card_expiry !== undefined ? payload.card_expiry?.trim() || undefined : account.card_expiry,
      card_security_code:
        payload.card_security_code !== undefined
          ? payload.card_security_code?.trim() || undefined
          : account.card_security_code,
      opening_balance: payload.opening_balance ?? account.opening_balance,
      current_balance:
        payload.current_balance ??
        (payload.opening_balance !== undefined
          ? payload.opening_balance
          : account.current_balance),
      is_active: payload.is_active ?? account.is_active,
      updated_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
    };
    return updatedAccount;
  });

  if (!updatedAccount) {
    throw new Error(`Account ${accountId} not found`);
  }

  return clone(updatedAccount);
};

export const deleteAccountRecord = (accountId: string) => {
  accounts = accounts.filter((account) => account.account_id !== accountId);
};

/***************************************************************
 * Bill / Voucher document types
 ***************************************************************/

let billDocumentTypes: string[] = [
  "Expense Bill",
  "Client Invoice",
  "Journal Voucher",
  "Salary Slip",
  "Other",
];

export const listBillDocumentTypes = () => clone(billDocumentTypes);

export const createBillDocumentTypeRecord = (name: string): string => {
  const normalized = name.trim();
  if (!normalized) {
    throw new Error("Document type name is required");
  }

  const exists = billDocumentTypes.some(
    (docType) => docType.toLowerCase() === normalized.toLowerCase(),
  );

  if (exists) {
    throw new Error("Document type already exists");
  }

  billDocumentTypes = [...billDocumentTypes, normalized];
  return normalized;
};

/***************************************************************
 * Departments
 ***************************************************************/

export interface DepartmentPayload {
  dept_id?: string;
  name: string;
  is_active?: boolean;
  description?: string;
  assigned_staff_ids?: string[];
}

let departments: Department[] = [
  {
    dept_id: "DEPT-OPS",
    name: "Operations",
    is_active: true,
    description: "Oversees day-to-day company operations and client delivery.",
    assigned_staff_ids: [],
    created_at: format(now, "yyyy-MM-dd'T'HH:mm:ssxxx"),
  },
  {
    dept_id: "DEPT-FIN",
    name: "Finance",
    is_active: true,
    description: "Responsible for accounting, compliance, and reporting.",
    assigned_staff_ids: [],
    created_at: format(now, "yyyy-MM-dd'T'HH:mm:ssxxx"),
  },
  {
    dept_id: "DEPT-HR",
    name: "Human Resources",
    is_active: true,
    description: "Manages hiring, onboarding, and employee development.",
    assigned_staff_ids: [],
    created_at: format(now, "yyyy-MM-dd'T'HH:mm:ssxxx"),
  },
];

export const listDepartments = () => clone(departments);

export const createDepartmentRecord = (payload: DepartmentPayload): Department => {
  const department: Department = {
    dept_id: payload.dept_id ?? `DEPT-${randomId()}`,
    name: payload.name,
    is_active: true,
    description: payload.description?.trim() || undefined,
    assigned_staff_ids: payload.assigned_staff_ids ?? [],
    created_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
  };

  departments = [department, ...departments];
  return clone(department);
};

export const updateDepartmentRecord = (
  deptId: string,
  payload: Partial<DepartmentPayload>,
): Department => {
  departments = departments.map((department) =>
    department.dept_id === deptId
      ? {
          ...department,
          ...payload,
          description:
            payload.description !== undefined ? payload.description?.trim() || undefined : department.description,
          assigned_staff_ids:
            payload.assigned_staff_ids !== undefined ? [...payload.assigned_staff_ids] : department.assigned_staff_ids,
          updated_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
        }
      : department,
  );

  const updated = departments.find((department) => department.dept_id === deptId);
  if (!updated) {
    throw new Error(`Department ${deptId} not found`);
  }

  return clone(updated);
};

export const deleteDepartmentRecord = (deptId: string) => {
  departments = departments.filter((department) => department.dept_id !== deptId);
};

/***************************************************************
 * Staff
 ***************************************************************/

export interface StaffPayload {
  staff_id?: string;
  name: string;
  email: string;
  role: Staff["role"];
  password?: string;
  is_active?: boolean;
  employee_id: string;
  phone_number?: string;
  aadhaar_number?: string;
  pan_number?: string;
  date_of_birth?: string;
  gender?: Staff["gender"];
  marital_status?: string;
  nationality?: string;
  address?: string;
  emergency_contact_number?: string;
  join_date: string;
  date_of_last_promotion?: string | null;
  job_title?: string;
  department_id?: string;
  manager_id?: string;
  job_level?: string;
  contract_type?: Staff["contract_type"];
  probation_end_date?: string | null;
  employment_status?: Staff["employment_status"];
  date_of_resignation?: string | null;
  last_working_day?: string | null;
  account_number?: string;
  ifsc_code?: string;
  bank_name?: string;
  bank_branch?: string;
  gpay_id?: string;
  performance_rating?: string;
  training_certifications?: string[];
  skills_competencies?: string[];
  professional_development?: string[];
  company_equipment_issued?: string[];
  company_equipment_returned?: string[];
  confidentiality_agreement_signed?: boolean;
  offer_letter_url?: string;
  notes?: string;
}

let staffMembers: Staff[] = [
  {
    staff_id: "STF-001",
    name: "Amina Desai",
    email: "amina.desai@example.com",
    role: "Accountant",
    is_active: true,
    employee_id: "EMP-1001",
    phone_number: "+91-9876543210",
    aadhaar_number: "1234-5678-9012",
    pan_number: "ABCDE1234F",
    date_of_birth: "1988-03-14",
    gender: "Female",
    marital_status: "Married",
    nationality: "Indian",
    address: "12, Green Park, Mumbai",
    emergency_contact_number: "+91-9876501234",
    join_date: "2020-06-01",
    date_of_last_promotion: "2023-04-01",
    job_title: "Senior Accountant",
    department_id: "DEPT-FIN",
    manager_id: "EMP-1002",
    job_level: "Level 4",
    contract_type: "Full-time",
    probation_end_date: "2020-12-01",
    employment_status: "Active",
    account_number: "123456789012",
    ifsc_code: "HDFC0001234",
    bank_name: "HDFC Bank",
    bank_branch: "Bandra West",
    gpay_id: "amina@upi",
    salary_paid: 850000,
    salary_pending: 0,
    performance_rating: "Exceeds Expectations",
    training_certifications: ["GST Compliance", "Advanced Excel"],
    skills_competencies: ["Financial Reporting", "Tax Planning"],
    working_days: 220,
    leaves_taken: 4,
    overtime_hours: 12,
    attendance: ["2024-10-01:P", "2024-10-02:P"],
    professional_development: ["Leadership Program 2023"],
    company_equipment_issued: ["Dell Laptop", "ID Card"],
    company_equipment_returned: ["ID Card"],
    confidentiality_agreement_signed: true,
    offer_letter_url: "https://example.com/offers/amina.pdf",
    notes: "Key contributor to monthly closings",
    created_at: format(now, "yyyy-MM-dd'T'HH:mm:ssxxx"),
  },
  {
    staff_id: "STF-002",
    name: "Ravi Patel",
    email: "ravi.patel@example.com",
    role: "Admin",
    is_active: true,
    employee_id: "EMP-1002",
    phone_number: "+91-9988776655",
    aadhaar_number: "5678-9012-3456",
    pan_number: "PQRSX6789L",
    date_of_birth: "1984-09-02",
    gender: "Male",
    marital_status: "Married",
    nationality: "Indian",
    address: "4, Lotus Residency, Ahmedabad",
    emergency_contact_number: "+91-9988700000",
    join_date: "2018-02-15",
    date_of_last_promotion: "2022-01-01",
    job_title: "Operations Head",
    department_id: "DEPT-OPS",
    manager_id: null,
    job_level: "Level 5",
    contract_type: "Full-time",
    probation_end_date: "2018-08-15",
    employment_status: "Active",
    account_number: "998877665544",
    ifsc_code: "ICIC0004321",
    bank_name: "ICICI Bank",
    bank_branch: "SG Highway",
    gpay_id: "ravi@upi",
    salary_paid: 1050000,
    salary_pending: 0,
    performance_rating: "Meets Expectations",
    training_certifications: ["Operations Excellence"],
    skills_competencies: ["People Management", "Process Improvement"],
    working_days: 230,
    leaves_taken: 6,
    overtime_hours: 8,
    attendance: ["2024-10-01:P", "2024-10-02:P"],
    professional_development: ["Six Sigma Workshop"],
    company_equipment_issued: ["MacBook Pro", "Company Phone"],
    company_equipment_returned: ["Company Phone"],
    confidentiality_agreement_signed: true,
    offer_letter_url: "https://example.com/offers/ravi.pdf",
    notes: "Oversees all branch operations",
    created_at: format(now, "yyyy-MM-dd'T'HH:mm:ssxxx"),
  },
  {
    staff_id: "STF-003",
    name: "Sara Khan",
    email: "sara.khan@example.com",
    role: "Staff",
    is_active: true,
    employee_id: "EMP-1010",
    phone_number: "+91-9001234567",
    aadhaar_number: "9012-3456-7890",
    pan_number: "LMNOP5432Z",
    date_of_birth: "1992-12-22",
    gender: "Female",
    marital_status: "Single",
    nationality: "Indian",
    address: "55, Sunrise Apartments, Pune",
    emergency_contact_number: "+91-9001200000",
    join_date: "2022-07-10",
    date_of_last_promotion: null,
    job_title: "Finance Associate",
    department_id: "DEPT-FIN",
    manager_id: "EMP-1001",
    job_level: "Level 2",
    contract_type: "Full-time",
    probation_end_date: "2023-01-10",
    employment_status: "Active",
    account_number: "112233445566",
    ifsc_code: "SBIN0001234",
    bank_name: "State Bank of India",
    bank_branch: "Baner",
    gpay_id: "sara@upi",
    salary_paid: 420000,
    salary_pending: 25000,
    performance_rating: "Outstanding",
    training_certifications: ["Advanced Tally"],
    skills_competencies: ["Reconciliation", "Accounts Payable"],
    working_days: 200,
    leaves_taken: 2,
    overtime_hours: 5,
    attendance: ["2024-10-01:P", "2024-10-02:P"],
    professional_development: ["Communication Skills"],
    company_equipment_issued: ["HP Laptop"],
    company_equipment_returned: [],
    confidentiality_agreement_signed: true,
    offer_letter_url: "https://example.com/offers/sara.pdf",
    notes: "Supports monthly reconciliations",
    created_at: format(now, "yyyy-MM-dd'T'HH:mm:ssxxx"),
  },
];

export const listStaff = () => clone(staffMembers);

export const createStaffRecord = (payload: StaffPayload): Staff => {
  const staff: Staff = {
    staff_id: payload.staff_id ?? `STF-${randomId()}`,
    name: payload.name,
    email: payload.email,
    role: payload.role,
    is_active: payload.is_active ?? true,
    employee_id: payload.employee_id,
    phone_number: payload.phone_number,
    aadhaar_number: payload.aadhaar_number,
    pan_number: payload.pan_number,
    date_of_birth: payload.date_of_birth,
    gender: payload.gender ?? null,
    marital_status: payload.marital_status,
    nationality: payload.nationality,
    address: payload.address,
    emergency_contact_number: payload.emergency_contact_number,
    join_date: payload.join_date,
    date_of_last_promotion: payload.date_of_last_promotion ?? null,
    job_title: payload.job_title,
    department_id: payload.department_id,
    manager_id: payload.manager_id,
    job_level: payload.job_level,
    contract_type: payload.contract_type ?? null,
    probation_end_date: payload.probation_end_date ?? null,
    employment_status: payload.employment_status ?? "Active",
    date_of_resignation: payload.date_of_resignation ?? null,
    last_working_day: payload.last_working_day ?? null,
    account_number: payload.account_number,
    ifsc_code: payload.ifsc_code,
    bank_name: payload.bank_name,
    bank_branch: payload.bank_branch,
    gpay_id: payload.gpay_id,
    salary_paid: 0,
    salary_pending: 0,
    performance_rating: payload.performance_rating,
    training_certifications: payload.training_certifications ?? [],
    skills_competencies: payload.skills_competencies ?? [],
    working_days: 0,
    leaves_taken: 0,
    overtime_hours: 0,
    attendance: [],
    professional_development: payload.professional_development ?? [],
    company_equipment_issued: payload.company_equipment_issued ?? [],
    company_equipment_returned: payload.company_equipment_returned ?? [],
    confidentiality_agreement_signed: payload.confidentiality_agreement_signed ?? false,
    offer_letter_url: payload.offer_letter_url,
    notes: payload.notes,
    created_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
  };

  staffMembers = [staff, ...staffMembers];
  return clone(staff);
};

export const updateStaffRecord = (staffId: string, payload: Partial<StaffPayload>): Staff => {
  staffMembers = staffMembers.map((member) =>
    member.staff_id === staffId
      ? {
          ...member,
          ...payload,
          training_certifications:
            payload.training_certifications !== undefined
              ? payload.training_certifications
              : member.training_certifications,
          skills_competencies:
            payload.skills_competencies !== undefined
              ? payload.skills_competencies
              : member.skills_competencies,
          professional_development:
            payload.professional_development !== undefined
              ? payload.professional_development
              : member.professional_development,
          company_equipment_issued:
            payload.company_equipment_issued !== undefined
              ? payload.company_equipment_issued
              : member.company_equipment_issued,
          company_equipment_returned:
            payload.company_equipment_returned !== undefined
              ? payload.company_equipment_returned
              : member.company_equipment_returned,
          confidentiality_agreement_signed:
            payload.confidentiality_agreement_signed ?? member.confidentiality_agreement_signed,
          updated_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
        }
      : member,
  );

  const updated = staffMembers.find((member) => member.staff_id === staffId);
  if (!updated) {
    throw new Error(`Staff member ${staffId} not found`);
  }

  return clone(updated);
};

export const deleteStaffRecord = (staffId: string) => {
  staffMembers = staffMembers.filter((member) => member.staff_id !== staffId);
};

/***************************************************************
 * Transactions & Bills
 ***************************************************************/

export interface TransactionFilters {
  search?: string;
  finance_type_id?: string;
  department_id?: string;
  staff_id?: string;
  transaction_from?: string;
  transaction_to?: string;
  update_from?: string;
  update_to?: string;
  per_page?: number;
}

export interface TransactionBillPayload {
  type: string;
  vendor_client_name: string;
  file_url: string;
  file_name?: string;
  file_mime?: string;
  file_size?: number;
}

export interface TransactionPayload {
  t_date: string;
  u_date: string;
  finance_type_id: string;
  department_id: string;
  narration: string;
  debit: number;
  credit: number;
  expected_debit?: number;
  expected_credit?: number;
  staff_id?: string | null;
  bill?: TransactionBillPayload;
}

let bills: Bill[] = [
  {
    bill_id: "BILL-1001",
    transaction_id_link: 1,
    type: "Expense Bill",
    vendor_client_name: "Office Supplies Co.",
    file_url: "https://example.com/files/bill-1001.pdf",
    file_name: "bill-1001.pdf",
    file_mime: "application/pdf",
    file_size: 45123,
    uploaded_by: "Amina Desai",
    uploaded_at: format(now, "yyyy-MM-dd'T'HH:mm:ssxxx"),
  },
];

let transactions: Transaction[] = [
  {
    id: 1,
    reference: "TXN-2024001",
    t_date: "2024-10-01",
    u_date: "2024-10-01",
    transaction_time: "09:30",
    finance_type_id: financeTypes[0].type_id,
    finance_type: {
      id: financeTypes[0].type_id,
      name: financeTypes[0].name,
      category: financeTypes[0].category,
    },
    department_id: departments[0].dept_id,
    department: {
      id: departments[0].dept_id,
      name: departments[0].name,
    },
    staff_id: staffMembers[0].staff_id,
    staff: staffMembers[0],
    bill_reference_id: bills[0].bill_id,
    bill: bills[0],
    narration: "Consulting invoice payment received",
    debit: 0,
    credit: 120000,
    expected_debit: 0,
    expected_credit: 120000,
    running_balance: 120000,
    created_at: "2024-10-01T10:15:00+05:30",
    updated_at: "2024-10-01T10:15:00+05:30",
  },
  {
    id: 2,
    reference: "TXN-2024002",
    t_date: "2024-10-02",
    u_date: "2024-10-02",
    transaction_time: "15:00",
    finance_type_id: financeTypes[1].type_id,
    finance_type: {
      id: financeTypes[1].type_id,
      name: financeTypes[1].name,
      category: financeTypes[1].category,
    },
    department_id: departments[0].dept_id,
    department: {
      id: departments[0].dept_id,
      name: departments[0].name,
    },
    staff_id: staffMembers[1].staff_id,
    staff: staffMembers[1],
    bill_reference_id: null,
    bill: null,
    narration: "Office stationery purchase",
    debit: 15000,
    credit: 0,
    expected_debit: 14000,
    expected_credit: 0,
    running_balance: 105000,
    created_at: "2024-10-02T15:05:00+05:30",
    updated_at: "2024-10-02T15:05:00+05:30",
  },
  {
    id: 3,
    reference: "TXN-2024003",
    t_date: "2024-10-05",
    u_date: "2024-10-05",
    transaction_time: "12:20",
    finance_type_id: financeTypes[2].type_id,
    finance_type: {
      id: financeTypes[2].type_id,
      name: financeTypes[2].name,
      category: financeTypes[2].category,
    },
    department_id: departments[1].dept_id,
    department: {
      id: departments[1].dept_id,
      name: departments[1].name,
    },
    staff_id: staffMembers[0].staff_id,
    staff: staffMembers[0],
    bill_reference_id: null,
    bill: null,
    narration: "Capital infusion",
    debit: 0,
    credit: 50000,
    expected_debit: 0,
    expected_credit: 50000,
    running_balance: 155000,
    created_at: "2024-10-05T12:25:00+05:30",
    updated_at: "2024-10-05T12:25:00+05:30",
  },
];

const resolveFinanceType = (typeId: string) => {
  const type = financeTypes.find((item) => item.type_id === typeId);
  return type
    ? {
        id: type.type_id,
        name: type.name,
        category: type.category,
      }
    : null;
};

const resolveDepartment = (deptId: string) => {
  const dept = departments.find((item) => item.dept_id === deptId);
  return dept
    ? {
        id: dept.dept_id,
        name: dept.name,
      }
    : null;
};

const resolveStaff = (staffId: string | null | undefined) => {
  if (!staffId) return null;
  return staffMembers.find((member) => member.staff_id === staffId) ?? null;
};

const applyTransactionFilters = (items: Transaction[], filters: TransactionFilters) => {
  return items.filter((transaction) => {
    if (filters.finance_type_id && transaction.finance_type_id !== filters.finance_type_id) {
      return false;
    }

    if (filters.department_id && transaction.department_id !== filters.department_id) {
      return false;
    }

    if (filters.staff_id && transaction.staff_id !== filters.staff_id) {
      return false;
    }

    if (filters.transaction_from && transaction.t_date < filters.transaction_from) {
      return false;
    }

    if (filters.transaction_to && transaction.t_date > filters.transaction_to) {
      return false;
    }

    if (filters.update_from && transaction.u_date < filters.update_from) {
      return false;
    }

    if (filters.update_to && transaction.u_date > filters.update_to) {
      return false;
    }

    if (filters.search) {
      const needle = filters.search.toLowerCase();
      const haystack = [
        transaction.reference,
        transaction.narration,
        transaction.finance_type?.name ?? "",
        transaction.department?.name ?? "",
        transaction.staff?.name ?? "",
      ]
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(needle)) {
        return false;
      }
    }

    return true;
  });
};

export const listTransactions = (filters: TransactionFilters): Transaction[] => {
  const filtered = applyTransactionFilters(transactions, filters);
  return clone(filtered);
};

export const createTransactionRecord = (payload: TransactionPayload): Transaction => {
  const id = nextCounter();
  const reference = `TXN-${id}`;
  const createdAt = format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx");
  const runningBalance =
    (transactions[0]?.running_balance ?? 0) + payload.credit - payload.debit;

  const bill = payload.bill
    ? createBillRecord(id, {
        ...payload.bill,
        transaction_id: id,
      })
    : null;

  const transaction: Transaction = {
    id,
    reference,
    t_date: payload.t_date,
    u_date: payload.u_date ?? payload.t_date,
    transaction_time: format(new Date(), "HH:mm"),
    finance_type_id: payload.finance_type_id,
    finance_type: resolveFinanceType(payload.finance_type_id),
    department_id: payload.department_id,
    department: resolveDepartment(payload.department_id),
    staff_id: payload.staff_id ?? null,
    staff: resolveStaff(payload.staff_id ?? null),
    bill_reference_id: bill?.bill_id ?? null,
    bill,
    narration: payload.narration,
    debit: payload.debit,
    credit: payload.credit,
    expected_debit: payload.expected_debit ?? payload.debit,
    expected_credit: payload.expected_credit ?? payload.credit,
    running_balance: runningBalance,
    created_at: createdAt,
    updated_at: createdAt,
  };

  transactions = [transaction, ...transactions];
  return clone(transaction);
};

export const updateTransactionRecord = (
  transactionId: number,
  payload: TransactionPayload,
): Transaction => {
  const existing = transactions.find((transaction) => transaction.id === transactionId);
  if (!existing) {
    throw new Error(`Transaction ${transactionId} not found`);
  }

  let bill: Bill | null = existing.bill;
  if (payload.bill) {
    bill = createBillRecord(transactionId, {
      ...payload.bill,
      transaction_id: transactionId,
    });
  }

  const updated: Transaction = {
    ...existing,
    t_date: payload.t_date,
    finance_type_id: payload.finance_type_id,
    finance_type: resolveFinanceType(payload.finance_type_id),
    department_id: payload.department_id,
    department: resolveDepartment(payload.department_id),
    staff_id: payload.staff_id ?? null,
    staff: resolveStaff(payload.staff_id ?? null),
    narration: payload.narration,
    debit: payload.debit,
    credit: payload.credit,
    expected_debit: payload.expected_debit ?? payload.debit,
    expected_credit: payload.expected_credit ?? payload.credit,
    bill_reference_id: bill?.bill_id ?? null,
    bill,
    u_date: payload.u_date ?? payload.t_date,
    updated_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
  };

  transactions = transactions.map((transaction) =>
    transaction.id === transactionId ? updated : transaction,
  );

  return clone(updated);
};

export const deleteTransactionRecord = (transactionId: number) => {
  transactions = transactions.filter((transaction) => transaction.id !== transactionId);
  bills = bills.filter((bill) => bill.transaction_id_link !== transactionId);
};

export const getTransactionRecord = (transactionId: number): Transaction => {
  const transaction = transactions.find((item) => item.id === transactionId);
  if (!transaction) {
    throw new Error(`Transaction ${transactionId} not found`);
  }
  return clone(transaction);
};

export const paginateTransactions = (filters: TransactionFilters, perPage: number) => {
  const filtered = listTransactions(filters);
  return paginate(filtered, perPage);
};

export interface LinkBillPayload {
  transaction_id: number;
  vendor_client_name: string;
  type: string;
  file_url: string;
  file_name?: string;
  file_mime?: string;
  file_size?: number;
}

export interface UploadBillResponse {
  file_url: string;
  file_name: string;
  file_mime: string;
  file_size: number;
}

export const simulateUpload = (file: File): UploadBillResponse => {
  const timestamp = Date.now();
  const fileName = file.name || `upload-${timestamp}`;
  return {
    file_url: `blob://mock/${timestamp}/${encodeURIComponent(fileName)}`,
    file_name: fileName,
    file_mime: file.type || "application/octet-stream",
    file_size: file.size,
  };
};

export const createBillRecord = (
  transactionId: number,
  payload: LinkBillPayload,
): Bill => {
  if (
    !billDocumentTypes.some(
      (docType) => docType.toLowerCase() === payload.type.toLowerCase(),
    )
  ) {
    billDocumentTypes = [...billDocumentTypes, payload.type];
  }

  const bill: Bill = {
    bill_id: payload.file_name ? payload.file_name : `BILL-${randomId()}`,
    transaction_id_link: transactionId,
    type: payload.type,
    vendor_client_name: payload.vendor_client_name,
    file_url: payload.file_url,
    file_name: payload.file_name,
    file_mime: payload.file_mime,
    file_size: payload.file_size,
    uploaded_by: resolveStaff(payload.transaction_id)?.name ?? "System",
    uploaded_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
  };

  bills = [bill, ...bills.filter((item) => item.transaction_id_link !== transactionId)];
  return clone(bill);
};

export const linkBillRecord = (payload: LinkBillPayload): Bill => {
  return createBillRecord(payload.transaction_id, payload);
};

/***************************************************************
 * Salaries
 ***************************************************************/

export interface SalaryPayload {
  salary_id?: string;
  staff_id: string;
  pay_month: string;
  gross_salary: number;
  deductions?: number;
  net_pay?: number;
  finance_type_id?: string;
  department_id?: string;
}

let salaries: Salary[] = [
  {
    salary_id: "SAL-001",
    staff_id: staffMembers[0].staff_id,
    pay_month: "2024-10",
    gross_salary: 85000,
    deductions: 5000,
    net_pay: 80000,
    transaction_id_link: transactions[1]?.id ?? null,
    staff: staffMembers[0],
    transaction: transactions[1] ?? null,
    created_at: format(now, "yyyy-MM-dd'T'HH:mm:ssxxx"),
  },
  {
    salary_id: "SAL-002",
    staff_id: staffMembers[2].staff_id,
    pay_month: "2024-10",
    gross_salary: 60000,
    deductions: 4000,
    net_pay: 56000,
    transaction_id_link: null,
    staff: staffMembers[2],
    transaction: null,
    created_at: format(now, "yyyy-MM-dd'T'HH:mm:ssxxx"),
  },
];

export const listSalaries = () => clone(salaries);

export const createSalaryRecord = (payload: SalaryPayload): Salary => {
  const staff = resolveStaff(payload.staff_id);
  if (!staff) {
    throw new Error(`Staff member ${payload.staff_id} not found`);
  }

  const salary: Salary = {
    salary_id: payload.salary_id ?? `SAL-${randomId()}`,
    staff_id: payload.staff_id,
    pay_month: payload.pay_month,
    gross_salary: payload.gross_salary,
    deductions: payload.deductions ?? 0,
    net_pay: payload.net_pay ?? payload.gross_salary - (payload.deductions ?? 0),
    transaction_id_link: null,
    staff,
    transaction: null,
    created_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
  };

  salaries = [salary, ...salaries];
  return clone(salary);
};

export const updateSalaryRecord = (salaryId: string, payload: Partial<SalaryPayload>): Salary => {
  const existing = salaries.find((salary) => salary.salary_id === salaryId);
  if (!existing) {
    throw new Error(`Salary ${salaryId} not found`);
  }

  const staff = payload.staff_id ? resolveStaff(payload.staff_id) : existing.staff;

  const updated: Salary = {
    ...existing,
    ...payload,
    staff_id: payload.staff_id ?? existing.staff_id,
    staff: staff ?? existing.staff,
    net_pay:
      payload.net_pay ??
      (payload.gross_salary ?? existing.gross_salary) -
        (payload.deductions ?? existing.deductions ?? 0),
    updated_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx"),
  };

  if (updated.net_pay < 0) {
    updated.net_pay = 0;
  }

  if (existing.transaction && existing.transaction_id_link) {
    const transactionRecord = transactions.find(
      (transaction) => transaction.id === existing.transaction!.id,
    );

    if (transactionRecord) {
      const isDebitTransaction = transactionRecord.debit > 0;
      const narration =
        transactionRecord.narration ??
        `Payroll for ${staff?.name ?? existing.staff_id}`;

      const transactionPayload: TransactionPayload = {
        t_date: transactionRecord.t_date,
        u_date: transactionRecord.u_date ?? transactionRecord.t_date,
        finance_type_id: payload.finance_type_id ?? transactionRecord.finance_type_id,
        department_id: payload.department_id ?? transactionRecord.department_id,
        narration,
        debit: isDebitTransaction ? updated.net_pay : 0,
        credit: isDebitTransaction ? 0 : updated.net_pay,
        expected_debit: isDebitTransaction ? updated.net_pay : 0,
        expected_credit: isDebitTransaction ? 0 : updated.net_pay,
        staff_id: updated.staff_id,
      };

      const adjustedTransaction = updateTransactionRecord(
        transactionRecord.id,
        transactionPayload,
      );

      updated.transaction = {
        ...adjustedTransaction,
      };
    }
  }

  salaries = salaries.map((salary) => (salary.salary_id === salaryId ? updated : salary));
  return clone(updated);
};

export const deleteSalaryRecord = (salaryId: string) => {
  salaries = salaries.filter((salary) => salary.salary_id !== salaryId);
};

/***************************************************************
 * Opening Balance
 ***************************************************************/

export interface OpeningBalancePayload {
  balance_date: string;
  balance_amount: number;
}

let openingBalance: OpeningBalance | null = {
  ob_id: "OB-2024",
  entity_name: "Codo Accounts",
  balance_date: "2024-04-01",
  balance_amount: 75000,
  created_by: "System",
  transaction_id_link: transactions[0]?.id ?? null,
  created_at: format(now, "yyyy-MM-dd'T'HH:mm:ssxxx"),
  updated_at: format(now, "yyyy-MM-dd'T'HH:mm:ssxxx"),
  transaction: transactions[0] ?? null,
};

export type OpeningBalanceStatusResponse =
  | { status: "not_set" }
  | { status: "set"; data: OpeningBalance };

export const getOpeningBalanceStatus = (): OpeningBalanceStatusResponse => {
  if (!openingBalance) {
    return { status: "not_set" };
  }

  return {
    status: "set",
    data: clone(openingBalance),
  };
};

const upsertOpeningBalance = (payload: OpeningBalancePayload) => {
  const timestamp = format(new Date(), "yyyy-MM-dd'T'HH:mm:ssxxx");

  openingBalance = {
    ...(openingBalance ?? {
      ob_id: `OB-${randomId()}`,
      entity_name: "Codo Accounts",
      created_by: "System",
      transaction_id_link: null,
    }),
    balance_date: payload.balance_date,
    balance_amount: payload.balance_amount,
    updated_at: timestamp,
    created_at: openingBalance?.created_at ?? timestamp,
    transaction: null,
  };

  return clone(openingBalance);
};

export const setOpeningBalance = (payload: OpeningBalancePayload) => upsertOpeningBalance(payload);
export const updateOpeningBalanceRecord = (payload: OpeningBalancePayload) =>
  upsertOpeningBalance(payload);

/***************************************************************
 * Async Facade
 ***************************************************************/

export const mockDb = {
  // finance types
  listFinanceCategories: () => simulateAsync(listFinanceCategories()),
  createFinanceCategory: (name: string) => simulateAsync(createFinanceCategoryRecord(name)),
  listFinanceTypes: () => simulateAsync(listFinanceTypes()),
  createFinanceType: (payload: FinanceTypePayload) =>
    simulateAsync(createFinanceTypeRecord(payload)),
  updateFinanceType: (typeId: string, payload: Partial<FinanceTypePayload>) =>
    simulateAsync(updateFinanceTypeRecord(typeId, payload)),
  deleteFinanceType: (typeId: string) => simulateAsync(deleteFinanceTypeRecord(typeId)),
  listBillDocumentTypes: () => simulateAsync(listBillDocumentTypes()),
  createBillDocumentType: (name: string) => simulateAsync(createBillDocumentTypeRecord(name)),
  listAccounts: () => simulateAsync(listAccounts()),
  createAccount: (payload: AccountPayload) => simulateAsync(createAccountRecord(payload)),
  updateAccount: (accountId: string, payload: Partial<AccountPayload>) =>
    simulateAsync(updateAccountRecord(accountId, payload)),
  deleteAccount: (accountId: string) => simulateAsync(deleteAccountRecord(accountId)),

  // departments
  listDepartments: () => simulateAsync(listDepartments()),
  createDepartment: (payload: DepartmentPayload) =>
    simulateAsync(createDepartmentRecord(payload)),
  updateDepartment: (deptId: string, payload: Partial<DepartmentPayload>) =>
    simulateAsync(updateDepartmentRecord(deptId, payload)),
  deleteDepartment: (deptId: string) => simulateAsync(deleteDepartmentRecord(deptId)),

  // staff
  listStaff: () => simulateAsync(listStaff()),
  createStaff: (payload: StaffPayload) => simulateAsync(createStaffRecord(payload)),
  updateStaff: (staffId: string, payload: Partial<StaffPayload>) =>
    simulateAsync(updateStaffRecord(staffId, payload)),
  deleteStaff: (staffId: string) => simulateAsync(deleteStaffRecord(staffId)),

  // transactions
  paginateTransactions: (filters: TransactionFilters, perPage: number) =>
    simulateAsync(paginateTransactions(filters, perPage)),
  createTransaction: (payload: TransactionPayload) =>
    simulateAsync(createTransactionRecord(payload)),
  updateTransaction: (transactionId: number, payload: TransactionPayload) =>
    simulateAsync(updateTransactionRecord(transactionId, payload)),
  deleteTransaction: (transactionId: number) =>
    simulateAsync(deleteTransactionRecord(transactionId)),
  getTransaction: (transactionId: number) =>
    simulateAsync(getTransactionRecord(transactionId)),

  // bills
  uploadBill: (file: File) => simulateAsync(simulateUpload(file)),
  linkBill: (payload: LinkBillPayload) => simulateAsync(linkBillRecord(payload)),

  // salaries
  listSalaries: () => simulateAsync(listSalaries()),
  createSalary: (payload: SalaryPayload) => simulateAsync(createSalaryRecord(payload)),
  updateSalary: (salaryId: string, payload: Partial<SalaryPayload>) =>
    simulateAsync(updateSalaryRecord(salaryId, payload)),
  deleteSalary: (salaryId: string) => simulateAsync(deleteSalaryRecord(salaryId)),

  // opening balance
  getOpeningBalanceStatus: () => simulateAsync(getOpeningBalanceStatus()),
  setOpeningBalance: (payload: OpeningBalancePayload) =>
    simulateAsync(setOpeningBalance(payload)),
  updateOpeningBalance: (payload: OpeningBalancePayload) =>
    simulateAsync(updateOpeningBalanceRecord(payload)),

  // analytics
  getAnalyticsSummary: (filters: AnalyticsFilters) => simulateAsync(buildAnalyticsSummary(filters)),
};

export type { AccountPayload, AnalyticsFilters, PaginatedResponse };

