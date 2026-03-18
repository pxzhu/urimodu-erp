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
  section: "home" | "org" | "workflow" | "attendance" | "finance" | "collab" | "ops";
  adminOnly?: boolean;
}

type NavSection = MenuItem["section"];

const menuItems: MenuItem[] = [
  { href: "/workspace", ko: "업무 홈", en: "Workspace", section: "home" },
  { href: "/companies", ko: "회사", en: "Companies", section: "org", adminOnly: true },
  { href: "/departments", ko: "부서", en: "Departments", section: "org", adminOnly: true },
  { href: "/employees", ko: "직원", en: "Employees", section: "org" },
  { href: "/files", ko: "파일", en: "Files", section: "workflow" },
  { href: "/documents", ko: "문서", en: "Documents", section: "workflow" },
  { href: "/approvals", ko: "결재함", en: "Approvals", section: "workflow" },
  { href: "/attendance/raw", ko: "근태 원본", en: "Attendance Raw", section: "attendance" },
  { href: "/attendance/ledger", ko: "근태 원장", en: "Attendance Ledger", section: "attendance" },
  { href: "/leave", ko: "휴가", en: "Leave", section: "attendance" },
  { href: "/attendance/corrections", ko: "근태 정정", en: "Corrections", section: "attendance" },
  { href: "/attendance/shift-policies", ko: "근무 정책", en: "Shift Policies", section: "attendance", adminOnly: true },
  { href: "/expenses", ko: "경비", en: "Expenses", section: "finance" },
  { href: "/accounting/accounts", ko: "계정과목", en: "Accounts", section: "finance", adminOnly: true },
  { href: "/accounting/journal-entries", ko: "분개", en: "Journal Entries", section: "finance", adminOnly: true },
  { href: "/collaboration", ko: "협업 허브", en: "Collaboration Hub", section: "collab" },
  { href: "/imports", ko: "가져오기", en: "Imports", section: "ops", adminOnly: true },
  { href: "/exports", ko: "내보내기", en: "Exports", section: "ops", adminOnly: true }
];

function isActivePath(pathname: string, targetPath: string): boolean {
  if (targetPath === "/") {
    return pathname === "/";
  }

  return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
}

const orderedSections: NavSection[] = [
  "home",
  "org",
  "workflow",
  "attendance",
  "finance",
  "collab",
  "ops"
];

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function sectionIcon(section: NavSection) {
  if (section === "home") return "홈";
  if (section === "org") return "조";
  if (section === "workflow") return "문";
  if (section === "attendance") return "근";
  if (section === "finance") return "회";
  if (section === "collab") return "협";
  return "운";
}

