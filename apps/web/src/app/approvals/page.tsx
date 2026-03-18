"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../components/dashboard-nav";
import { useLocaleText, useUiShell } from "../../components/ui-shell-provider";
import { ApiError, apiRequest, requireCompanyId } from "../../lib/api";
import { loadSession, type LoginSession } from "../../lib/auth";
import { translateApprovalStepType, translateStatus } from "../../lib/status-label";
import styles from "./page.module.css";

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
type QueueTone = "danger" | "warning" | "neutral";

function getAgeDays(submittedAt: string | null) {
  if (!submittedAt) {
    return 0;
  }
  const diffMs = Date.now() - new Date(submittedAt).getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function getQueueTone(ageDays: number): QueueTone {
  if (ageDays >= 3) return "danger";
  if (ageDays >= 1) return "warning";
  return "neutral";
}

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

  const queueSummary = useMemo(() => {
    const urgent = inbox.filter((line) => getQueueTone(getAgeDays(line.submittedAt)) === "danger");
    const warning = inbox.filter((line) => getQueueTone(getAgeDays(line.submittedAt)) === "warning");
    const normal = inbox.filter((line) => getQueueTone(getAgeDays(line.submittedAt)) === "neutral");

    return {
      total: inbox.length,
      urgent,
      warning,
      normal,
      completedTodayHint: Math.max(0, inbox.length - urgent.length - warning.length)
    };
  }, [inbox]);

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

  function renderQueueCard(line: ApprovalInboxLine) {
    const currentStep = line.steps.find((step) => step.orderNo === line.currentOrder);
    const ageDays = getAgeDays(line.submittedAt);
    const tone = getQueueTone(ageDays);

    return (
      <article key={line.id} className={`${styles.queueCard} ${styles[`queueCard--${tone}`]}`}>
        <div className={styles.queueCardHeader}>
          <strong>{line.document.title}</strong>
          <span>{translateStatus(line.status, t)}</span>
        </div>
        <p>
          {currentStep
            ? t(
                `${currentStep.approverEmployee.nameKr} · ${translateApprovalStepType(currentStep.type, t)} 단계`,
                `${currentStep.approverEmployee.nameKr} · ${translateApprovalStepType(currentStep.type, t)} step`
              )
            : t("현재 단계 정보 없음", "No current step information")}
        </p>
        <div className={styles.queueMeta}>
          <span>{t(`상신 후 ${ageDays}일`, `${ageDays} days since submit`)}</span>
          <code>{line.document.id}</code>
        </div>
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
      </article>
    );
  }

  return (
    <main className="container with-shell">
      <DashboardNav />
      <section className="app-shell-content">
        <h1>{t("결재함", "Approvals Inbox")}</h1>
        <p>
          {t(
            "단순 결재 목록이 아니라 오늘 먼저 처리해야 할 결재 큐를 중심으로 확인할 수 있도록 구성했습니다.",
            "This inbox is organized around the approval queue you should process first today."
          )}
        </p>
        <p>
          {t("문서 작성/상신은", "Need to create or submit a document? Go to")} <Link href="/documents">{t("문서함", "Documents")}</Link>.
        </p>

        {!isAdminView ? (
          <p className="role-note">{t("사용자 모드에서는 개인 결재 대상만 표시됩니다.", "User mode shows only personal approval targets.")}</p>
        ) : null}

        <section className={styles.metricGrid}>
          <article className={styles.metricCard}>
            <p>{t("전체 대기", "Total pending")}</p>
            <strong>{queueSummary.total}</strong>
            <span>{t("결재함 기준", "From inbox")}</span>
          </article>
          <article className={styles.metricCard}>
            <p>{t("긴급 처리", "Urgent")}</p>
            <strong>{queueSummary.urgent.length}</strong>
            <span>{t("3일 이상 지연", "Delayed for 3+ days")}</span>
          </article>
          <article className={styles.metricCard}>
            <p>{t("검토 필요", "Needs review")}</p>
            <strong>{queueSummary.warning.length}</strong>
            <span>{t("1일 이상 경과", "Aged 1+ day")}</span>
          </article>
          <article className={styles.metricCard}>
            <p>{t("일반 큐", "Normal queue")}</p>
            <strong>{queueSummary.normal.length}</strong>
            <span>{t("당일 처리 권장", "Process within today")}</span>
          </article>
        </section>

        {error ? <p className="error-text">{error}</p> : null}

        <section className={styles.queueSection}>
          <div className={styles.queueSectionHeader}>
            <h2>{t("우선 처리 결재", "Priority approvals")}</h2>
            <span>{t("지연되었거나 먼저 확인이 필요한 항목", "Delayed or attention-worthy items")}</span>
          </div>
          <div className={styles.queueGrid}>
            {queueSummary.urgent.length > 0
              ? queueSummary.urgent.map(renderQueueCard)
              : queueSummary.warning.slice(0, 2).map(renderQueueCard)}
            {queueSummary.urgent.length === 0 && queueSummary.warning.length === 0 ? (
              <p className="empty-note">{t("긴급 처리 항목이 없습니다.", "No urgent approvals right now.")}</p>
            ) : null}
          </div>
        </section>

        <section className={styles.queueSection}>
          <div className={styles.queueSectionHeader}>
            <h2>{t("일반 결재 큐", "Standard queue")}</h2>
            <span>{t("나머지 대기 항목은 아래 목록에서 순서대로 처리하세요.", "Process the remaining items in order below.")}</span>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>{t("문서", "Document")}</th>
                <th>{t("결재선 상태", "Line Status")}</th>
                <th>{t("현재 단계", "Current Step")}</th>
                <th>{t("결재자", "Approver")}</th>
                <th>{t("경과", "Age")}</th>
                <th>{t("동작", "Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {inbox.map((line) => {
                const currentStep = line.steps.find((step) => step.orderNo === line.currentOrder);
                const ageDays = getAgeDays(line.submittedAt);

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
                    <td>{t(`${ageDays}일`, `${ageDays}d`)}</td>
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
                  <td colSpan={6}>{t("결재 대기 항목이 없습니다.", "No pending approvals in your inbox.")}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>

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
