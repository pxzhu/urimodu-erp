"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../../components/dashboard-nav";
import { ApiError, apiRequest, requireCompanyId } from "../../../lib/api";
import { loadSession, type LoginSession } from "../../../lib/auth";

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
        setError("Failed to load attendance ledger");
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
      <h1>Attendance Ledger</h1>
      <p>Normalized work-date ledger rows generated from immutable raw events.</p>

      <div className="inline-actions">
        <button type="button" disabled={!session || loading} onClick={() => session && void refresh(session)}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <table className="data-table">
        <thead>
          <tr>
            <th>Work Date</th>
            <th>Employee</th>
            <th>Status</th>
            <th>Check In / Out</th>
            <th>Worked / Overtime</th>
            <th>Policy</th>
            <th>Source Events</th>
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
                {row.status}
                {row.needsReview ? " (review)" : ""}
              </td>
              <td>
                {row.checkInAt ? new Date(row.checkInAt).toLocaleTimeString() : "-"} /{" "}
                {row.checkOutAt ? new Date(row.checkOutAt).toLocaleTimeString() : "-"}
              </td>
              <td>
                {row.workedMinutes} / {row.overtimeMinutes} min
              </td>
              <td>
                {row.shiftPolicy ? `${row.shiftPolicy.code} v${row.policyVersion ?? row.shiftPolicy.version}` : "-"}
              </td>
              <td>{row.sourceEvents.length}</td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7}>No normalized ledger rows found.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </main>
  );
}
