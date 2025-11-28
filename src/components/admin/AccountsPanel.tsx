import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Account, AccountType, Transaction } from "@/types/api";
import {
  AccountPayload,
  createAccount,
  deleteAccount,
  fetchAccounts,
  updateAccount,
  restoreAccount,
} from "@/services/accounts";
import { fetchTransactions } from "@/services/transactions";
import { fetchFinanceTypes } from "@/services/financeTypes";
import { fetchDepartments } from "@/services/departments";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { useUndoToast } from "@/hooks/use-undo-toast";
import { formatCurrency } from "@/lib/format";
import { ApiError } from "@/lib/api";
import { Loader2, Pencil, Plus, RefreshCw, Trash2, Share2, Mail, Copy } from "lucide-react";
import { TransactionDetailModal } from "@/components/TransactionDetailModal";
import { format } from "date-fns";

const accountTypes: AccountType[] = ["Bank Account", "Cash", "Credit Card", "Debit Card"];

interface FormState {
  name: string;
  holder_name: string;
  account_type: AccountType;
  bank_name: string;
  branch_name: string;
  ifsc_code: string;
  opening_balance: string;
  account_number: string;
  reference_number: string;
  card_number: string;
  card_expiry: string;
  card_security_code: string;
  is_active: boolean;
}

const defaultFormState: FormState = {
  name: "",
  holder_name: "",
  account_type: "Bank Account",
  bank_name: "",
  branch_name: "",
  ifsc_code: "",
  opening_balance: "",
  account_number: "",
  reference_number: "",
  card_number: "",
  card_expiry: "",
  card_security_code: "",
  is_active: true,
};

interface AccountLedgerRow {
  transaction: Transaction;
  runningBalance: number;
  timestamp: Date;
}

