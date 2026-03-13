"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../components/dashboard-nav";
import { ApiError, apiRequest, requireCompanyId } from "../../lib/api";
import { loadSession, type LoginSession } from "../../lib/auth";

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

export default function LeavePage() {
  const router = useRouter();
  const [session, setSession] = useState<LoginSession | null>(null);
  const [policies, setPolicies] = useState<LeavePolicyItem[]>([]);
  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [form, setForm] = useState({
    leavePolicyId: "",
    startDate: "",
    endDate: "",
    unit: "DAY",
    quantity: "",
    reason: "",
    approverEmployeeIds: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const companyId = useMemo(() => (session ? requireCompanyId(session) : ""), [session]);

  async function refresh(activeSession: LoginSession) {
    const [policyData, requestData] = await Promise.all([
      apiRequest<LeavePolicyItem[]>("/leave/policies", {
        token: activeSession.token,
        companyId: requireCompanyId(activeSession)
      }),
      apiRequest<LeaveRequestItem[]>("/leave/requests?limit=100", {
        token: activeSession.token,
        companyId: requireCompanyId(activeSession)
      })
    ]);

    setPolicies(policyData);
    setRequests(requestData);

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
          setError("Failed to load leave data");
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
          approverEmployeeIds: form.approverEmployeeIds
            .split(",")
            .map((value) => value.trim())
            .filter((value) => value.length > 0),
          autoCreateDocument: true
        }
      });

      setSuccess("Leave request created.");
      setForm((current) => ({
        ...current,
        startDate: "",
        endDate: "",
        quantity: "",
        reason: "",
        approverEmployeeIds: ""
      }));
      await refresh(session);
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.message);
      } else {
        setError("Failed to create leave request");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container">
      <DashboardNav />
      <h1>Leave Requests</h1>
      <p>Create leave requests and route approvals through the existing document workflow.</p>

      <form className="form-grid" onSubmit={(event) => void handleSubmit(event)}>
        <label>
          Leave policy
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
          Start date
          <input
            type="date"
            value={form.startDate}
            onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
            required
          />
        </label>

        <label>
          End date
          <input
            type="date"
            value={form.endDate}
            onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
            required
          />
        </label>

        <label>
          Quantity (optional)
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
          />
        </label>

        <button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create leave request"}
        </button>
      </form>

      {error ? <p className="error-text">{error}</p> : null}
      {success ? <p className="success-text">{success}</p> : null}

      <table className="data-table">
        <thead>
          <tr>
            <th>Request</th>
            <th>Employee</th>
            <th>Period</th>
            <th>Policy</th>
            <th>Status</th>
            <th>Document</th>
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
              <td>{request.status}</td>
              <td>{request.document ? `${request.document.title} (${request.document.status})` : "-"}</td>
            </tr>
          ))}
          {requests.length === 0 ? (
            <tr>
              <td colSpan={6}>No leave requests found.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </main>
  );
}
