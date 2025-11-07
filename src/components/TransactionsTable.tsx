import { useState, useMemo } from "react";
import { Transaction } from "@/types/transactions";
import { mockTransactions, mockBills } from "@/data/mockTransactions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, FileText, Plus, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const TransactionsTable = () => {
  const [transactions] = useState<Transaction[]>(mockTransactions);
  const [searchQuery, setSearchQuery] = useState("");
  const [financeTypeFilter, setFinanceTypeFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const financeTypes = useMemo(
    () => ["all", ...new Set(transactions.map((t) => t.finance_type))],
    [transactions]
  );

  const departments = useMemo(
    () => ["all", ...new Set(transactions.map((t) => t.department))],
    [transactions]
  );

  const filteredTransactions = useMemo(() => {
    return transactions.filter((txn) => {
      const matchesSearch =
        searchQuery === "" ||
        txn.narration.toLowerCase().includes(searchQuery.toLowerCase()) ||
        txn.transaction_id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFinanceType =
        financeTypeFilter === "all" || txn.finance_type === financeTypeFilter;

      const matchesDepartment =
        departmentFilter === "all" || txn.department === departmentFilter;

      const matchesDateFrom =
        !dateFrom || new Date(txn.t_date) >= new Date(dateFrom);

      const matchesDateTo =
        !dateTo || new Date(txn.t_date) <= new Date(dateTo);

      return (
        matchesSearch &&
        matchesFinanceType &&
        matchesDepartment &&
        matchesDateFrom &&
        matchesDateTo
      );
    });
  }, [transactions, searchQuery, financeTypeFilter, departmentFilter, dateFrom, dateTo]);

  const getBillForTransaction = (txnId: string) => {
    const txn = transactions.find((t) => t.transaction_id === txnId);
    if (!txn?.bill_reference_id) return null;
    return mockBills.find((b) => b.bill_id === txn.bill_reference_id);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground">
            Exact Accounts Transactions
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Complete ledger view with {filteredTransactions.length} of{" "}
            {transactions.length} transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-initial">
            <Download className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button size="sm" className="flex-1 sm:flex-initial">
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">New</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl p-3 md:p-4 shadow-card space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search narration or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={financeTypeFilter} onValueChange={setFinanceTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Finance Type" />
            </SelectTrigger>
            <SelectContent className="bg-card z-50">
              {financeTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type === "all" ? "All Types" : type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent className="bg-card z-50">
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept === "all" ? "All Departments" : dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            placeholder="From Date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="text-sm"
          />

          <Input
            type="date"
            placeholder="To Date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="text-sm"
          />
        </div>

        {(searchQuery || financeTypeFilter !== "all" || departmentFilter !== "all" || dateFrom || dateTo) && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Active filters:</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setFinanceTypeFilter("all");
                setDepartmentFilter("all");
                setDateFrom("");
                setDateTo("");
              }}
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-card rounded-xl shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Transaction ID</TableHead>
              <TableHead>Finance Type</TableHead>
              <TableHead>Narration</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead className="text-right">Running Balance</TableHead>
              <TableHead>Bill</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.map((txn) => {
              const bill = getBillForTransaction(txn.transaction_id);
              return (
                <TableRow key={txn.transaction_id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {formatDate(txn.t_date)}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-accent px-2 py-1 rounded">
                      {txn.transaction_id}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="whitespace-nowrap">{txn.finance_type}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="truncate" title={txn.narration}>
                      {txn.narration}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                    <div className="truncate">{txn.department}</div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-destructive whitespace-nowrap">
                    {txn.debit > 0 ? formatCurrency(txn.debit) : "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-green-600 whitespace-nowrap">
                    {txn.credit > 0 ? formatCurrency(txn.credit) : "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold whitespace-nowrap">
                    {formatCurrency(txn.running_balance)}
                  </TableCell>
                  <TableCell>
                    {bill ? (
                      <Button variant="ghost" size="sm" className="h-8">
                        <FileText className="w-4 h-4" />
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No transactions found matching your filters.
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {filteredTransactions.map((txn) => {
          const bill = getBillForTransaction(txn.transaction_id);
          return (
            <div key={txn.transaction_id} className="bg-card rounded-xl shadow-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">{txn.finance_type}</Badge>
                    {bill && (
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <FileText className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{txn.narration}</p>
                  <p className="text-xs text-muted-foreground truncate">{txn.department}</p>
                </div>
                <div className="text-right shrink-0">
                  {txn.debit > 0 && (
                    <p className="text-sm font-mono font-semibold text-destructive">
                      -{formatCurrency(txn.debit)}
                    </p>
                  )}
                  {txn.credit > 0 && (
                    <p className="text-sm font-mono font-semibold text-green-600">
                      +{formatCurrency(txn.credit)}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{formatDate(txn.t_date)}</span>
                  <code className="bg-accent px-1.5 py-0.5 rounded text-[10px]">
                    {txn.transaction_id}
                  </code>
                </div>
                <div className="font-mono font-semibold">
                  {formatCurrency(txn.running_balance)}
                </div>
              </div>
            </div>
          );
        })}

        {filteredTransactions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground bg-card rounded-xl">
            No transactions found matching your filters.
          </div>
        )}
      </div>
    </div>
  );
};
