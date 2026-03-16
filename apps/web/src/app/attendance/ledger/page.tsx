"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../../components/dashboard-nav";
import { useLocaleText } from "../../../components/ui-shell-provider";
import { ApiError, apiRequest, requireCompanyId } from "../../../lib/api";
import { loadSession, type LoginSession } from "../../../lib/auth";
import { translateStatus } from "../../../lib/status-label";

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

export default function AttendanceLedgerPage() {
  const router = useRouter();
  const t = useLocaleText();
  const [session, setSession] = useState<LoginSession | null>(null);
  const [rows, setRows] = useState<AttendanceLedgerItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <main className="container with-shell">
      <DashboardNav />
      <section className="app-shell-content">
      <h1>{t("근태 원장", "Attendance Ledger")}</h1>
      <p>{t("불변 원본 이벤트를 기준으로 정규화된 근무일 원장입니다.", "Normalized work-date ledger rows generated from immutable raw events.")}</p>

      <div className="inline-actions">
        <button type="button" disabled={!session || loading} onClick={() => session && void refresh(session)}>
          {loading ? t("로딩 중...", "Loading...") : t("새로고침", "Refresh")}
        </button>
      </div>

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
          {rows.map((row) => (
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
                {row.checkInAt ? new Date(row.checkInAt).toLocaleTimeString() : "-"} /{" "}
                {row.checkOutAt ? new Date(row.checkOutAt).toLocaleTimeString() : "-"}
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
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7}>{t("정규화된 원장 데이터가 없습니다.", "No normalized ledger rows found.")}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
      </section>
    </main>
  );
}
