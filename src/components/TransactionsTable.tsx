import { useEffect, useMemo, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Transaction, FinanceType, Department, Bill, TransactionNature, Account } from "@/types/api";
import {
  fetchTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  restoreTransaction,
  exportTransactionsFile,
  type TransactionFilters,
  type TransactionPayload,
  type TransactionExportResult,
} from "@/services/transactions";
import { fetchAccounts } from "@/services/accounts";
import {
  uploadBillFile,
  linkBillToTransaction,
  fetchDocumentTypes,
  createDocumentType,
} from "@/services/bills";
import { fetchFinanceTypes } from "@/services/financeTypes";
import { fetchDepartments } from "@/services/departments";
import { TransactionDetailModal, ManageBillHandler } from "@/components/TransactionDetailModal";
import { TimePickerField } from "@/components/TimePickerField";
import { Calendar, type CalendarRange } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { PaginatedResponse } from "@/lib/api";
import { cn } from "@/lib/utils";
import { combineDateAndTime, displayTimeTo24Hour, format24HourToDisplay, getCurrentDisplayTime } from "@/lib/time";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { useUndoToast } from "@/hooks/use-undo-toast";
import { ApiError } from "@/lib/api";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Loader2,
  Plus,
  PlusCircle,
  Download,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  Calendar as CalendarIcon,
  FileText,
  Link as LinkIcon,
  ExternalLink,
  X,
  Info,
} from "lucide-react";


interface DatePickerFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  max?: string;
  min?: string;
  disabled?: boolean;
}

const toDateOrUndefined = (value?: string) => {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
};

