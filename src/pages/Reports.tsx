import { useCallback, useMemo, useRef, useState } from "react";
import { format, formatISO, startOfMonth } from "date-fns";
import { FileDown, FileSpreadsheet, Loader2, RefreshCcw } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Calendar, type CalendarRange } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/format";
import { fetchDepartments } from "@/services/departments";
import {
  fetchProfitLossReport,
  fetchTrialBalanceReport,
  type BaseReportFilters,
  type ProfitLossReport,
  type ReportsResult,
  type TrialBalanceReport,
} from "@/services/reports";
import type { Department } from "@/types/api";

type ReportType = "trial-balance" | "profit-loss";

interface ReportRequest {
  type: ReportType;
  filters: BaseReportFilters;
}

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  "trial-balance": "Trial Balance",
  "profit-loss": "Profit & Loss",
};

const DEFAULT_DATE_FORMAT = "yyyy-MM-dd";

const getRangeLabel = (range: CalendarRange | undefined, fallback: string): string => {
  if (!range?.from && !range?.to) {
    return fallback;
  }

  const from = range?.from ? format(range.from, "dd MMM yyyy") : "Start";
  const to = range?.to ? format(range.to, "dd MMM yyyy") : from;

  if (from === to) {
    return from;
  }

  return `${from} – ${to}`;
};

const buildBaseFilters = (
  range: CalendarRange | undefined,
  departmentId: string,
): BaseReportFilters => {
  const startDate = range?.from ? format(range.from, DEFAULT_DATE_FORMAT) : undefined;
  const endDate = range?.to
    ? format(range.to, DEFAULT_DATE_FORMAT)
    : range?.from
      ? format(range.from, DEFAULT_DATE_FORMAT)
      : undefined;

  return {
    startDate,
    endDate,
    departmentId: departmentId === "all" ? undefined : departmentId,
  };
};

const buildReportFileName = (type: ReportType, filters: BaseReportFilters) => {
  const datePart =
    filters.startDate && filters.endDate
      ? `${filters.startDate}_${filters.endDate}`
      : filters.endDate ?? filters.startDate ?? formatISO(new Date(), { representation: "date" });

  const departmentPart = filters.departmentId ? `_${filters.departmentId}` : "";
  return `Codo_${REPORT_TYPE_LABELS[type].replace(/\s+/g, "")}_${datePart}${departmentPart}`;
};

