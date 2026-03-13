"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../../components/dashboard-nav";
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
        setError("Failed to load raw attendance events");
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
    <main className="container">
      <DashboardNav />
      <h1>Attendance Raw Events</h1>
      <p>Immutable source events ingested from API/CSV/edge-agent integrations.</p>

      <div className="inline-actions">
        <button type="button" disabled={!session || loading} onClick={() => session && void refresh(session)}>
          {loading ? "Loading..." : "Refresh"}
        </button>
        <span>
          Company context: <code>{companyId || "-"}</code>
        </span>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <table className="data-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Provider/Source</th>
            <th>External User</th>
            <th>Employee</th>
            <th>Event Type</th>
            <th>Device/Site</th>
            <th>Normalized</th>
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
              <td>{row.employee ? `${row.employee.employeeNumber} ${row.employee.nameKr}` : "(unmapped)"}</td>
              <td>{row.eventType}</td>
              <td>
                {(row.deviceId ?? "-")}/{row.siteCode ?? "-"}
              </td>
              <td>{row.normalized ? "yes" : "no"}</td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7}>No raw events found.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </main>
  );
}
