import { useMemo, useState } from "react";
import { format, subMonths } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend as RechartsLegend,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar as CalendarIcon,
  Minus,
  TrendingUp
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarRange } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { fetchAnalyticsSummary } from "@/services/analytics";
import type { AnalyticsSummary } from "@/types/api";
import { cn } from "@/lib/utils";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);

const buildRangeLabel = (range?: CalendarRange) => {
  if (!range?.from && !range?.to) {
    return "Select date range";
  }

  if (range.from && !range.to) {
    return `from ${format(range.from, "dd MMM yyyy")}`;
  }

  if (!range.from && range.to) {
    return `up to ${format(range.to, "dd MMM yyyy")}`;
  }

  if (range.from && range.to) {
    return `${format(range.from, "dd MMM yyyy")} • ${format(range.to, "dd MMM yyyy")}`;
  }

  return "Select date range";
};

const toFilters = (range?: CalendarRange) => {
  if (!range?.from && !range?.to) {
    return {};
  }

  return {
    startDate: range.from ? format(range.from, "yyyy-MM-dd") : undefined,
    endDate: range.to ? format(range.to, "yyyy-MM-dd") : undefined
  };
};

const COLORS = ["#2563eb", "#0ea5e9", "#22c55e", "#f97316", "#a855f7"];

const defaultRange: CalendarRange = {
  from: subMonths(new Date(), 5),
  to: new Date()
};

