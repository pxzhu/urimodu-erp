"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../../components/dashboard-nav";
import { useLocaleText } from "../../../components/ui-shell-provider";
import { ApiError, apiRequest, requireCompanyId } from "../../../lib/api";
import { loadSession, type LoginSession } from "../../../lib/auth";
import { translateStatus } from "../../../lib/status-label";
import styles from "./page.module.css";

interface AttendanceLedgerItem {
  id: string;
  workDate: string;
  status: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  workedMinutes: number;
  overtimeMinutes: number;
  policyVersion: number | null;
  needsReview: boolean;
  employee: {
    id: string;
    employeeNumber: string;
    nameKr: string;
  };
  shiftPolicy: {
    id: string;
    code: string;
    name: string;
    version: number;
  } | null;
  sourceEvents: Array<{
    id: string;
    rawEvent: {
      id: string;
      eventType: string;
      eventTimestamp: string;
      provider: string;
      source: string;
    };
  }>;
}

function formatTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString();
}

export default function AttendanceLedgerPage() {
  const router = useRouter();
  const t = useLocaleText();
  const [session, setSession] = useState<LoginSession | null>(null);
  const [rows, setRows] = useState<AttendanceLedgerItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewOnly, setReviewOnly] = useState(true);
  const [query, setQuery] = useState("");

  async function refresh(activeSession: LoginSession) {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<AttendanceLedgerItem[]>("/attendance/ledgers?limit=200", {
        token: activeSession.token,
        companyId: requireCompanyId(activeSession)
      });
      setRows(data);
    } catch (refreshError) {
      if (refreshError instanceof ApiError) {
        setError(refreshError.message);
      } else {
        setError(t("근태 원장을 불러오지 못했습니다.", "Failed to load attendance ledger."));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function run() {
      const loaded = loadSession();
      if (!loaded) {
        router.push("/login");
        return;
      }

      setSession(loaded);
      await refresh(loaded);
    }

    void run();
  }, [router]);

  const metrics = useMemo(() => {
    const review = rows.filter((row) => row.needsReview).length;
    const overtime = rows.filter((row) => row.overtimeMinutes > 0).length;
    const missingOut = rows.filter((row) => row.checkInAt && !row.checkOutAt).length;
    const noPolicy = rows.filter((row) => !row.shiftPolicy).length;
    return { review, overtime, missingOut, noPolicy };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (reviewOnly && !row.needsReview) {
        return false;
      }
      if (!normalized) {
        return true;
      }
      const searchable = `${row.employee.employeeNumber} ${row.employee.nameKr} ${row.workDate}`.toLowerCase();
      return searchable.includes(normalized);
    });
  }, [query, reviewOnly, rows]);

  const alerts = [
    {
      id: "review",
      title: t("검토 필요 원장", "Ledger rows needing review"),
      description: t(
        `${metrics.review}건의 근태가 검토 필요 상태입니다. 우선 확인하세요.`,
        `${metrics.review} ledger rows need review. Prioritize these first.`
      )
    },
    {
      id: "missing-out",
      title: t("퇴근 누락 가능성", "Possible missing check-outs"),
      description: t(
        `${metrics.missingOut}건에서 출근은 있으나 퇴근 기록이 없습니다.`,
        `${metrics.missingOut} rows have check-in without check-out.`
      )
    },
    {
      id: "policy",
      title: t("정책 미연결", "Rows without policy"),
      description: t(
        `${metrics.noPolicy}건은 근무 정책이 연결되지 않았습니다.`,
        `${metrics.noPolicy} rows do not have a shift policy linked.`
      )
    }
  ];

  return (
    <main className="container with-shell">
      <DashboardNav />
      <section className="app-shell-content">
        <h1>{t("근태 원장", "Attendance Ledger")}</h1>
        <p>
          {t(
            "정규화된 근무일 원장을 단순 표가 아니라 예외 중심으로 확인할 수 있도록 구성했습니다.",
            "This ledger is organized around exceptions first instead of a plain table."
          )}
        </p>

        <section className={styles.metricGrid}>
          <article className={styles.metricCard}>
            <p>{t("검토 필요", "Needs review")}</p>
            <strong>{metrics.review}</strong>
            <span>{t("우선 확인 대상", "Priority queue")}</span>
          </article>
          <article className={styles.metricCard}>
            <p>{t("연장 근무", "Overtime rows")}</p>
            <strong>{metrics.overtime}</strong>
            <span>{t("연장 발생 건수", "Rows with overtime")}</span>
          </article>
          <article className={styles.metricCard}>
            <p>{t("퇴근 누락", "Missing check-out")}</p>
            <strong>{metrics.missingOut}</strong>
            <span>{t("출근 후 퇴근 미기록", "Checked-in without check-out")}</span>
          </article>
          <article className={styles.metricCard}>
            <p>{t("정책 미연결", "No policy")}</p>
            <strong>{metrics.noPolicy}</strong>
            <span>{t("정책 확인 필요", "Needs policy review")}</span>
          </article>
        </section>

        <section className={styles.alertGrid}>
          {alerts.map((alert) => (
            <article key={alert.id} className={styles.alertCard}>
              <strong>{alert.title}</strong>
              <span>{alert.description}</span>
            </article>
          ))}
        </section>

        <section className={styles.filterBar}>
          <div className="inline-actions">
            <button type="button" disabled={!session || loading} onClick={() => session && void refresh(session)}>
              {loading ? t("로딩 중...", "Loading...") : t("새로고침", "Refresh")}
            </button>
            <button type="button" onClick={() => setReviewOnly((current) => !current)}>
              {reviewOnly ? t("전체 보기", "Show all") : t("검토 필요만", "Review only")}
            </button>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("사번/이름/날짜 검색", "Search by employee/date")}
          />
        </section>

        {error ? <p className="error-text">{error}</p> : null}

        <table className="data-table">
          <thead>
            <tr>
              <th>{t("근무일", "Work Date")}</th>
              <th>{t("직원", "Employee")}</th>
              <th>{t("상태", "Status")}</th>
              <th>{t("출근 / 퇴근", "Check In / Out")}</th>
              <th>{t("근무 / 연장(분)", "Worked / Overtime")}</th>
              <th>{t("정책", "Policy")}</th>
              <th>{t("원본 이벤트 수", "Source Events")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.id}>
                <td>{row.workDate.slice(0, 10)}</td>
                <td>
                  {row.employee.employeeNumber} {row.employee.nameKr}
                </td>
                <td>
                  {translateStatus(row.status, t)}
                  {row.needsReview ? ` (${t("검토필요", "review")})` : ""}
                </td>
                <td>
                  {formatTime(row.checkInAt)} / {formatTime(row.checkOutAt)}
                </td>
                <td>
                  {row.workedMinutes} / {row.overtimeMinutes}
                </td>
                <td>
                  {row.shiftPolicy ? `${row.shiftPolicy.code} v${row.policyVersion ?? row.shiftPolicy.version}` : "-"}
                </td>
                <td>{row.sourceEvents.length}</td>
              </tr>
            ))}
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7}>{t("조건에 맞는 근태 데이터가 없습니다.", "No ledger rows match the current filters.")}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
