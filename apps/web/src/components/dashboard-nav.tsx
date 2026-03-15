"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { apiRequest } from "../lib/api";
import { clearSession, loadSession } from "../lib/auth";
import { useLocaleText, useUiShell } from "./ui-shell-provider";

interface MenuItem {
  href: string;
  ko: string;
  en: string;
  adminOnly?: boolean;
}

const menuItems: MenuItem[] = [
  { href: "/companies", ko: "회사", en: "Companies", adminOnly: true },
  { href: "/departments", ko: "부서", en: "Departments", adminOnly: true },
  { href: "/employees", ko: "직원", en: "Employees" },
  { href: "/files", ko: "파일", en: "Files" },
  { href: "/documents", ko: "문서", en: "Documents" },
  { href: "/approvals", ko: "결재함", en: "Approvals" },
  { href: "/attendance/raw", ko: "근태 원본", en: "Attendance Raw" },
  { href: "/attendance/ledger", ko: "근태 원장", en: "Attendance Ledger" },
  { href: "/leave", ko: "휴가", en: "Leave" },
  { href: "/attendance/corrections", ko: "근태 정정", en: "Corrections" },
  { href: "/attendance/shift-policies", ko: "근무 정책", en: "Shift Policies", adminOnly: true },
  { href: "/expenses", ko: "경비", en: "Expenses" },
  { href: "/accounting/accounts", ko: "계정과목", en: "Accounts", adminOnly: true },
  { href: "/accounting/journal-entries", ko: "분개", en: "Journal Entries", adminOnly: true },
  { href: "/imports", ko: "가져오기", en: "Imports", adminOnly: true },
  { href: "/exports", ko: "내보내기", en: "Exports", adminOnly: true }
];

function isActivePath(pathname: string, targetPath: string): boolean {
  if (targetPath === "/") {
    return pathname === "/";
  }

  return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
}

export function DashboardNav() {
  const router = useRouter();
  const pathname = usePathname();
  const session = loadSession();
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

  async function handleLogout() {
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

  const roleLabel = isAdminView
    ? t("관리자", "Administrator")
    : t("사용자", "User");

  return (
    <nav className={`app-shell-nav ${sidebarCollapsed ? "is-collapsed" : ""}`}>
      <div className="app-shell-nav__brand-row">
        <button
          type="button"
          className="nav-icon-button"
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? t("메뉴 열기", "Expand menu") : t("메뉴 닫기", "Collapse menu")}
        >
          {sidebarCollapsed ? "☰" : "◀"}
        </button>
        <Link href="/" className="app-shell-nav__brand" title="Urimodu ERP">
          {sidebarCollapsed ? "우리" : "우리모두ERP"}
        </Link>
      </div>

      <div className="app-shell-nav__meta">
        <div className="app-shell-nav__user">{sidebarCollapsed ? userName.slice(0, 1) : userName}</div>
        <div className="app-shell-nav__role" title={role}>
          {sidebarCollapsed ? roleLabel.slice(0, 1) : `${t("모드", "Mode")}: ${roleLabel}`}
        </div>
      </div>

      <div className="app-shell-nav__controls">
        <button type="button" className="nav-chip" onClick={toggleLocale}>
          {locale === "ko" ? "EN" : "KO"}
        </button>
        <button type="button" className="nav-chip" onClick={toggleTheme}>
          {theme === "dark" ? t("라이트", "Light") : t("다크", "Dark")}
        </button>
        <button type="button" className="nav-chip nav-chip--danger" onClick={handleLogout}>
          {sidebarCollapsed ? t("로그", "Out") : t("로그아웃", "Logout")}
        </button>
      </div>

      <ul className="app-shell-nav__menu">
        {visibleMenuItems.map((item) => {
          const active = isActivePath(pathname, item.href);
          const label = locale === "ko" ? item.ko : item.en;

          return (
            <li key={item.href}>
              <Link href={item.href} className={`app-shell-nav__link ${active ? "is-active" : ""}`}>
                <span className="app-shell-nav__link-dot">•</span>
                <span className="app-shell-nav__link-text">{sidebarCollapsed ? label.slice(0, 2) : label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
