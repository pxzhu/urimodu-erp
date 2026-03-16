"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../components/dashboard-nav";
import { useLocaleText } from "../../components/ui-shell-provider";
import { ApiError, apiRequest, requireCompanyId } from "../../lib/api";
import { loadSession, type LoginSession } from "../../lib/auth";
import styles from "./page.module.css";

interface SimpleEmployee {
  id: string;
}

interface SimpleApprovalLine {
  id: string;
}

interface SimpleAttendanceLedger {
  id: string;
  needsReview: boolean;
}

interface SimpleExpenseClaim {
  id: string;
  status: string;
}

interface WorkspaceStat {
  id: string;
  labelKo: string;
  labelEn: string;
  value: number;
  helperKo: string;
  helperEn: string;
}

interface WorkspaceModule {
  id: string;
  category: "core" | "collab" | "growth";
  titleKo: string;
  titleEn: string;
  descriptionKo: string;
  descriptionEn: string;
  badgeKo: string;
  badgeEn: string;
  href?: string;
}

const FAVORITE_STORAGE_KEY = "korean_erp_workspace_favorites";

const WEHAGO_INSPIRED_MODULES: WorkspaceModule[] = [
  {
    id: "one-ai",
    category: "core",
    titleKo: "ONE AI 브리핑",
    titleEn: "ONE AI Briefing",
    descriptionKo: "인사/근태/결재 데이터를 요약해 다음 액션을 제안합니다.",
    descriptionEn: "Summarizes HR, attendance, and approvals with next-step suggestions.",
    badgeKo: "운영중",
    badgeEn: "Live",
    href: "/workspace"
  },
  {
    id: "smart-a-accounting",
    category: "core",
    titleKo: "Smart A 회계관리",
    titleEn: "Smart A Accounting",
    descriptionKo: "계정과목/분개를 기반으로 재무 흐름을 관리합니다.",
    descriptionEn: "Manage accounting flow with accounts and journal entries.",
    badgeKo: "운영중",
    badgeEn: "Live",
    href: "/accounting/journal-entries"
  },
  {
    id: "attendance-leave",
    category: "core",
    titleKo: "근태·휴가",
    titleEn: "Attendance & Leave",
    descriptionKo: "근태 원장, 휴가, 정정 요청을 하나의 흐름으로 운영합니다.",
    descriptionEn: "Operate ledger, leave, and correction requests in one flow.",
    badgeKo: "운영중",
    badgeEn: "Live",
    href: "/attendance/ledger"
  },
  {
    id: "expense-management",
    category: "core",
    titleKo: "경비관리",
    titleEn: "Expense Management",
    descriptionKo: "영수증 첨부 기반 경비 청구를 등록하고 추적합니다.",
    descriptionEn: "Create and track receipt-backed expense claims.",
    badgeKo: "운영중",
    badgeEn: "Live",
    href: "/expenses"
  },
  {
    id: "approval-workflow",
    category: "core",
    titleKo: "전자결재",
    titleEn: "Approval Workflow",
    descriptionKo: "문서 작성, 버전 관리, 결재선 설정, 승인/반려를 처리합니다.",
    descriptionEn: "Handle drafting, versions, approval lines, and outcomes.",
    badgeKo: "운영중",
    badgeEn: "Live",
    href: "/documents"
  },
  {
    id: "collab-hub",
    category: "collab",
    titleKo: "협업 허브",
    titleEn: "Collaboration Hub",
    descriptionKo: "메신저/회의/메일/드라이브/노트/게시판을 한 화면에서 사용합니다.",
    descriptionEn: "Use messenger, meetings, mail, drive, notes, and board in one place.",
    badgeKo: "신규",
    badgeEn: "New",
    href: "/collaboration"
  },
  {
    id: "crm",
    category: "growth",
    titleKo: "WE CRM",
    titleEn: "WE CRM",
    descriptionKo: "거래처 기반 파이프라인 관리 준비용 모듈입니다.",
    descriptionEn: "Starter module for account-centered sales pipeline management.",
    badgeKo: "준비중",
    badgeEn: "Planned"
  },
  {
    id: "pms",
    category: "growth",
    titleKo: "WE PMS",
    titleEn: "WE PMS",
    descriptionKo: "프로젝트 기반 인력/일정 운영 준비용 모듈입니다.",
    descriptionEn: "Starter module for project-centric workforce planning.",
    badgeKo: "준비중",
    badgeEn: "Planned"
  },
  {
    id: "e-tax-invoice",
    category: "growth",
    titleKo: "전자세금계산서",
    titleEn: "E-Tax Invoice",
    descriptionKo: "국내 세금계산서 연동을 위한 확장 모듈(어댑터 기반)입니다.",
    descriptionEn: "Adapter-based extension module for Korean tax invoice integration.",
    badgeKo: "준비중",
    badgeEn: "Planned"
  }
];

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function loadFavorites() {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  try {
    const raw = window.localStorage.getItem(FAVORITE_STORAGE_KEY);
    if (!raw) {
      return [] as string[];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [] as string[];
    }
    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return [] as string[];
  }
}

