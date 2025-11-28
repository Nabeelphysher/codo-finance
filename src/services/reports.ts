import { formatISO, parseISO } from "date-fns";

import type { FinanceCategory } from "@/types/api";
import { mockDb, type TransactionFilters } from "./mockDatabase";

export interface BaseReportFilters {
  startDate?: string;
  endDate?: string;
  departmentId?: string;
}

export interface TrialBalanceReportFilters extends BaseReportFilters {
  asOfDate?: string;
}

export interface TrialBalanceEntry {
  financeTypeId: string;
  accountName: string;
  category: FinanceCategory | null;
  debit: number;
  credit: number;
  totalDebit: number;
  totalCredit: number;
}

export interface TrialBalanceReport {
  reportType: "trial-balance";
  generatedAt: string;
  asOfDate: string;
  entries: TrialBalanceEntry[];
  totals: {
    debit: number;
    credit: number;
  };
  isBalanced: boolean;
}

export interface ProfitLossEntry {
  financeTypeId: string;
  accountName: string;
  category: FinanceCategory | null;
  amount: number;
}

export interface ProfitLossSection {
  label: string;
  total: number;
  entries: ProfitLossEntry[];
}

export interface ProfitLossReport {
  reportType: "profit-loss";
  generatedAt: string;
  range: {
    start: string;
    end: string;
  };
  revenue: ProfitLossSection;
  expenses: ProfitLossSection;
  netProfit: number;
}

export interface TaxSectionEntry {
  financeTypeId: string;
  accountName: string;
  category: FinanceCategory | null;
  amount: number;
}

export interface TaxSection {
  heading: string;
  entries: TaxSectionEntry[];
  total: number;
}

export interface IncomeTaxStatementReport {
  reportType: "income-tax";
  generatedAt: string;
  range: {
    start: string;
    end: string;
  };
  departmentId?: string;
  incomeSections: TaxSection[];
  deductionSections: TaxSection[];
  totalIncome: number;
  totalDeductions: number;
  netTaxableIncome: number;
  notes: string[];
}

export type ReportsResult = TrialBalanceReport | ProfitLossReport | IncomeTaxStatementReport;

const toIsoDate = (value?: string): string | undefined => {
  if (!value) return undefined;
  try {
    return formatISO(parseISO(value), { representation: "date" });
  } catch (error) {
    return value;
  }
};

const buildTransactionFilters = (
  filters: BaseReportFilters,
  overrides: Partial<TransactionFilters> = {},
): TransactionFilters => {
  const base: TransactionFilters = {
    transaction_from: toIsoDate(filters.startDate),
    transaction_to: toIsoDate(filters.endDate),
  };

  if (filters.departmentId && filters.departmentId !== "all") {
    base.department_id = filters.departmentId;
  }

  return {
    ...base,
    ...overrides,
  };
};

const sumBy = (values: number[]) => values.reduce((acc, value) => acc + value, 0);

const NON_DEDUCTIBLE_KEYWORDS = ["penalty", "fine", "late fee", "personal", "income tax", "drawings"];

const classifyIncomeHeading = (name: string) => {
  const normalized = name.toLowerCase();
  if (/(interest|dividend|other income|rent|rental|misc)/.test(normalized)) {
    return "Other Income";
  }
  if (/(capital|asset sale|gain)/.test(normalized)) {
    return "Capital Gains & Asset Sales";
  }
  return "Business & Professional Income";
};

const classifyDeductionHeading = (name: string) => {
  const normalized = name.toLowerCase();
  if (/(salary|wage|staff|payroll|bonus)/.test(normalized)) {
    return "Employee Costs";
  }
  if (/(rent|lease|office|admin|utility|internet|electric|maintenance)/.test(normalized)) {
    return "Administrative & Facility Costs";
  }
  if (/(marketing|travel|client|business development|sales)/.test(normalized)) {
    return "Selling & General Expenses";
  }
  if (/(depreciation|amortization|asset)/.test(normalized)) {
    return "Depreciation & Amortisation";
  }
  if (/(professional|consultant|legal|audit)/.test(normalized)) {
    return "Professional & Compliance Fees";
  }
  return "Other Allowable Deductions";
};

const isNonDeductibleExpense = (name: string) =>
  NON_DEDUCTIBLE_KEYWORDS.some((term) => name.toLowerCase().includes(term));

const roundAmount = (value: number) => Number(value.toFixed(2));

type TaxSectionAccumulator = Map<string, TaxSection>;

const ensureSection = (container: TaxSectionAccumulator, heading: string): TaxSection => {
  const existing = container.get(heading);
  if (existing) {
    return existing;
  }

  const section: TaxSection = {
    heading,
    entries: [],
    total: 0,
  };

  container.set(heading, section);
  return section;
};

