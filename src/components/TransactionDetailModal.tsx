import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Account, Department, FinanceType, Transaction } from "@/types/api";
import { fetchTransaction, updateTransaction, TransactionPayload } from "@/services/transactions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { TimePickerField } from "@/components/TimePickerField";
import { combineDateAndTime, displayTimeTo24Hour, format24HourToDisplay, getCurrentDisplayTime } from "@/lib/time";
import { Loader2, ExternalLink, Pencil, Save, X, RefreshCw, Link as LinkIcon } from "lucide-react";
import { format } from "date-fns";

export type ManageBillHandler = (transaction: Transaction, mode: "link" | "replace") => void;

interface TransactionDetailModalProps {
  transactionId: number | null;
  open: boolean;
  onClose: () => void;
  financeTypes: FinanceType[];
  departments: Department[];
  accounts: Account[];
  onSuccess?: () => void;
  onManageBill?: ManageBillHandler;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

const formatDate = (value: string | null | undefined, dateFormat = "dd MMM yyyy") => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return format(parsed, dateFormat);
};

interface FormState {
  t_date: string;
  u_date: string;
  transaction_time: string;
  finance_type_id: string;
  department_id: string;
  account_id: string;
  debit: string;
  credit: string;
  expected_debit: string;
  expected_credit: string;
  narration: string;
}

const emptyForm: FormState = {
  t_date: "",
  u_date: "",
  transaction_time: "",
  finance_type_id: "",
  department_id: "",
  account_id: "",
  debit: "",
  credit: "",
  expected_debit: "",
  expected_credit: "",
  narration: "",
};

