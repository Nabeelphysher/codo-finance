import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Salary, Staff } from "@/types/api";
import { fetchSalaries, createSalary, deleteSalary, updateSalary, SalaryPayload } from "@/services/salaries";
import { fetchStaff } from "@/services/staff";
import { fetchDepartments } from "@/services/departments";
import { fetchFinanceTypes } from "@/services/financeTypes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { ApiError } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

interface FormState {
  staff_id: string;
  pay_month: string;
  gross_salary: string;
  deductions: string;
  net_pay: string;
}

interface EditFormState {
  gross_salary: string;
  deductions: string;
  net_pay: string;
  finance_type_id: string;
  department_id: string;
}

const defaultFormState: FormState = {
  staff_id: "",
  pay_month: "",
  gross_salary: "",
  deductions: "",
  net_pay: "",
};

const defaultEditFormState: EditFormState = {
  gross_salary: "",
  deductions: "",
  net_pay: "",
  finance_type_id: "",
  department_id: "",
};

export const SalariesPanel = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formState, setFormState] = useState<FormState>(defaultFormState);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSalary, setEditingSalary] = useState<Salary | null>(null);
  const [editFormState, setEditFormState] = useState<EditFormState>(defaultEditFormState);
  const [netManuallyEdited, setNetManuallyEdited] = useState(false);

  const salariesQuery = useQuery({
    queryKey: ["salaries"],
    queryFn: () => fetchSalaries(200),
  });

  const staffQuery = useQuery({
    queryKey: ["staff", "options"],
    queryFn: () => fetchStaff(200),
  });

  const departmentsQuery = useQuery({
    queryKey: ["departments", "options"],
    queryFn: () => fetchDepartments(200),
  });

  const financeTypesQuery = useQuery({
    queryKey: ["finance-types", "options"],
    queryFn: () => fetchFinanceTypes(200),
  });

  const createMutation = useMutation({
    mutationFn: (payload: SalaryPayload) => createSalary(payload),
    onSuccess: () => {
      toast({ title: "Salary created and ledger updated" });
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      closeDialog();
    },
    onError: (error: unknown) => showError(error, "Unable to create salary"),
  });

  const deleteMutation = useMutation({
    mutationFn: (salaryId: string) => deleteSalary(salaryId),
    onSuccess: () => {
      toast({ title: "Salary removed" });
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (error: unknown) => showError(error, "Unable to delete salary"),
  });

  const updateSalaryMutation = useMutation({
    mutationFn: ({ salaryId, payload }: { salaryId: string; payload: Partial<SalaryPayload> }) =>
      updateSalary(salaryId, payload),
    onSuccess: () => {
      toast({ title: "Payroll updated" });
      queryClient.invalidateQueries({ queryKey: ["salaries"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      closeEditDialog();
    },
    onError: (error: unknown) => showError(error, "Unable to update payroll"),
  });

  const showError = (error: unknown, fallback: string) => {
    const message = error instanceof ApiError ? error.message : fallback;
    toast({
      title: "Request failed",
      description: message,
      variant: "destructive",
    });
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setFormState(defaultFormState);
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditingSalary(null);
    setEditFormState(defaultEditFormState);
    setNetManuallyEdited(false);
  };

  const openDialog = () => {
    setFormState(defaultFormState);
    setDialogOpen(true);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.staff_id || !formState.pay_month || !formState.gross_salary) {
      toast({
        title: "Missing information",
        description: "Staff, pay month, and gross salary are required.",
        variant: "destructive",
      });
      return;
    }

    const grossSalary = Number(formState.gross_salary);
    const deductions = formState.deductions ? Number(formState.deductions) : 0;
    const month = `${formState.pay_month}-01`;
    const netPay = formState.net_pay ? Number(formState.net_pay) : grossSalary - deductions;

    const payload: SalaryPayload = {
      staff_id: formState.staff_id,
      pay_month: month,
      gross_salary: grossSalary,
      deductions,
      net_pay: netPay,
    };

    createMutation.mutate(payload);
  };

  const staffLookup = useMemo(() => {
    const map = new Map<string, Staff>();
    staffQuery.data?.forEach((staff) => map.set(staff.staff_id, staff));
    return map;
  }, [staffQuery.data]);

  const departmentLookup = useMemo(() => {
    const map = new Map<string, string>();
    departmentsQuery.data?.forEach((department) => map.set(department.dept_id, department.name));
    return map;
  }, [departmentsQuery.data]);

  const financeTypeLookup = useMemo(() => {
    const map = new Map<string, string>();
    financeTypesQuery.data?.forEach((type) => map.set(type.type_id, type.name));
    return map;
  }, [financeTypesQuery.data]);

  const calculateNetFromStrings = (gross: string, deductions: string) => {
    const grossValue = parseFloat(gross || "0");
    const deductionValue = parseFloat(deductions || "0");
    if (Number.isNaN(grossValue) || Number.isNaN(deductionValue)) {
      return "";
    }
    const result = grossValue - deductionValue;
    return result >= 0 ? String(result) : "0";
  };

  const openEditDialog = (salary: Salary) => {
    const transaction = salary.transaction;
    const defaultFinanceType =
      transaction?.finance_type_id ?? financeTypesQuery.data?.[0]?.type_id ?? "";
    const defaultDepartment =
      transaction?.department_id ?? departmentsQuery.data?.[0]?.dept_id ?? "";

    setEditingSalary(salary);
    setEditFormState({
      gross_salary: String(salary.gross_salary ?? ""),
      deductions: String(salary.deductions ?? "0"),
      net_pay: String(salary.net_pay ?? calculateNetFromStrings(String(salary.gross_salary ?? ""), String(salary.deductions ?? "0"))),
      finance_type_id: defaultFinanceType,
      department_id: defaultDepartment,
    });
    setNetManuallyEdited(false);
    setEditDialogOpen(true);
  };

  const handleGrossChange = (value: string) => {
    setEditFormState((prev) => {
      const next = { ...prev, gross_salary: value };
      if (!netManuallyEdited) {
        next.net_pay = calculateNetFromStrings(value, prev.deductions);
      }
      return next;
    });
  };

  const handleDeductionChange = (value: string) => {
    setEditFormState((prev) => {
      const next = { ...prev, deductions: value };
      if (!netManuallyEdited) {
        next.net_pay = calculateNetFromStrings(prev.gross_salary, value);
      }
      return next;
    });
  };

  const handleNetChange = (value: string) => {
    setNetManuallyEdited(Boolean(value.trim()));
    setEditFormState((prev) => ({ ...prev, net_pay: value }));
  };

  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingSalary) return;

    const gross = parseFloat(editFormState.gross_salary || "0");
    const deductions = parseFloat(editFormState.deductions || "0");
    const net = parseFloat(editFormState.net_pay || "0");

    if (Number.isNaN(gross) || Number.isNaN(deductions) || Number.isNaN(net)) {
      toast({
        title: "Invalid amounts",
        description: "Please enter valid numbers for gross, deductions, and net pay.",
        variant: "destructive",
      });
      return;
    }

    if (!editFormState.finance_type_id) {
      toast({
        title: "Finance type required",
        description: "Select the ledger account used for this payroll.",
        variant: "destructive",
      });
      return;
    }

    if (!editFormState.department_id) {
      toast({
        title: "Department required",
        description: "Select the department or cost center.",
        variant: "destructive",
      });
      return;
    }

    const difference = Math.abs((gross - deductions) - net);
    if (difference > 0.01) {
      toast({
        title: "Totals do not match",
        description: "Ensure Gross Pay - Deductions equals Net Pay.",
        variant: "destructive",
      });
      return;
    }

    const payload: Partial<SalaryPayload> = {
      gross_salary: gross,
      deductions,
      net_pay: net,
      finance_type_id: editFormState.finance_type_id,
      department_id: editFormState.department_id,
    };

    updateSalaryMutation.mutate({ salaryId: editingSalary.salary_id, payload });
  };

  const sortedSalaries = useMemo(() => {
    if (!salariesQuery.data) {
      return [];
    }

    return [...salariesQuery.data].sort((a, b) => (a.pay_month > b.pay_month ? -1 : 1));
  }, [salariesQuery.data]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Salaries & Payroll</h2>
          <p className="text-sm text-muted-foreground">
            Generate payroll and post expenses to the general ledger
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => salariesQuery.refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={openDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Process Payroll
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow>
                <TableHead>Pay Month</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Net Pay</TableHead>
                <TableHead>Gross / Deductions</TableHead>
                <TableHead>Finance Type</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Ledger ID</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {salariesQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                  <Loader2 className="mr-2 inline-block h-4 w-4 animate-spin" />
                  Loading salary records...
                </TableCell>
              </TableRow>
            )}

            {salariesQuery.isError && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6 text-destructive">
                  Failed to load salary records.
                </TableCell>
              </TableRow>
            )}

            {!salariesQuery.isLoading &&
              sortedSalaries.map((salary) => {
                const staff = staffLookup.get(salary.staff_id);
                const txn = salary.transaction;
                const financeTypeName = txn ? financeTypeLookup.get(txn.finance_type_id) : null;
                const departmentName = txn ? departmentLookup.get(txn.department_id) : null;

                return (
                  <TableRow key={salary.salary_id}>
                    <TableCell className="font-medium">
                      {formatDate(salary.pay_month)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{staff?.name ?? salary.staff_id}</div>
                        <div className="text-xs text-muted-foreground">{staff?.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(salary.net_pay ?? 0)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div>Gross: {formatCurrency(salary.gross_salary)}</div>
                      <div>Deductions: {formatCurrency(salary.deductions)}</div>
                    </TableCell>
                    <TableCell>
                      {financeTypeName ? (
                        <Badge variant="outline">{financeTypeName}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {departmentName ? (
                        <span>{departmentName}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {txn ? (
                        <code className="text-xs bg-accent px-2 py-1 rounded">
                          {txn.id}
                        </code>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
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
                              aria-label="Edit payroll"
                              onClick={() => openEditDialog(salary)}
                              disabled={
                                updateSalaryMutation.isPending && editingSalary?.salary_id === salary.salary_id
                              }
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit Payroll</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/15"
                              aria-label="Delete salary record"
                              onClick={() => deleteMutation.mutate(salary.salary_id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete Salary</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

            {!salariesQuery.isLoading && sortedSalaries.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No payroll processed yet. Create a salary entry to post to the ledger.
                </TableCell>
              </TableRow>
            )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process monthly payroll</DialogTitle>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Staff member</label>
              <Select
                value={formState.staff_id}
                onValueChange={(value) => setFormState((prev) => ({ ...prev, staff_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {staffQuery.data?.map((staff) => (
                    <SelectItem key={staff.staff_id} value={staff.staff_id}>
                      {staff.name} • {staff.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="pay-month">
                Pay month
              </label>
              <Input
                id="pay-month"
                type="month"
                value={formState.pay_month}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, pay_month: event.target.value }))
                }
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="gross-salary">
                  Gross salary
                </label>
                <Input
                  id="gross-salary"
                  type="number"
                  min={0}
                  step="0.01"
                  value={formState.gross_salary}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, gross_salary: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="deductions">
                  Deductions
                </label>
                <Input
                  id="deductions"
                  type="number"
                  min={0}
                  step="0.01"
                  value={formState.deductions}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, deductions: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="net-pay">
                  Net pay (optional)
                </label>
                <Input
                  id="net-pay"
                  type="number"
                  min={0}
                  step="0.01"
                  value={formState.net_pay}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, net_pay: event.target.value }))
                  }
                  placeholder="Auto-calculated if blank"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save &amp; Post
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingSalary
                ? `Edit Payroll Details for ${
                    staffLookup.get(editingSalary.staff_id)?.name ?? editingSalary.staff_id
                  }`
                : "Edit Payroll Details"}
            </DialogTitle>
          </DialogHeader>

          {editingSalary && (
            <form className="space-y-6 max-h-[70vh] overflow-y-auto pr-1" onSubmit={handleEditSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Staff Name</label>
                  <Input
                    value={staffLookup.get(editingSalary.staff_id)?.name ?? editingSalary.staff_id}
                    disabled
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Pay Month</label>
                  <Input value={formatDate(editingSalary.pay_month)} disabled readOnly />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Ledger ID</label>
                  <Input
                    value={editingSalary.transaction?.id ? String(editingSalary.transaction.id) : "Not posted"}
                    disabled
                    readOnly
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="edit-gross">
                    Gross Pay (₹)
                  </label>
                  <Input
                    id="edit-gross"
                    type="number"
                    min={0}
                    step="0.01"
                    value={editFormState.gross_salary}
                    onChange={(event) => handleGrossChange(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="edit-deductions">
                    Total Deductions (₹)
                  </label>
                  <Input
                    id="edit-deductions"
                    type="number"
                    min={0}
                    step="0.01"
                    value={editFormState.deductions}
                    onChange={(event) => handleDeductionChange(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="edit-net">
                    Net Pay (₹)
                  </label>
                  <Input
                    id="edit-net"
                    type="number"
                    min={0}
                    step="0.01"
                    value={editFormState.net_pay}
                    onChange={(event) => handleNetChange(event.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Auto-updates from gross & deductions unless overridden.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Finance Type</label>
                  <Select
                    value={editFormState.finance_type_id}
                    onValueChange={(value) =>
                      setEditFormState((prev) => ({ ...prev, finance_type_id: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select finance type" />
                    </SelectTrigger>
                    <SelectContent>
                      {financeTypesQuery.data?.map((type) => (
                        <SelectItem key={type.type_id} value={type.type_id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Department</label>
                  <Select
                    value={editFormState.department_id}
                    onValueChange={(value) =>
                      setEditFormState((prev) => ({ ...prev, department_id: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departmentsQuery.data?.map((department) => (
                        <SelectItem key={department.dept_id} value={department.dept_id}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <Button type="button" variant="outline" onClick={closeEditDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateSalaryMutation.isPending}>
                  {updateSalaryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  </TooltipProvider>
  );
};

