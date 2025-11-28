import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FinanceType, FinanceCategory, TransactionNature } from "@/types/api";
import {
  fetchFinanceTypes,
  createFinanceType,
  updateFinanceType,
  deleteFinanceType,
  restoreFinanceType,
  fetchFinanceCategories,
  createFinanceCategory,
  FinanceTypePayload,
} from "@/services/financeTypes";
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
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { useUndoToast } from "@/hooks/use-undo-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Pencil, Plus, PlusCircle, RefreshCw, Trash2 } from "lucide-react";
import { ApiError } from "@/lib/api";

const categories: FinanceCategory[] = ["Income", "Expense", "Asset", "Liability"];

interface FormState {
  name: string;
  category: FinanceCategory;
  transaction_nature: TransactionNature;
  is_active: boolean;
}

const defaultFormState: FormState = {
  name: "",
  category: "Expense",
  transaction_nature: "Debit",
  is_active: true,
};

export const FinanceTypesPanel = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const showUndoToast = useUndoToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceType | null>(null);
  const [formState, setFormState] = useState<FormState>(defaultFormState);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const categoriesQuery = useQuery({
    queryKey: ["finance-type-categories"],
    queryFn: () => fetchFinanceCategories(),
  });

  const categories = categoriesQuery.data ?? ["Income", "Expense", "Asset", "Liability"];

  const financeTypesQuery = useQuery({
    queryKey: ["finance-types"],
    queryFn: () => fetchFinanceTypes(200),
  });

  const createMutation = useMutation({
    mutationFn: (payload: FinanceTypePayload) => createFinanceType(payload),
    onSuccess: () => {
      toast({ title: "Finance type saved" });
      queryClient.invalidateQueries({ queryKey: ["finance-types"] });
      closeDialog();
    },
    onError: (error: unknown) => showError(error, "Unable to save finance type"),
  });

  const createCategoryMutation = useMutation({
    mutationFn: (name: string) => createFinanceCategory(name),
    onSuccess: (category) => {
      toast({ title: "Category created", description: `"${category}" is now available.` });
      queryClient.setQueryData<FinanceCategory[]>(["finance-type-categories"], (prev = []) => {
        if (prev.some((item) => item.toLowerCase() === category.toLowerCase())) {
          return prev;
        }
        return [...prev, category];
      });
      queryClient.invalidateQueries({ queryKey: ["finance-type-categories"] });
      setFormState((prev) => ({ ...prev, category }));
      setAddingCategory(false);
      setNewCategoryName("");
    },
    onError: (error: unknown) => showError(error, "Unable to create category"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ typeId, payload }: { typeId: string; payload: Partial<FinanceTypePayload> }) =>
      updateFinanceType(typeId, payload),
    onSuccess: () => {
      toast({ title: "Finance type updated" });
      queryClient.invalidateQueries({ queryKey: ["finance-types"] });
      closeDialog();
    },
    onError: (error: unknown) => showError(error, "Unable to update finance type"),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ typeId }: { typeId: string; label: string }) => deleteFinanceType(typeId),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["finance-types"] });
      showUndoToast({
        entity: "Finance Type",
        identifier: variables.label,
        onUndo: async () => {
          await restoreFinanceType(variables.typeId);
          queryClient.invalidateQueries({ queryKey: ["finance-types"] });
        },
      });
    },
    onError: (error: unknown) =>
      showError(error, "Unable to delete finance type", {
        title:
          error instanceof Error &&
          /Cannot delete .+linked to one or more active transactions/i.test(error.message)
            ? "Deletion Blocked: Active Dependencies"
            : undefined,
      }),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setFormState(defaultFormState);
  };

  const showError = (error: unknown, fallback: string, options?: { title?: string }) => {
    const message =
      error instanceof ApiError
        ? error.message
        : error instanceof Error && error.message
          ? error.message
          : fallback;

    toast({
      title: options?.title ?? "Request failed",
      description: message,
      variant: "destructive",
    });
  };

  const openCreateDialog = () => {
    setEditing(null);
    setFormState(defaultFormState);
    setDialogOpen(true);
  };

  const openEditDialog = (financeType: FinanceType) => {
    setEditing(financeType);
    setFormState({
      name: financeType.name,
      category: financeType.category,
      transaction_nature: financeType.transaction_nature,
      is_active: financeType.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload: FinanceTypePayload = {
      name: formState.name,
      category: formState.category,
      transaction_nature: formState.transaction_nature,
      is_active: editing ? formState.is_active : true, // Always true when creating
    };

    if (editing) {
      updateMutation.mutate({ typeId: editing.type_id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const toggleActive = (financeType: FinanceType) => {
    updateMutation.mutate({
      typeId: financeType.type_id,
      payload: { is_active: !financeType.is_active },
    });
  };

  useEffect(() => {
    if (!editing && !formState.category && categories.length) {
      setFormState((prev) => ({ ...prev, category: categories[0] }));
    }
  }, [categories, editing, formState.category]);

  const sortedFinanceTypes = useMemo(() => {
    if (!financeTypesQuery.data) {
      return [];
    }
    return [...financeTypesQuery.data].sort((a, b) => a.name.localeCompare(b.name));
  }, [financeTypesQuery.data]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Finance Types</h2>
          <p className="text-sm text-muted-foreground">
            Manage categories used for ledger classification
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => financeTypesQuery.refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            New Type
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table className="min-w-[680px]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {financeTypesQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                  <Loader2 className="mr-2 inline-block h-4 w-4 animate-spin" />
                  Loading finance types...
                </TableCell>
              </TableRow>
            )}

            {financeTypesQuery.isError && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-destructive">
                  Failed to load finance types.
                </TableCell>
              </TableRow>
            )}

            {!financeTypesQuery.isLoading &&
              sortedFinanceTypes.map((financeType) => {
                const linkedCount = financeType.linked_transaction_count ?? 0;
                const hasDependencies = linkedCount > 0;
                const deleteDisabled = deleteMutation.isLoading || hasDependencies;
                const dependencyLabel =
                  hasDependencies &&
                  `${linkedCount} linked transaction${linkedCount === 1 ? "" : "s"}`;

                return (
                  <TableRow key={financeType.type_id} className="align-middle">
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-1">
                        <span>{financeType.name}</span>
                        {hasDependencies && (
                          <span className="text-xs font-normal text-amber-600">
                            {dependencyLabel}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  <TableCell>
                    <Badge variant="outline">{financeType.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={financeType.is_active}
                      onCheckedChange={() => toggleActive(financeType)}
                      disabled={updateMutation.isLoading}
                    />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {financeType.created_at
                      ? new Date(financeType.created_at).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          aria-label="Edit finance type"
                          onClick={() => openEditDialog(financeType)}
                          disabled={updateMutation.isLoading}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit Finance Type</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10 disabled:text-muted-foreground"
                          aria-label="Delete finance type"
                          onClick={() =>
                            deleteMutation.mutate({
                              typeId: financeType.type_id,
                              label: financeType.name,
                            })
                          }
                          disabled={deleteDisabled}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {hasDependencies
                          ? "Reassign linked transactions before deleting."
                          : "Delete Finance Type"}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}

            {!financeTypesQuery.isLoading && sortedFinanceTypes.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No finance types found. Create your first one to get started.
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
            <DialogTitle>{editing ? "Edit finance type" : "Create finance type"}</DialogTitle>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="finance-name">
                Name
              </label>
              <Input
                id="finance-name"
                placeholder="e.g. CODO SALARY"
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, name: event.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="finance-category">
                Category
              </label>
              {addingCategory ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    id="new-category-name"
                    placeholder="New category name"
                    value={newCategoryName}
                    onChange={(event) => setNewCategoryName(event.target.value)}
                    autoFocus
                    disabled={createCategoryMutation.isLoading}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const trimmed = newCategoryName.trim();
                        if (!trimmed) {
                          showError(new Error("Category name is required"), "Category name is required");
                          return;
                        }
                        createCategoryMutation.mutate(trimmed);
                      }}
                      disabled={createCategoryMutation.isLoading}
                    >
                      {createCategoryMutation.isLoading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setAddingCategory(false);
                        setNewCategoryName("");
                      }}
                      disabled={createCategoryMutation.isLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Select
                    value={formState.category}
                    onValueChange={(value: FinanceCategory) =>
                      setFormState((prev) => ({ ...prev, category: value }))
                    }
                  >
                    <SelectTrigger id="finance-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
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
                      setAddingCategory(true);
                      setNewCategoryName("");
                    }}
                    disabled={categoriesQuery.isLoading || createCategoryMutation.isLoading}
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span className="sr-only">Add category</span>
                  </Button>
                </div>
              )}
              {categoriesQuery.isLoading && !addingCategory && (
                <p className="text-xs text-muted-foreground">Loading categories…</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="transaction-nature">
                Transaction Nature
              </label>
              <Select
                value={formState.transaction_nature}
                onValueChange={(value: TransactionNature) =>
                  setFormState((prev) => ({ ...prev, transaction_nature: value }))
                }
              >
                <SelectTrigger id="transaction-nature">
                  <SelectValue placeholder="Select transaction nature" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Debit">Debit (Outflow)</SelectItem>
                  <SelectItem value="Credit">Credit (Inflow)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editing && (
              <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Active status</p>
                  <p className="text-xs text-muted-foreground">
                    Toggle to disable this finance type without removing history
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
    </div>
  </TooltipProvider>
  );
};