function saveFavorites(next: string[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(FAVORITE_STORAGE_KEY, JSON.stringify(next));
}

export default function WorkspacePage() {
  const router = useRouter();
  const t = useLocaleText();
  const [session, setSession] = useState<LoginSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [stats, setStats] = useState<WorkspaceStat[]>([
    {
      id: "employees",
      labelKo: "직원",
      labelEn: "Employees",
      value: 0,
      helperKo: "조직 구성원",
      helperEn: "Org members"
    },
    {
      id: "approvals",
      labelKo: "결재 대기",
      labelEn: "Pending approvals",
      value: 0,
      helperKo: "결재함 기준",
      helperEn: "From approvals inbox"
    },
    {
      id: "attendance-alerts",
      labelKo: "근태 검토",
      labelEn: "Attendance review",
      value: 0,
      helperKo: "검토 필요 행",
      helperEn: "Rows requiring review"
    },
    {
      id: "expense-open",
      labelKo: "경비 진행",
      labelEn: "Open expenses",
      value: 0,
      helperKo: "승인 전 청구",
      helperEn: "Claims before approval"
    }
  ]);

  useEffect(() => {
    setFavoriteIds(loadFavorites());
  }, []);

  useEffect(() => {
    async function run() {
      const loaded = loadSession();
      if (!loaded) {
        router.push("/login");
        return;
      }

      setSession(loaded);
      setLoading(true);
      setError(null);
      try {
        const companyId = requireCompanyId(loaded);
        const [employees, approvalInbox, attendanceLedger, expenseClaims] = await Promise.all([
          apiRequest<SimpleEmployee[]>(`/employees?companyId=${companyId}`, {
            token: loaded.token,
            companyId
          }),
          apiRequest<SimpleApprovalLine[]>("/approvals/inbox", {
            token: loaded.token,
            companyId
          }),
          apiRequest<SimpleAttendanceLedger[]>("/attendance/ledgers?limit=200", {
            token: loaded.token,
            companyId
          }),
          apiRequest<SimpleExpenseClaim[]>("/expenses/claims?limit=200", {
            token: loaded.token,
            companyId
          })
        ]);

        setStats((current) =>
          current.map((item) => {
            if (item.id === "employees") {
              return { ...item, value: employees.length };
            }
            if (item.id === "approvals") {
              return { ...item, value: approvalInbox.length };
            }
            if (item.id === "attendance-alerts") {
              return {
                ...item,
                value: attendanceLedger.filter((row) => row.needsReview).length
              };
            }
            if (item.id === "expense-open") {
              return {
                ...item,
                value: expenseClaims.filter((claim) => claim.status !== "APPROVED").length
              };
            }
            return item;
          })
        );
      } catch (loadError) {
        if (loadError instanceof ApiError) {
          setError(loadError.message);
        } else {
          setError(t("업무 홈 데이터를 불러오지 못했습니다.", "Failed to load workspace data."));
        }
      } finally {
        setLoading(false);
      }
    }

    void run();
  }, [router, t]);

  function toggleFavorite(moduleId: string) {
    setFavoriteIds((current) => {
      const next = current.includes(moduleId)
        ? current.filter((id) => id !== moduleId)
        : [...current, moduleId];
      saveFavorites(next);
      return next;
    });
  }

  const filteredModules = useMemo(() => {
    const normalizedQuery = normalizeText(search);
    if (!normalizedQuery) {
      return WEHAGO_INSPIRED_MODULES;
    }

    return WEHAGO_INSPIRED_MODULES.filter((module) => {
      const searchable = `${module.titleKo} ${module.titleEn} ${module.descriptionKo} ${module.descriptionEn}`.toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [search]);

  const categoryOrder: Array<WorkspaceModule["category"]> = ["core", "collab", "growth"];
  const groupedModules = categoryOrder
    .map((category) => ({
      category,
      modules: filteredModules.filter((module) => module.category === category)
    }))
    .filter((entry) => entry.modules.length > 0);

  function categoryLabel(category: WorkspaceModule["category"]) {
    if (category === "core") {
      return t("코어 업무 모듈", "Core work modules");
    }
    if (category === "collab") {
      return t("협업/생산성", "Collaboration / productivity");
    }
    return t("확장/연동", "Extensions / integrations");
  }

  return (
    <main className="container with-shell">
      <DashboardNav />
      <section className={`app-shell-content ${styles.workspaceContent}`}>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>WEHAGO-inspired Workspace</p>
            <h1>{t("업무 홈", "Workspace Home")}</h1>
            <p>
              {t(
                "회계·근태·결재·협업을 하나의 화면에서 연결해 운영할 수 있도록 허브형 화면을 제공합니다.",
                "Use a hub-style workspace that connects accounting, attendance, approvals, and collaboration in one view."
              )}
            </p>
            <div className="inline-actions">
              <Link href="/documents" className={styles.ctaButton}>
                {t("전자결재 바로가기", "Open approvals")}
              </Link>
              <Link href="/collaboration" className={styles.ctaButtonSecondary}>
                {t("협업 허브 열기", "Open collaboration hub")}
              </Link>
            </div>
          </div>
          <aside className={styles.aiPanel}>
            <h2>{t("AI 운영 브리핑", "AI operations briefing")}</h2>
            <ul>
              <li>{t("결재 대기 문서 우선순위 상위 항목을 먼저 처리하세요.", "Handle top-priority approvals first.")}</li>
              <li>{t("근태 검토 대상이 있는 부서에 알림을 발송하세요.", "Notify departments with attendance review items.")}</li>
              <li>{t("이번 주 경비 청구 누락 영수증을 점검하세요.", "Check missing receipts in this week's expense claims.")}</li>
            </ul>
          </aside>
        </header>

        <section className={styles.kpiSection}>
          {stats.map((stat) => (
            <article key={stat.id} className={styles.kpiCard}>
              <p>{t(stat.labelKo, stat.labelEn)}</p>
              <strong>{loading ? "-" : stat.value.toLocaleString()}</strong>
              <span>{t(stat.helperKo, stat.helperEn)}</span>
            </article>
          ))}
        </section>

        <section className={styles.moduleSection}>
          <div className={styles.moduleSectionHeader}>
            <h2>{t("서비스 모듈", "Service modules")}</h2>
            <div className={styles.searchWrap}>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("모듈 검색 (예: 근태, 회계, 메신저)", "Search modules (e.g., attendance, accounting, messenger)")}
                aria-label={t("모듈 검색", "Search modules")}
              />
            </div>
          </div>

          {groupedModules.map((group) => (
            <div key={group.category} className={styles.moduleGroup}>
              <h3>{categoryLabel(group.category)}</h3>
              <div className={styles.moduleGrid}>
                {group.modules.map((module) => {
                  const favorite = favoriteIds.includes(module.id);
                  return (
                    <article key={module.id} className={styles.moduleCard}>
                      <div className={styles.moduleCardTop}>
                        <strong>{t(module.titleKo, module.titleEn)}</strong>
                        <span>{t(module.badgeKo, module.badgeEn)}</span>
                      </div>
                      <p>{t(module.descriptionKo, module.descriptionEn)}</p>
                      <div className="inline-actions">
                        {module.href ? (
                          <Link href={module.href} className={styles.moduleLink}>
                            {t("열기", "Open")}
                          </Link>
                        ) : (
                          <span className={styles.plannedTag}>{t("연동 준비중", "Planned")}</span>
                        )}
                        <button
                          type="button"
                          className={styles.favoriteButton}
                          onClick={() => toggleFavorite(module.id)}
                          aria-pressed={favorite}
                        >
                          {favorite ? t("즐겨찾기 해제", "Unfavorite") : t("즐겨찾기", "Favorite")}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </section>

        {error ? <p className="error-text">{error}</p> : null}

        <section className="form-grid">
          <h2>{t("즐겨찾기 모듈", "Favorite modules")}</h2>
          {favoriteIds.length === 0 ? (
            <p className="empty-note">{t("아직 즐겨찾기한 모듈이 없습니다.", "No favorite modules yet.")}</p>
          ) : (
            <div className="inline-actions">
              {WEHAGO_INSPIRED_MODULES.filter((module) => favoriteIds.includes(module.id)).map((module) => (
                <span key={module.id} className={styles.favoriteChip}>
                  {t(module.titleKo, module.titleEn)}
                </span>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
