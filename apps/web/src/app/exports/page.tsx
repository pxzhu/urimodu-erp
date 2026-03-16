"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../components/dashboard-nav";
import { useLocaleText } from "../../components/ui-shell-provider";
import { ApiError, apiRequest, requireCompanyId } from "../../lib/api";
import { loadSession, type LoginSession } from "../../lib/auth";

interface ExportJobItem {
  id: string;
  type: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  finishedAt: string | null;
  summaryJson: {
    rowCount?: number;
    format?: string;
    resultFileId?: string;
  } | null;
  resultFile: {
    id: string;
    originalName: string;
    mimeType: string;
  } | null;
}

function translateJobStatus(status: string, t: (ko: string, en: string) => string): string {
  const normalized = status.toUpperCase();
  if (normalized === "PENDING") return t("대기", "Pending");
  if (normalized === "RUNNING") return t("실행 중", "Running");
  if (normalized === "SUCCEEDED") return t("완료", "Succeeded");
  if (normalized === "FAILED") return t("실패", "Failed");
  return status;
}

export default function ExportsPage() {
  const router = useRouter();
  const t = useLocaleText();
  const [session, setSession] = useState<LoginSession | null>(null);
  const [jobs, setJobs] = useState<ExportJobItem[]>([]);
  const [selectedJob, setSelectedJob] = useState<ExportJobItem | null>(null);
  const [format, setFormat] = useState<"CSV" | "JSON">("CSV");
  const [statusFilter, setStatusFilter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const companyId = useMemo(() => (session ? requireCompanyId(session) : ""), [session]);

  async function fetchJobs(activeSession: LoginSession) {
    const data = await apiRequest<ExportJobItem[]>("/import-export/export-jobs?limit=50", {
      token: activeSession.token,
      companyId: requireCompanyId(activeSession)
    });

    setJobs(data);
    setError(null);
  }

  async function fetchJobDetail(activeSession: LoginSession, jobId: string) {
    const data = await apiRequest<ExportJobItem>(`/import-export/export-jobs/${jobId}`, {
      token: activeSession.token,
      companyId: requireCompanyId(activeSession)
    });

    setSelectedJob(data);
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
        await fetchJobs(loaded);
      } catch (refreshError) {
        if (refreshError instanceof ApiError) {
          setError(refreshError.message);
        } else {
          setError(t("내보내기 작업 목록을 불러오지 못했습니다.", "Failed to load export jobs."));
        }
      }
    }

    void run();
  }, [router]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const created = await apiRequest<ExportJobItem>("/import-export/export-jobs/expense-claims", {
        method: "POST",
        token: session.token,
        companyId,
        body: {
          format,
          status: statusFilter || undefined
        }
      });

      setSuccess(t("경비 청구 내보내기 작업을 생성했습니다.", "Expense claim export job created."));
      await fetchJobs(session);
      await fetchJobDetail(session, created.id);
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.message);
      } else {
        setError(t("내보내기 작업 생성에 실패했습니다.", "Failed to create export job."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownload(fileId: string, fileName: string) {
    if (!session) {
      return;
    }

    const blob = await apiRequest<Blob>(`/files/${fileId}/download`, {
      token: session.token,
      companyId,
      responseType: "blob"
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="container with-shell">
      <DashboardNav />
      <section className="app-shell-content">
      <h1>{t("내보내기 작업", "Export Jobs")}</h1>
      <p>{t("경비 청구 목록을 CSV/JSON으로 생성하고 결과 파일을 다운로드하세요.", "Generate CSV/JSON exports from expense claim list and download job result files.")}</p>

      <form className="form-grid" onSubmit={(event) => void handleCreate(event)}>
        <label>
          {t("포맷", "Format")}
          <select value={format} onChange={(event) => setFormat(event.target.value as "CSV" | "JSON")}> 
            <option value="CSV">CSV</option>
            <option value="JSON">JSON</option>
          </select>
        </label>

        <label>
          {t("경비 상태 필터", "Expense status filter")}
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">{t("(전체)", "(all)")}</option>
            <option value="DRAFT">{t("초안", "DRAFT")}</option>
            <option value="SUBMITTED">{t("제출됨", "SUBMITTED")}</option>
            <option value="APPROVED">{t("승인", "APPROVED")}</option>
            <option value="REJECTED">{t("반려", "REJECTED")}</option>
            <option value="POSTED">{t("전기 완료", "POSTED")}</option>
          </select>
        </label>

        <button type="submit" disabled={submitting}>
          {submitting ? t("생성 중...", "Creating...") : t("경비 청구 내보내기 생성", "Create expense claim export job")}
        </button>
      </form>

      {error ? <p className="error-text">{error}</p> : null}
      {success ? <p className="success-text">{success}</p> : null}

      <table className="data-table">
        <thead>
          <tr>
            <th>Job</th>
            <th>{t("유형", "Type")}</th>
            <th>{t("상태", "Status")}</th>
            <th>{t("요약", "Summary")}</th>
            <th>{t("결과 파일", "Result File")}</th>
            <th>{t("완료 시각", "Finished")}</th>
            <th>{t("오류", "Error")}</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td>
                <button type="button" onClick={() => session && void fetchJobDetail(session, job.id)}>
                  {t("보기", "View")}
                </button>
                <div>
                  <code>{job.id}</code>
                </div>
              </td>
              <td>{job.type}</td>
              <td>{translateJobStatus(job.status, t)}</td>
              <td>{job.summaryJson ? JSON.stringify(job.summaryJson) : "-"}</td>
              <td>
                {job.resultFile ? (
                  <button type="button" onClick={() => void handleDownload(job.resultFile!.id, job.resultFile!.originalName)}>
                    {t("다운로드", "Download")}
                  </button>
                ) : (
                  "-"
                )}
              </td>
              <td>{job.finishedAt ? new Date(job.finishedAt).toLocaleString() : "-"}</td>
              <td>{job.errorMessage ?? "-"}</td>
            </tr>
          ))}
          {jobs.length === 0 ? (
            <tr>
              <td colSpan={7}>{t("내보내기 작업이 없습니다.", "No export jobs yet.")}</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {selectedJob ? (
        <section className="form-grid">
          <h2>{t("선택된 작업", "Selected Job")}</h2>
          <p>
            <code>{selectedJob.id}</code>
          </p>
          <p>{t("상태", "Status")}: {translateJobStatus(selectedJob.status, t)}</p>
          <p>{t("요약", "Summary")}: {selectedJob.summaryJson ? JSON.stringify(selectedJob.summaryJson) : "-"}</p>
          <p>
            {t("결과 파일", "Result file")}: {selectedJob.resultFile?.originalName ?? "-"}
            {selectedJob.resultFile ? (
              <button
                type="button"
                onClick={() => void handleDownload(selectedJob.resultFile!.id, selectedJob.resultFile!.originalName)}
              >
                {t("다운로드", "Download")}
              </button>
            ) : null}
          </p>
        </section>
      ) : null}
      </section>
    </main>
  );
}
