import { DEFAULT_PAGE_SIZE } from "@/config";
import { Account } from "@/types/api";

import { mockDb, type AccountPayload } from "./mockDatabase";

export type { AccountPayload } from "./mockDatabase";

export async function fetchAccounts(perPage = DEFAULT_PAGE_SIZE): Promise<Account[]> {
  const all = await mockDb.listAccounts();
  return all.slice(0, perPage);
}

export function createAccount(payload: AccountPayload) {
  return mockDb.createAccount(payload);
}

export function updateAccount(accountId: string, payload: Partial<AccountPayload>) {
  return mockDb.updateAccount(accountId, payload);
}

export function deleteAccount(accountId: string) {
  return mockDb.deleteAccount(accountId);
}

