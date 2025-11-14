import { Bill } from "@/types/api";

import { mockDb, type LinkBillPayload, type UploadBillResponse } from "./mockDatabase";

export type { LinkBillPayload, UploadBillResponse } from "./mockDatabase";

export async function fetchDocumentTypes(): Promise<string[]> {
  return mockDb.listBillDocumentTypes();
}

export async function uploadBillFile(file: File): Promise<UploadBillResponse> {
  return mockDb.uploadBill(file);
}

export async function linkBillToTransaction(payload: LinkBillPayload): Promise<Bill> {
  return mockDb.linkBill(payload);
}

export async function createDocumentType(name: string): Promise<string> {
  return mockDb.createBillDocumentType(name);
}

