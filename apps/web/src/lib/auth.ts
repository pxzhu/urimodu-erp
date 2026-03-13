export interface LoginSession {
  token: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  memberships: Array<{
    companyId: string;
    companyName: string;
    role: string;
  }>;
  defaultCompanyId: string;
}

const AUTH_STORAGE_KEY = "korean_erp_auth_session";

export function loadSession(): LoginSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as LoginSession;
  } catch {
    return null;
  }
}

export function saveSession(session: LoginSession): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}
