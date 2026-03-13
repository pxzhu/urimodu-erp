"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../components/dashboard-nav";
import { ApiError, apiRequest, requireCompanyId } from "../../lib/api";
import { loadSession, type LoginSession } from "../../lib/auth";

interface ApprovalInboxLine {
  id: string;
  status: string;
  currentOrder: number | null;
  submittedAt: string | null;
  document: {
    id: string;
    title: string;
    status: string;
    currentVersionNo: number;
  };
  steps: Array<{
    id: string;
    orderNo: number;
    type: string;
    status: string;
    approverEmployeeId: string;
    approverEmployee: {
      id: string;
      employeeNumber: string;
      nameKr: string;
      userId: string | null;
    };
  }>;
}

export default function ApprovalsPage() {
  const router = useRouter();
  const [session, setSession] = useState<LoginSession | null>(null);
  const [inbox, setInbox] = useState<ApprovalInboxLine[]>([]);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [workingLineId, setWorkingLineId] = useState<string | null>(null);

  const companyId = useMemo(() => (session ? requireCompanyId(session) : ""), [session]);

  async function refresh(activeSession: LoginSession) {
    const next = await apiRequest<ApprovalInboxLine[]>("/approvals/inbox", {
      token: activeSession.token,
      companyId: requireCompanyId(activeSession)
    });
    setInbox(next);
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

  async function handleAction(lineId: string, action: "approve" | "reject") {
    if (!session) {
      return;
    }

    setWorkingLineId(lineId);
    setError(null);
    try {
      await apiRequest(`/approvals/lines/${lineId}/${action}`, {
        method: "POST",
        token: session.token,
        companyId,
        body: {
          comment: comments[lineId] ?? ""
        }
      });
      await refresh(session);
    } catch (actionError) {
      if (actionError instanceof ApiError) {
        setError(actionError.message);
      } else {
        setError("Failed to process approval action");
      }
    } finally {
      setWorkingLineId(null);
    }
  }

  return (
    <main className="container">
      <DashboardNav />
      <h1>Approvals Inbox</h1>
      <p>Approve or reject pending steps assigned to your employee identity.</p>
      <p>
        Need to create or submit a document? Go to <Link href="/documents">Documents</Link>.
      </p>

      {error ? <p className="error-text">{error}</p> : null}

      <table className="data-table">
        <thead>
          <tr>
            <th>Document</th>
            <th>Line Status</th>
            <th>Current Step</th>
            <th>Approver</th>
            <th>Comment</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {inbox.map((line) => {
            const currentStep = line.steps.find((step) => step.orderNo === line.currentOrder);

            return (
              <tr key={line.id}>
                <td>
                  {line.document.title}
                  <div>
                    <code>{line.document.id}</code>
                  </div>
                </td>
                <td>{line.status}</td>
                <td>
                  {currentStep ? (
                    <>
                      #{currentStep.orderNo} {currentStep.type}
                    </>
                  ) : (
                    "-"
                  )}
                </td>
                <td>
                  {currentStep
                    ? `${currentStep.approverEmployee.employeeNumber} ${currentStep.approverEmployee.nameKr}`
                    : "-"}
                </td>
                <td>
                  <input
                    value={comments[line.id] ?? ""}
                    onChange={(event) =>
                      setComments((current) => ({
                        ...current,
                        [line.id]: event.target.value
                      }))
                    }
                    placeholder="comment (optional)"
                  />
                </td>
                <td>
                  <div className="inline-actions">
                    <button
                      type="button"
                      disabled={workingLineId === line.id}
                      onClick={() => void handleAction(line.id, "approve")}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={workingLineId === line.id}
                      onClick={() => void handleAction(line.id, "reject")}
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
          {inbox.length === 0 ? (
            <tr>
              <td colSpan={6}>No pending approvals in your inbox.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </main>
  );
}