export function DashboardNav() {
  const router = useRouter();
  const pathname = usePathname();
  const session = loadSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [menuQuery, setMenuQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState<NavSection>("home");
  const [expandedSection, setExpandedSection] = useState<NavSection>("home");
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const {
    locale,
    toggleLocale,
    theme,
    toggleTheme,
    isAdminView,
    role,
    userName
  } = useUiShell();
  const t = useLocaleText();

  const visibleMenuItems = useMemo(
    () => menuItems.filter((item) => isAdminView || !item.adminOnly),
    [isAdminView]
  );
  const filteredMenuItems = useMemo(() => {
    const normalizedQuery = normalizeText(menuQuery);
    if (!normalizedQuery) {
      return visibleMenuItems;
    }

    return visibleMenuItems.filter((item) => {
      const searchableText = `${item.ko} ${item.en} ${item.href}`.toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }, [menuQuery, visibleMenuItems]);
  const sectionedMenuItems = useMemo(
    () =>
      orderedSections
        .map((section) => ({
          section,
          items: filteredMenuItems.filter((item) => item.section === section)
        }))
        .filter((entry) => entry.items.length > 0),
    [filteredMenuItems]
  );

  useEffect(() => {
    const activeSection = sectionedMenuItems.find((entry) =>
      entry.items.some((item) => isActivePath(pathname, item.href))
    )?.section;

    if (activeSection && activeSection !== selectedSection) {
      setSelectedSection(activeSection);
      setExpandedSection(activeSection);
      return;
    }

    const selectedExists = sectionedMenuItems.some((entry) => entry.section === selectedSection);
    if (!selectedExists && sectionedMenuItems[0]?.section) {
      setSelectedSection(sectionedMenuItems[0].section);
    }
  }, [pathname, sectionedMenuItems, selectedSection]);

  useEffect(() => {
    const hasExpandedSection = sectionedMenuItems.some((entry) => entry.section === expandedSection);
    if (!hasExpandedSection && sectionedMenuItems[0]?.section) {
      setExpandedSection(sectionedMenuItems[0].section);
    }
  }, [expandedSection, sectionedMenuItems]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") {
      return;
    }
    const syncLayoutByViewport = () => {
      const isMobileViewport = window.innerWidth <= 1080;
      setIsMobileViewport(isMobileViewport);
      const shouldLockBody = isMobileViewport && mobileMenuOpen;
      document.body.style.overflow = shouldLockBody ? "hidden" : "";
      if (!isMobileViewport && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    syncLayoutByViewport();
    window.addEventListener("resize", syncLayoutByViewport);

    return () => {
      window.removeEventListener("resize", syncLayoutByViewport);
      document.body.style.removeProperty("overflow");
    };
  }, [hydrated, mobileMenuOpen]);

  useEffect(() => {
    function onEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      setSettingsModalOpen(false);
      setLogoutModalOpen(false);
      if (mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    }

    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("keydown", onEscape);
    };
  }, [mobileMenuOpen]);

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

  function sectionLabel(section: NavSection) {
    if (section === "home") {
      return t("홈", "Home");
    }
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
    if (section === "collab") {
      return t("협업", "Collaboration");
    }

    return t("운영", "Operations");
  }

  function sectionHint(section: NavSection) {
    if (section === "home") {
      return t("오늘 필요한 기능을 빠르게 시작", "Quick launch for today's tasks");
    }
    if (section === "org") {
      return t("회사/부서/직원 운영", "Company, department, employee ops");
    }
    if (section === "workflow") {
      return t("문서 작성과 결재 흐름", "Document and approval flow");
    }
    if (section === "attendance") {
      return t("근태/휴가/정정 관리", "Attendance, leave, corrections");
    }
    if (section === "finance") {
      return t("경비/회계 처리", "Expense and accounting");
    }
    if (section === "collab") {
      return t("메신저/회의/드라이브", "Messenger, meetings, drive");
    }
    return t("가져오기/내보내기 운영", "Import/export operations");
  }

  const roleLabel = isAdminView
    ? t("관리자", "Administrator")
    : t("사용자", "User");

  useEffect(() => {
    setHydrated(true);
  }, []);

  const normalizedUserName = userName.trim().length > 0 ? userName : t("게스트", "Guest");
  const showMobileMenu = mobileMenuOpen;
  const selectedEntry =
    sectionedMenuItems.find((entry) => entry.section === selectedSection) ?? sectionedMenuItems[0];
  const sectionEntriesToRender = sectionedMenuItems;
  const hasSearchQuery = menuQuery.trim().length > 0;
  const shouldUseAccordion = isMobileViewport && !hasSearchQuery;

  return (
    <>
      <nav
        className={`app-shell-nav ${showMobileMenu ? "is-mobile-open" : ""}`}
        data-hydrated={hydrated ? "true" : "false"}
      >
        <div className="app-shell-nav__brand-row">
          <button
            type="button"
            className="nav-icon-button nav-mobile-toggle"
            onClick={() => setMobileMenuOpen((current) => !current)}
            aria-expanded={mobileMenuOpen}
            aria-controls="app-shell-nav-menu"
            aria-label={mobileMenuOpen ? t("메뉴 닫기", "Close menu") : t("메뉴 열기", "Open menu")}
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
          <span className="app-shell-nav__brand-mark" aria-hidden>
            UM
          </span>
          <Link href="/workspace" prefetch={false} className="app-shell-nav__brand" title="Urimodu ERP">
            우리모두ERP
          </Link>
          <span className="app-shell-nav__brand-role">{roleLabel}</span>
        </div>

        <div className="app-shell-nav__meta">
          <div className="app-shell-nav__user">{normalizedUserName}</div>
          <div className="app-shell-nav__role" title={role}>
            {`${t("모드", "Mode")}: ${roleLabel}`}
          </div>
        </div>

        <div className="app-shell-nav__controls">
          <button
            type="button"
            className="nav-chip nav-chip--ghost"
            onClick={() => setSettingsModalOpen(true)}
          >
            {t("설정", "Settings")}
          </button>
          <button
            type="button"
            className="nav-chip nav-chip--danger"
            onClick={() => setLogoutModalOpen(true)}
          >
            {t("로그아웃", "Logout")}
          </button>
        </div>

        <div className="app-shell-nav__workspace">
          <div id="app-shell-nav-menu" className="app-shell-nav__menu-scroll">
            <div className="app-shell-nav__search">
              <input
                value={menuQuery}
                onChange={(event) => setMenuQuery(event.target.value)}
                placeholder={t("메뉴 검색 (예: 근태, 결재, 경비)", "Search menu (e.g., attendance, approvals)")}
                aria-label={t("메뉴 검색", "Search menu")}
              />
              {menuQuery ? (
                <small>{t(`${filteredMenuItems.length}건 검색`, `${filteredMenuItems.length} results`)}</small>
              ) : null}
            </div>
            {selectedEntry ? (
              <div className="app-shell-nav__panel-meta">
                <strong>{sectionLabel(selectedEntry.section)}</strong>
                <p>{sectionHint(selectedEntry.section)}</p>
              </div>
            ) : null}
            {sectionEntriesToRender.map((entry) => (
              <section className="app-shell-nav__section" key={entry.section}>
                <button
                  type="button"
                  className={`app-shell-nav__section-button ${expandedSection === entry.section ? "is-expanded" : ""}`}
                  onClick={() => {
                    setSelectedSection(entry.section);
                    setExpandedSection((current) => {
                      if (!shouldUseAccordion) {
                        return entry.section;
                      }
                      return current === entry.section ? current : entry.section;
                    });
                  }}
                  aria-expanded={!shouldUseAccordion || expandedSection === entry.section}
                >
                  <h2 className="app-shell-nav__section-title">
                    <span className="app-shell-nav__section-icon" aria-hidden>{sectionIcon(entry.section)}</span>
                    <span>{sectionLabel(entry.section)}</span>
                  </h2>
                  <span className="app-shell-nav__section-meta">
                    <span className="app-shell-nav__section-count">{entry.items.length}</span>
                    <span className="app-shell-nav__section-chevron" aria-hidden>
                      {!shouldUseAccordion || expandedSection === entry.section ? "▾" : "▸"}
                    </span>
                  </span>
                </button>
                <ul
                  className={`app-shell-nav__menu ${!shouldUseAccordion || expandedSection === entry.section ? "" : "is-hidden"}`}
                >
                  {entry.items.map((item) => {
                    const active = isActivePath(pathname, item.href);
                    const label = locale === "ko" ? item.ko : item.en;

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          prefetch={false}
                        className={`app-shell-nav__link ${active ? "is-active" : ""}`}
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setSelectedSection(entry.section);
                          setExpandedSection(entry.section);
                        }}
                        >
                          <span className="app-shell-nav__link-text">{label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </nav>
      {mobileMenuOpen ? (
        <button
          type="button"
          className="nav-mobile-backdrop"
          aria-label={t("메뉴 닫기", "Close menu")}
          onClick={() => setMobileMenuOpen(false)}
        />
      ) : null}
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
