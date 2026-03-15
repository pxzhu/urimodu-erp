"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../../components/dashboard-nav";
import { useLocaleText } from "../../../components/ui-shell-provider";
import { ApiError, apiRequest, requireCompanyId } from "../../../lib/api";
import { loadSession, type LoginSession } from "../../../lib/auth";

interface AttendanceRawEventItem {
  id: string;
  provider: string;
  source: string;
  externalUserId: string;
  eventType: string;
  eventTimestamp: string;
  deviceId: string | null;
  siteCode: string | null;
  normalized: boolean;
  employee: {
    id: string;
    employeeNumber: string;
    nameKr: string;
  } | null;
}

export default function AttendanceRawPage() {
  const router = useRouter();
  const t = useLocaleText();
  const [session, setSession] = useState<LoginSession | null>(null);
  const [rows, setRows] = useState<AttendanceRawEventItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const companyId = useMemo(() => (session ? requireCompanyId(session) : ""), [session]);

  async function refresh(activeSession: LoginSession) {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<AttendanceRawEventItem[]>("/attendance/raw-events?limit=200", {
        token: activeSession.token,
        companyId: requireCompanyId(activeSession)
      });
      setRows(data);
    } catch (refreshError) {
      if (refreshError instanceof ApiError) {
        setError(refreshError.message);
      } else {
        setError(t("원본 근태 이벤트를 불러오지 못했습니다.", "Failed to load raw attendance events."));
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
      <h1>{t("근태 원본 이벤트", "Attendance Raw Events")}</h1>
      <p>{t("API/CSV/에이전트로 유입된 불변 원본 이벤트입니다.", "Immutable source events ingested from API/CSV/edge-agent integrations.")}</p>

      <div className="inline-actions">
        <button type="button" disabled={!session || loading} onClick={() => session && void refresh(session)}>
          {loading ? t("로딩 중...", "Loading...") : t("새로고침", "Refresh")}
        </button>
        <span>
          {t("회사 컨텍스트", "Company context")}: <code>{companyId || "-"}</code>
        </span>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <table className="data-table">
        <thead>
          <tr>
            <th>{t("발생시각", "Timestamp")}</th>
            <th>{t("공급자/소스", "Provider/Source")}</th>
            <th>{t("외부 사용자", "External User")}</th>
            <th>{t("직원", "Employee")}</th>
            <th>{t("이벤트 유형", "Event Type")}</th>
            <th>{t("장치/사이트", "Device/Site")}</th>
            <th>{t("정규화 여부", "Normalized")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{new Date(row.eventTimestamp).toLocaleString()}</td>
              <td>
                {row.provider}/{row.source}
              </td>
              <td>{row.externalUserId}</td>
              <td>{row.employee ? `${row.employee.employeeNumber} ${row.employee.nameKr}` : t("(미매핑)", "(unmapped)")}</td>
              <td>{row.eventType}</td>
              <td>
                {(row.deviceId ?? "-")}/{row.siteCode ?? "-"}
              </td>
              <td>{row.normalized ? t("예", "yes") : t("아니오", "no")}</td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7}>{t("원본 이벤트가 없습니다.", "No raw events found.")}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
      </section>
    </main>
  );
}
