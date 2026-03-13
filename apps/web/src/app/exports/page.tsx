"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../components/dashboard-nav";
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

export default function ExportsPage() {
  const router = useRouter();
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
          setError("Failed to load export jobs");
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

      setSuccess("Expense claim export job created.");
      await fetchJobs(session);
      await fetchJobDetail(session, created.id);
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.message);
      } else {
        setError("Failed to create export job");
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
    <main className="container">
      <DashboardNav />
      <h1>Export Jobs</h1>
      <p>Generate CSV/JSON exports from expense claim list and download job result files.</p>

      <form className="form-grid" onSubmit={(event) => void handleCreate(event)}>
        <label>
          Format
          <select value={format} onChange={(event) => setFormat(event.target.value as "CSV" | "JSON")}> 
            <option value="CSV">CSV</option>
            <option value="JSON">JSON</option>
          </select>
        </label>

        <label>
          Expense status filter
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">(all)</option>
            <option value="DRAFT">DRAFT</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="POSTED">POSTED</option>
          </select>
        </label>

        <button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create expense claim export job"}
        </button>
      </form>

      {error ? <p className="error-text">{error}</p> : null}
      {success ? <p className="success-text">{success}</p> : null}

      <table className="data-table">
        <thead>
          <tr>
            <th>Job</th>
            <th>Type</th>
            <th>Status</th>
            <th>Summary</th>
            <th>Result File</th>
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
              <td>{job.summaryJson ? JSON.stringify(job.summaryJson) : "-"}</td>
              <td>
                {job.resultFile ? (
                  <button type="button" onClick={() => void handleDownload(job.resultFile!.id, job.resultFile!.originalName)}>
                    Download
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
              <td colSpan={7}>No export jobs yet.</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {selectedJob ? (
        <section className="form-grid">
          <h2>Selected Job</h2>
          <p>
            <code>{selectedJob.id}</code>
          </p>
          <p>Status: {selectedJob.status}</p>
          <p>Summary: {selectedJob.summaryJson ? JSON.stringify(selectedJob.summaryJson) : "-"}</p>
          <p>
            Result file: {selectedJob.resultFile?.originalName ?? "-"}
            {selectedJob.resultFile ? (
              <button
                type="button"
                onClick={() => void handleDownload(selectedJob.resultFile!.id, selectedJob.resultFile!.originalName)}
              >
                Download
              </button>
            ) : null}
          </p>
        </section>
      ) : null}
    </main>
  );
}
