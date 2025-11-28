import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Department } from "@/types/api";
import {
  fetchDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  restoreDepartment,
  DepartmentPayload,
} from "@/services/departments";
import { fetchStaff } from "@/services/staff";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { useUndoToast } from "@/hooks/use-undo-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Pencil, Plus, RefreshCw, Trash2, ChevronsUpDown, Search, Check, X } from "lucide-react";
import { ApiError } from "@/lib/api";

interface FormState {
  name: string;
  description: string;
  assigned_staff_ids: string[];
  is_active: boolean;
}

const defaultFormState: FormState = {
  name: "",
  description: "",
  assigned_staff_ids: [],
  is_active: true,
};

export const DepartmentsPanel = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const showUndoToast = useUndoToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [formState, setFormState] = useState<FormState>(defaultFormState);
  const [staffPickerOpen, setStaffPickerOpen] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [viewingDepartment, setViewingDepartment] = useState<Department | null>(null);

  const departmentsQuery = useQuery({
    queryKey: ["departments"],
    queryFn: () => fetchDepartments(200),
  });

  const staffQuery = useQuery({
    queryKey: ["staff", "for-departments"],
    queryFn: () => fetchStaff(200),
  });

  const createMutation = useMutation({
    mutationFn: (payload: DepartmentPayload) => createDepartment(payload),
    onSuccess: () => {
      toast({ title: "Department saved" });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      closeDialog();
    },
    onError: (error: unknown) => showError(error, "Unable to save department"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ deptId, payload }: { deptId: string; payload: Partial<DepartmentPayload> }) =>
      updateDepartment(deptId, payload),
    onSuccess: () => {
      toast({ title: "Department updated" });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      closeDialog();
    },
    onError: (error: unknown) => showError(error, "Unable to update department"),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ deptId }: { deptId: string; label: string }) => deleteDepartment(deptId),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      showUndoToast({
        entity: "Department",
        identifier: variables.label,
        onUndo: async () => {
          await restoreDepartment(variables.deptId);
          queryClient.invalidateQueries({ queryKey: ["departments"] });
        },
      });
    },
    onError: (error: unknown) => showError(error, "Unable to delete department"),
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
    setEditing(null);
    setFormState(defaultFormState);
    setStaffPickerOpen(false);
    setStaffSearch("");
  };

  const openDetailDialog = (department: Department) => {
    setViewingDepartment(department);
    setDetailDialogOpen(true);
  };

  const closeDetailDialog = () => {
    setDetailDialogOpen(false);
    setViewingDepartment(null);
  };

  const openCreateDialog = () => {
    setEditing(null);
    setFormState(defaultFormState);
    setDialogOpen(true);
  };

  const openEditDialog = (department: Department) => {
    setEditing(department);
    setFormState({
      name: department.name,
      description: department.description ?? "",
      assigned_staff_ids: department.assigned_staff_ids ?? [],
      is_active: department.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const description = formState.description.trim();

    if (editing) {
      const payload: DepartmentPayload = {
        name: formState.name,
        description: description || undefined,
        assigned_staff_ids: formState.assigned_staff_ids,
        is_active: formState.is_active,
      };
      updateMutation.mutate({ deptId: editing.dept_id, payload });
    } else {
      const payload: DepartmentPayload = {
        name: formState.name,
        description: description || undefined,
        assigned_staff_ids: formState.assigned_staff_ids,
        is_active: true,
      };
      createMutation.mutate(payload);
    }
  };

  const toggleActive = (department: Department) => {
    updateMutation.mutate({
      deptId: department.dept_id,
      payload: { is_active: !department.is_active },
    });
  };

  const sortedDepartments = useMemo(() => {
    if (!departmentsQuery.data) {
      return [];
    }
    return [...departmentsQuery.data].sort((a, b) => a.name.localeCompare(b.name));
  }, [departmentsQuery.data]);

  const staffOptions = staffQuery.data ?? [];

  const staffLookup = useMemo(() => {
    const map = new Map<string, (typeof staffOptions)[number]>();
    staffOptions.forEach((staff) => {
      map.set(staff.staff_id, staff);
    });
    return map;
  }, [staffOptions]);

  const filteredStaff = useMemo(() => {
    const query = staffSearch.trim().toLowerCase();
    if (!query) {
      return staffOptions;
    }
    return staffOptions.filter((staff) => {
      const nameMatch = staff.name.toLowerCase().includes(query);
      const emailMatch = staff.email?.toLowerCase().includes(query);
      return nameMatch || Boolean(emailMatch && emailMatch.includes(query));
    });
  }, [staffOptions, staffSearch]);

  const toggleStaffSelection = (staffId: string) => {
    setFormState((prev) => {
      const exists = prev.assigned_staff_ids.includes(staffId);
      const next = exists
        ? prev.assigned_staff_ids.filter((id) => id !== staffId)
        : [...prev.assigned_staff_ids, staffId];
      return { ...prev, assigned_staff_ids: next };
    });
  };

  const removeStaffSelection = (staffId: string) => {
    setFormState((prev) => ({
      ...prev,
      assigned_staff_ids: prev.assigned_staff_ids.filter((id) => id !== staffId),
    }));
  };

  const selectedStaffLabel =
    formState.assigned_staff_ids.length > 0
      ? `${formState.assigned_staff_ids.length} member${
          formState.assigned_staff_ids.length > 1 ? "s" : ""
        } selected`
      : "Select staff";

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Departments</h2>
          <p className="text-sm text-muted-foreground">Maintain cost centre departments</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => departmentsQuery.refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            New Department
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Staff Count</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {departmentsQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                  <Loader2 className="mr-2 inline-block h-4 w-4 animate-spin" />
                  Loading departments...
                </TableCell>
              </TableRow>
            )}

            {departmentsQuery.isError && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-destructive">
                  Failed to load departments.
                </TableCell>
              </TableRow>
            )}

                {!departmentsQuery.isLoading &&
                  sortedDepartments.map((department) => (
                    <TableRow
                      key={department.dept_id}
                      onClick={() => openDetailDialog(department)}
                      className="cursor-pointer transition hover:bg-muted/50"
                    >
                  <TableCell className="font-medium">{department.name}</TableCell>
                  <TableCell>
                    <Badge variant={department.is_active ? "outline" : "secondary"}>
                      {department.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {department.assigned_staff_ids?.length ?? 0}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {department.created_at
                      ? new Date(department.created_at).toLocaleDateString()
                      : "—"}
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
                          aria-label="Edit department"
                          onClick={() => openEditDialog(department)}
                          disabled={updateMutation.isLoading}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit Department</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10"
                          aria-label="Delete department"
                          onClick={() =>
                            deleteMutation.mutate({
                              deptId: department.dept_id,
                              label: department.name,
                            })
                          }
                          disabled={deleteMutation.isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete Department</TooltipContent>
                    </Tooltip>
                    <Switch
                      checked={department.is_active}
                      onCheckedChange={() => toggleActive(department)}
                      disabled={updateMutation.isLoading}
                    />
                  </TableCell>
                </TableRow>
              ))}

            {!departmentsQuery.isLoading && sortedDepartments.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No departments found. Add your first department to begin.
                </TableCell>
              </TableRow>
            )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="w-[min(95vw,560px)]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit department" : "Create department"}</DialogTitle>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="department-name">
                Name
              </label>
              <Input
                id="department-name"
                placeholder="e.g. Marketing"
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, name: event.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="department-description">
                Description
              </label>
              <Textarea
                id="department-description"
                placeholder="Describe the department's primary function and scope."
                rows={4}
                value={formState.description}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Assign Staff Members (Optional)
              </label>
              <Popover open={staffPickerOpen} onOpenChange={setStaffPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between"
                  >
                    <span>{selectedStaffLabel}</span>
                    <ChevronsUpDown className="h-4 w-4 opacity-60" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="start">
                  <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      value={staffSearch}
                      onChange={(event) => setStaffSearch(event.target.value)}
                      placeholder="Search staff..."
                      className="h-8 border-0 px-0 text-sm shadow-none focus-visible:ring-0"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {filteredStaff.length === 0 ? (
                      <p className="px-3 py-4 text-sm text-muted-foreground">No staff found.</p>
                    ) : (
                      filteredStaff.map((staff) => {
                        const selected = formState.assigned_staff_ids.includes(staff.staff_id);
                        return (
                          <button
                            type="button"
                            key={staff.staff_id}
                            className="flex w-full items-start justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => toggleStaffSelection(staff.staff_id)}
                          >
                            <div>
                              <p className="font-medium text-foreground">{staff.name}</p>
                              {staff.email && (
                                <p className="text-xs text-muted-foreground">{staff.email}</p>
                              )}
                            </div>
                            {selected && <Check className="h-4 w-4 text-primary" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              {formState.assigned_staff_ids.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formState.assigned_staff_ids.map((staffId) => {
                    const staff = staffLookup.get(staffId);
                    return (
                      <Badge
                        key={staffId}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        <span>{staff?.name ?? staffId}</span>
                        <button
                          type="button"
                          onClick={() => removeStaffSelection(staffId)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {editing && (
              <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Active status</p>
                  <p className="text-xs text-muted-foreground">
                    Disable to keep history while preventing new allocations
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isLoading || updateMutation.isLoading}
              >
                {(createMutation.isLoading || updateMutation.isLoading) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detailDialogOpen} onOpenChange={(open) => !open && closeDetailDialog()}>
        <DialogContent className="w-[min(95vw,800px)] max-w-3xl">
          {viewingDepartment && (
            <>
              <DialogHeader>
                <DialogTitle>{`Department Details: ${viewingDepartment.name}`}</DialogTitle>
              </DialogHeader>

              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Name</p>
                    <p className="text-base font-semibold text-foreground">{viewingDepartment.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Status</p>
                    <Badge variant={viewingDepartment.is_active ? "outline" : "secondary"}>
                      {viewingDepartment.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Staff Count</p>
                    <p className="text-base font-semibold text-foreground">
                      {viewingDepartment.assigned_staff_ids?.length ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Created</p>
                    <p className="text-sm text-foreground">
                      {viewingDepartment.created_at
                        ? new Date(viewingDepartment.created_at).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Description</p>
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm text-foreground">
                    {viewingDepartment.description ? (
                      <p className="whitespace-pre-line">{viewingDepartment.description}</p>
                    ) : (
                      <span className="text-muted-foreground">No description provided.</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Assigned Members</p>
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                    {viewingDepartment.assigned_staff_ids && viewingDepartment.assigned_staff_ids.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {viewingDepartment.assigned_staff_ids.map((staffId) => {
                          const staff = staffLookup.get(staffId);
                          return (
                            <div
                              key={staffId}
                              className="flex flex-col gap-0.5 rounded-md border border-border/60 bg-background px-3 py-2"
                            >
                              <p className="text-sm font-medium text-foreground">{staff?.name ?? staffId}</p>
                              {staff?.email && <p className="text-xs text-muted-foreground">{staff.email}</p>}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No staff members assigned.</span>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDetailDialog}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  </TooltipProvider>
  );
};
