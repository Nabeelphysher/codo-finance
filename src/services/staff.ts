import { DEFAULT_PAGE_SIZE } from "@/config";
import { Staff } from "@/types/api";

import { mockDb, type StaffPayload } from "./mockDatabase";

export type { StaffPayload } from "./mockDatabase";

export async function fetchStaff(perPage = DEFAULT_PAGE_SIZE): Promise<Staff[]> {
  const staff = await mockDb.listStaff();
  return staff.slice(0, perPage);
}

export async function createStaff(payload: StaffPayload): Promise<Staff> {
  return mockDb.createStaff(payload);
}

export async function updateStaff(
  staffId: string,
  payload: Partial<StaffPayload>,
): Promise<Staff> {
  return mockDb.updateStaff(staffId, payload);
}

export async function deleteStaff(staffId: string): Promise<void> {
  await mockDb.deleteStaff(staffId);
}

