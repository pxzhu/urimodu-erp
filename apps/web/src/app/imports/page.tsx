"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../components/dashboard-nav";
import { KeyValueTableEditor, type KeyValueRow } from "../../components/key-value-table-editor";
import { useLocaleText, useUiShell } from "../../components/ui-shell-provider";
import { ApiError, apiRequest, requireCompanyId } from "../../lib/api";
import { loadSession, type LoginSession } from "../../lib/auth";
import { translateStatus } from "../../lib/status-label";

interface UploadedFile {
  id: string;
  originalName: string;
}

interface ImportJobListItem {
  id: string;
  type: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  finishedAt: string | null;
  sourceFile: {
    id: string;
    originalName: string;
  } | null;
  _count: {
    rows: number;
  };
}

interface ImportJobDetail {
  id: string;
  type: string;
  status: string;
  errorMessage: string | null;
  summaryJson: {
    totalRows?: number;
    createdRows?: number;
    updatedRows?: number;
    failedRows?: number;
  } | null;
  rows: Array<{
    id: string;
    rowNo: number;
    status: string;
    errorMessage: string | null;
    rawData: Record<string, unknown>;
  }>;
}

function rowsToMapping(rows: KeyValueRow[]): Record<string, string> | undefined {
  const mapping = rows.reduce<Record<string, string>>((accumulator, row) => {
    const source = row.key.trim();
    const target = row.value.trim();
    if (!source || !target) {
      return accumulator;
    }

    accumulator[source] = target;
    return accumulator;
  }, {});

  if (Object.keys(mapping).length === 0) {
    return undefined;
  }

  return mapping;
}

