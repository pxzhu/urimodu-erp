import type { LoginSession } from "./auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface ApiRequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
  companyId?: string;
  responseType?: "json" | "blob" | "text";
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  if (options.companyId) {
    headers["x-company-id"] = options.companyId;
  }

  const bodyIsFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!bodyIsFormData) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body
      ? bodyIsFormData
        ? (options.body as FormData)
        : JSON.stringify(options.body)
      : undefined
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const payload = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(payload.message)) {
        message = payload.message.join(", ");
      } else if (typeof payload.message === "string") {
        message = payload.message;
      }
    } catch {
      // ignore non-json error responses
    }

    throw new ApiError(response.status, message);
  }

  if ((options.responseType ?? "json") === "blob") {
    return (await response.blob()) as T;
  }

  if ((options.responseType ?? "json") === "text") {
    return (await response.text()) as T;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function requireCompanyId(session: LoginSession): string {
  if (session.defaultCompanyId && session.defaultCompanyId.trim().length > 0) {
    return session.defaultCompanyId;
  }

  return session.memberships[0]?.companyId ?? "";
}
