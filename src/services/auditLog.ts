import { AuditLog, AuditModule, AuditActionType } from "@/types/api";

import { mockDb, type AuditLogFilters } from "./mockDatabase";

export type { AuditLogFilters } from "./mockDatabase";

export async function fetchAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLog[]> {
  return mockDb.listAuditLogs(filters);
}

export const AUDIT_MODULES: AuditModule[] = [
  "Transactions",
  "Accounts",
  "Finance Types",
  "Departments",
  "Staff & Roles",
  "Opening Balance",
];

export const AUDIT_ACTION_TYPES: AuditActionType[] = ["CREATED", "UPDATED", "DELETED"];

