import { ApiError, getApiBaseUrl, type PaginatedResponse } from "@/lib/api";
import { Transaction } from "@/types/api";

import {
  mockDb,
  type TransactionBillPayload,
  type TransactionFilters,
  type TransactionPayload,
} from "./mockDatabase";

export type { TransactionBillPayload, TransactionFilters, TransactionPayload } from "./mockDatabase";

export async function fetchTransactions(
  filters: TransactionFilters = {},
): Promise<PaginatedResponse<Transaction>> {
  const perPage = filters.per_page ?? 200;
  return mockDb.paginateTransactions(filters, perPage);
}

export async function createTransaction(payload: TransactionPayload): Promise<Transaction> {
  return mockDb.createTransaction(payload);
}

export async function updateTransaction(
  transactionId: number,
  payload: TransactionPayload,
): Promise<Transaction> {
  return mockDb.updateTransaction(transactionId, payload);
}

export async function deleteTransaction(transactionId: number): Promise<void> {
  await mockDb.deleteTransaction(transactionId);
}

export async function fetchTransaction(transactionId: number): Promise<Transaction> {
  return mockDb.getTransaction(transactionId);
}

export async function restoreTransaction(transactionId: number): Promise<Transaction> {
  return mockDb.restoreTransaction(transactionId);
}

const serializeTransactionFilters = (filters: TransactionFilters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    params.append(key, String(value));
  });
  return params.toString();
};

export interface TransactionExportResult {
  blob: Blob;
  filename: string;
  contentType: string;
}

export async function exportTransactionsFile(
  filters: TransactionFilters = {},
): Promise<TransactionExportResult> {
  const baseUrl = getApiBaseUrl();
  const candidates = new Set<string>();
  candidates.add(baseUrl);

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    const localhostFallback = `${protocol}//${hostname}:4000`;
    if (!baseUrl.includes(":4000")) {
      candidates.add(localhostFallback);
    }
  }

  const query = serializeTransactionFilters(filters);
  const endpoint = `/api/transactions/export${query ? `?${query}` : ""}`;

  let lastError: unknown = null;
  let lastResponse: Response | null = null;

  for (const candidateBase of candidates) {
    try {
      const response = await fetch(`${candidateBase}${endpoint}`, {
        method: "GET",
        headers: {
          Accept:
            "text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream",
        },
      });

      if (!response.ok) {
        lastResponse = response;
        if (response.status !== 404) {
          break;
        }
        continue;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
      const filename =
        filenameMatch?.[1] ?? `CODO_Transactions_${new Date().toISOString().split("T")[0]}.csv`;

      return {
        blob,
        filename,
        contentType: response.headers.get("content-type") ?? "application/octet-stream",
      };
    } catch (error) {
      lastError = error;
      continue;
    }
  }

  if (lastResponse) {
    let message = `Failed to export transactions (HTTP ${lastResponse.status})`;
    try {
      const payload = await lastResponse.json();
      message = payload?.message ?? message;
    } catch (error) {
      // ignore JSON parse errors for non-JSON responses
    }
    throw new ApiError(message, lastResponse.status);
  }

  if (lastError instanceof ApiError) {
    throw lastError;
  }

  throw new ApiError(
    (lastError as Error | null)?.message ?? "Failed to export transactions",
    0,
  );
}