const buildTrialBalanceTableHtml = (report: TrialBalanceReport) => {
  const rows = report.entries
    .map(
      (entry) => `
        <tr>
          <td>${entry.accountName}</td>
          <td>${entry.category ?? ""}</td>
          <td style="text-align:right;">${entry.debit.toFixed(2)}</td>
          <td style="text-align:right;">${entry.credit.toFixed(2)}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <table border="1" cellspacing="0" cellpadding="6">
      <thead>
        <tr style="background:#f3f4f6;">
          <th align="left">Account</th>
          <th align="left">Category</th>
          <th align="right">Debit (₹)</th>
          <th align="right">Credit (₹)</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr style="font-weight:bold;">
          <td>Total</td>
          <td></td>
          <td style="text-align:right;">${report.totals.debit.toFixed(2)}</td>
          <td style="text-align:right;">${report.totals.credit.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
  `;
};

const buildProfitLossTableHtml = (report: ProfitLossReport) => {
  const renderSection = (label: string, entries: ProfitLossReport["revenue"]["entries"], total: number) => {
    if (!entries.length) return "";

    const rows = entries
      .map(
        (entry) => `
          <tr>
            <td>${entry.accountName}</td>
            <td style="text-align:right;">${entry.amount.toFixed(2)}</td>
          </tr>
        `,
      )
      .join("");

    return `
      <h3>${label}</h3>
      <table border="1" cellspacing="0" cellpadding="6">
        <thead>
          <tr style="background:#f3f4f6;">
            <th align="left">Account</th>
            <th align="right">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr style="font-weight:bold;">
            <td>Total ${label}</td>
            <td style="text-align:right;">${total.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    `;
  };

  return `
    ${renderSection("Revenue", report.revenue.entries, report.revenue.total)}
    ${renderSection("Expenses", report.expenses.entries, report.expenses.total)}
    <h3>Net Result</h3>
    <table border="1" cellspacing="0" cellpadding="6">
      <tbody>
        <tr style="font-weight:bold;">
          <td>Net Profit / (Loss)</td>
          <td style="text-align:right;">${report.netProfit.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
  `;
};

const buildExcelMarkup = (report: ReportsResult) => {
  const header = `
    <h2>${REPORT_TYPE_LABELS[report.reportType as ReportType]}</h2>
    ${
      report.reportType === "trial-balance"
        ? `<p>As at ${report.asOfDate}</p>`
        : `<p>Period: ${(report as ProfitLossReport).range.start} to ${(report as ProfitLossReport).range.end}</p>`
    }
  `;

  if (report.reportType === "trial-balance") {
    return `${header}${buildTrialBalanceTableHtml(report)}`;
  }

  return `${header}${buildProfitLossTableHtml(report)}`;
};

const openPrintWindow = (content: string, title: string) => {
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=800");
  if (!printWindow) {
    throw new Error("Unable to open print window. Please check your pop-up blocker settings.");
  }

  const styles = `
    <style>
      :root { color-scheme: only light; }
      @page { margin: 20mm; }
      body {
        font-family: "Inter", "Segoe UI", Arial, sans-serif;
        font-size: 12pt;
        color: #111827;
        margin: 0;
        padding: 0;
      }
      header {
        margin-bottom: 24px;
        padding-bottom: 12px;
        border-bottom: 1px solid #d1d5db;
      }
      h1 {
        font-size: 20pt;
        margin: 0 0 4px 0;
        color: #0f172a;
      }
      h2 {
        font-size: 14pt;
        margin: 24px 0 8px;
        color: #0f172a;
      }
      h3 {
        font-size: 12pt;
        margin: 16px 0 6px;
        color: #0f172a;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 16px;
      }
      th, td {
        border: 1px solid #e5e7eb;
        padding: 8px;
      }
      th {
        background: #f8fafc;
        text-align: left;
      }
      tfoot td {
        font-weight: 600;
      }
      .report-footer {
        position: fixed;
        bottom: 12mm;
        right: 0;
        left: 0;
        text-align: right;
        font-size: 10pt;
        color: #6b7280;
      }
      .report-footer::after {
        content: "Page " counter(page) " of " counter(pages);
      }
    </style>
  `;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>${title}</title>
        ${styles}
      </head>
      <body>
        ${content}
        <div class="report-footer"></div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};

const ReportsPage = () => {
  const [reportType, setReportType] = useState<ReportType>("trial-balance");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<CalendarRange | undefined>(() => {
    const today = new Date();
    return {
      from: startOfMonth(today),
      to: today,
    };
  });

  const reportRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();

  const departmentsQuery = useQuery<Department[]>({
    queryKey: ["departments", "reports"],
    queryFn: () => fetchDepartments(200),
    staleTime: 10 * 60 * 1000,
  });

  const reportMutation = useMutation<ReportsResult, unknown, ReportRequest>({
    mutationFn: async ({ type, filters }: ReportRequest) => {
      if (type === "trial-balance") {
        return fetchTrialBalanceReport({
          ...filters,
          asOfDate: filters.endDate ?? filters.startDate,
        });
      }
      return fetchProfitLossReport(filters);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to build the report.";
      toast({
        title: "Report generation failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const activeReport = reportMutation.data ?? null;
  const filtersForRequest = useMemo(
    () => buildBaseFilters(dateRange, departmentFilter),
    [dateRange, departmentFilter],
  );

  const selectedDepartmentName = useMemo(() => {
    if (departmentFilter === "all") {
      return undefined;
    }

    return (
      departmentsQuery.data?.find((department) => department.dept_id === departmentFilter)?.name ??
      departmentFilter
    );
  }, [departmentFilter, departmentsQuery.data]);

  const handleGenerate = useCallback(async () => {
    if (
      reportType === "profit-loss" &&
      (!filtersForRequest.startDate || !filtersForRequest.endDate)
    ) {
      toast({
        title: "Date range required",
        description: "Please select a valid start and end date to generate the Profit & Loss report.",
        variant: "destructive",
      });
      return;
    }

    await reportMutation.mutateAsync({
      type: reportType,
      filters: filtersForRequest,
    });
  }, [filtersForRequest, reportMutation, reportType, toast]);

  const handleExportPdf = useCallback(() => {
    if (!activeReport || !reportRef.current) {
      toast({
        title: "Nothing to export",
        description: "Please generate a report before exporting.",
      });
      return;
    }

    const reportHtml = reportRef.current.innerHTML;
    const headerHtml = `
      <header>
        <h1>${REPORT_TYPE_LABELS[activeReport.reportType as ReportType]}</h1>
        ${
          activeReport.reportType === "trial-balance"
            ? `<p>As at ${formatDate(activeReport.asOfDate)}</p>`
            : `<p>Period: ${formatDate((activeReport as ProfitLossReport).range.start)} – ${formatDate((activeReport as ProfitLossReport).range.end)}</p>`
        }
      </header>
    `;

    try {
      openPrintWindow(
        `${headerHtml}<main>${reportHtml}</main>`,
        REPORT_TYPE_LABELS[activeReport.reportType as ReportType],
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to open print preview.";
      toast({
        title: "Export failed",
        description: message,
        variant: "destructive",
      });
    }
  }, [activeReport, toast]);

  const handleExportExcel = useCallback(() => {
    if (!activeReport) {
      toast({
        title: "Nothing to export",
        description: "Please generate a report before exporting.",
      });
      return;
    }

    const markup = buildExcelMarkup(activeReport);
    const fileName = `${buildReportFileName(reportType, filtersForRequest)}.xls`;
    const blob = new Blob([markup], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();

    URL.revokeObjectURL(url);
  }, [activeReport, filtersForRequest, reportType, toast]);

  const isLoadingReport = reportMutation.isPending;

  const hasData = useMemo(() => {
    if (!activeReport) return false;

    if (activeReport.reportType === "profit-loss") {
      return (
        activeReport.revenue.entries.length > 0 || activeReport.expenses.entries.length > 0
      );
    }

    return activeReport.entries.length > 0;
  }, [activeReport]);

  return (
    <AppLayout title="Reports" subtitle="Generate compliant, auditor-ready statements">
      <div className="p-6 md:p-8 space-y-6">
        <section className="flex flex-col gap-4 print:hidden">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="md:flex-1 min-w-[220px]">
              <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground mb-2">
                Report Type
              </label>
              <Select value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
                <SelectTrigger className="h-12 rounded-xl border-border/60 bg-card shadow-[0_12px_32px_-18px_rgba(15,23,42,0.35)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  {Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:flex-1 min-w-[220px]">
              <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground mb-2">
                Date Range
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-12 w-full justify-start rounded-xl border-border/60 bg-background px-4 text-sm font-medium shadow-[0_12px_32px_-18px_rgba(15,23,42,0.35)] transition hover:bg-muted/80",
                    )}
                  >
                    {getRangeLabel(dateRange, "Select period")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    numberOfMonths={2}
                    selected={dateRange}
                    onSelect={setDateRange}
                  />
                  {(dateRange?.from || dateRange?.to) && (
                    <div className="flex justify-end border-t border-border bg-muted/40 p-2">
                      <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined)}>
                        Clear
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div className="md:flex-1 min-w-[220px]">
              <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground mb-2">
                Department
              </label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="h-12 rounded-xl border-border/60 bg-card shadow-[0_12px_32px_-18px_rgba(15,23,42,0.35)]">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent className="bg-card">
                  <SelectItem value="all">All Departments</SelectItem>
                  {(departmentsQuery.data ?? []).map((department) => (
                    <SelectItem key={department.dept_id} value={department.dept_id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="sticky top-4 z-20">
            <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/95 p-4 shadow-[0_22px_48px_-30px_rgba(15,23,42,0.65)] backdrop-blur print:hidden">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  className="flex-1 md:flex-none md:min-w-[200px] rounded-xl"
                  onClick={handleGenerate}
                  disabled={isLoadingReport}
                >
                  {isLoadingReport ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Generate Report
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="flex-1 md:flex-none md:min-w-[160px] rounded-xl"
                  onClick={handleExportPdf}
                  disabled={!activeReport || isLoadingReport}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Export to PDF
                </Button>

                <Button
                  variant="outline"
                  className="flex-1 md:flex-none md:min-w-[160px] rounded-xl"
                  onClick={handleExportExcel}
                  disabled={!activeReport || isLoadingReport}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export to Excel
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section
          ref={reportRef}
          className="rounded-3xl border border-border/60 bg-white shadow-[0_30px_80px_-48px_rgba(15,23,42,0.55)] px-5 py-6 md:px-8 md:py-10 print:shadow-none print:border-0 print:p-0"
        >
          {!activeReport && !isLoadingReport && (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center text-muted-foreground">
              <div className="text-3xl">🧾</div>
              <div className="space-y-1">
                <p className="text-lg font-semibold text-foreground">No report generated yet</p>
                <p className="text-sm">Select a report type, set your filters, and click “Generate Report”.</p>
              </div>
            </div>
          )}

          {isLoadingReport && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm font-medium">Preparing your report…</p>
            </div>
          )}

          {hasData && activeReport?.reportType === "trial-balance" && (
            <TrialBalanceView
              report={activeReport as TrialBalanceReport}
              departmentName={selectedDepartmentName}
            />
          )}

          {hasData && activeReport?.reportType === "profit-loss" && (
            <ProfitLossView
              report={activeReport as ProfitLossReport}
              departmentName={selectedDepartmentName}
            />
          )}

          {activeReport && !hasData && !isLoadingReport && (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center text-muted-foreground">
              <div className="text-3xl">📂</div>
              <div className="space-y-1">
                <p className="text-lg font-semibold text-foreground">No records for the selected filters</p>
                <p className="text-sm">Try expanding your date range or removing optional filters.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
};

const TrialBalanceView = ({
  report,
  departmentName,
}: {
  report: TrialBalanceReport;
  departmentName?: string;
}) => (
  <div className="space-y-6 text-foreground">
    <header className="space-y-1 border-b border-border pb-4">
      <h2 className="text-2xl font-semibold tracking-tight">Trial Balance</h2>
      <p className="text-sm text-muted-foreground">
        As at {formatDate(report.asOfDate)}
        {departmentName ? ` · Department: ${departmentName}` : " · All Departments"}
      </p>
      {!report.isBalanced && (
        <Alert variant="destructive" className="mt-4 print:border-red-500 print:bg-white">
          <AlertTitle>Out of balance</AlertTitle>
          <AlertDescription>
            Total debits ({formatCurrency(report.totals.debit)}) do not match total credits (
            {formatCurrency(report.totals.credit)}). Please investigate the ledger balances.
          </AlertDescription>
        </Alert>
      )}
    </header>

    <Table className="text-sm">
      <TableHeader className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
        <TableRow>
          <TableHead className="font-semibold">Account</TableHead>
          <TableHead className="font-semibold">Category</TableHead>
          <TableHead className="text-right font-semibold">Debit (₹)</TableHead>
          <TableHead className="text-right font-semibold">Credit (₹)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {report.entries.map((entry) => (
          <TableRow key={entry.financeTypeId} className="border-border/60">
            <TableCell className="font-medium text-slate-900">{entry.accountName}</TableCell>
            <TableCell className="text-muted-foreground">{entry.category ?? "Uncategorised"}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCurrency(entry.debit)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCurrency(entry.credit)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow className="bg-slate-900/90 text-white">
          <TableCell colSpan={2} className="text-right font-semibold uppercase tracking-[0.3em]">
            Totals
          </TableCell>
          <TableCell className="text-right font-semibold tabular-nums">
            {formatCurrency(report.totals.debit)}
          </TableCell>
          <TableCell className="text-right font-semibold tabular-nums">
            {formatCurrency(report.totals.credit)}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  </div>
);

const ProfitLossView = ({
  report,
  departmentName,
}: {
  report: ProfitLossReport;
  departmentName?: string;
}) => (
  <div className="space-y-8 text-foreground">
    <header className="space-y-1 border-b border-border pb-4">
      <h2 className="text-2xl font-semibold tracking-tight">Profit &amp; Loss Statement</h2>
      <p className="text-sm text-muted-foreground">
        Period: {formatDate(report.range.start)} – {formatDate(report.range.end)}
        {departmentName ? ` · Department: ${departmentName}` : " · All Departments"}
      </p>
    </header>

    <section className="space-y-3">
      <h3 className="text-lg font-semibold tracking-tight text-slate-900">Revenue</h3>
      {report.revenue.entries.length ? (
        <Table>
          <TableHeader className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
            <TableRow>
              <TableHead className="font-semibold">Account</TableHead>
              <TableHead className="text-right font-semibold">Amount (₹)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.revenue.entries.map((entry) => (
              <TableRow key={entry.financeTypeId} className="border-border/60">
                <TableCell className="font-medium text-slate-900">{entry.accountName}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(entry.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="bg-slate-900/90 text-white">
              <TableCell className="text-right font-semibold uppercase tracking-[0.3em]">
                Total Revenue
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {formatCurrency(report.revenue.total)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground">No revenue recorded for the selected period.</p>
      )}
    </section>

    <section className="space-y-3">
      <h3 className="text-lg font-semibold tracking-tight text-slate-900">Expenses</h3>
      {report.expenses.entries.length ? (
        <Table>
          <TableHeader className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
            <TableRow>
              <TableHead className="font-semibold">Account</TableHead>
              <TableHead className="text-right font-semibold">Amount (₹)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.expenses.entries.map((entry) => (
              <TableRow key={entry.financeTypeId} className="border-border/60">
                <TableCell className="font-medium text-slate-900">{entry.accountName}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(entry.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="bg-slate-900/90 text-white">
              <TableCell className="text-right font-semibold uppercase tracking-[0.3em]">
                Total Expenses
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {formatCurrency(report.expenses.total)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground">No expenses recorded for the selected period.</p>
      )}
    </section>

    <section className="rounded-2xl border border-border/70 bg-slate-900 text-white p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-white/70">Net Profit / (Loss)</p>
          <p className="text-2xl font-semibold tabular-nums">{formatCurrency(report.netProfit)}</p>
        </div>
        <div className="text-sm sm:text-right text-white/80">
          <p>Revenue: {formatCurrency(report.revenue.total)}</p>
          <p>Expenses: {formatCurrency(report.expenses.total)}</p>
        </div>
      </div>
    </section>
  </div>
);

export default ReportsPage;