export const AccountsPanel = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const showUndoToast = useUndoToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [formState, setFormState] = useState<FormState>(defaultFormState);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [viewingAccount, setViewingAccount] = useState<Account | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyAccount, setHistoryAccount] = useState<Account | null>(null);
  const [historyTransactionId, setHistoryTransactionId] = useState<number | null>(null);
  const [historyDetailOpen, setHistoryDetailOpen] = useState(false);

  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: () => fetchAccounts(200),
  });

  const financeTypesQuery = useQuery({
    queryKey: ["finance-types", "for-account-history"],
    queryFn: () => fetchFinanceTypes(200),
  });

  const departmentsQuery = useQuery({
    queryKey: ["departments", "for-account-history"],
    queryFn: () => fetchDepartments(200),
  });

  const historyTransactionsQuery = useQuery({
    queryKey: ["account-ledger", historyAccount?.account_id ?? "none"],
    queryFn: () =>
      fetchTransactions({
        account_id: historyAccount?.account_id ?? "",
        per_page: 500,
      }),
    enabled: historyDialogOpen && Boolean(historyAccount?.account_id),
  });

  const accounts = accountsQuery.data ?? [];
  const financeTypes = financeTypesQuery.data ?? [];
  const departments = departmentsQuery.data ?? [];

  const historyLedgerRows = useMemo<AccountLedgerRow[]>(() => {
    if (!historyAccount) {
      return [];
    }

    const dataset = historyTransactionsQuery.data?.data ?? [];
    if (!dataset.length) {
      return [];
    }

    const relevant = dataset.filter((txn) => txn.account_id === historyAccount.account_id);
    if (!relevant.length) {
      return [];
    }

    const ascending = [...relevant].sort(
      (a, b) => getTransactionDate(a).getTime() - getTransactionDate(b).getTime(),
    );

    let balance = historyAccount.opening_balance ?? 0;
    const computed = ascending.map((txn) => {
      balance += (txn.credit ?? 0) - (txn.debit ?? 0);
      return {
        transaction: txn,
        runningBalance: balance,
        timestamp: getTransactionDate(txn),
      };
    });

    return computed.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [historyAccount, historyTransactionsQuery.data]);

  const historyTotals = useMemo(
    () =>
      historyLedgerRows.reduce(
        (acc, row) => ({
          debit: acc.debit + (row.transaction.debit ?? 0),
          credit: acc.credit + (row.transaction.credit ?? 0),
        }),
        { debit: 0, credit: 0 },
      ),
    [historyLedgerRows],
  );

  const lastTransactionLabel = historyLedgerRows.length
    ? format(historyLedgerRows[0].timestamp, "dd MMM yyyy, hh:mm a")
    : "—";

  const openHistoryDialogForAccount = (account: Account) => {
    setHistoryAccount(account);
    setHistoryDialogOpen(true);
  };

  const closeHistoryDialog = () => {
    setHistoryDialogOpen(false);
    setHistoryAccount(null);
    setHistoryDetailOpen(false);
    setHistoryTransactionId(null);
  };

  const openHistoryTransactionDetail = (transactionId: number) => {
    setHistoryTransactionId(transactionId);
    setHistoryDetailOpen(true);
  };

  const closeHistoryTransactionDetail = () => {
    setHistoryTransactionId(null);
    setHistoryDetailOpen(false);
  };

  const showError = (error: unknown, fallback: string) => {
    const message = error instanceof ApiError ? error.message : fallback;
    toast({
      title: "Request failed",
      description: message,
      variant: "destructive",
    });
  };

  const createMutation = useMutation({
    mutationFn: (payload: AccountPayload) => createAccount(payload),
    onSuccess: () => {
      toast({ title: "Account created" });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      closeDialog();
    },
    onError: (error: unknown) => showError(error, "Unable to create account"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ accountId, payload }: { accountId: string; payload: Partial<AccountPayload> }) =>
      updateAccount(accountId, payload),
    onSuccess: () => {
      toast({ title: "Account updated" });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      closeDialog();
    },
    onError: (error: unknown) => showError(error, "Unable to update account"),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ accountId }: { accountId: string; label: string }) => deleteAccount(accountId),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      showUndoToast({
        entity: "Account",
        identifier: variables.label,
        onUndo: async () => {
          await restoreAccount(variables.accountId);
          queryClient.invalidateQueries({ queryKey: ["accounts"] });
        },
      });
    },
    onError: (error: unknown) => showError(error, "Unable to delete account"),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setFormState(defaultFormState);
  };

  const openDetailDialog = (account: Account) => {
    setViewingAccount(account);
    setDetailDialogOpen(true);
  };

  const closeDetailDialog = () => {
    setDetailDialogOpen(false);
    setViewingAccount(null);
  };

  const handleShareCopy = (account: Account) => {
    const text = formatAccountDetailsForSharing(account);
    navigator.clipboard.writeText(text).then(
      () => {
        toast({
          title: "Copied to clipboard",
          description: "Account details have been copied to your clipboard.",
        });
      },
      () => {
        toast({
          title: "Copy failed",
          description: "Unable to copy to clipboard. Please try again.",
          variant: "destructive",
        });
      },
    );
  };

  const handleShareEmail = (account: Account) => {
    const text = formatAccountDetailsForSharing(account);
    const subject = encodeURIComponent(`CODO Account Details: ${account.name}`);
    const body = encodeURIComponent(text);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleShareWhatsApp = (account: Account) => {
    const text = formatAccountDetailsForSharing(account);
    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/?text=${encodedText}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const openCreateDialog = () => {
    setEditing(null);
    setFormState(defaultFormState);
    setDialogOpen(true);
  };

  const openEditDialog = (account: Account) => {
    setEditing(account);
    setFormState({
      name: account.name,
      holder_name: account.holder_name,
      account_type: account.account_type,
      bank_name: account.bank_name ?? "",
      branch_name: account.branch_name ?? "",
      ifsc_code: account.ifsc_code ?? "",
      opening_balance: String(account.opening_balance ?? 0),
      account_number: account.account_number ?? "",
      reference_number: account.reference_number ?? "",
      card_number: account.card_number ?? "",
      card_expiry: account.card_expiry ?? "",
      card_security_code: account.card_security_code ?? "",
      is_active: account.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const openingBalance = Number(formState.opening_balance || "0");
    if (Number.isNaN(openingBalance)) {
      toast({
        title: "Invalid opening balance",
        description: "Enter a valid amount for the opening balance.",
        variant: "destructive",
      });
      return;
    }

    const holderName = formState.holder_name.trim();
    const name = formState.name.trim() || holderName;
    const bankName = formState.bank_name.trim();
    const branchName = formState.branch_name.trim();
    const ifscCode = formState.ifsc_code.trim();
    const accountNumber = formState.account_number.trim();
    const referenceNumber = formState.reference_number.trim();
    const cardNumberRaw = formState.card_number;
    const cardNumber = cardNumberRaw.replace(/\D/g, "");
    const cardExpiry = formState.card_expiry.trim();
    const cardSecurityCode = formState.card_security_code.trim();

    if (!holderName) {
      toast({
        title: "Holder name required",
        description: "Specify the legal entity or person who owns this account.",
        variant: "destructive",
      });
      return;
    }

    if (isBankAccount) {
      const missingBankFields: string[] = [];
      if (!bankName) missingBankFields.push("Bank Name");
      if (!branchName) missingBankFields.push("Branch");
      if (!ifscCode) missingBankFields.push("IFSC Code");
      if (!accountNumber) missingBankFields.push("Account Number");
      if (missingBankFields.length) {
        toast({
          title: "Missing bank details",
          description: `Please fill: ${missingBankFields.join(", ")}.`,
          variant: "destructive",
        });
        return;
      }
    }

    let normalizedExpiry = cardExpiry;

    if (isCardAccount) {
      if (!cardNumber || cardNumber.length < 13 || cardNumber.length > 19) {
        toast({
          title: "Invalid card number",
          description: "Enter a valid card number (13-19 digits, numbers only).",
          variant: "destructive",
        });
        return;
      }

      const expiryPattern = /^(0[1-9]|1[0-2])\/?\d{2}$/;
      if (!expiryPattern.test(cardExpiry)) {
        toast({
          title: "Invalid expiry date",
          description: "Use the MM/YY format (e.g., 09/26).",
          variant: "destructive",
        });
        return;
      }
      normalizedExpiry =
        cardExpiry.length === 4
          ? `${cardExpiry.slice(0, 2)}/${cardExpiry.slice(2)}`
          : cardExpiry;

      if (cardSecurityCode && (cardSecurityCode.length < 3 || cardSecurityCode.length > 4 || /\D/.test(cardSecurityCode))) {
        toast({
          title: "Invalid security code",
          description: "CVV/CVC must be 3 or 4 digits.",
          variant: "destructive",
        });
        return;
      }
    }

    const payload: AccountPayload = {
      name,
      holder_name: holderName,
      account_type: formState.account_type,
      opening_balance: openingBalance,
      bank_name: isBankAccount ? bankName : undefined,
      branch_name: isBankAccount ? branchName : undefined,
      ifsc_code: isBankAccount ? ifscCode : undefined,
      account_number: isBankAccount ? accountNumber : undefined,
      reference_number: !isBankAccount && !isCardAccount ? referenceNumber || undefined : undefined,
      card_number: isCardAccount ? cardNumber : undefined,
      card_expiry: isCardAccount ? normalizedExpiry : undefined,
      card_security_code: isCardAccount && cardSecurityCode ? cardSecurityCode : undefined,
      is_active: formState.is_active,
    };

    if (!isBankAccount && !isCardAccount && referenceNumber) {
      payload.reference_number = referenceNumber;
    }

    if (editing) {
      updateMutation.mutate({ accountId: editing.account_id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const toggleActive = (account: Account) => {
    updateMutation.mutate({
      accountId: account.account_id,
      payload: { is_active: !account.is_active },
    });
  };

  const sortedAccounts = useMemo(() => {
    if (!accountsQuery.data) {
      return [];
    }

    return [...accountsQuery.data].sort((a, b) => a.name.localeCompare(b.name));
  }, [accountsQuery.data]);

  const isBankAccount = formState.account_type === "Bank Account";
  const isCardAccount =
    formState.account_type === "Credit Card" || formState.account_type === "Debit Card";

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Manage Accounts</h2>
            <p className="text-sm text-muted-foreground">Control bank, cash, and card accounts</p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => accountsQuery.refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              New Account
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table className="min-w-[820px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Current Balance</TableHead>
                  <TableHead>Holder</TableHead>
                  <TableHead>Account No./Reference</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountsQuery.isLoading && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-6 text-center text-muted-foreground">
                      <Loader2 className="mr-2 inline-block h-4 w-4 animate-spin" />
                      Loading accounts...
                    </TableCell>
                  </TableRow>
                )}

                {accountsQuery.isError && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-6 text-center text-destructive">
                      Failed to load accounts.
                    </TableCell>
                  </TableRow>
                )}

                {!accountsQuery.isLoading &&
                  sortedAccounts.map((account) => (
                    <TableRow
                      key={account.account_id}
                      onClick={() => openDetailDialog(account)}
                      className="cursor-pointer transition hover:bg-muted/50"
                    >
                      <TableCell className="font-medium">{account.name}</TableCell>
                      <TableCell>{account.account_type}</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(account.current_balance ?? account.opening_balance)}
                      </TableCell>
                      <TableCell>{account.holder_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {account.account_number ?? account.card_number ?? account.reference_number ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {account.created_at ? new Date(account.created_at).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={account.is_active}
                          onCheckedChange={() => toggleActive(account)}
                          disabled={updateMutation.isLoading}
                        />
                      </TableCell>
                      <TableCell
                        className="flex items-center justify-end gap-2"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary"
                              aria-label="Edit account"
                              onClick={() => openEditDialog(account)}
                              disabled={updateMutation.isLoading}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit Account</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10"
                              aria-label="Delete account"
                          onClick={() =>
                            deleteMutation.mutate({ accountId: account.account_id, label: account.name })
                          }
                              disabled={deleteMutation.isLoading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete Account</TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}

                {!accountsQuery.isLoading && sortedAccounts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      No accounts yet. Add your first bank, cash, or card account.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent className="w-[min(95vw,720px)] max-w-2xl overflow-hidden p-0">
            <div className="flex h-full max-h-[90vh] flex-col">
              <DialogHeader className="border-b border-border px-6 py-5">
                <DialogTitle>{editing ? "Edit account" : "New account"}</DialogTitle>
              </DialogHeader>

              <form className="flex flex-1 flex-col overflow-hidden" onSubmit={handleSubmit}>
                <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="holder-name">
                  Holder Name
                </label>
                <Input
                  id="holder-name"
                  placeholder="e.g. CODO Innovations Pvt Ltd"
                  value={formState.holder_name}
                  onChange={(event) => {
                    const value = event.target.value;
                    setFormState((prev) => ({ ...prev, holder_name: value, name: value }));
                  }}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="account-type">
                  Account Type
                </label>
                <Select
                  value={formState.account_type}
                  onValueChange={(value: AccountType) =>
                    setFormState((prev) => ({ ...prev, account_type: value }))
                  }
                >
                  <SelectTrigger id="account-type">
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    {accountTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isCardAccount && (
                <div className="space-y-4 rounded-xl border border-border px-4 py-3">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="card-number">
                        Card Number
                      </label>
                      <Input
                        id="card-number"
                        placeholder="XXXX XXXX XXXX 1234"
                        inputMode="numeric"
                        value={formState.card_number}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, card_number: event.target.value }))
                        }
                        maxLength={19}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="card-expiry">
                        Expiry Date (MM/YY)
                      </label>
                      <Input
                        id="card-expiry"
                        placeholder="09/26"
                        value={formState.card_expiry}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, card_expiry: event.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground" htmlFor="card-security">
                        Security Code (CVV/CVC)
                      </label>
                      <Input
                        id="card-security"
                        placeholder="123"
                        inputMode="numeric"
                        value={formState.card_security_code}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, card_security_code: event.target.value }))
                        }
                        maxLength={4}
                      />
                    </div>
                  </div>
                </div>
              )}

              {isBankAccount && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="bank-name">
                      Bank Name
                    </label>
                    <Input
                      id="bank-name"
                      placeholder="e.g. HDFC Bank"
                      value={formState.bank_name}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, bank_name: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="branch-name">
                      Branch
                    </label>
                    <Input
                      id="branch-name"
                      placeholder="e.g. Kozhikode Main"
                      value={formState.branch_name}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, branch_name: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="ifsc-code">
                      IFSC Code
                    </label>
                    <Input
                      id="ifsc-code"
                      placeholder="e.g. HDFC0000001"
                      value={formState.ifsc_code}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, ifsc_code: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="account-number">
                      Account Number
                    </label>
                    <Input
                      id="account-number"
                      placeholder="501000XXXXXX"
                      value={formState.account_number}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, account_number: event.target.value }))
                      }
                    />
                  </div>
                </div>
              )}

              {!isBankAccount && !isCardAccount && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="account-reference">
                    Account Reference (optional)
                  </label>
                  <Input
                    id="account-reference"
                    placeholder="Internal reference or card number"
                    value={formState.reference_number}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, reference_number: event.target.value }))
                    }
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="opening-balance">
                  Initial Balance (₹)
                </label>
                <Input
                  id="opening-balance"
                  type="number"
                  step="0.01"
                  value={formState.opening_balance}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, opening_balance: event.target.value }))
                  }
                  required
                  min="0"
                />
              </div>

              {editing && (
                <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Active status</p>
                    <p className="text-xs text-muted-foreground">
                      Deactivate to stop new postings without deleting history
                    </p>
                  </div>
                  <Switch
                    checked={formState.is_active}
                    onCheckedChange={(checked) =>
                      setFormState((prev) => ({ ...prev, is_active: checked }))
                    }
                  />
                </div>
              )}

                </div>
                <DialogFooter className="border-t border-border px-6 py-4">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save
                </Button>
                </DialogFooter>
              </form>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={detailDialogOpen} onOpenChange={(open) => !open && closeDetailDialog()}>
          <DialogContent className="w-[min(95vw,720px)] max-w-2xl overflow-hidden p-0">
            {viewingAccount && (
              <div className="flex max-h-[90vh] flex-col">
                <DialogHeader className="flex flex-row items-center justify-between border-b border-border px-6 py-5">
                  <DialogTitle className="m-0">{`Account Details: ${viewingAccount.name}`}</DialogTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9">
                        <Share2 className="h-4 w-4" />
                        <span className="sr-only">Share account details</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleShareCopy(viewingAccount)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Details to Clipboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShareEmail(viewingAccount)}>
                        <Mail className="mr-2 h-4 w-4" />
                        Share via Email
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShareWhatsApp(viewingAccount)}>
                        <Share2 className="mr-2 h-4 w-4" />
                        Share via WhatsApp
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </DialogHeader>
                <div className="space-y-4 overflow-y-auto px-6 py-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <DetailField label="Account Name" value={viewingAccount.name} />
                    <DetailField label="Holder Name" value={viewingAccount.holder_name} />
                    <DetailField label="Account Type" value={viewingAccount.account_type} />
                    <DetailField label="Status" value={viewingAccount.is_active ? "Active" : "Inactive"} />
                    <DetailField
                      label="Current Balance"
                      value={formatCurrency(viewingAccount.current_balance ?? viewingAccount.opening_balance)}
                    />
                    <DetailField
                      label="Initial Balance"
                      value={formatCurrency(viewingAccount.opening_balance)}
                    />
                    <DetailField
                      label="Created"
                      value={
                        viewingAccount.created_at
                          ? new Date(viewingAccount.created_at).toLocaleDateString()
                          : "—"
                      }
                    />
                  </div>

                  {viewingAccount.account_type === "Bank Account" && (
                    <div className="space-y-3 rounded-xl border border-border/80 bg-muted/40 p-4">
                      <p className="text-sm font-semibold text-foreground">Bank Information</p>
                      <div className="grid gap-3 md:grid-cols-2">
                        <DetailField label="Bank Name" value={viewingAccount.bank_name} />
                        <DetailField label="Branch" value={viewingAccount.branch_name} />
                        <DetailField label="IFSC Code" value={viewingAccount.ifsc_code} />
                        <DetailField label="Account Number" value={viewingAccount.account_number} />
                      </div>
                    </div>
                  )}

                  {isCardAccountType(viewingAccount.account_type) && (
                    <div className="space-y-3 rounded-xl border border-border/80 bg-muted/40 p-4">
                      <p className="text-sm font-semibold text-foreground">Card Information</p>
                      <div className="grid gap-3 md:grid-cols-2">
                        <DetailField label="Card Number" value={viewingAccount.card_number} />
                        <DetailField label="Expiry Date" value={viewingAccount.card_expiry} />
                        <DetailField label="Security Code" value={viewingAccount.card_security_code ? "Stored" : "—"} />
                        <DetailField label="Reference" value={viewingAccount.reference_number} />
                      </div>
                    </div>
                  )}

                  {!isBankAccountType(viewingAccount.account_type) &&
                    !isCardAccountType(viewingAccount.account_type) && (
                      <DetailField label="Reference" value={viewingAccount.reference_number} />
                    )}
                </div>
                <DialogFooter className="border-t border-border px-6 py-4">
                  <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-between">
                    <Button type="button" variant="outline" onClick={closeDetailDialog}>
                      Close
                    </Button>
                    <Button
                      type="button"
                      onClick={() => viewingAccount && openHistoryDialogForAccount(viewingAccount)}
                      disabled={!viewingAccount}
                    >
                      View History
                    </Button>
                  </div>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={historyDialogOpen} onOpenChange={(open) => !open && closeHistoryDialog()}>
          <DialogContent className="w-[min(96vw,1200px)] max-w-5xl overflow-hidden p-0">
            {historyAccount ? (
              <div className="flex max-h-[90vh] flex-col">
                <div className="border-b border-border bg-card/95 px-6 py-5 backdrop-blur supports-[backdrop-filter]:bg-card/75">
                  <DialogHeader>
                    <DialogTitle className="text-lg">{`Transaction History: ${historyAccount.name}`}</DialogTitle>
                    <DialogDescription>
                      Review every debit and credit that has impacted this account&apos;s balance.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <HistorySummaryCard label="Current Balance" value={formatCurrency(historyAccount.current_balance ?? historyAccount.opening_balance)} />
                    <HistorySummaryCard label="Initial Balance" value={formatCurrency(historyAccount.opening_balance)} muted />
                    <HistorySummaryCard label="Total Entries" value={historyLedgerRows.length.toString()} muted />
                    <HistorySummaryCard label="Last Transaction" value={lastTransactionLabel} muted />
                  </div>
                </div>

                <div className="flex-1 overflow-hidden bg-background">
                  {historyTransactionsQuery.isLoading ? (
                    <div className="flex h-full items-center justify-center gap-2 px-6 py-8 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Loading ledger history...
                    </div>
                  ) : historyTransactionsQuery.isError ? (
                    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 py-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        Unable to load the ledger history right now. Please try again.
                      </p>
                      <Button onClick={() => historyTransactionsQuery.refetch()}>Retry</Button>
                    </div>
                  ) : historyLedgerRows.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-8 text-center text-muted-foreground">
                      <p className="text-base font-medium text-foreground">No transactions yet</p>
                      <p className="text-sm text-muted-foreground">
                        Debits and credits posted to this account will appear here for audit review.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="px-4 py-4">
                        <div className="rounded-lg border border-border/60">
                          <div className="overflow-x-auto">
                            <div className="max-h-[55vh] overflow-y-auto">
                              <Table className="min-w-[960px] text-sm">
                                <colgroup>
                                  <col className="w-[18%]" />
                                  <col className="w-[12%]" />
                                  <col className="w-[26%]" />
                                  <col className="w-[14%]" />
                                  <col className="w-[10%]" />
                                  <col className="w-[10%]" />
                                  <col className="w-[10%]" />
                                </colgroup>
                                <TableHeader className="sticky top-0 z-10 bg-card shadow-sm">
                                  <TableRow>
                                    <TableHead>Date / Time</TableHead>
                                    <TableHead>TXN ID</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Finance Type</TableHead>
                                    <TableHead className="text-right">Debit (₹)</TableHead>
                                    <TableHead className="text-right">Credit (₹)</TableHead>
                                    <TableHead className="text-right">Running Balance</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {historyLedgerRows.map((row) => (
                                    <TableRow key={row.transaction.id} className="odd:bg-muted/40">
                                      <TableCell className="align-top">
                                        <p className="font-medium text-foreground">{formatLedgerTimestamp(row.transaction)}</p>
                                        <p className="text-xs text-muted-foreground">
                                          Posted on {row.transaction.t_date ?? "—"}
                                        </p>
                                      </TableCell>
                                      <TableCell className="align-top">
                                        <button
                                          type="button"
                                          className="font-mono text-sm font-semibold text-primary underline-offset-4 hover:underline"
                                          onClick={() => openHistoryTransactionDetail(row.transaction.id)}
                                        >
                                          {row.transaction.reference}
                                        </button>
                                      </TableCell>
                                      <TableCell className="align-top">
                                        <p className="font-medium text-foreground">{row.transaction.narration ?? "—"}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {row.transaction.department?.name ?? row.transaction.finance_type?.category ?? "—"}
                                        </p>
                                      </TableCell>
                                      <TableCell className="align-top">
                                        {row.transaction.finance_type?.name ?? row.transaction.finance_type_id ?? "—"}
                                      </TableCell>
                                      <TableCell className="align-top text-right font-mono text-destructive">
                                        {row.transaction.debit > 0 ? formatCurrency(row.transaction.debit) : "—"}
                                      </TableCell>
                                      <TableCell className="align-top text-right font-mono text-green-600">
                                        {row.transaction.credit > 0 ? formatCurrency(row.transaction.credit) : "—"}
                                      </TableCell>
                                      <TableCell className="align-top text-right font-mono font-semibold text-foreground">
                                        {formatCurrency(row.runningBalance)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-border bg-muted/30 px-4 py-3 text-sm">
                        <div className="flex flex-wrap gap-6">
                          <div>
                            <p className="text-xs uppercase text-muted-foreground">Total Debit (₹)</p>
                            <p className="font-semibold text-destructive">{formatCurrency(historyTotals.debit)}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-muted-foreground">Total Credit (₹)</p>
                            <p className="font-semibold text-green-600">{formatCurrency(historyTotals.credit)}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

              </div>
            ) : (
              <div className="px-6 py-8 text-center text-muted-foreground">Select an account to view history.</div>
            )}
          </DialogContent>
        </Dialog>

        <TransactionDetailModal
          open={historyDetailOpen}
          transactionId={historyTransactionId}
          onClose={closeHistoryTransactionDetail}
          financeTypes={financeTypes}
          departments={departments}
          accounts={accounts}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            queryClient.invalidateQueries({ queryKey: ["account-ledger"] });
            queryClient.invalidateQueries({ queryKey: ["accounts"] });
          }}
        />
      </div>
    </TooltipProvider>
  );
};

const DetailField = ({
  label,
  value,
}: {
  label: string;
  value?: string | number;
}) => (
  <div className="space-y-1">
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="rounded-lg border border-border/70 bg-background px-3 py-2 text-sm text-foreground">
      {value !== undefined && value !== null && String(value).trim() ? value : "—"}
    </p>
  </div>
);

const HistorySummaryCard = ({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) => (
  <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 shadow-sm">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className={`text-base font-semibold ${muted ? "text-muted-foreground" : "text-foreground"}`}>{value}</p>
  </div>
);

const getTransactionDate = (transaction: Transaction): Date => {
  if (transaction.transaction_datetime) {
    const parsed = new Date(transaction.transaction_datetime);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  if (transaction.t_date) {
    const time = transaction.transaction_time ?? "00:00";
    const normalizedTime = time.length === 5 ? `${time}:00` : time;
    const candidate = new Date(`${transaction.t_date}T${normalizedTime}`);
    if (!Number.isNaN(candidate.getTime())) {
      return candidate;
    }
  }

  if (transaction.created_at) {
    const created = new Date(transaction.created_at);
    if (!Number.isNaN(created.getTime())) {
      return created;
    }
  }

  return new Date();
};

const formatLedgerTimestamp = (transaction: Transaction) =>
  format(getTransactionDate(transaction), "dd-MM-yyyy hh:mm a");

const isCardAccountType = (type: AccountType) => type === "Credit Card" || type === "Debit Card";
const isBankAccountType = (type: AccountType) => type === "Bank Account";

const formatAccountDetailsForSharing = (account: Account): string => {
  if (account.account_type === "Bank Account") {
    return [
      `Holder Name: ${account.holder_name}`,
      `Bank Name: ${account.bank_name ?? "—"}`,
      `Branch: ${account.branch_name ?? "—"}`,
      `Account Number: ${account.account_number ?? "—"}`,
      `IFSC Code: ${account.ifsc_code ?? "—"}`,
    ].join("\n");
  } else {
    // Cash, Credit Card, or Debit Card
    const reference = account.account_number ?? account.reference_number ?? "—";
    return `**ACCOUNT REFERENCE**

Account Name: ${account.name}

Holder Name: ${account.holder_name}

Type: ${account.account_type}

Reference: ${reference}`;
  }
};

