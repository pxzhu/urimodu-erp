"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { apiRequest } from "../lib/api";
import { clearSession, loadSession } from "../lib/auth";
import { useLocaleText, useUiShell } from "./ui-shell-provider";

interface MenuItem {
  href: string;
  ko: string;
  en: string;
  icon: string;
  section: "org" | "workflow" | "attendance" | "finance" | "ops";
  adminOnly?: boolean;
}

const menuItems: MenuItem[] = [
  { href: "/companies", ko: "회사", en: "Companies", icon: "CO", section: "org", adminOnly: true },
  { href: "/departments", ko: "부서", en: "Departments", icon: "DE", section: "org", adminOnly: true },
  { href: "/employees", ko: "직원", en: "Employees", icon: "EM", section: "org" },
  { href: "/files", ko: "파일", en: "Files", icon: "FI", section: "workflow" },
  { href: "/documents", ko: "문서", en: "Documents", icon: "DO", section: "workflow" },
  { href: "/approvals", ko: "결재함", en: "Approvals", icon: "AP", section: "workflow" },
  { href: "/attendance/raw", ko: "근태 원본", en: "Attendance Raw", icon: "AR", section: "attendance" },
  { href: "/attendance/ledger", ko: "근태 원장", en: "Attendance Ledger", icon: "AL", section: "attendance" },
  { href: "/leave", ko: "휴가", en: "Leave", icon: "LV", section: "attendance" },
  { href: "/attendance/corrections", ko: "근태 정정", en: "Corrections", icon: "AC", section: "attendance" },
  { href: "/attendance/shift-policies", ko: "근무 정책", en: "Shift Policies", icon: "SP", section: "attendance", adminOnly: true },
  { href: "/expenses", ko: "경비", en: "Expenses", icon: "EX", section: "finance" },
  { href: "/accounting/accounts", ko: "계정과목", en: "Accounts", icon: "GL", section: "finance", adminOnly: true },
  { href: "/accounting/journal-entries", ko: "분개", en: "Journal Entries", icon: "JE", section: "finance", adminOnly: true },
  { href: "/imports", ko: "가져오기", en: "Imports", icon: "IM", section: "ops", adminOnly: true },
  { href: "/exports", ko: "내보내기", en: "Exports", icon: "EX", section: "ops", adminOnly: true }
];

function isActivePath(pathname: string, targetPath: string): boolean {
  if (targetPath === "/") {
    return pathname === "/";
  }

  return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
}

const orderedSections: Array<MenuItem["section"]> = ["org", "workflow", "attendance", "finance", "ops"];
const sectionIcons: Record<MenuItem["section"], string> = {
  org: "OR",
  workflow: "WF",
  attendance: "AT",
  finance: "FN",
  ops: "OP"
};

