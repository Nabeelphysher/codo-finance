import { DEFAULT_PAGE_SIZE } from "@/config";
import { Department } from "@/types/api";

import { mockDb, type DepartmentPayload } from "./mockDatabase";

export type { DepartmentPayload } from "./mockDatabase";

export async function fetchDepartments(perPage = DEFAULT_PAGE_SIZE): Promise<Department[]> {
  const all = await mockDb.listDepartments();
  return all.slice(0, perPage);
}

export async function createDepartment(payload: DepartmentPayload): Promise<Department> {
  return mockDb.createDepartment(payload);
}

export async function updateDepartment(
  deptId: string,
  payload: Partial<DepartmentPayload>,
): Promise<Department> {
  return mockDb.updateDepartment(deptId, payload);
}

export async function deleteDepartment(deptId: string): Promise<void> {
  await mockDb.deleteDepartment(deptId);
}

export async function restoreDepartment(deptId: string): Promise<Department> {
  return mockDb.restoreDepartment(deptId);
}