const DatePickerField = ({ id, label, value, onChange, max, min, disabled }: DatePickerFieldProps) => {
  const [open, setOpen] = useState(false);
  const selectedDate = toDateOrUndefined(value);
  const minDate = toDateOrUndefined(min);
  const maxDate = toDateOrUndefined(max);
  const computedYearRange = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const minYear = minDate?.getFullYear();
    const maxYear = maxDate?.getFullYear();
    let start = minYear ?? (maxYear ? maxYear - 80 : currentYear - 80);
    let end = maxYear ?? currentYear + 20;
    if (start > end) {
      const swappedStart = Math.min(start, end);
      const swappedEnd = Math.max(start, end);
      start = swappedStart;
      end = swappedEnd;
    }
    return { start, end };
  }, [minDate, maxDate]);

  const displayValue =
    selectedDate && isValid(selectedDate) ? format(selectedDate, "dd MMM yyyy") : "Select date";

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn(
              "flex h-10 w-full items-center justify-start gap-2 rounded-md border border-input bg-background px-3 text-left text-sm font-normal transition hover:bg-muted/80",
              !value && "text-muted-foreground",
              disabled && "cursor-not-allowed opacity-70",
            )}
            aria-haspopup="dialog"
            aria-expanded={open}
            disabled={disabled}
          >
            <CalendarIcon className="h-4 w-4" />
            <span>{displayValue}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            initialFocus
            selected={selectedDate}
            withDropdowns
            yearRange={computedYearRange}
            onSelect={(date) => {
              if (!date) return;
              onChange(format(date, "yyyy-MM-dd"));
              setOpen(false);
            }}
            disabled={(date) => {
              if (minDate && date < minDate) return true;
              if (maxDate && date > maxDate) return true;
              return false;
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

interface FormState {
  t_date: string;
  u_date: string;
  transaction_time: string;
  finance_type_id: string;
  department_id: string;
  account_id: string;
  narration: string;
  amount: string;
  expected_amount: string;
}

type BillDialogMode = "link" | "replace";

interface BillFormState {
  vendor_client_name: string;
  type: string;
  file: File | null;
  fileName: string;
}

const getTodayIso = () => new Date().toISOString().split("T")[0];

const createDefaultFormState = (): FormState => {
  const currentDate = getTodayIso();
  return {
    t_date: currentDate,
    u_date: currentDate,
    transaction_time: getCurrentDisplayTime(),
    finance_type_id: "",
    department_id: "",
    account_id: "",
    narration: "",
    amount: "",
    expected_amount: "",
  };
};

const defaultDocumentTypes = [
  "Expense Bill",
  "Client Invoice",
  "Journal Voucher",
  "Salary Slip",
  "Other",
];

const defaultBillFormState: BillFormState = {
  vendor_client_name: "",
  type: "",
  file: null,
  fileName: "",
};

const getNatureIndicatorColor = (nature?: TransactionNature) => {
  if (nature === "Credit") {
    return "bg-emerald-500";
  }
  if (nature === "Debit") {
    return "bg-red-500";
  }
  return "bg-muted-foreground/40";
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return "—";
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return dateString;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
};

const mapTransactionToFormState = (txn: Transaction): FormState => {
  const amount = txn.debit > 0 ? txn.debit : txn.credit;
  const expectedAmount =
    txn.expected_debit > 0
      ? txn.expected_debit
      : txn.expected_credit > 0
        ? txn.expected_credit
        : 0;

  return {
    t_date: txn.t_date,
    u_date: txn.u_date ?? txn.t_date,
    transaction_time: format24HourToDisplay(txn.transaction_time ?? "") || getCurrentDisplayTime(),
    finance_type_id: txn.finance_type_id,
    department_id: txn.department_id,
    account_id: txn.account_id ?? "",
    narration: txn.narration,
    amount: String(amount),
    expected_amount: expectedAmount > 0 ? String(expectedAmount) : "",
  };
};

export const TransactionsTable = () => {
  const { toast } = useToast();
  const showUndoToast = useUndoToast();
  const queryClient = useQueryClient();
  const today = getTodayIso();

  const [searchQuery, setSearchQuery] = useState("");
  const [financeTypeFilter, setFinanceTypeFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [transactionDateRange, setTransactionDateRange] = useState<CalendarRange | undefined>();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [formState, setFormState] = useState<FormState>(() => createDefaultFormState());
  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [billDialogMode, setBillDialogMode] = useState<BillDialogMode>("link");
  const [billTarget, setBillTarget] = useState<Transaction | null>(null);
  const [billForm, setBillForm] = useState<BillFormState>(defaultBillFormState);
  const [newBillFile, setNewBillFile] = useState<File | null>(null);
  const [newBillFileName, setNewBillFileName] = useState("");
  const [newBillType, setNewBillType] = useState<string>("");
  const [addingDocumentType, setAddingDocumentType] = useState(false);
  const [newDocumentTypeName, setNewDocumentTypeName] = useState("");
  const [detailTransactionId, setDetailTransactionId] = useState<number | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const filters = useMemo<TransactionFilters>(() => {
    const transaction_from =
      transactionDateRange?.from ? format(transactionDateRange.from, "yyyy-MM-dd") : undefined;
    const transaction_to =
      transactionDateRange?.to ? format(transactionDateRange.to, "yyyy-MM-dd") : undefined;

    return {
      search: searchQuery || undefined,
      finance_type_id: financeTypeFilter !== "all" ? financeTypeFilter : undefined,
      department_id: departmentFilter !== "all" ? departmentFilter : undefined,
      transaction_from,
      transaction_to,
      per_page: 200,
    };
  }, [searchQuery, financeTypeFilter, departmentFilter, transactionDateRange]);

  const hasTransactionRange = Boolean(transactionDateRange?.from || transactionDateRange?.to);

  const getRangeLabel = (range: CalendarRange | undefined, placeholder: string): string => {
    if (range?.from && range?.to) {
      return `${format(range.from, "dd MMM yyyy")} – ${format(range.to, "dd MMM yyyy")}`;
    }
    if (range?.from) {
      return `${format(range.from, "dd MMM yyyy")} – …`;
    }
    if (range?.to) {
      return `… – ${format(range.to, "dd MMM yyyy")}`;
    }
    return placeholder;
  };

  const transactionsQuery = useQuery<PaginatedResponse<Transaction>>({
    queryKey: ["transactions", filters],
    queryFn: () => fetchTransactions(filters),
  });

  const financeTypesQuery = useQuery({
    queryKey: ["finance-types", "for-transactions"],
    queryFn: () => fetchFinanceTypes(200),
  });

  const departmentsQuery = useQuery({
    queryKey: ["departments", "for-transactions"],
    queryFn: () => fetchDepartments(200),
  });

  const accountsQuery = useQuery({
    queryKey: ["accounts", "for-transactions"],
    queryFn: () => fetchAccounts(200),
  });

  const documentTypesQuery = useQuery({
    queryKey: ["bill-document-types"],
    queryFn: () => fetchDocumentTypes(),
  });

  const transactions = transactionsQuery.data?.data ?? [];
  const totalTransactions = transactionsQuery.data?.meta?.total ?? transactions.length;
  useEffect(() => {
    const interval = window.setInterval(() => {
      transactionsQuery.refetch({ cancelRefetch: false });
    }, 30000);

    return () => window.clearInterval(interval);
  }, [transactionsQuery]);
  const financeTypes = financeTypesQuery.data ?? [];
  const departments = departmentsQuery.data ?? [];
  const accounts = accountsQuery.data ?? [];
  const documentTypes = documentTypesQuery.data ?? defaultDocumentTypes;
  const getPrimaryDocumentType = () => documentTypes[0] ?? "";

  const selectedFinanceType = useMemo(
    () => financeTypes.find((type) => type.type_id === formState.finance_type_id),
    [financeTypes, formState.finance_type_id],
  );
  const selectedAccount = useMemo(
    () => accounts.find((account) => account.account_id === formState.account_id),
    [accounts, formState.account_id],
  );
  const expectedAmountLabel =
    selectedFinanceType?.transaction_nature === "Credit"
      ? "Expected Credit (Optional)"
      : "Expected Debit (Optional)";
  const expectedAmountHelper =
    selectedFinanceType?.transaction_nature === "Credit"
      ? "Use for planned inflows."
      : "Use for planned outflows.";

  useEffect(() => {
    if (!documentTypes.length) {
      return;
    }
    setBillForm((prev) => {
      const nextType =
        prev.type && documentTypes.includes(prev.type) ? prev.type : documentTypes[0] ?? "";
      if (nextType === prev.type) {
        return prev;
      }
      return { ...prev, type: nextType };
    });
    setNewBillType((prev) => {
      if (prev && documentTypes.includes(prev)) {
        return prev;
      }
      return documentTypes[0] ?? "";
    });
  }, [documentTypes]);

  const showError = (error: unknown, fallback: string) => {
    const message = error instanceof ApiError ? error.message : fallback;
    toast({
      title: "Request failed",
      description: message,
      variant: "destructive",
    });
  };

  const handleCreateDocumentType = () => {
    const trimmed = newDocumentTypeName.trim();
    if (!trimmed) {
      showError(new Error("Document type name is required"), "Document type name is required");
      return;
    }
    createDocumentTypeMutation.mutate(trimmed);
  };

  const closeBillDialog = () => {
    setBillDialogOpen(false);
    setBillTarget(null);
    setBillDialogMode("link");
    setBillForm(defaultBillFormState);
    setAddingDocumentType(false);
    setNewDocumentTypeName("");
  };

  const resetNewBillState = () => {
    setNewBillFile(null);
    setNewBillFileName("");
    setNewBillType(getPrimaryDocumentType());
    setAddingDocumentType(false);
    setNewDocumentTypeName("");
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setFormState((prev) => ({
      ...createDefaultFormState(),
      finance_type_id: financeTypes[0]?.type_id ?? "",
      department_id: departments[0]?.dept_id ?? "",
      account_id: accounts[0]?.account_id ?? "",
    }));
    resetNewBillState();
  };

  const openCreateDialog = () => {
    setEditing(null);
    setFormState({
      ...createDefaultFormState(),
      finance_type_id: financeTypes[0]?.type_id ?? "",
      department_id: departments[0]?.dept_id ?? "",
      account_id: accounts[0]?.account_id ?? "",
    });
    resetNewBillState();
    setDialogOpen(true);
  };

  const openBillDialog = (transaction: Transaction, mode: BillDialogMode) => {
    setBillTarget(transaction);
    setBillDialogMode(mode);
    setBillForm({
      vendor_client_name: transaction.bill?.vendor_client_name ?? transaction.narration ?? "",
      type: transaction.bill?.type ?? getPrimaryDocumentType(),
      file: null,
      fileName: "",
    });
    setAddingDocumentType(false);
    setNewDocumentTypeName("");
    setBillDialogOpen(true);
  };

  const openEditDialog = (transaction: Transaction) => {
    setEditing(transaction);
  setFormState({
    ...mapTransactionToFormState(transaction),
    u_date: getTodayIso(),
  });
    resetNewBillState();
    setDialogOpen(true);
  };

  const queryInvalidation = () =>
    queryClient.invalidateQueries({ queryKey: ["transactions"] });

  const createMutation = useMutation({
    mutationFn: (payload: TransactionPayload) => createTransaction(payload),
    onSuccess: () => {
      toast({ title: "Transaction created" });
      queryInvalidation();
      closeDialog();
    },
    onError: (error: unknown) => showError(error, "Unable to create transaction"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: TransactionPayload }) =>
      updateTransaction(id, payload),
    onSuccess: () => {
      toast({ title: "Transaction updated" });
      queryInvalidation();
      closeDialog();
    },
    onError: (error: unknown) => showError(error, "Unable to update transaction"),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: number; reference: string }) => deleteTransaction(id),
    onSuccess: (_result, variables) => {
      queryInvalidation();
      showUndoToast({
        entity: "Transaction",
        identifier: variables.reference,
        onUndo: async () => {
          await restoreTransaction(variables.id);
          queryInvalidation();
        },
      });
    },
    onError: (error: unknown) => showError(error, "Unable to delete transaction"),
  });

  const billMutation = useMutation({
    mutationFn: async () => {
      if (!billTarget) {
        throw new Error("No transaction selected");
      }

      if (!billForm.file) {
        throw new Error("Please select a file to upload.");
      }

      const upload = await uploadBillFile(billForm.file);

      return linkBillToTransaction({
        transaction_id: billTarget.id,
        file_url: upload.file_url,
        file_name: upload.file_name ?? billForm.file.name,
        file_mime: upload.file_mime,
        file_size: upload.file_size,
        vendor_client_name: billForm.vendor_client_name.trim(),
        type: billForm.type,
      });
    },
    onSuccess: () => {
      toast({ title: billDialogMode === "replace" ? "Document replaced" : "Document linked" });
      queryInvalidation();
      closeBillDialog();
    },
    onError: (error: unknown) => showError(error, "Unable to link document"),
  });

  const createDocumentTypeMutation = useMutation({
    mutationFn: (name: string) => createDocumentType(name),
    onSuccess: (docType: string) => {
      toast({ title: "Document type created", description: `"${docType}" added successfully.` });
      queryClient.setQueryData<string[]>(["bill-document-types"], (prev = []) => {
        if (prev.some((item) => item.toLowerCase() === docType.toLowerCase())) {
          return prev;
        }
        return [...prev, docType];
      });
      queryClient.invalidateQueries({ queryKey: ["bill-document-types"] });
      setBillForm((prev) => ({ ...prev, type: docType }));
      setNewBillType(docType);
      setAddingDocumentType(false);
      setNewDocumentTypeName("");
    },
    onError: (error: unknown) => showError(error, "Unable to create document type"),
  });

const exportMutation = useMutation<TransactionExportResult, unknown, TransactionFilters>({
  mutationFn: (currentFilters: TransactionFilters) => exportTransactionsFile(currentFilters),
  onSuccess: (result) => {
    const objectUrl = window.URL.createObjectURL(result.blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);

    toast({
      title: "Export ready",
      description: `${result.filename} downloaded successfully.`,
    });
  },
  onError: (error: unknown) => showError(error, "Unable to export transactions"),
});

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formState.t_date) {
      toast({
        title: "Transaction date required",
        description: "Please choose when the transaction occurred.",
        variant: "destructive",
      });
      return;
    }

    if (!formState.u_date) {
      toast({
        title: "Updation date required",
        description: "Please choose the last update date for this entry.",
        variant: "destructive",
      });
      return;
    }

    const transactionDate = toDateOrUndefined(formState.t_date);
    const updationDate = toDateOrUndefined(formState.u_date);
    if (transactionDate && updationDate && updationDate < transactionDate) {
      toast({
        title: "Updation date is earlier than transaction date",
        description: "Please pick an updation date on or after the transaction date.",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(formState.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount greater than zero.",
        variant: "destructive",
      });
      return;
    }

    const expectedAmount = parseFloat(formState.expected_amount || "0");

    if (expectedAmount < 0) {
      toast({
        title: "Invalid expected amount",
        description: "Expected amounts cannot be negative.",
        variant: "destructive",
      });
      return;
    }

    if (!formState.finance_type_id || !formState.department_id) {
      toast({
        title: "Missing selections",
        description: "Finance type and department are required.",
        variant: "destructive",
      });
      return;
    }

    if (!formState.account_id) {
      toast({
        title: "Account required",
        description: "Please choose which account this transaction impacts.",
        variant: "destructive",
      });
      return;
    }

    // Get the selected finance type to determine transaction nature
    const selectedFinanceType = financeTypes.find(
      (type) => type.type_id === formState.finance_type_id
    );

    if (!selectedFinanceType) {
      toast({
        title: "Invalid finance type",
        description: "Selected finance type not found.",
        variant: "destructive",
      });
      return;
    }

    // Use transaction_nature from the finance type to determine debit/credit
    const isDebit = selectedFinanceType.transaction_nature === "Debit";
    const normalizedTime = displayTimeTo24Hour(formState.transaction_time);

    if (!normalizedTime) {
      toast({
        title: "Invalid time",
        description: "Please select a valid transaction time (e.g., 03:45 PM).",
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
      debit: isDebit ? amount : 0,
      credit: isDebit ? 0 : amount,
      expected_debit: isDebit && expectedAmount > 0 ? expectedAmount : 0,
      expected_credit: !isDebit && expectedAmount > 0 ? expectedAmount : 0,
    };

    if (!editing && newBillFile) {
      if (!formState.narration.trim()) {
        toast({
          title: "Narration required",
          description: "Please provide a narration before attaching a document.",
          variant: "destructive",
        });
        return;
      }

      if (!newBillType) {
        toast({
          title: "Document type required",
          description: "Select or create a document type before uploading.",
          variant: "destructive",
        });
        return;
      }

      try {
        const upload = await uploadBillFile(newBillFile);
        payload.bill = {
          type: newBillType,
          vendor_client_name: formState.narration,
          file_url: upload.file_url,
          file_name: upload.file_name ?? newBillFile.name,
          file_mime: upload.file_mime,
          file_size: upload.file_size,
        };
      } catch (error) {
        showError(error, "Failed to upload document");
        return;
      }
    }

    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const validateUploadFile = (file: File): boolean => {
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum allowed size is 5MB.",
        variant: "destructive",
      });
      return false;
    }

    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Unsupported file type",
        description: "Allowed formats: PDF, PNG, JPG, JPEG, WEBP.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleBillFileChange = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      setBillForm((prev) => ({ ...prev, file: null, fileName: "" }));
      return;
    }

    const file = fileList[0];
    if (!validateUploadFile(file)) {
      return;
    }

    setBillForm((prev) => ({ ...prev, file, fileName: file.name }));
  };

  const handleNewBillFileChange = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      setNewBillFile(null);
      setNewBillFileName("");
      return;
    }

    const file = fileList[0];
    if (!validateUploadFile(file)) {
      return;
    }

    setNewBillFile(file);
    setNewBillFileName(file.name);
  };

  const handleBillSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!billForm.vendor_client_name.trim()) {
      toast({
        title: "Vendor/Client required",
        description: "Please enter the vendor or client name.",
        variant: "destructive",
      });
      return;
    }

    if (!billForm.type) {
      toast({
        title: "Document type required",
        description: "Please select or create a document type.",
        variant: "destructive",
      });
      return;
    }

    if (!billForm.file) {
      toast({
        title: "Document missing",
        description: "Please select a PDF or image file.",
        variant: "destructive",
      });
      return;
    }

    billMutation.mutate();
  };

  const handleViewBill = (bill?: Bill | null) => {
    if (bill?.file_url) {
      window.open(bill.file_url, "_blank", "noopener,noreferrer");
    } else {
      toast({
        title: "Document unavailable",
        description: "No bill or voucher is linked with this transaction yet.",
      });
    }
  };

  const handleDelete = (transaction: Transaction) => {
    if (deleteMutation.isPending) return;
    const confirmed = window.confirm(
      `Delete transaction ${transaction.reference}? This cannot be undone.`,
    );
    if (confirmed) {
      deleteMutation.mutate({ id: transaction.id, reference: transaction.reference });
    }
  };

  const loadingFinanceData =
    financeTypesQuery.isLoading || departmentsQuery.isLoading || accountsQuery.isLoading;

  const resetFilters = () => {
    setSearchQuery("");
    setFinanceTypeFilter("all");
    setDepartmentFilter("all");
    setTransactionDateRange(undefined);
  };

  const handleRowSelection = (event: React.MouseEvent<HTMLElement>, transaction: Transaction) => {
    const target = event.target as HTMLElement;
    if (target.closest("button") || target.closest("a") || target.closest("[data-stop-propagation='true']")) {
      return;
    }
    setDetailTransactionId(transaction.id);
    setDetailModalOpen(true);
  };

  const handleManageBillFromDetail: ManageBillHandler = (transaction, mode) => {
    openBillDialog(transaction, mode as BillDialogMode);
    setDetailModalOpen(false);
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-3 rounded-2xl border border-[hsl(var(--topbar-border))] bg-[hsl(var(--topbar-bg))] p-4 text-[hsl(var(--topbar-text))] shadow-sm md:flex-row md:items-center md:justify-between md:gap-4">
          <div className="flex-1 space-y-1 text-center md:text-left">
            <h2 className="text-xl md:text-2xl font-bold text-[hsl(var(--topbar-text))]">
              Exact Accounts Transactions
            </h2>
            <p className="text-xs md:text-sm text-[hsl(var(--topbar-muted))]">
              Complete ledger view with {transactions.length} of {totalTransactions} transactions
            </p>
          </div>
          <div className="flex w-full flex-wrap justify-stretch gap-2 md:w-auto md:flex-nowrap md:justify-end">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 min-w-[120px] md:flex-none"
              onClick={() => transactionsQuery.refetch()}
            >
              <RefreshCw className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 min-w-[120px] md:flex-none"
              onClick={() => exportMutation.mutate(filters)}
              disabled={exportMutation.isPending}
              aria-busy={exportMutation.isPending}
            >
              {exportMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin sm:mr-2" />
              ) : (
                <Download className="w-4 h-4 sm:mr-2" />
              )}
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button
              size="sm"
              className="flex-1 min-w-[120px] md:flex-none"
              onClick={openCreateDialog}
              disabled={loadingFinanceData || transactionsQuery.isLoading}
            >
              {(loadingFinanceData || transactionsQuery.isFetching) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">New</span>
            </Button>
          </div>
        </div>

      <div className="bg-card rounded-2xl border border-border/60 p-3 md:p-5 shadow-[0_18px_45px_-22px_rgba(15,23,42,0.35)] space-y-5 transition-all duration-300">
        <div className="flex flex-wrap items-stretch gap-3 md:gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search narration or ID..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-12 rounded-xl border-border/60 pl-10 shadow-[0_12px_32px_-18px_rgba(15,23,42,0.45)] focus:border-primary focus:ring-primary/25 transition-colors"
            />
          </div>

          <div className="flex-[0_1_220px] min-w-[180px]">
            <Select value={financeTypeFilter} onValueChange={setFinanceTypeFilter}>
              <SelectTrigger className="h-12 w-full rounded-xl border-border/60 shadow-[0_12px_32px_-18px_rgba(15,23,42,0.35)] focus:border-primary focus:ring-primary/25 transition-colors">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className="bg-card z-50">
                <SelectItem value="all">All Types</SelectItem>
                {financeTypes.map((type: FinanceType) => (
                  <SelectItem key={type.type_id} value={type.type_id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-[0_1_220px] min-w-[180px]">
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="h-12 w-full rounded-xl border-border/60 shadow-[0_12px_32px_-18px_rgba(15,23,42,0.35)] focus:border-primary focus:ring-primary/25 transition-colors">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent className="bg-card z-50">
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((department: Department) => (
                  <SelectItem key={department.dept_id} value={department.dept_id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-[0_1_260px] min-w-[200px]">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  aria-label="Select transaction date range"
                  className={cn(
                    "flex h-12 w-full items-center justify-start rounded-xl border border-border/60 bg-background px-4 text-sm font-medium shadow-[0_12px_32px_-18px_rgba(15,23,42,0.35)] transition hover:bg-muted/80",
                    hasTransactionRange ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <span className="truncate">
                    {getRangeLabel(transactionDateRange, "Select range")}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  numberOfMonths={2}
                  selected={transactionDateRange}
                  onSelect={setTransactionDateRange}
                />
                {hasTransactionRange && (
                  <div className="flex justify-end border-t border-border bg-muted/40 p-2">
                    <Button variant="ghost" size="sm" onClick={() => setTransactionDateRange(undefined)}>
                      Clear
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

        </div>

        {(searchQuery ||
          financeTypeFilter !== "all" ||
          departmentFilter !== "all" ||
          hasTransactionRange) && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Active filters:</span>
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Clear all
            </Button>
          </div>
        )}
      </div>

      <div className="hidden xl:block rounded-2xl border border-border/60 bg-card shadow-card">
        <div className="w-full overflow-x-auto xl:overflow-visible">
        <Table className="w-full table-auto">
          <colgroup>
            <col className="w-[14%]" />
            <col className="w-[16%]" />
            <col className="w-[22%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Transaction Date</TableHead>
              <TableHead className="whitespace-nowrap">Transaction ID</TableHead>
              <TableHead>Finance Type</TableHead>
              <TableHead className="text-right">Debit (₹)</TableHead>
              <TableHead className="text-right">Credit (₹)</TableHead>
              <TableHead className="text-center">Bill/Voucher</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactionsQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  <Loader2 className="mr-2 inline-block h-5 w-5 animate-spin" />
                  Loading transactions...
                </TableCell>
              </TableRow>
            )}

            {!transactionsQuery.isLoading && transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No transactions found. Adjust your filters or create a new entry.
                </TableCell>
              </TableRow>
            )}

            {transactions.map((txn) => (
              <TableRow
                key={txn.id}
                className="align-top cursor-pointer transition hover:bg-muted/60"
                onClick={(event) => handleRowSelection(event, txn)}
              >
                <TableCell className="whitespace-nowrap font-medium">
                  {formatDate(txn.t_date)}
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-accent px-2 py-1 rounded whitespace-nowrap">
                    {txn.reference}
                  </code>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="max-w-full truncate pr-2">
                    {txn.finance_type?.name ?? txn.finance_type_id}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-destructive whitespace-nowrap">
                  {txn.debit > 0 ? formatCurrency(txn.debit) : "-"}
                </TableCell>
                <TableCell className="text-right font-mono text-green-600 whitespace-nowrap">
                  {txn.credit > 0 ? formatCurrency(txn.credit) : "-"}
                </TableCell>
                <TableCell className="text-center">
                  {txn.bill_reference_id && txn.bill ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleViewBill(txn.bill);
                      }}
                      title="View linked document"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center justify-center gap-1"
                      onClick={(event) => {
                        event.stopPropagation();
                        openBillDialog(txn, "link");
                      }}
                      title="Link bill or voucher"
                    >
                      <LinkIcon className="h-4 w-4" />
                      <Plus className="ml-1 h-3 w-3" />
                    </Button>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-full text-muted-foreground hover:bg-muted/70"
                          aria-label="Edit transaction"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditDialog(txn);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit Transaction</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/15"
                          aria-label="Delete transaction"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDelete(txn);
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete Transaction</TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>

      <div className="xl:hidden space-y-4">
        {transactionsQuery.isLoading && (
          <div className="bg-card rounded-xl shadow-card p-6 text-center text-muted-foreground">
            <Loader2 className="mr-2 inline-block h-5 w-5 animate-spin" />
            Loading transactions...
          </div>
        )}

        {!transactionsQuery.isLoading && transactions.length === 0 && (
          <div className="bg-card rounded-xl shadow-card p-6 text-center text-muted-foreground">
            No transactions found. Adjust your filters or create a new entry.
          </div>
        )}

        {transactions.map((txn) => (
          <div
            key={txn.id}
            className="bg-card rounded-xl shadow-card p-4 space-y-3 cursor-pointer transition hover:bg-muted/60"
            onClick={(event) => handleRowSelection(event, txn)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {txn.finance_type?.name ?? txn.finance_type_id}
                  </Badge>
                  <code className="bg-accent px-1.5 py-0.5 rounded text-[10px]">
                    {txn.reference}
                  </code>
                </div>
                <p className="text-sm font-medium text-foreground truncate">{txn.narration}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {txn.department?.name ?? txn.department_id}
                </p>
              </div>
              <div className="text-right shrink-0 font-mono">
                {txn.debit > 0 && (
                  <p className="text-sm font-semibold text-destructive">
                    -{formatCurrency(txn.debit)}
                  </p>
                )}
                {txn.credit > 0 && (
                  <p className="text-sm font-semibold text-green-600">
                    +{formatCurrency(txn.credit)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-muted-foreground">
                  {formatDate(txn.t_date)}
                </span>
                <span className="text-muted-foreground">
                  Updated: {formatDate(txn.u_date)}
                </span>
              </div>
              <div className="text-right font-mono font-semibold">
                {formatCurrency(txn.running_balance)}
              </div>
            </div>

          <div className="flex items-center justify-end gap-2 pt-2">
              {txn.bill_reference_id && txn.bill ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleViewBill(txn.bill);
                  }}
                >
                  <ExternalLink className="mr-1 h-4 w-4" />
                  View Bill
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={(event) => {
                    event.stopPropagation();
                    openBillDialog(txn, "link");
                  }}
                >
                  <LinkIcon className="mr-1 h-4 w-4" />
                  Attach
                </Button>
              )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full text-muted-foreground hover:bg-muted/70"
                  aria-label="Edit transaction"
                  onClick={(event) => {
                    event.stopPropagation();
                    openEditDialog(txn);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit Transaction</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/15"
                  aria-label="Delete transaction"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDelete(txn);
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete Transaction</TooltipContent>
            </Tooltip>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="w-[min(95vw,720px)] max-w-2xl overflow-hidden p-0">
          <div className="flex h-full max-h-[90vh] flex-col">
            <DialogHeader className="border-b border-border/50 px-6 py-5">
              <DialogTitle>{editing ? "Edit transaction" : "New transaction"}</DialogTitle>
            </DialogHeader>

            <form className="flex flex-1 flex-col overflow-hidden" onSubmit={handleSubmit}>
              <ScrollArea className="flex-1">
                <div className="space-y-4 px-6 py-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <DatePickerField
                  id="transaction-date"
                  label="Transaction Date"
                  value={formState.t_date}
                  max={today}
                  onChange={(value) =>
                    setFormState((prev) => ({
                      ...prev,
                      t_date: value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <TimePickerField
                  id="transaction-time"
                  label="Transaction Time"
                  value={formState.transaction_time}
                  granularityMinutes={1}
                  onChange={(value) =>
                    setFormState((prev) => ({
                      ...prev,
                      transaction_time: value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <DatePickerField
                  id="updation-date"
                  label="Updation Date"
                  value={formState.u_date}
                  max={today}
                  disabled
                  onChange={() => {}}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="finance-type">Finance Type</Label>
                <Select
                  value={formState.finance_type_id}
                  onValueChange={(value) => {
                    // Transaction nature is automatically applied from the selected finance type during submission
                    setFormState((prev) => ({ ...prev, finance_type_id: value }));
                  }}
                >
                  <SelectTrigger id="finance-type">
                    <SelectValue placeholder="Select finance type">
                      {selectedFinanceType && (
                        <span className="flex items-center gap-2">
                          <span
                            aria-hidden
                            className={cn(
                              "h-2 w-2 rounded-full",
                              getNatureIndicatorColor(selectedFinanceType.transaction_nature),
                            )}
                          />
                          <span>{selectedFinanceType.name}</span>
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {financeTypes.map((type) => {
                      const indicatorColor = getNatureIndicatorColor(type.transaction_nature);
                      return (
                        <SelectItem key={type.type_id} value={type.type_id}>
                          <span className="flex items-center gap-2">
                            <span aria-hidden className={cn("h-2 w-2 rounded-full", indicatorColor)} />
                            <span>{type.name}</span>
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account">Account</Label>
                <Select
                  value={formState.account_id}
                  onValueChange={(value) =>
                    setFormState((prev) => ({ ...prev, account_id: value }))
                  }
                  disabled={!accounts.length}
                >
                  <SelectTrigger id="account">
                    <SelectValue placeholder="Select account">
                      {selectedAccount && (
                        <span className="flex flex-col">
                          <span className="font-medium">{selectedAccount.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatCurrency(selectedAccount.current_balance)}
                          </span>
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.account_id} value={account.account_id}>
                        <span className="flex flex-col">
                          <span className="font-medium">{account.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatCurrency(account.current_balance)}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!accounts.length && (
                  <p className="text-xs text-muted-foreground">
                    No accounts available. Add one from the Accounts panel before recording transactions.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select
                  value={formState.department_id}
                  onValueChange={(value) =>
                    setFormState((prev) => ({ ...prev, department_id: value }))
                  }
                >
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((department) => (
                      <SelectItem key={department.dept_id} value={department.dept_id}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formState.amount}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, amount: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expected-amount">{expectedAmountLabel}</Label>
                <Input
                  id="expected-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formState.expected_amount}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      expected_amount: event.target.value,
                    }))
                  }
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">{expectedAmountHelper}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="narration">Narration</Label>
              <Textarea
                id="narration"
                value={formState.narration}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, narration: event.target.value }))
                }
                placeholder="Describe the transaction..."
                rows={4}
                required
              />
            </div>

            {editing?.bill_reference_id && (
              <div className="rounded-lg border border-border bg-muted/40 p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Linked Bill/Voucher</p>
                  <p className="text-xs text-muted-foreground">
                    {editing.bill?.vendor_client_name ?? "No vendor/client name recorded"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleViewBill(editing.bill)}>
                    <ExternalLink className="mr-1 h-4 w-4" />
                    View
                  </Button>
                  <Button size="sm" onClick={() => openBillDialog(editing, "replace")}>
                    <LinkIcon className="mr-1 h-4 w-4" />
                    Replace Document
                  </Button>
                </div>
              </div>
            )}

            {!editing && (
              <div className="space-y-3 rounded-xl border border-dashed border-border bg-muted/30 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">
                        Attach Supporting Document (Optional)
                      </p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label="Supporting document information"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-sm leading-relaxed">
                          Upload the PDF or image voucher associated with this transaction so reviewers can verify the
                          entry during audits.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  {newBillFile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={resetNewBillState}
                    >
                      <X className="h-4 w-4" />
                      Remove
                    </Button>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
                  <div className="rounded-lg border border-dashed border-border bg-background p-4 text-center">
                    <input
                      id="new-bill-upload"
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={(event) => handleNewBillFileChange(event.target.files)}
                    />
                    <label
                      htmlFor="new-bill-upload"
                      className="cursor-pointer text-sm font-medium text-primary hover:underline"
                    >
                      {newBillFileName ? "Choose a different file" : "Drag & drop or click to upload"}
                    </label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Accepted: PDF, PNG, JPG, WEBP · Max 5MB
                    </p>
                    {newBillFileName && (
                      <p className="mt-2 text-sm text-foreground">{newBillFileName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="new-bill-type" className="mb-0">
                        Voucher Type
                      </Label>
                      {!addingDocumentType && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              aria-label="Voucher type information"
                            >
                              <Info className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-sm leading-relaxed">
                            Select the classification of the supporting document (e.g., Expense Bill, Client Invoice,
                            Salary Slip) for auditing and record-keeping.
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    {addingDocumentType ? (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                          id="new-bill-type-input"
                          placeholder="New document type"
                          value={newDocumentTypeName}
                          onChange={(event) => setNewDocumentTypeName(event.target.value)}
                          disabled={createDocumentTypeMutation.isPending}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleCreateDocumentType}
                            disabled={createDocumentTypeMutation.isPending}
                          >
                            {createDocumentTypeMutation.isPending && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Save
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setAddingDocumentType(false);
                              setNewDocumentTypeName("");
                            }}
                            disabled={createDocumentTypeMutation.isPending}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Select value={newBillType} onValueChange={setNewBillType}>
                          <SelectTrigger id="new-bill-type">
                            <SelectValue placeholder="Select voucher type" />
                          </SelectTrigger>
                          <SelectContent>
                            {documentTypes.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10"
                          onClick={() => {
                            setAddingDocumentType(true);
                            setNewDocumentTypeName("");
                          }}
                          disabled={documentTypesQuery.isLoading || createDocumentTypeMutation.isPending}
                        >
                          <PlusCircle className="h-4 w-4" />
                          <span className="sr-only">Add document type</span>
                        </Button>
                      </div>
                    )}
                    {documentTypesQuery.isLoading && !addingDocumentType && (
                      <p className="text-xs text-muted-foreground">Loading document types…</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

          <DialogFooter className="border-t border-border/50 px-6 py-4">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
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

      <TransactionDetailModal
        open={detailModalOpen}
        transactionId={detailTransactionId}
        onClose={() => {
          setDetailModalOpen(false);
          setDetailTransactionId(null);
        }}
        financeTypes={financeTypes}
        departments={departments}
        accounts={accounts}
        onManageBill={handleManageBillFromDetail}
        onSuccess={() => {
          queryInvalidation();
        }}
      />

      <Dialog open={billDialogOpen} onOpenChange={(open) => !open && closeBillDialog()}>
        <DialogContent className="w-[min(95vw,520px)] max-w-lg overflow-hidden p-0">
          <div className="flex h-full max-h-[85vh] flex-col">
            <DialogHeader className="border-b border-border/50 px-6 py-5">
              <DialogTitle>
                {billDialogMode === "replace" ? "Replace linked document" : "Attach bill or voucher"}
              </DialogTitle>
            </DialogHeader>

            <form className="flex flex-1 flex-col overflow-hidden" onSubmit={handleBillSubmit}>
              <div className="flex-1 overflow-y-auto space-y-4 px-6 py-5">
            {billTarget && (
              <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {billTarget.reference} · {formatDate(billTarget.t_date)}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {billTarget.narration}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="bill-vendor">Vendor / Client</Label>
              <Input
                id="bill-vendor"
                value={billForm.vendor_client_name}
                onChange={(event) =>
                  setBillForm((prev) => ({ ...prev, vendor_client_name: event.target.value }))
                }
                placeholder="e.g. PropertyCo Real Estate"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bill-type">Document Type</Label>
              {addingDocumentType ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    id="bill-type-input"
                    placeholder="New document type"
                    value={newDocumentTypeName}
                    onChange={(event) => setNewDocumentTypeName(event.target.value)}
                    disabled={createDocumentTypeMutation.isPending}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCreateDocumentType}
                      disabled={createDocumentTypeMutation.isPending}
                    >
                      {createDocumentTypeMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setAddingDocumentType(false);
                        setNewDocumentTypeName("");
                      }}
                      disabled={createDocumentTypeMutation.isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Select
                    value={billForm.type}
                    onValueChange={(value) => setBillForm((prev) => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger id="bill-type">
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => {
                      setAddingDocumentType(true);
                      setNewDocumentTypeName("");
                    }}
                    disabled={documentTypesQuery.isLoading || createDocumentTypeMutation.isPending}
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span className="sr-only">Add document type</span>
                  </Button>
                </div>
              )}
              {documentTypesQuery.isLoading && !addingDocumentType && (
                <p className="text-xs text-muted-foreground">Loading document types…</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bill-file">Upload document</Label>
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center">
                <input
                  id="bill-file"
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(event) => handleBillFileChange(event.target.files)}
                />
                <label
                  htmlFor="bill-file"
                  className="cursor-pointer text-sm font-medium text-primary hover:underline"
                >
                  {billForm.fileName ? "Choose a different file" : "Drag & drop or click to upload"}
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Accepted formats: PDF, PNG, JPG, WEBP · Max size 5MB
                </p>
                {billForm.fileName && (
                  <p className="mt-2 text-sm text-foreground">{billForm.fileName}</p>
                )}
              </div>
            </div>

              </div>

              <DialogFooter className="border-t border-border/50 px-6 py-4">
              <Button type="button" variant="outline" onClick={closeBillDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={billMutation.isPending}>
                {billMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {billDialogMode === "replace" ? "Replace Document" : "Attach Document"}
              </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
};