const chartTickFormatter = (value: number) => {
  if (Math.abs(value) >= 1_00_00_000) {
    return `${(value / 1_00_00_000).toFixed(1)}Cr`;
  }
  if (Math.abs(value) >= 1_00_000) {
    return `${(value / 1_00_000).toFixed(1)}L`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toString();
};

const getTrendIcon = (trend: "up" | "down" | "flat") => {
  if (trend === "up") return ArrowUpRight;
  if (trend === "down") return ArrowDownRight;
  return Minus;
};

const getTrendColor = (trend: "up" | "down" | "flat") => {
  if (trend === "up") return "text-emerald-500";
  if (trend === "down") return "text-rose-500";
  return "text-slate-400";
};

const getTrendLabel = (summary: AnalyticsSummary) => {
  const { start, end } = summary.range;
  const { start: prevStart, end: prevEnd } = summary.previousRange;

  if (!start || !end || !prevStart || !prevEnd) {
    return "Awaiting baseline comparison";
  }

  return `Compared to ${prevStart} to ${prevEnd}`;
};

const formatDelta = (delta: number) => {
  if (delta === 0) {
    return "No change";
  }

  const sign = delta > 0 ? "+" : "-";
  return `${sign}${formatCurrency(Math.abs(delta))}`;
};

const emptySummaryState: AnalyticsSummary = {
  range: { start: "", end: "" },
  previousRange: { start: "", end: "" },
  kpis: {
    totalRevenue: { label: "Total Revenue", value: 0, previous: 0, delta: 0, trend: "flat" },
    totalExpenditure: {
      label: "Total Expenditure",
      value: 0,
      previous: 0,
      delta: 0,
      trend: "flat"
    },
    netPosition: { label: "Net Position", value: 0, previous: 0, delta: 0, trend: "flat" }
  },
  cashFlowTrend: [],
  incomeVsExpense: [],
  revenueBreakdown: [],
  expenditureBreakdown: [],
  departmentCosts: [],
  topSpendCategories: []
};

const Analytics = () => {
  const [range, setRange] = useState<CalendarRange | undefined>(defaultRange);

  const filters = useMemo(() => toFilters(range), [range]);

  const analyticsQuery = useQuery({
    queryKey: ["analytics-summary", filters],
    queryFn: () => fetchAnalyticsSummary(filters),
    keepPreviousData: true
  });

  const summary = analyticsQuery.data ?? emptySummaryState;

  const isRangeActive = Boolean(range?.from || range?.to);

  return (
    <AppLayout disableContentPadding>
      <div className="px-4 pb-8 pt-4 md:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-2 md:mb-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Strategic Analytics
            </h1>
            <p className="text-sm text-muted-foreground md:text-base">
              Actionable insights across revenue, spending, and operational allocation.
            </p>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="lg"
                className={cn(
                  "flex items-center gap-2 rounded-2xl border-border/60 bg-background px-4 py-2 shadow-[0_15px_35px_-25px_rgba(15,23,42,0.45)] transition hover:bg-muted/80",
                  isRangeActive ? "border-primary text-primary" : "text-muted-foreground"
                )}
              >
                <CalendarIcon className="h-5 w-5" />
                <span className="text-sm font-medium">{buildRangeLabel(range)}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                numberOfMonths={2}
                selected={range}
                onSelect={setRange}
                initialFocus
              />
              {isRangeActive && (
                <div className="flex justify-end border-t border-border bg-muted/30 p-2">
                  <Button variant="ghost" size="sm" onClick={() => setRange(undefined)}>
                    Clear range
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </header>

        {analyticsQuery.isError && (
          <Alert
            variant="destructive"
            className="mb-6 flex flex-col gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle className="text-sm font-semibold">Unable to load analytics</AlertTitle>
            </div>
            <AlertDescription className="flex flex-col gap-3 text-sm text-destructive/80 sm:flex-row sm:items-center sm:justify-between">
              <span>
                We couldn&apos;t retrieve the analytics summary from the server. Please try again.
              </span>
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl border-destructive/40 text-destructive hover:bg-destructive/20 sm:w-auto"
                onClick={() => analyticsQuery.refetch()}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          {(analyticsQuery.isLoading
            ? Array.from({ length: 3 })
            : summary.kpis
              ? [summary.kpis.totalRevenue, summary.kpis.totalExpenditure, summary.kpis.netPosition]
              : []
          ).map(
            (kpi, index) => {
              if (analyticsQuery.isLoading) {
                return (
                  <Card key={`kpi-skeleton-${index}`} className="rounded-2xl border-border/60 shadow-card">
                    <CardContent className="space-y-4 pt-6">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-4 w-40" />
                    </CardContent>
                  </Card>
                );
              }

              const TrendIcon = getTrendIcon(kpi.trend);
              const trendColor = getTrendColor(kpi.trend);

              return (
                <Card
                  key={kpi.label}
                  className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-white via-white to-slate-50 shadow-[0_25px_70px_-35px_rgba(15,23,42,0.55)] transition hover:shadow-[0_30px_75px_-30px_rgba(15,23,42,0.55)] dark:from-slate-900 dark:via-slate-900 dark:to-slate-950"
                >
                  <CardHeader className="flex flex-row items-start justify-between pb-4">
                    <div>
                      <CardDescription className="text-[13px] uppercase tracking-[0.3em]">
                        {kpi.label}
                      </CardDescription>
                      <CardTitle className="mt-2 text-3xl font-semibold">
                        {formatCurrency(kpi.value)}
                      </CardTitle>
                    </div>
                    <div className="rounded-xl bg-primary/10 p-2 text-primary">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className={cn("flex items-center gap-1 font-medium", trendColor)}>
                        <TrendIcon className="h-4 w-4" />
                        {formatDelta(kpi.delta)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {analyticsQuery.isLoading ? "Calculating..." : getTrendLabel(summary)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            }
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-2xl border-border/60 shadow-card">
            <CardHeader className="flex flex-col gap-1 pb-0">
              <CardDescription className="text-xs uppercase tracking-[0.3em]">
                Financial Health
              </CardDescription>
              <CardTitle className="text-xl font-semibold">Cash Flow Trend</CardTitle>
              <p className="text-sm text-muted-foreground">
                Net cash position across the selected period
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full">
                {analyticsQuery.isLoading ? (
                  <Skeleton className="h-full w-full rounded-xl" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={summary.cashFlowTrend}>
                      <defs>
                        <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.3)" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={chartTickFormatter} tick={{ fontSize: 12 }} />
                      <RechartsTooltip
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(label) => label}
                      />
                      <Area
                        type="monotone"
                        dataKey="net"
                        stroke="#2563eb"
                        strokeWidth={2.5}
                        fill="url(#netGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 shadow-card">
            <CardHeader className="flex flex-col gap-1 pb-0">
              <CardDescription className="text-xs uppercase tracking-[0.3em]">
                Revenue vs Expense
              </CardDescription>
              <CardTitle className="text-xl font-semibold">Income vs. Expense</CardTitle>
              <p className="text-sm text-muted-foreground">
                Compare total inflows and outflows month over month
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full">
                {analyticsQuery.isLoading ? (
                  <Skeleton className="h-full w-full rounded-xl" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary.incomeVsExpense}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.3)" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={chartTickFormatter} tick={{ fontSize: 12 }} />
                      <RechartsTooltip
                        formatter={(value: number, name: string) => [
                          formatCurrency(value),
                          name === "income" ? "Income" : "Expense"
                        ]}
                      />
                      <RechartsLegend />
                      <Bar dataKey="income" name="Income" fill="#2563eb" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="expense" name="Expense" fill="#f97316" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="rounded-2xl border-border/60 shadow-card">
            <CardHeader className="pb-0">
              <CardDescription className="text-xs uppercase tracking-[0.3em]">
                Revenue Composition
              </CardDescription>
              <CardTitle className="text-xl font-semibold">Top Income Streams</CardTitle>
              <p className="text-sm text-muted-foreground">
                Top performing finance types contributing to revenue
              </p>
            </CardHeader>
            <CardContent>
              {analyticsQuery.isLoading ? (
                <Skeleton className="h-72 w-full rounded-xl" />
              ) : summary.revenueBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">No income entries within the range.</p>
              ) : (
                <div className="flex flex-col gap-6 md:flex-row md:items-center">
                  <div className="h-72 flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                        <Pie
                          data={summary.revenueBreakdown}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={70}
                          outerRadius={110}
                          paddingAngle={4}
                        >
                          {summary.revenueBreakdown.map((entry, index) => (
                            <Cell key={entry.id} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-3">
                    {summary.revenueBreakdown.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between rounded-xl border border-border/50 bg-card/80 px-4 py-3 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.45)]"
                      >
                        <div>
                          <p className="text-sm font-semibold text-foreground">{entry.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.percentage.toFixed(1)}%
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-foreground">
                          {formatCurrency(entry.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 shadow-card">
            <CardHeader className="pb-0">
              <CardDescription className="text-xs uppercase tracking-[0.3em]">
                Expense Composition
              </CardDescription>
              <CardTitle className="text-xl font-semibold">Top Expense Categories</CardTitle>
              <p className="text-sm text-muted-foreground">
                Largest outflows driven by finance types
              </p>
            </CardHeader>
            <CardContent>
              {analyticsQuery.isLoading ? (
                <Skeleton className="h-72 w-full rounded-xl" />
              ) : summary.expenditureBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">No expense entries within the range.</p>
              ) : (
                <div className="flex flex-col gap-6 md:flex-row md:items-center">
                  <div className="h-72 flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                        <Pie
                          data={summary.expenditureBreakdown}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={70}
                          outerRadius={110}
                          paddingAngle={4}
                        >
                          {summary.expenditureBreakdown.map((entry, index) => (
                            <Cell key={entry.id} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-3">
                    {summary.expenditureBreakdown.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between rounded-xl border border-border/50 bg-card/80 px-4 py-3 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.45)]"
                      >
                        <div>
                          <p className="text-sm font-semibold text-foreground">{entry.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.percentage.toFixed(1)}%
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-foreground">
                          {formatCurrency(entry.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card className="rounded-2xl border-border/60 shadow-card">
            <CardHeader className="pb-0">
              <CardDescription className="text-xs uppercase tracking-[0.3em]">
                Operational Allocation
              </CardDescription>
              <CardTitle className="text-xl font-semibold">Departmental Costs</CardTitle>
              <p className="text-sm text-muted-foreground">
                Expense distribution across departments
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                {analyticsQuery.isLoading ? (
                  <Skeleton className="h-full w-full rounded-xl" />
                ) : summary.departmentCosts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No departmental expenses recorded.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[...summary.departmentCosts].sort((a, b) => a.value - b.value)}
                      layout="vertical"
                      margin={{ top: 20, right: 30, left: 80, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.25)" />
                      <XAxis type="number" tickFormatter={chartTickFormatter} />
                      <YAxis dataKey="name" type="category" width={120} />
                      <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="value" fill="#0ea5e9" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 shadow-card">
            <CardHeader className="pb-0">
              <CardDescription className="text-xs uppercase tracking-[0.3em]">
                Spend Focus
              </CardDescription>
              <CardTitle className="text-xl font-semibold">Top Spend Categories</CardTitle>
              <p className="text-sm text-muted-foreground">
                Highest volume expense finance types by spend
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {analyticsQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              ) : summary.topSpendCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground">No spend categories to highlight.</p>
              ) : (
                summary.topSpendCategories.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between rounded-2xl border border-border/50 bg-card/80 px-4 py-3 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.65)]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {index + 1}. {entry.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.count} entries · {entry.category ?? "Expense"}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(entry.value)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </AppLayout>
  );
};

export default Analytics;

