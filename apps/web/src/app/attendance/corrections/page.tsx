"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../../components/dashboard-nav";
import { SearchableEmployeeSelector } from "../../../components/searchable-employee-selector";
import { useLocaleText, useUiShell } from "../../../components/ui-shell-provider";
import { ApiError, apiRequest, requireCompanyId } from "../../../lib/api";
import { loadSession, type LoginSession } from "../../../lib/auth";
import { translateStatus } from "../../../lib/status-label";

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

interface EmployeeItem {
  id: string;
  employeeNumber: string;
  nameKr: string;
}

export default function AttendanceCorrectionsPage() {
  const router = useRouter();
  const t = useLocaleText();
  const { isAdminView } = useUiShell();
  const [session, setSession] = useState<LoginSession | null>(null);
  const [rows, setRows] = useState<AttendanceCorrectionItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [form, setForm] = useState({
    workDate: "",
    requestedCheckInAt: "",
    requestedCheckOutAt: "",
    reason: "",
    approverEmployeeIds: [] as string[]
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const companyId = useMemo(() => (session ? requireCompanyId(session) : ""), [session]);

  async function refresh(activeSession: LoginSession) {
    const activeCompanyId = requireCompanyId(activeSession);
    const [correctionData, employeeData] = await Promise.all([
      apiRequest<AttendanceCorrectionItem[]>("/attendance-corrections?limit=100", {
        token: activeSession.token,
        companyId: activeCompanyId
      }),
      apiRequest<EmployeeItem[]>(`/employees?companyId=${activeCompanyId}`, {
        token: activeSession.token,
        companyId: activeCompanyId
      })
    ]);

    setRows(correctionData);
    setEmployees(employeeData);
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
          setError(t("근태 정정 요청 목록을 불러오지 못했습니다.", "Failed to load attendance correction requests."));
        }
      }
    }

    void run();
  }, [router, t]);

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
          approverEmployeeIds: form.approverEmployeeIds,
          autoCreateDocument: true
        }
      });

      setSuccess(t("근태 정정 요청을 생성했습니다.", "Attendance correction request created."));
      setForm({
        workDate: "",
        requestedCheckInAt: "",
        requestedCheckOutAt: "",
        reason: "",
        approverEmployeeIds: []
      });

      await refresh(session);
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.message);
      } else {
        setError(t("근태 정정 요청 생성에 실패했습니다.", "Failed to create attendance correction request."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container with-shell">
      <DashboardNav />
      <section className="app-shell-content">
      <h1>{t("근태 정정", "Attendance Corrections")}</h1>
      <p>
        {t(
          "정정 요청을 생성하고 문서/결재 플로우로 라우팅합니다. 결재자는 이름으로 검색해 추가할 수 있습니다.",
          "Create correction requests and route through document/approval flow with searchable approver selection."
        )}
      </p>

      {!isAdminView ? (
        <p className="role-note">
          {t("사용자 권한에서는 본인 요청 처리 위주입니다.", "User role focuses on self-service correction requests.")}
        </p>
      ) : null}

      <form className="form-grid" onSubmit={(event) => void handleSubmit(event)}>
        <label>
          {t("근무일", "Work date")}
          <input
            type="date"
            value={form.workDate}
            onChange={(event) => setForm((current) => ({ ...current, workDate: event.target.value }))}
            required
          />
        </label>

        <label>
          {t("요청 출근 시각", "Requested check-in")}
          <input
            type="datetime-local"
            value={form.requestedCheckInAt}
            onChange={(event) => setForm((current) => ({ ...current, requestedCheckInAt: event.target.value }))}
          />
        </label>

        <label>
          {t("요청 퇴근 시각", "Requested check-out")}
          <input
            type="datetime-local"
            value={form.requestedCheckOutAt}
            onChange={(event) => setForm((current) => ({ ...current, requestedCheckOutAt: event.target.value }))}
          />
        </label>

        <label>
          {t("사유", "Reason")}
          <textarea
            rows={3}
            value={form.reason}
            onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
            required
          />
        </label>

        <SearchableEmployeeSelector
          employees={employees}
          selectedEmployeeIds={form.approverEmployeeIds}
          onChange={(nextIds) => setForm((current) => ({ ...current, approverEmployeeIds: nextIds }))}
          label={t("결재자 선택", "Select approvers")}
          placeholder={t("이름 일부로 검색 (예: 홍)", "Type part of a name to search")}
        />

        <button type="submit" disabled={submitting}>
          {submitting ? t("생성 중...", "Creating...") : t("정정 요청 생성", "Create correction request")}
        </button>
      </form>

      {error ? <p className="error-text">{error}</p> : null}
      {success ? <p className="success-text">{success}</p> : null}

      <table className="data-table">
        <thead>
          <tr>
            <th>{t("요청", "Request")}</th>
            <th>{t("직원", "Employee")}</th>
            <th>{t("근무일", "Work Date")}</th>
            <th>{t("요청 시간", "Requested Time")}</th>
            <th>{t("상태", "Status")}</th>
            <th>{t("문서", "Document")}</th>
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
              <td>{translateStatus(row.status, t)}</td>
              <td>{row.document ? `${row.document.title} (${translateStatus(row.document.status, t)})` : "-"}</td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6}>{t("근태 정정 요청이 없습니다.", "No attendance correction requests found.")}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
      </section>
    </main>
  );
}
