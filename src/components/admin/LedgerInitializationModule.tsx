import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { ApiError } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  createOpeningBalance,
  fetchOpeningBalanceStatus,
  updateOpeningBalance,
} from "@/services/openingBalance";

const todayISO = () => new Date().toISOString().slice(0, 10);

type FormState = {
  balance_date: string;
  balance_amount: string;
};

const initialSetState: FormState = {
  balance_date: todayISO(),
  balance_amount: "",
};

export const LedgerInitializationModule = () => {
  const { toast } = useToast();

  const statusQuery = useQuery({
    queryKey: ["opening-balance-status"],
    queryFn: fetchOpeningBalanceStatus,
  });

  const [setForm, setSetForm] = useState<FormState>(initialSetState);
  const [updateForm, setUpdateForm] = useState<FormState>({
    balance_date: todayISO(),
    balance_amount: "",
  });

  useEffect(() => {
    if (statusQuery.data?.status === "not_set") {
      setSetForm((prev) => ({
        ...prev,
        balance_date: prev.balance_date || todayISO(),
      }));
    }
  }, [statusQuery.data?.status]);

  useEffect(() => {
    if (statusQuery.data?.status === "set") {
      const balance = statusQuery.data.data;
      setUpdateForm({
        balance_date: balance.balance_date,
        balance_amount: balance.balance_amount.toString(),
      });
    }
  }, [statusQuery.data]);

  const createMutation = useMutation({
    mutationFn: createOpeningBalance,
    onSuccess: () => {
      toast({ title: "Opening balance initialized." });
      statusQuery.refetch();
    },
    onError: (error: unknown) => {
      const message = error instanceof ApiError ? error.message : "Unable to set opening balance.";
      toast({ title: "Request failed", description: message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateOpeningBalance,
    onSuccess: () => {
      toast({ title: "Opening balance updated." });
      statusQuery.refetch();
    },
    onError: (error: unknown) => {
      const message = error instanceof ApiError ? error.message : "Unable to update opening balance.";
      toast({ title: "Request failed", description: message, variant: "destructive" });
    },
  });

  const isInitialized = statusQuery.data?.status === "set";
  const currentBalance = useMemo(() => {
    if (statusQuery.data?.status === "set") {
      return statusQuery.data.data;
    }
    return null;
  }, [statusQuery.data]);

  const handleCreateSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const amount = Number(setForm.balance_amount);

    if (Number.isNaN(amount)) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }

    createMutation.mutate({
      balance_date: setForm.balance_date,
      balance_amount: amount,
    });
  };

  const handleUpdateSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const amount = Number(updateForm.balance_amount);

    if (Number.isNaN(amount)) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }

    updateMutation.mutate({
      balance_date: updateForm.balance_date,
      balance_amount: amount,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Opening Balance Status</CardTitle>
          <CardDescription>Foundation entry for the general ledger.</CardDescription>
        </CardHeader>
        <CardContent>
          {statusQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64" />
            </div>
          ) : isInitialized && currentBalance ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Status: <span className="text-foreground font-medium">Initialized</span></p>
              <p className="text-sm text-muted-foreground">
                Effective Date: <span className="text-foreground font-medium">{formatDate(currentBalance.balance_date)}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Starting Amount:{" "}
                <span className="text-foreground font-medium">
                  {formatCurrency(currentBalance.balance_amount)}
                </span>
              </p>
            </div>
          ) : (
            <Alert>
              <AlertTitle>Opening balance not configured</AlertTitle>
              <AlertDescription>
                Initialize the ledger with the organisation&apos;s starting balance before recording any transactions.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {!isInitialized ? (
        <Card>
          <CardHeader>
            <CardTitle>Set Opening Balance</CardTitle>
            <CardDescription>One-time initialization. Available only to Super Admins.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleCreateSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="set-balance-date">Balance date</Label>
                  <Input
                    id="set-balance-date"
                    type="date"
                    value={setForm.balance_date}
                    onChange={(event) =>
                      setSetForm((prev) => ({ ...prev, balance_date: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="set-balance-amount">Opening amount (₹)</Label>
                  <Input
                    id="set-balance-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={setForm.balance_amount}
                    onChange={(event) =>
                      setSetForm((prev) => ({ ...prev, balance_amount: event.target.value }))
                    }
                    required
                  />
                </div>
              </div>
              <Button type="submit" disabled={createMutation.isLoading}>
                {createMutation.isLoading ? "Saving..." : "Initialize Ledger"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Update Opening Balance</CardTitle>
            <CardDescription>
              Apply audited corrections. All subsequent ledger entries will be rebalanced.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleUpdateSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="update-balance-date">Balance date</Label>
                  <Input
                    id="update-balance-date"
                    type="date"
                    value={updateForm.balance_date}
                    onChange={(event) =>
                      setUpdateForm((prev) => ({ ...prev, balance_date: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="update-balance-amount">Opening amount (₹)</Label>
                  <Input
                    id="update-balance-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={updateForm.balance_amount}
                    onChange={(event) =>
                      setUpdateForm((prev) => ({ ...prev, balance_amount: event.target.value }))
                    }
                    required
                  />
                </div>
              </div>
              <Button type="submit" disabled={updateMutation.isLoading}>
                {updateMutation.isLoading ? "Updating..." : "Apply Corrections"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

