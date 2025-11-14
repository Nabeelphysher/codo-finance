import { apiFetch } from "@/lib/api";
import type { AnalyticsSummary } from "@/types/api";

import { mockDb, type AnalyticsFilters } from "./mockDatabase";

export type { AnalyticsFilters };

const buildQueryString = (filters: AnalyticsFilters) => {
  const params = new URLSearchParams();

  if (filters.startDate) {
    params.set("start_date", filters.startDate);
  }

  if (filters.endDate) {
    params.set("end_date", filters.endDate);
  }

  return params.toString() ? `?${params.toString()}` : "";
};

export const fetchAnalyticsSummary = async (
  filters: AnalyticsFilters = {},
): Promise<AnalyticsSummary> => {
  try {
    return await apiFetch<AnalyticsSummary>(`/api/analytics/summary${buildQueryString(filters)}`);
  } catch (error) {
    console.warn("Falling back to mock analytics summary", error);
    return mockDb.getAnalyticsSummary(filters);
  }
};
