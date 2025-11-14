import { DEFAULT_PAGE_SIZE } from "@/config";
import { Salary } from "@/types/api";

import { mockDb, type SalaryPayload } from "./mockDatabase";

export type { SalaryPayload } from "./mockDatabase";

export async function fetchSalaries(perPage = DEFAULT_PAGE_SIZE): Promise<Salary[]> {
  const all = await mockDb.listSalaries();
  return all.slice(0, perPage);
}

export async function createSalary(payload: SalaryPayload): Promise<Salary> {
  return mockDb.createSalary(payload);
}

export async function updateSalary(
  salaryId: string,
  payload: Partial<SalaryPayload>,
): Promise<Salary> {
  return mockDb.updateSalary(salaryId, payload);
}

export async function deleteSalary(salaryId: string): Promise<void> {
  await mockDb.deleteSalary(salaryId);
}

