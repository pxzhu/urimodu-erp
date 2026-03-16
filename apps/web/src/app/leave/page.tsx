"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../components/dashboard-nav";
import { SearchableEmployeeSelector } from "../../components/searchable-employee-selector";
import { useLocaleText, useUiShell } from "../../components/ui-shell-provider";
import { ApiError, apiRequest, requireCompanyId } from "../../lib/api";
import { loadSession, type LoginSession } from "../../lib/auth";
import { translateStatus } from "../../lib/status-label";

interface LeavePolicyItem {
  id: string;
  code: string;
  name: string;
  unit: string;
}

interface LeaveRequestItem {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  unit: string;
  quantity: string;
  reason: string | null;
  employee: {
    employeeNumber: string;
    nameKr: string;
  };
  leavePolicy: {
    name: string;
  };
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

export default function LeavePage() {
  const router = useRouter();
  const t = useLocaleText();
  const { isAdminView } = useUiShell();
  const [session, setSession] = useState<LoginSession | null>(null);
  const [policies, setPolicies] = useState<LeavePolicyItem[]>([]);
  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [form, setForm] = useState({
    leavePolicyId: "",
    startDate: "",
    endDate: "",
    unit: "DAY",
    quantity: "",
    reason: "",
    approverEmployeeIds: [] as string[]
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const companyId = useMemo(() => (session ? requireCompanyId(session) : ""), [session]);

  async function refresh(activeSession: LoginSession) {
    const activeCompanyId = requireCompanyId(activeSession);
    const [policyData, requestData, employeeData] = await Promise.all([
      apiRequest<LeavePolicyItem[]>("/leave/policies", {
        token: activeSession.token,
        companyId: activeCompanyId
      }),
      apiRequest<LeaveRequestItem[]>("/leave/requests?limit=100", {
        token: activeSession.token,
        companyId: activeCompanyId
      }),
      apiRequest<EmployeeItem[]>(`/employees?companyId=${activeCompanyId}`, {
        token: activeSession.token,
        companyId: activeCompanyId
      })
    ]);

    setPolicies(policyData);
    setRequests(requestData);
    setEmployees(employeeData);

    if (!form.leavePolicyId && policyData.length > 0) {
      const firstPolicy = policyData[0];
      if (firstPolicy) {
        setForm((current) => ({ ...current, leavePolicyId: firstPolicy.id, unit: firstPolicy.unit }));
      }
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
      try {
        await refresh(loaded);
      } catch (refreshError) {
        if (refreshError instanceof ApiError) {
          setError(refreshError.message);
        } else {
          setError(t("휴가 데이터를 불러오지 못했습니다.", "Failed to load leave data."));
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
      const selectedPolicy = policies.find((policy) => policy.id === form.leavePolicyId);
      await apiRequest("/leave/requests", {
        method: "POST",
        token: session.token,
        companyId,
        body: {
          leavePolicyId: form.leavePolicyId,
          startDate: form.startDate,
          endDate: form.endDate,
          unit: selectedPolicy?.unit ?? form.unit,
          quantity: form.quantity ? Number(form.quantity) : undefined,
          reason: form.reason,
          approverEmployeeIds: form.approverEmployeeIds,
          autoCreateDocument: true
        }
      });

      setSuccess(t("휴가 요청을 생성했습니다.", "Leave request created."));
      setForm((current) => ({
        ...current,
        startDate: "",
        endDate: "",
        quantity: "",
        reason: "",
        approverEmployeeIds: []
      }));
      await refresh(session);
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.message);
      } else {
        setError(t("휴가 요청 생성에 실패했습니다.", "Failed to create leave request."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container with-shell">
      <DashboardNav />
      <section className="app-shell-content">
      <h1>{t("휴가 신청", "Leave Requests")}</h1>
      <p>
        {t(
          "휴가 신청서를 생성하고 기존 문서/결재 플로우로 연동합니다. 결재자는 이름 검색으로 선택할 수 있습니다.",
          "Create leave requests and route them through the existing document/approval flow with searchable approver selection."
        )}
      </p>

      {!isAdminView ? (
        <p className="role-note">
          {t(
            "사용자 화면에서는 본인 신청 위주로 간소화됩니다.",
            "User screen focuses on personal request flow."
          )}
        </p>
      ) : null}

      <form className="form-grid" onSubmit={(event) => void handleSubmit(event)}>
        <label>
          {t("휴가 정책", "Leave policy")}
          <select
            value={form.leavePolicyId}
            onChange={(event) => {
              const policy = policies.find((item) => item.id === event.target.value);
              setForm((current) => ({
                ...current,
                leavePolicyId: event.target.value,
                unit: policy?.unit ?? current.unit
              }));
            }}
            required
          >
            {policies.map((policy) => (
              <option key={policy.id} value={policy.id}>
                {policy.name} ({policy.unit})
              </option>
            ))}
          </select>
        </label>

        <label>
          {t("시작일", "Start date")}
          <input
            type="date"
            value={form.startDate}
            onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
            required
          />
        </label>

        <label>
          {t("종료일", "End date")}
          <input
            type="date"
            value={form.endDate}
            onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
            required
          />
        </label>

        <label>
          {t("수량(선택)", "Quantity (optional)")}
          <input
            type="number"
            min="0.25"
            step="0.25"
            value={form.quantity}
            onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
            placeholder="auto"
          />
        </label>

        <label>
          {t("사유", "Reason")}
          <textarea
            rows={3}
            value={form.reason}
            onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
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
          {submitting ? t("생성 중...", "Creating...") : t("휴가 요청 생성", "Create leave request")}
        </button>
      </form>

      {error ? <p className="error-text">{error}</p> : null}
      {success ? <p className="success-text">{success}</p> : null}

      <table className="data-table">
        <thead>
          <tr>
            <th>{t("요청", "Request")}</th>
            <th>{t("직원", "Employee")}</th>
            <th>{t("기간", "Period")}</th>
            <th>{t("정책", "Policy")}</th>
            <th>{t("상태", "Status")}</th>
            <th>{t("문서", "Document")}</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id}>
              <td>
                <code>{request.id}</code>
              </td>
              <td>
                {request.employee.employeeNumber} {request.employee.nameKr}
              </td>
              <td>
                {request.startDate.slice(0, 10)} ~ {request.endDate.slice(0, 10)} ({request.quantity} {request.unit})
              </td>
              <td>{request.leavePolicy.name}</td>
              <td>{translateStatus(request.status, t)}</td>
              <td>{request.document ? `${request.document.title} (${translateStatus(request.document.status, t)})` : "-"}</td>
            </tr>
          ))}
          {requests.length === 0 ? (
            <tr>
              <td colSpan={6}>{t("휴가 요청이 없습니다.", "No leave requests found.")}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
      </section>
    </main>
  );
}