export const TransactionDetailModal = ({
  transactionId,
  open,
  onClose,
  financeTypes,
  departments,
  accounts,
  onSuccess,
  onManageBill,
}: TransactionDetailModalProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formState, setFormState] = useState<FormState>(emptyForm);

  const transactionQuery = useQuery({
    queryKey: ["transaction", transactionId],
    queryFn: () => fetchTransaction(transactionId ?? 0),
    enabled: open && transactionId !== null,
  });

  useEffect(() => {
    if (transactionQuery.data && open) {
      const displayTime =
        format24HourToDisplay(transactionQuery.data.transaction_time ?? "") || getCurrentDisplayTime();
      setFormState({
        t_date: transactionQuery.data.t_date,
        u_date: transactionQuery.data.u_date ?? transactionQuery.data.t_date,
        transaction_time: displayTime,
        finance_type_id: transactionQuery.data.finance_type_id,
        department_id: transactionQuery.data.department_id,
        account_id: transactionQuery.data.account_id ?? "",
        debit: String(transactionQuery.data.debit ?? 0),
        credit: String(transactionQuery.data.credit ?? 0),
        expected_debit:
          transactionQuery.data.expected_debit && transactionQuery.data.expected_debit > 0
            ? String(transactionQuery.data.expected_debit)
            : "",
        expected_credit:
          transactionQuery.data.expected_credit && transactionQuery.data.expected_credit > 0
            ? String(transactionQuery.data.expected_credit)
            : "",
        narration: transactionQuery.data.narration ?? "",
      });
      setIsEditing(false);
    }
  }, [transactionQuery.data, open]);

  const updateMutation = useMutation({
    mutationFn: (payload: TransactionPayload) =>
      updateTransaction(transactionQuery.data!.id, payload),
    onSuccess: (updated) => {
      toast({ title: "Transaction updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transaction", transactionId] });
      setIsEditing(false);
      const displayTime = format24HourToDisplay(updated.transaction_time ?? "") || getCurrentDisplayTime();
      setFormState({
        t_date: updated.t_date,
        u_date: updated.u_date ?? updated.t_date,
        transaction_time: displayTime,
        finance_type_id: updated.finance_type_id,
        department_id: updated.department_id,
        account_id: updated.account_id ?? "",
        debit: String(updated.debit ?? 0),
        credit: String(updated.credit ?? 0),
        expected_debit: updated.expected_debit && updated.expected_debit > 0 ? String(updated.expected_debit) : "",
        expected_credit: updated.expected_credit && updated.expected_credit > 0 ? String(updated.expected_credit) : "",
        narration: updated.narration ?? "",
      });
      onSuccess?.();
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Unable to update transaction. Please try again.";
      toast({ title: "Update failed", description: message, variant: "destructive" });
    },
  });

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  const selectedFinanceType = useMemo(
    () => financeTypes.find((type) => type.type_id === formState.finance_type_id),
    [financeTypes, formState.finance_type_id],
  );

  const transaction = transactionQuery.data;
  const debitValue = parseFloat(formState.debit || "0");
  const creditValue = parseFloat(formState.credit || "0");
  const expectedDebitValue = parseFloat(formState.expected_debit || "0");
  const expectedCreditValue = parseFloat(formState.expected_credit || "0");
  const inferredNatureFromFinanceType = selectedFinanceType?.transaction_nature;
  const inferredNatureFromTransaction =
    transaction?.finance_type?.transaction_nature ??
    (transaction?.debit && transaction.debit > 0
      ? "Debit"
      : transaction?.credit && transaction.credit > 0
        ? "Credit"
        : undefined);
  const transactionNature = (inferredNatureFromFinanceType ?? inferredNatureFromTransaction ?? "Debit") as
    | "Debit"
    | "Credit";
  const isDebitNature = transactionNature === "Debit";

  const canEdit = Boolean(transaction);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!transaction) return;

    if (debitValue <= 0 && creditValue <= 0) {
      return;
    }

    if (expectedDebitValue < 0 || expectedCreditValue < 0) {
      toast({
        title: "Invalid expected amount",
        description: "Expected values cannot be negative.",
        variant: "destructive",
      });
      return;
    }

    if (expectedDebitValue > 0 && expectedCreditValue > 0) {
      toast({
        title: "Choose one expected amount",
        description: "Provide either expected debit or expected credit, not both.",
        variant: "destructive",
      });
      return;
    }

    if (!formState.account_id) {
      toast({
        title: "Account required",
        description: "Select which account this transaction belongs to.",
        variant: "destructive",
      });
      return;
    }

    const normalizedTime = displayTimeTo24Hour(formState.transaction_time);
    if (!normalizedTime) {
      toast({
        title: "Invalid time",
        description: "Please provide a valid time in HH:MM AM/PM format.",
        variant: "destructive",
      });
      return;
    }

    const transactionDateTime = combineDateAndTime(formState.t_date, normalizedTime);

    const payload: TransactionPayload = {
      t_date: formState.t_date,
      u_date: formState.u_date,
      transaction_time: normalizedTime,
      transaction_datetime: transactionDateTime,
      finance_type_id: formState.finance_type_id,
      department_id: formState.department_id,
      account_id: formState.account_id,
      narration: formState.narration,
      debit: debitValue,
      credit: creditValue,
      expected_debit: expectedDebitValue > 0 ? expectedDebitValue : 0,
      expected_credit: expectedCreditValue > 0 ? expectedCreditValue : 0,
    };

    updateMutation.mutate(payload);
  };

  const financeTypeOptions = useMemo(
    () => financeTypes.map((type) => ({ label: type.name, value: type.type_id })),
    [financeTypes],
  );
  const departmentOptions = useMemo(
    () => departments.map((department) => ({ label: department.name, value: department.dept_id })),
    [departments],
  );
  const accountOptions = useMemo(
    () => accounts.map((account) => ({ label: account.name, value: account.account_id })),
    [accounts],
  );

  const renderAuditSection = () => (
    <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Transaction ID</p>
          <p className="font-mono text-lg font-semibold text-foreground">
            {transaction?.reference ?? `TXN${transactionId?.toString().padStart(5, "0")}`}
          </p>
        </div>
        <Badge variant="outline">
          {formatDate(transaction?.transaction_datetime ?? transaction?.created_at, "dd MMM yyyy, hh:mm a")}
        </Badge>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Updation Date</p>
          <p className="text-sm font-medium text-foreground">
            {formatDate(transaction?.u_date, "dd MMM yyyy")}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">Created / Managed By</p>
          <p className="text-sm font-medium text-foreground">
            {transaction?.staff?.name ?? transaction?.staff_id ?? "—"}
          </p>
        </div>
      </div>
    </div>
  );

  const renderLedgerSection = () => (
    <div className="space-y-4 rounded-xl border border-border bg-background p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Transaction Date</Label>
          {isEditing ? (
            <Input
              type="date"
              value={formState.t_date}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, t_date: event.target.value }))
              }
            />
          ) : (
            <p className="text-sm font-medium text-foreground">{formatDate(transaction?.t_date)}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Updation Date</Label>
          {isEditing ? (
            <Input
              type="date"
              value={formState.u_date}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, u_date: event.target.value }))
              }
            />
          ) : (
            <p className="text-sm font-medium text-foreground">{formatDate(transaction?.u_date)}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Transaction Time</Label>
          {isEditing ? (
            <TimePickerField
              id="detail-transaction-time"
              value={formState.transaction_time}
              granularityMinutes={1}
              onChange={(value) => setFormState((prev) => ({ ...prev, transaction_time: value }))}
            />
          ) : (
            <p className="text-sm font-medium text-foreground">
              {format24HourToDisplay(transaction?.transaction_time ?? "") || "—"}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Finance Type</Label>
          {isEditing ? (
            <Select
              value={formState.finance_type_id}
              onValueChange={(value) => setFormState((prev) => ({ ...prev, finance_type_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select finance type" />
              </SelectTrigger>
              <SelectContent>
                {financeTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm font-medium text-foreground">
              {transaction?.finance_type?.name ?? transaction?.finance_type_id ?? "—"}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Department</Label>
          {isEditing ? (
            <Select
              value={formState.department_id}
              onValueChange={(value) => setFormState((prev) => ({ ...prev, department_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departmentOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm font-medium text-foreground">
              {transaction?.department?.name ?? transaction?.department_id ?? "—"}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Account</Label>
          {isEditing ? (
            <Select
              value={formState.account_id}
              onValueChange={(value) => setFormState((prev) => ({ ...prev, account_id: value }))}
              disabled={!accounts.length}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accountOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div>
              <p className="text-sm font-medium text-foreground">
                {transaction?.account?.name ?? transaction?.account_id ?? "—"}
              </p>
              {transaction?.account?.current_balance !== undefined && (
                <p className="text-xs text-muted-foreground">
                  Current balance: {formatCurrency(transaction.account.current_balance)}
                </p>
              )}
            </div>
          )}
          {!accounts.length && isEditing && (
            <p className="text-xs text-muted-foreground">
              No accounts available. Add one before updating the ledger entry.
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const renderMonetarySection = () => {
    const amountLabel = isDebitNature ? "Debit (₹)" : "Credit (₹)";
    const expectedLabel = isDebitNature ? "Expected Debit (₹)" : "Expected Credit (₹)";
    const actualDisplayAmount = isDebitNature
      ? Number(transaction?.debit ?? 0)
      : Number(transaction?.credit ?? 0);
    const expectedDisplayAmount = isDebitNature
      ? Number(transaction?.expected_debit ?? 0)
      : Number(transaction?.expected_credit ?? 0);
    const amountTextColor = isDebitNature ? "text-destructive" : "text-green-600";

    return (
      <div className="space-y-4 rounded-xl border border-border bg-background p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{amountLabel}</Label>
            {isEditing ? (
              <Input
                type="number"
                min="0"
                step="0.01"
                value={isDebitNature ? formState.debit : formState.credit}
                onChange={(event) => {
                  const value = event.target.value;
                  setFormState((prev) =>
                    isDebitNature
                      ? { ...prev, debit: value, credit: "" }
                      : { ...prev, credit: value, debit: "" },
                  );
                }}
              />
            ) : (
              <p className={`text-sm font-medium ${amountTextColor}`}>
                {actualDisplayAmount > 0 ? formatCurrency(actualDisplayAmount) : "—"}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{expectedLabel}</Label>
            {isEditing ? (
              <Input
                type="number"
                min="0"
                step="0.01"
                value={isDebitNature ? formState.expected_debit : formState.expected_credit}
                onChange={(event) => {
                  const value = event.target.value;
                  setFormState((prev) =>
                    isDebitNature
                      ? { ...prev, expected_debit: value, expected_credit: "" }
                      : { ...prev, expected_credit: value, expected_debit: "" },
                  );
                }}
                placeholder="0.00"
              />
            ) : (
              <p className="text-sm font-medium text-muted-foreground">
                {expectedDisplayAmount > 0 ? formatCurrency(expectedDisplayAmount) : "—"}
              </p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Narration</Label>
          {isEditing ? (
            <Textarea
              value={formState.narration}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, narration: event.target.value }))
              }
              rows={4}
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm text-foreground">{transaction?.narration ?? "—"}</p>
          )}
        </div>
      </div>
    );
  };

  const renderDocumentSection = () => {
    const linked = Boolean(transaction?.bill_reference_id);

    return (
      <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground">Bill / Voucher</p>
            <p className="text-xs text-muted-foreground">
              {linked
                ? `Linked document • ${transaction?.bill?.type ?? "Voucher"}`
                : "No supporting document attached"}
            </p>
          </div>
          <Badge variant={linked ? "outline" : "secondary"}>
            {linked ? "Linked" : "Missing"}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {linked && transaction?.bill ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => window.open(transaction.bill?.file_url, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="h-4 w-4" />
                View Document
              </Button>
              {onManageBill && (
                <Button
                  type="button"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => onManageBill(transaction, "replace")}
                >
                  <RefreshCw className="h-4 w-4" />
                  Replace
                </Button>
              )}
            </>
          ) : (
            onManageBill && (
              <Button
                type="button"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => onManageBill(transaction!, "link")}
              >
                <LinkIcon className="h-4 w-4" />
                Attach Document
              </Button>
            )
          )}
        </div>
      </div>
    );
  };

  const renderFooter = () => (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs uppercase text-muted-foreground">Running Balance</p>
        <p className="text-lg font-semibold text-foreground">
          {transaction ? formatCurrency(Number(transaction.running_balance ?? 0)) : "—"}
        </p>
      </div>
      <div className="flex gap-2">
        {canEdit && !isEditing && (
          <Button size="sm" variant="outline" className="flex items-center gap-2" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4" />
            Edit Transaction
          </Button>
        )}
        {isEditing && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (transaction) {
                  const displayTime =
                    format24HourToDisplay(transaction.transaction_time ?? "") || getCurrentDisplayTime();
                  setFormState({
                    t_date: transaction.t_date,
                    u_date: transaction.u_date ?? transaction.t_date,
                    transaction_time: displayTime,
                    finance_type_id: transaction.finance_type_id,
                    department_id: transaction.department_id,
                    account_id: transaction.account_id ?? "",
                    debit: String(transaction.debit ?? 0),
                    credit: String(transaction.credit ?? 0),
                    expected_debit:
                      transaction.expected_debit && transaction.expected_debit > 0
                        ? String(transaction.expected_debit)
                        : "",
                    expected_credit:
                      transaction.expected_credit && transaction.expected_credit > 0
                        ? String(transaction.expected_credit)
                        : "",
                    narration: transaction.narration ?? "",
                  });
                }
                setIsEditing(false);
              }}
            >
              <X className="mr-1 h-4 w-4" />
              Cancel
            </Button>
            <Button
              size="sm"
              className="flex items-center gap-2"
              type="submit"
              form="transaction-detail-form"
              disabled={updateMutation.isLoading}
            >
              {updateMutation.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </Button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(state) => !state && handleClose()}>
      <DialogContent className="flex w-[min(92vw,800px)] max-h-[95vh] flex-col overflow-hidden p-0">
        <div className="border-b border-border bg-card/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-card/75 sm:px-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg md:text-xl">Transaction Details</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Review the complete audit and ledger information for this entry.
            </DialogDescription>
          </DialogHeader>
        </div>
        {transactionQuery.isLoading ? (
          <div className="flex flex-1 items-center justify-center px-4 py-6 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading transaction details...
          </div>
        ) : transaction ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="sticky top-0 z-10 border-b border-border bg-card/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-card/75 sm:px-6">
              {renderAuditSection()}
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
              <form
                id="transaction-detail-form"
                className="space-y-6 pt-2"
                onSubmit={handleSubmit}
              >
                {renderLedgerSection()}
                {renderMonetarySection()}
                {renderDocumentSection()}
                {renderFooter()}
              </form>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center px-4 py-6 text-muted-foreground">
            Unable to load transaction details. Please try again.
          </div>
        )}

        <div className="border-t border-border bg-card/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/75 sm:px-6">
          <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Button type="button" variant="outline" onClick={handleClose}>
              Close
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