const pushTaxEntry = (
  container: TaxSectionAccumulator,
  heading: string,
  entry: TaxSectionEntry,
) => {
  const section = ensureSection(container, heading);
  const existing = section.entries.find((item) => item.financeTypeId === entry.financeTypeId);
  if (existing) {
    existing.amount += entry.amount;
  } else {
    section.entries.push(entry);
  }
  section.total += entry.amount;
};

const serializeSections = (container: TaxSectionAccumulator): TaxSection[] =>
  Array.from(container.values())
    .map((section) => ({
      heading: section.heading,
      total: roundAmount(section.total),
      entries: section.entries
        .filter((entry) => entry.amount > 0.005)
        .map((entry) => ({
          ...entry,
          amount: roundAmount(entry.amount),
        }))
        .sort((a, b) => b.amount - a.amount),
    }))
    .filter((section) => section.entries.length > 0)
    .sort((a, b) => a.heading.localeCompare(b.heading));

export async function fetchTrialBalanceReport(
  filters: TrialBalanceReportFilters = {},
): Promise<TrialBalanceReport> {
  const financeTypes = (await mockDb.listFinanceTypes()).filter((type) => type.is_active !== false);

  const asOfDate = toIsoDate(filters.asOfDate ?? filters.endDate) ?? toIsoDate(filters.startDate);
  const effectiveAsOf =
    asOfDate ??
    formatISO(new Date(), {
      representation: "date",
    });

  const transactions = await mockDb.listTransactions(
    buildTransactionFilters(filters, {
      transaction_to: effectiveAsOf,
      transaction_from: undefined,
    }),
  );

  const aggregated = new Map<
    string,
    {
      financeTypeId: string;
      accountName: string;
      category: FinanceCategory | null;
      totalDebit: number;
      totalCredit: number;
    }
  >();

  const typeLookup = new Map(financeTypes.map((type) => [type.type_id, type]));

  transactions.forEach((transaction) => {
    const type = typeLookup.get(transaction.finance_type_id);
    const entry =
      aggregated.get(transaction.finance_type_id) ??
      ({
        financeTypeId: transaction.finance_type_id,
        accountName: type?.name ?? transaction.finance_type?.name ?? "Uncategorised",
        category: type?.category ?? transaction.finance_type?.category ?? null,
        totalDebit: 0,
        totalCredit: 0,
      } satisfies TrialBalanceEntry);

    entry.totalDebit += transaction.debit;
    entry.totalCredit += transaction.credit;
    aggregated.set(transaction.finance_type_id, entry);
  });

  financeTypes.forEach((type) => {
    if (!aggregated.has(type.type_id)) {
      aggregated.set(type.type_id, {
        financeTypeId: type.type_id,
        accountName: type.name,
        category: type.category ?? null,
        totalDebit: 0,
        totalCredit: 0,
      });
    }
  });

  const entries: TrialBalanceEntry[] = Array.from(aggregated.values())
    .map((item) => {
      const balance = item.totalDebit - item.totalCredit;
      const debit = balance >= 0 ? balance : 0;
      const credit = balance < 0 ? Math.abs(balance) : 0;
      return {
        ...item,
        debit,
        credit,
      };
    })
    .sort((a, b) => a.accountName.localeCompare(b.accountName));

  const totalDebit = sumBy(entries.map((entry) => entry.debit));
  const totalCredit = sumBy(entries.map((entry) => entry.credit));
  const epsilon = 0.005;

  return {
    reportType: "trial-balance",
    generatedAt: new Date().toISOString(),
    asOfDate: effectiveAsOf,
    entries,
    totals: {
      debit: totalDebit,
      credit: totalCredit,
    },
    isBalanced: Math.abs(totalDebit - totalCredit) < epsilon,
  };
}

