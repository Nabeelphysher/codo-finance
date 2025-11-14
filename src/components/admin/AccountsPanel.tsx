import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Account, AccountType } from "@/types/api";
import { AccountPayload, createAccount, deleteAccount, fetchAccounts, updateAccount } from "@/services/accounts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/format";
import { ApiError } from "@/lib/api";
import { Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

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

export const AccountsPanel = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [formState, setFormState] = useState<FormState>(defaultFormState);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [viewingAccount, setViewingAccount] = useState<Account | null>(null);

  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: () => fetchAccounts(200),
  });

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
    mutationFn: (accountId: string) => deleteAccount(accountId),
    onSuccess: () => {
      toast({ title: "Account deleted" });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
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
                              onClick={() => deleteMutation.mutate(account.account_id)}
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
          <DialogContent className="max-w-2xl overflow-hidden p-0">
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
          <DialogContent className="max-w-2xl overflow-hidden p-0">
            {viewingAccount && (
              <div className="flex max-h-[90vh] flex-col">
                <DialogHeader className="border-b border-border px-6 py-5">
                  <DialogTitle>{`Account Details: ${viewingAccount.name}`}</DialogTitle>
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
                  <Button type="button" variant="outline" onClick={closeDetailDialog}>
                    Close
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
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

const isCardAccountType = (type: AccountType) => type === "Credit Card" || type === "Debit Card";
const isBankAccountType = (type: AccountType) => type === "Bank Account";