export default function ImportsPage() {
  const router = useRouter();
  const t = useLocaleText();
  const { isAdminView } = useUiShell();
  const [session, setSession] = useState<LoginSession | null>(null);
  const [jobs, setJobs] = useState<ImportJobListItem[]>([]);
  const [selectedJob, setSelectedJob] = useState<ImportJobDetail | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mappingRows, setMappingRows] = useState<KeyValueRow[]>([
    { key: "code", value: "code" },
    { key: "name", value: "name" }
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const companyId = useMemo(() => (session ? requireCompanyId(session) : ""), [session]);

  async function fetchJobs(activeSession: LoginSession) {
    const data = await apiRequest<ImportJobListItem[]>("/import-export/import-jobs?limit=50", {
      token: activeSession.token,
      companyId: requireCompanyId(activeSession)
    });
    setJobs(data);
  }

  async function fetchJobDetail(activeSession: LoginSession, jobId: string) {
    const data = await apiRequest<ImportJobDetail>(`/import-export/import-jobs/${jobId}`, {
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
          setError(t("가져오기 작업 목록을 불러오지 못했습니다.", "Failed to load import jobs."));
        }
      }
    }

    void run();
  }, [router, t]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !selectedFile) {
      setError(t("CSV/XLSX 파일을 선택해주세요.", "Please choose a CSV/XLSX file."));
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const metadata = { category: "vendor-import-source" };
      const uploadPayload = new FormData();
      uploadPayload.append("file", selectedFile);
      uploadPayload.append("metadataJson", JSON.stringify(metadata));

      const uploaded = await apiRequest<UploadedFile>("/files/upload", {
        method: "POST",
        token: session.token,
        companyId,
        body: uploadPayload
      });

      const createdJob = await apiRequest<ImportJobDetail>("/import-export/import-jobs/vendors", {
        method: "POST",
        token: session.token,
        companyId,
        body: {
          sourceFileId: uploaded.id,
          mappingJson: rowsToMapping(mappingRows)
        }
      });

      setSuccess(t("벤더 가져오기 작업을 생성했습니다.", "Vendor import job created."));
      setSelectedFile(null);
      await fetchJobs(session);
      await fetchJobDetail(session, createdJob.id);
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.message);
      } else if (submitError instanceof Error) {
        setError(submitError.message);
      } else {
        setError(t("가져오기 작업 생성에 실패했습니다.", "Failed to create import job."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container with-shell">
      <DashboardNav />
      <section className="app-shell-content">
      <h1>{t("가져오기 작업", "Import Jobs")}</h1>
      <p>
        {t(
          "CSV/XLSX 파일을 업로드하고 컬럼 매핑을 표로 지정한 뒤 행 단위 검증 결과를 확인하세요.",
          "Upload CSV/XLSX, set column mapping in table form, and review row-level validation results."
        )}
      </p>

      {!isAdminView ? (
        <p className="role-note">
          {t("사용자 권한에서는 가져오기 생성 권한이 제한될 수 있습니다.", "Import creation may be restricted for user role.")}
        </p>
      ) : null}

      <form className="form-grid" onSubmit={(event) => void handleSubmit(event)}>
        <label>
          {t("원본 파일 (CSV/XLSX)", "Source file (CSV/XLSX)")}
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            required
          />
        </label>

        <fieldset>
          <legend>{t("컬럼 매핑 (선택)", "Column mapping (optional)")}</legend>
          <KeyValueTableEditor
            rows={mappingRows}
            onChange={setMappingRows}
            keyPlaceholder={t("원본 컬럼", "Source column")}
            valuePlaceholder={t("대상 필드", "Target field")}
          />
        </fieldset>

        <button type="submit" disabled={submitting || !isAdminView}>
          {submitting ? t("생성 중...", "Creating...") : t("벤더 가져오기 생성", "Create vendor import job")}
        </button>
      </form>

      {error ? <p className="error-text">{error}</p> : null}
      {success ? <p className="success-text">{success}</p> : null}

      <h2>{t("작업 목록", "Jobs")}</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>{t("작업", "Job")}</th>
            <th>{t("유형", "Type")}</th>
            <th>{t("상태", "Status")}</th>
            <th>{t("원본 파일", "Source File")}</th>
            <th>{t("행 수", "Rows")}</th>
            <th>{t("완료 시각", "Finished")}</th>
            <th>{t("오류", "Error")}</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td>
                <button type="button" onClick={() => session && void fetchJobDetail(session, job.id)}>
                  {t("상세", "View")}
                </button>
                <div>
                  <code>{job.id}</code>
                </div>
              </td>
              <td>{job.type}</td>
              <td>{translateStatus(job.status, t)}</td>
              <td>{job.sourceFile?.originalName ?? "-"}</td>
              <td>{job._count.rows}</td>
              <td>{job.finishedAt ? new Date(job.finishedAt).toLocaleString() : "-"}</td>
              <td>{job.errorMessage ?? "-"}</td>
            </tr>
          ))}
          {jobs.length === 0 ? (
            <tr>
              <td colSpan={7}>{t("아직 가져오기 작업이 없습니다.", "No import jobs yet.")}</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {selectedJob ? (
        <>
          <h2>{t("선택된 작업 상세", "Selected Job Detail")}</h2>
          <p>
            <code>{selectedJob.id}</code> / {translateStatus(selectedJob.status, t)}
          </p>
          <p>
            {t("요약", "Summary")}: {selectedJob.summaryJson ? JSON.stringify(selectedJob.summaryJson) : "-"}
          </p>

          <table className="data-table">
            <thead>
              <tr>
                <th>{t("행", "Row")}</th>
                <th>{t("상태", "Status")}</th>
                <th>{t("오류", "Error")}</th>
                <th>{t("원본 데이터", "Raw Data")}</th>
              </tr>
            </thead>
            <tbody>
              {selectedJob.rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.rowNo}</td>
                  <td>{translateStatus(row.status, t)}</td>
                  <td>{row.errorMessage ?? "-"}</td>
                  <td>
                    <code>{JSON.stringify(row.rawData)}</code>
                  </td>
                </tr>
              ))}
              {selectedJob.rows.length === 0 ? (
                <tr>
                  <td colSpan={4}>{t("행 결과가 없습니다.", "No row results.")}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </>
      ) : null}
      </section>
    </main>
  );
}