export async function fetchProfitLossReport(
  filters: BaseReportFilters,
): Promise<ProfitLossReport> {
  const start = toIsoDate(filters.startDate);
  const end = toIsoDate(filters.endDate);

  if (!start || !end) {
    throw new Error("A valid date range is required to generate the Profit & Loss report.");
  }

  const financeTypes = (await mockDb.listFinanceTypes()).filter((type) => type.is_active !== false);
  const typeLookup = new Map(financeTypes.map((type) => [type.type_id, type]));

  const transactions = await mockDb.listTransactions(
    buildTransactionFilters(
      { ...filters, startDate: start, endDate: end },
      {
        transaction_from: start,
        transaction_to: end,
      },
    ),
  );

  const incomeEntries = new Map<string, ProfitLossEntry>();
  const expenseEntries = new Map<string, ProfitLossEntry>();

  const ensureEntry = (
    container: Map<string, ProfitLossEntry>,
    typeId: string,
  ): ProfitLossEntry => {
    const existing = container.get(typeId);
    if (existing) return existing;

    const type = typeLookup.get(typeId);
    const entry: ProfitLossEntry = {
      financeTypeId: typeId,
      accountName: type?.name ?? "Uncategorised",
      category: type?.category ?? null,
      amount: 0,
    };
    container.set(typeId, entry);
    return entry;
  };

  transactions.forEach((transaction) => {
    const type = typeLookup.get(transaction.finance_type_id);
    const category =
      type?.category ?? transaction.finance_type?.category ?? ("Uncategorised" as FinanceCategory);

    if (category === "Income") {
      const entry = ensureEntry(incomeEntries, transaction.finance_type_id);
      entry.amount += transaction.credit - transaction.debit;
      return;
    }

    if (category === "Expense") {
      const entry = ensureEntry(expenseEntries, transaction.finance_type_id);
      entry.amount += transaction.debit - transaction.credit;
    }
  });

  const hasValue = (amount: number) => Math.abs(amount) > 0.005;

  const revenueEntries = Array.from(incomeEntries.values())
    .filter((entry) => hasValue(entry.amount))
    .sort((a, b) => b.amount - a.amount);

  const expenseResults = Array.from(expenseEntries.values())
    .filter((entry) => hasValue(entry.amount))
    .sort((a, b) => b.amount - a.amount);

  const totalRevenue = sumBy(revenueEntries.map((entry) => entry.amount));
  const totalExpenses = sumBy(expenseResults.map((entry) => entry.amount));

  return {
    reportType: "profit-loss",
    generatedAt: new Date().toISOString(),
    range: {
      start,
      end,
    },
    revenue: {
      label: "Revenue",
      total: totalRevenue,
      entries: revenueEntries,
    },
    expenses: {
      label: "Expenses",
      total: totalExpenses,
      entries: expenseResults,
    },
    netProfit: totalRevenue - totalExpenses,
  };
}

export async function fetchIncomeTaxStatementReport(
  filters: BaseReportFilters,
): Promise<IncomeTaxStatementReport> {
  const start = toIsoDate(filters.startDate);
  const end = toIsoDate(filters.endDate);

  if (!start || !end) {
    throw new Error(
      "A valid start and end date are required to generate the Income Tax Statement.",
    );
  }

  const financeTypes = (await mockDb.listFinanceTypes()).filter((type) => type.is_active !== false);
  const typeLookup = new Map(financeTypes.map((type) => [type.type_id, type]));

  const transactions = await mockDb.listTransactions(
    buildTransactionFilters(
      { ...filters, startDate: start, endDate: end },
      {
        transaction_from: start,
        transaction_to: end,
      },
    ),
  );

  const incomeAccumulator: TaxSectionAccumulator = new Map();
  const deductionAccumulator: TaxSectionAccumulator = new Map();

  transactions.forEach((transaction) => {
    const type = typeLookup.get(transaction.finance_type_id);
    const accountName = type?.name ?? transaction.finance_type?.name ?? "Uncategorised";
    const category = type?.category ?? transaction.finance_type?.category ?? null;

    const netCredit = transaction.credit - transaction.debit;
    const netDebit = transaction.debit - transaction.credit;

    if (netCredit > 0.005) {
      const heading = classifyIncomeHeading(accountName);
      pushTaxEntry(incomeAccumulator, heading, {
        financeTypeId: transaction.finance_type_id,
        accountName,
        category,
        amount: netCredit,
      });
      return;
    }

    if (netDebit > 0.005) {
      if (category === "Asset" || category === "Liability") {
        return;
      }

      if (isNonDeductibleExpense(accountName)) {
        return;
      }

      const heading = classifyDeductionHeading(accountName);
      pushTaxEntry(deductionAccumulator, heading, {
        financeTypeId: transaction.finance_type_id,
        accountName,
        category,
        amount: netDebit,
      });
    }
  });

  const incomeSections = serializeSections(incomeAccumulator);
  const deductionSections = serializeSections(deductionAccumulator);

  const totalIncome = roundAmount(sumBy(incomeSections.map((section) => section.total)));
  const totalDeductions = roundAmount(sumBy(deductionSections.map((section) => section.total)));
  const netTaxableIncome = roundAmount(totalIncome - totalDeductions);

  const departmentId =
    filters.departmentId && filters.departmentId !== "all" ? filters.departmentId : undefined;

  const notes = [
    `Tax period: ${start} to ${end}`,
    departmentId ? `Department filter applied: ${departmentId}` : "Department filter: All",
    "Non-deductible expenses automatically excluded based on policy keywords.",
  ];

  return {
    reportType: "income-tax",
    generatedAt: new Date().toISOString(),
    range: {
      start,
      end,
    },
    departmentId,
    incomeSections,
    deductionSections,
    totalIncome,
    totalDeductions,
    netTaxableIncome,
    notes,
  };
}


