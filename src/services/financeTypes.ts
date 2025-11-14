import { DEFAULT_PAGE_SIZE } from "@/config";
import { FinanceCategory, FinanceType } from "@/types/api";

import { mockDb, type FinanceTypePayload } from "./mockDatabase";

export type { FinanceTypePayload } from "./mockDatabase";

export async function fetchFinanceCategories(): Promise<FinanceCategory[]> {
  return mockDb.listFinanceCategories();
}

export async function fetchFinanceTypes(perPage = DEFAULT_PAGE_SIZE): Promise<FinanceType[]> {
  const all = await mockDb.listFinanceTypes();
  return all.slice(0, perPage);
}

export async function createFinanceCategory(name: string): Promise<FinanceCategory> {
  return mockDb.createFinanceCategory(name);
}

export async function createFinanceType(payload: FinanceTypePayload): Promise<FinanceType> {
  return mockDb.createFinanceType(payload);
}

export async function updateFinanceType(
  typeId: string,
  payload: Partial<FinanceTypePayload>,
): Promise<FinanceType> {
  return mockDb.updateFinanceType(typeId, payload);
}

export async function deleteFinanceType(typeId: string): Promise<void> {
  await mockDb.deleteFinanceType(typeId);
}

