"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../../components/dashboard-nav";
import { ApiError, apiRequest, requireCompanyId } from "../../../lib/api";
import { loadSession, type LoginSession } from "../../../lib/auth";

interface AttendanceCorrectionItem {
  id: string;
  status: string;
  workDate: string;
  requestedCheckInAt: string | null;
  requestedCheckOutAt: string | null;
  reason: string;
  employee: {
    employeeNumber: string;
    nameKr: string;
  };
  attendanceLedger: {
    id: string;
    status: string;
  } | null;
  document: {
    id: string;
    title: string;
    status: string;
  } | null;
}

export default function AttendanceCorrectionsPage() {
  const router = useRouter();
  const [session, setSession] = useState<LoginSession | null>(null);
  const [rows, setRows] = useState<AttendanceCorrectionItem[]>([]);
  const [form, setForm] = useState({
    workDate: "",
    requestedCheckInAt: "",
    requestedCheckOutAt: "",
    reason: "",
    approverEmployeeIds: ""
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const companyId = useMemo(() => (session ? requireCompanyId(session) : ""), [session]);

  async function refresh(activeSession: LoginSession) {
    const data = await apiRequest<AttendanceCorrectionItem[]>("/attendance-corrections?limit=100", {
      token: activeSession.token,
      companyId: requireCompanyId(activeSession)
    });

    setRows(data);
  }

  useEffect(() => {
    async function run() {
      const loaded = loadSession();
      if (!loaded) {
        router.push("/login");
        return;
      }

      setSession(loaded);
      try {
        await refresh(loaded);
      } catch (loadError) {
        if (loadError instanceof ApiError) {
          setError(loadError.message);
        } else {
          setError("Failed to load attendance correction requests");
        }
      }
    }

    void run();
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await apiRequest("/attendance-corrections", {
        method: "POST",
        token: session.token,
        companyId,
        body: {
          workDate: form.workDate,
          requestedCheckInAt: form.requestedCheckInAt || undefined,
          requestedCheckOutAt: form.requestedCheckOutAt || undefined,
          reason: form.reason,
          approverEmployeeIds: form.approverEmployeeIds
            .split(",")
            .map((value) => value.trim())
            .filter((value) => value.length > 0),
          autoCreateDocument: true
        }
      });

      setSuccess("Attendance correction request created.");
      setForm({
        workDate: "",
        requestedCheckInAt: "",
        requestedCheckOutAt: "",
        reason: "",
        approverEmployeeIds: ""
      });

      await refresh(session);
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.message);
      } else {
        setError("Failed to create attendance correction request");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container">
      <DashboardNav />
      <h1>Attendance Corrections</h1>
      <p>Create correction requests and route them through document + approval flow.</p>

      <form className="form-grid" onSubmit={(event) => void handleSubmit(event)}>
        <label>
          Work date
          <input
            type="date"
            value={form.workDate}
            onChange={(event) => setForm((current) => ({ ...current, workDate: event.target.value }))}
            required
          />
        </label>

        <label>
          Requested check-in
          <input
            type="datetime-local"
            value={form.requestedCheckInAt}
            onChange={(event) => setForm((current) => ({ ...current, requestedCheckInAt: event.target.value }))}
          />
        </label>

        <label>
          Requested check-out
          <input
            type="datetime-local"
            value={form.requestedCheckOutAt}
            onChange={(event) => setForm((current) => ({ ...current, requestedCheckOutAt: event.target.value }))}
          />
        </label>

        <label>
          Approver employee IDs (comma-separated)
          <input
            value={form.approverEmployeeIds}
            onChange={(event) => setForm((current) => ({ ...current, approverEmployeeIds: event.target.value }))}
            placeholder="emp_xxx, emp_yyy"
          />
        </label>

        <label>
          Reason
          <textarea
            rows={3}
            value={form.reason}
            onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
            required
          />
        </label>

        <button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create correction request"}
        </button>
      </form>

      {error ? <p className="error-text">{error}</p> : null}
      {success ? <p className="success-text">{success}</p> : null}

      <table className="data-table">
        <thead>
          <tr>
            <th>Request</th>
            <th>Employee</th>
            <th>Work Date</th>
            <th>Requested Time</th>
            <th>Status</th>
            <th>Document</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <code>{row.id}</code>
              </td>
              <td>
                {row.employee.employeeNumber} {row.employee.nameKr}
              </td>
              <td>{row.workDate.slice(0, 10)}</td>
              <td>
                {row.requestedCheckInAt ? new Date(row.requestedCheckInAt).toLocaleString() : "-"} /{" "}
                {row.requestedCheckOutAt ? new Date(row.requestedCheckOutAt).toLocaleString() : "-"}
              </td>
              <td>{row.status}</td>
              <td>{row.document ? `${row.document.title} (${row.document.status})` : "-"}</td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6}>No attendance correction requests found.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </main>
  );
}