export function DashboardNav() {
  const router = useRouter();
  const pathname = usePathname();
  const session = loadSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const {
    locale,
    toggleLocale,
    theme,
    toggleTheme,
    sidebarCollapsed,
    toggleSidebar,
    isAdminView,
    role,
    userName
  } = useUiShell();
  const t = useLocaleText();

  const visibleMenuItems = menuItems.filter((item) => isAdminView || !item.adminOnly);
  const sectionedMenuItems = useMemo(
    () =>
      orderedSections
        .map((section) => ({
          section,
          items: visibleMenuItems.filter((item) => item.section === section)
        }))
        .filter((entry) => entry.items.length > 0),
    [visibleMenuItems]
  );

  useEffect(() => {
    function syncMobileMenuByViewport() {
      if (window.innerWidth > 1080) {
        setMobileMenuOpen(false);
      }
    }

    syncMobileMenuByViewport();
    window.addEventListener("resize", syncMobileMenuByViewport);
    return () => {
      window.removeEventListener("resize", syncMobileMenuByViewport);
    };
  }, []);

  useEffect(() => {
    function onEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      setSettingsModalOpen(false);
      setLogoutModalOpen(false);
      setMobileMenuOpen(false);
    }

    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("keydown", onEscape);
    };
  }, []);

  async function performLogout() {
    if (session) {
      try {
        await apiRequest<{ success: true }>("/auth/logout", {
          method: "POST",
          token: session.token,
          companyId: session.defaultCompanyId
        });
      } catch {
        // local logout should still proceed.
      }
    }

    clearSession();
    router.push("/login");
  }

  function sectionLabel(section: MenuItem["section"]) {
    if (section === "org") {
      return t("조직", "Organization");
    }
    if (section === "workflow") {
      return t("문서 · 결재", "Documents · Approvals");
    }
    if (section === "attendance") {
      return t("근태 · 휴가", "Attendance · Leave");
    }
    if (section === "finance") {
      return t("경비 · 회계", "Expenses · Finance");
    }

    return t("운영", "Operations");
  }

  const roleLabel = isAdminView
    ? t("관리자", "Administrator")
    : t("사용자", "User");

  return (
    <>
      <nav className={`app-shell-nav ${sidebarCollapsed ? "is-collapsed" : ""} ${mobileMenuOpen ? "is-mobile-open" : ""}`}>
        <div className="app-shell-nav__brand-row">
          <button
            type="button"
            className="nav-icon-button nav-mobile-toggle"
            onClick={() => setMobileMenuOpen((current) => !current)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? t("메뉴 닫기", "Close menu") : t("메뉴 열기", "Open menu")}
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
          <div className="app-shell-nav__brand-copy">
            <Link href="/" prefetch={false} className="app-shell-nav__brand" title="Urimodu ERP">
              {sidebarCollapsed ? "우리" : "우리모두ERP"}
            </Link>
            {!sidebarCollapsed ? (
              <span className="app-shell-nav__brand-subtitle">
                {t("운영 플랫폼", "Operations Platform")}
              </span>
            ) : null}
          </div>
        </div>

        <div className="app-shell-nav__meta">
          <div className="app-shell-nav__user">{sidebarCollapsed ? userName.slice(0, 1) : userName}</div>
          <div className="app-shell-nav__role" title={role}>
            {sidebarCollapsed ? roleLabel.slice(0, 1) : `${t("모드", "Mode")}: ${roleLabel}`}
          </div>
        </div>

        <div className="app-shell-nav__controls">
          <button
            type="button"
            className="nav-chip nav-chip--ghost"
            onClick={() => setSettingsModalOpen(true)}
          >
            {sidebarCollapsed ? t("설정", "Prefs") : t("표시 설정", "Display settings")}
          </button>
          <button
            type="button"
            className="nav-chip nav-chip--danger"
            onClick={() => setLogoutModalOpen(true)}
          >
            {sidebarCollapsed ? t("로그", "Out") : t("로그아웃", "Logout")}
          </button>
          <button
            type="button"
            className="nav-icon-button nav-desktop-toggle"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? t("메뉴 넓히기", "Expand menu") : t("메뉴 줄이기", "Collapse menu")}
          >
            {sidebarCollapsed ? "⟫" : "⟪"}
          </button>
        </div>

        <div className="app-shell-nav__menu-scroll">
          {sectionedMenuItems.map((entry) => (
            <section className="app-shell-nav__section" key={entry.section}>
              <h2 className="app-shell-nav__section-title">
                <span className="app-shell-nav__section-icon" aria-hidden="true">
                  {sectionIcons[entry.section]}
                </span>
                {sidebarCollapsed ? null : sectionLabel(entry.section)}
              </h2>
              <ul className="app-shell-nav__menu">
                {entry.items.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  const label = locale === "ko" ? item.ko : item.en;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        prefetch={false}
                        className={`app-shell-nav__link ${active ? "is-active" : ""}`}
                      >
                        <span className="app-shell-nav__link-icon" aria-hidden="true">
                          {item.icon}
                        </span>
                        <span className="app-shell-nav__link-text">{sidebarCollapsed ? label.slice(0, 2) : label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </nav>
      {settingsModalOpen ? (
        <div className="app-modal-backdrop" role="presentation" onClick={() => setSettingsModalOpen(false)}>
          <section
            className="app-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="display-settings-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="display-settings-title">{t("표시 설정", "Display settings")}</h3>
            <p className="empty-note">
              {t("기본 언어와 테마를 선택하세요.", "Choose your default language and theme.")}
            </p>
            <div className="inline-actions">
              <button type="button" className="nav-chip" onClick={toggleLocale}>
                {locale === "ko" ? "English" : "한국어"}
              </button>
              <button type="button" className="nav-chip" onClick={toggleTheme}>
                {theme === "dark" ? t("라이트 모드", "Light mode") : t("다크 모드", "Dark mode")}
              </button>
            </div>
            <div className="app-modal__actions">
              <button type="button" onClick={() => setSettingsModalOpen(false)}>
                {t("닫기", "Close")}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {logoutModalOpen ? (
        <div className="app-modal-backdrop" role="presentation" onClick={() => setLogoutModalOpen(false)}>
          <section
            className="app-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="logout-title">{t("로그아웃 확인", "Confirm logout")}</h3>
            <p className="empty-note">
              {t("현재 세션을 종료하고 로그인 화면으로 이동합니다.", "This will end your current session and return to login.")}
            </p>
            <div className="app-modal__actions">
              <button type="button" onClick={() => setLogoutModalOpen(false)}>
                {t("취소", "Cancel")}
              </button>
              <button
                type="button"
                className="nav-chip nav-chip--danger"
                onClick={() => void performLogout()}
              >
                {t("로그아웃", "Logout")}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
