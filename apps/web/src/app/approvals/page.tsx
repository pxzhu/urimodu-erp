"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../components/dashboard-nav";
import { useLocaleText, useUiShell } from "../../components/ui-shell-provider";
import { ApiError, apiRequest, requireCompanyId } from "../../lib/api";
import { loadSession, type LoginSession } from "../../lib/auth";
import { translateApprovalStepType, translateStatus } from "../../lib/status-label";

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
type ApprovalActionKind = "approve" | "reject";

export default function ApprovalsPage() {
  const router = useRouter();
  const t = useLocaleText();
  const { isAdminView } = useUiShell();
  const [session, setSession] = useState<LoginSession | null>(null);
  const [inbox, setInbox] = useState<ApprovalInboxLine[]>([]);
  const [actionModal, setActionModal] = useState<{ line: ApprovalInboxLine; action: ApprovalActionKind } | null>(null);
  const [actionComment, setActionComment] = useState("");
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

  async function handleAction(lineId: string, action: ApprovalActionKind, comment?: string) {
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
          comment: comment ?? ""
        }
      });
      await refresh(session);
      setActionComment("");
      setActionModal(null);
    } catch (actionError) {
      if (actionError instanceof ApiError) {
        setError(actionError.message);
      } else {
        setError(t("결재 처리에 실패했습니다.", "Failed to process approval action."));
      }
    } finally {
      setWorkingLineId(null);
    }
  }

  return (
    <main className="container with-shell">
      <DashboardNav />
      <section className="app-shell-content">
      <h1>{t("결재함", "Approvals Inbox")}</h1>
      <p>
        {t(
          "대기 중인 결재 단계를 승인/반려할 수 있습니다.",
          "Approve or reject pending steps assigned to your employee identity."
        )}
      </p>
      <p>
        {t("문서 작성/상신은", "Need to create or submit a document? Go to")} <Link href="/documents">{t("문서함", "Documents")}</Link>.
      </p>

      {!isAdminView ? (
        <p className="role-note">{t("사용자 모드에서는 개인 결재 대상만 표시됩니다.", "User mode shows only personal approval targets.")}</p>
      ) : null}

      {error ? <p className="error-text">{error}</p> : null}

      <table className="data-table">
        <thead>
          <tr>
            <th>{t("문서", "Document")}</th>
            <th>{t("결재선 상태", "Line Status")}</th>
            <th>{t("현재 단계", "Current Step")}</th>
            <th>{t("결재자", "Approver")}</th>
            <th>{t("동작", "Actions")}</th>
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
                <td>{translateStatus(line.status, t)}</td>
                <td>
                  {currentStep ? (
                    <>
                      #{currentStep.orderNo} {translateApprovalStepType(currentStep.type, t)}
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
                  <div className="inline-actions">
                    <button
                      type="button"
                      disabled={workingLineId === line.id}
                      onClick={() => {
                        setActionComment("");
                        setActionModal({ line, action: "approve" });
                      }}
                    >
                      {t("승인", "Approve")}
                    </button>
                    <button
                      type="button"
                      disabled={workingLineId === line.id}
                      onClick={() => {
                        setActionComment("");
                        setActionModal({ line, action: "reject" });
                      }}
                    >
                      {t("반려", "Reject")}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
          {inbox.length === 0 ? (
            <tr>
              <td colSpan={5}>{t("결재 대기 항목이 없습니다.", "No pending approvals in your inbox.")}</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {actionModal ? (
        <div className="app-modal-backdrop" role="presentation" onClick={() => setActionModal(null)}>
          <section className="app-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3>
              {actionModal.action === "approve"
                ? t("결재 승인", "Approve request")
                : t("결재 반려", "Reject request")}
            </h3>
            <p className="empty-note">{actionModal.line.document.title}</p>
            <label htmlFor="approval-comment">{t("코멘트 (선택)", "Comment (optional)")}</label>
            <textarea
              id="approval-comment"
              rows={4}
              value={actionComment}
              onChange={(event) => setActionComment(event.target.value)}
            />
            <div className="app-modal__actions">
              <button type="button" onClick={() => setActionModal(null)}>
                {t("취소", "Cancel")}
              </button>
              <button
                type="button"
                className={actionModal.action === "approve" ? "" : "nav-chip nav-chip--danger"}
                disabled={workingLineId === actionModal.line.id}
                onClick={() => void handleAction(actionModal.line.id, actionModal.action, actionComment)}
              >
                {workingLineId === actionModal.line.id
                  ? t("처리 중...", "Processing...")
                  : actionModal.action === "approve"
                    ? t("승인", "Approve")
                    : t("반려", "Reject")}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      </section>
    </main>
  );
}
