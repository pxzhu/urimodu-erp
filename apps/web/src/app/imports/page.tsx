"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../components/dashboard-nav";
import { ApiError, apiRequest, requireCompanyId } from "../../lib/api";
import { loadSession, type LoginSession } from "../../lib/auth";

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

export default function ImportsPage() {
  const router = useRouter();
  const [session, setSession] = useState<LoginSession | null>(null);
  const [jobs, setJobs] = useState<ImportJobListItem[]>([]);
  const [selectedJob, setSelectedJob] = useState<ImportJobDetail | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mappingJson, setMappingJson] = useState("{}");
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
          setError("Failed to load import jobs");
        }
      }
    }

    void run();
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !selectedFile) {
      setError("Please choose a CSV/XLSX file.");
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

      const parsedMapping = mappingJson.trim() ? (JSON.parse(mappingJson) as Record<string, unknown>) : undefined;

      const createdJob = await apiRequest<ImportJobDetail>("/import-export/import-jobs/vendors", {
        method: "POST",
        token: session.token,
        companyId,
        body: {
          sourceFileId: uploaded.id,
          mappingJson: parsedMapping
        }
      });

      setSuccess("Vendor import job created.");
      setSelectedFile(null);
      await fetchJobs(session);
      await fetchJobDetail(session, createdJob.id);
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.message);
      } else if (submitError instanceof Error) {
        setError(submitError.message);
      } else {
        setError("Failed to create import job");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container">
      <DashboardNav />
      <h1>Import Jobs</h1>
      <p>Upload CSV/XLSX and run vendor import with row-level validation results.</p>

      <form className="form-grid" onSubmit={(event) => void handleSubmit(event)}>
        <label>
          Source file (CSV/XLSX)
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            required
          />
        </label>

        <label>
          Mapping JSON (optional)
          <textarea rows={3} value={mappingJson} onChange={(event) => setMappingJson(event.target.value)} />
        </label>

        <button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create vendor import job"}
        </button>
      </form>

      {error ? <p className="error-text">{error}</p> : null}
      {success ? <p className="success-text">{success}</p> : null}

      <h2>Jobs</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Job</th>
            <th>Type</th>
            <th>Status</th>
            <th>Source File</th>
            <th>Rows</th>
            <th>Finished</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td>
                <button type="button" onClick={() => session && void fetchJobDetail(session, job.id)}>
                  View
                </button>
                <div>
                  <code>{job.id}</code>
                </div>
              </td>
              <td>{job.type}</td>
              <td>{job.status}</td>
              <td>{job.sourceFile?.originalName ?? "-"}</td>
              <td>{job._count.rows}</td>
              <td>{job.finishedAt ? new Date(job.finishedAt).toLocaleString() : "-"}</td>
              <td>{job.errorMessage ?? "-"}</td>
            </tr>
          ))}
          {jobs.length === 0 ? (
            <tr>
              <td colSpan={7}>No import jobs yet.</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {selectedJob ? (
        <>
          <h2>Selected Job Detail</h2>
          <p>
            <code>{selectedJob.id}</code> / {selectedJob.status}
          </p>
          <p>
            Summary: {selectedJob.summaryJson ? JSON.stringify(selectedJob.summaryJson) : "-"}
          </p>

          <table className="data-table">
            <thead>
              <tr>
                <th>Row</th>
                <th>Status</th>
                <th>Error</th>
                <th>Raw Data</th>
              </tr>
            </thead>
            <tbody>
              {selectedJob.rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.rowNo}</td>
                  <td>{row.status}</td>
                  <td>{row.errorMessage ?? "-"}</td>
                  <td>
                    <code>{JSON.stringify(row.rawData)}</code>
                  </td>
                </tr>
              ))}
              {selectedJob.rows.length === 0 ? (
                <tr>
                  <td colSpan={4}>No row results.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </>
      ) : null}
    </main>
  );
}
