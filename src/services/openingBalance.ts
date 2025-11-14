import { OpeningBalance } from "@/types/api";

import {
  mockDb,
  type OpeningBalancePayload,
  type OpeningBalanceStatusResponse,
} from "./mockDatabase";

export type { OpeningBalancePayload, OpeningBalanceStatusResponse } from "./mockDatabase";

export async function fetchOpeningBalanceStatus(): Promise<OpeningBalanceStatusResponse> {
  return mockDb.getOpeningBalanceStatus();
}

export async function createOpeningBalance(
  payload: OpeningBalancePayload,
): Promise<OpeningBalance> {
  return mockDb.setOpeningBalance(payload);
}

export async function updateOpeningBalance(
  payload: OpeningBalancePayload,
): Promise<OpeningBalance> {
  return mockDb.updateOpeningBalance(payload);
}

