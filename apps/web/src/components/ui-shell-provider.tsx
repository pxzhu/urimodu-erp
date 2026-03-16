"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

import { loadSession, type LoginSession } from "../lib/auth";

const LOCALE_STORAGE_KEY = "korean_erp_ui_locale";
const THEME_STORAGE_KEY = "korean_erp_ui_theme";
const SIDEBAR_STORAGE_KEY = "korean_erp_ui_sidebar_collapsed";

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"]);

export type AppLocale = "ko" | "en";
export type AppTheme = "dark" | "light";

interface UiShellContextValue {
  locale: AppLocale;
  setLocale: (value: AppLocale) => void;
  toggleLocale: () => void;
  theme: AppTheme;
  setTheme: (value: AppTheme) => void;
  toggleTheme: () => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  role: string;
  isAdminView: boolean;
  userName: string;
}

const UiShellContext = createContext<UiShellContextValue | null>(null);

function resolveRole(session: LoginSession | null): string {
  if (!session) {
    return "GUEST";
  }

  const targetMembership =
    session.memberships.find((membership) => membership.companyId === session.defaultCompanyId) ??
    session.memberships[0];

  return targetMembership?.role ?? "GUEST";
}

export function UiShellProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>("ko");
  const [theme, setThemeState] = useState<AppTheme>("light");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [session, setSession] = useState<LoginSession | null>(null);

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (storedLocale === "ko" || storedLocale === "en") {
      setLocaleState(storedLocale);
    }

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === "dark" || storedTheme === "light") {
      setThemeState(storedTheme);
    }

    const storedSidebar = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (storedSidebar === "true") {
      setSidebarCollapsed(true);
    }

    setSession(loadSession());
  }, []);

  useEffect(() => {
    function normalizeSidebarForViewport() {
      if (window.innerWidth <= 1080) {
        setSidebarCollapsed(false);
      }
    }

    normalizeSidebarForViewport();
    window.addEventListener("resize", normalizeSidebarForViewport);
    return () => {
      window.removeEventListener("resize", normalizeSidebarForViewport);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    document.documentElement.lang = locale === "ko" ? "ko" : "en";
  }, [locale]);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarCollapsed));
    document.documentElement.style.setProperty("--sidebar-width", sidebarCollapsed ? "84px" : "280px");
  }, [sidebarCollapsed]);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (!event.key) {
        setSession(loadSession());
        return;
      }

      if (event.key === "korean_erp_auth_session") {
        setSession(loadSession());
      }
    }

    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const role = resolveRole(session);

  const value = useMemo<UiShellContextValue>(
    () => ({
      locale,
      setLocale: setLocaleState,
      toggleLocale: () => setLocaleState((current) => (current === "ko" ? "en" : "ko")),
      theme,
      setTheme: setThemeState,
      toggleTheme: () => setThemeState((current) => (current === "dark" ? "light" : "dark")),
      sidebarCollapsed,
      toggleSidebar: () => setSidebarCollapsed((current) => !current),
      role,
      isAdminView: ADMIN_ROLES.has(role),
      userName: session?.user.name ?? "Guest"
    }),
    [locale, theme, sidebarCollapsed, role, session?.user.name]
  );

  return <UiShellContext.Provider value={value}>{children}</UiShellContext.Provider>;
}

export function useUiShell(): UiShellContextValue {
  const context = useContext(UiShellContext);
  if (!context) {
    throw new Error("useUiShell must be used within UiShellProvider");
  }

  return context;
}

export function useLocaleText() {
  const { locale } = useUiShell();
  return useCallback(
    (koreanText: string, englishText: string) => (locale === "ko" ? koreanText : englishText),
    [locale]
  );
}
