export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiFetchOptions = RequestInit & {
  skipAuth?: boolean;
};

const normalizeBase = (value: string | undefined | null) =>
  value ? value.replace(/\/$/, "") : undefined;

const DEV_PORT_REDIRECTS: Record<string, string> = {
  "5173": "4000",
  "3000": "4000",
  "8080": "4000",
};

const FALLBACK_BASE_URL = "http://localhost:4000";

export const getApiBaseUrl = () => {
  const envBase = normalizeBase(import.meta.env.VITE_API_BASE_URL);
  if (envBase) {
    return envBase;
  }

  const configuredBase =
    typeof window === "undefined"
      ? normalizeBase(process.env?.VITE_API_BASE_URL)
      : normalizeBase((window as Window & { __API_BASE__?: string }).__API_BASE__);

  if (configuredBase) {
    return configuredBase;
  }

  if (typeof window === "undefined") {
    return FALLBACK_BASE_URL;
  }

  const { protocol, hostname, port } = window.location;
  if (port && DEV_PORT_REDIRECTS[port]) {
    return `${protocol}//${hostname}:${DEV_PORT_REDIRECTS[port]}`;
  }

  return `${protocol}//${hostname}${port ? `:${port}` : ""}`;
};

export async function apiFetch<T>(endpoint: string, options: ApiFetchOptions = {}): Promise<T> {
  const { skipAuth: _skipAuth, headers, ...requestInit } = options;

  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;

  const response = await fetch(url, {
    ...requestInit,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...headers,
    },
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const message =
      payload?.message ??
      `Request to ${endpoint} failed with status ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  return (payload?.data ?? payload ?? null) as T;
}

export interface PaginatedResponse<T> {
  data: T[];
  links: Record<string, string | null>;
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    path: string;
    per_page: number;
    to: number | null;
    total: number;
  };
}

export interface ResourceResponse<T> {
  data: T;
}

