"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../components/dashboard-nav";
import { ApiError, apiRequest, requireCompanyId } from "../../lib/api";
import { loadSession, type LoginSession } from "../../lib/auth";

interface FileItem {
  id: string;
  originalName: string;
  mimeType: string;
  extension: string | null;
  sizeBytes: string | number;
  checksumSha256: string;
  createdAt: string;
  uploadedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

function formatBytes(value: string | number): string {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return String(value);
  }
  if (parsed < 1024) {
    return `${parsed} B`;
  }
  if (parsed < 1024 * 1024) {
    return `${(parsed / 1024).toFixed(1)} KB`;
  }
  return `${(parsed / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilesPage() {
  const router = useRouter();
  const [session, setSession] = useState<LoginSession | null>(null);
  const [items, setItems] = useState<FileItem[]>([]);
  const [metadataJson, setMetadataJson] = useState("{\"category\":\"approval-attachment\"}");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const companyId = useMemo(() => (session ? requireCompanyId(session) : ""), [session]);

  async function refreshList(activeSession: LoginSession) {
    const nextCompanyId = requireCompanyId(activeSession);
    setRefreshing(true);
    try {
      const list = await apiRequest<FileItem[]>("/files", {
        token: activeSession.token,
        companyId: nextCompanyId
      });
      setItems(list);
    } finally {
      setRefreshing(false);
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
      await refreshList(loaded);
    }

    void run();
  }, [router]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !selectedFile) {
      setError("Please select a file first.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (metadataJson.trim()) {
        JSON.parse(metadataJson);
      }

      const payload = new FormData();
      payload.append("file", selectedFile);
      if (metadataJson.trim()) {
        payload.append("metadataJson", metadataJson.trim());
      }

      await apiRequest<FileItem>("/files/upload", {
        method: "POST",
        token: session.token,
        companyId,
        body: payload
      });

      setSelectedFile(null);
      await refreshList(session);
    } catch (uploadError) {
      if (uploadError instanceof ApiError) {
        setError(uploadError.message);
      } else if (uploadError instanceof Error) {
        setError(uploadError.message);
      } else {
        setError("Unexpected upload error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownload(file: FileItem) {
    if (!session) {
      return;
    }

    try {
      const blob = await apiRequest<Blob>(`/files/${file.id}/download`, {
        token: session.token,
        companyId,
        responseType: "blob"
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.originalName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      if (downloadError instanceof ApiError) {
        setError(downloadError.message);
      } else {
        setError("Failed to download file");
      }
    }
  }

  return (
    <main className="container">
      <DashboardNav />
      <h1>Files</h1>
      <p>Upload to MinIO-backed storage and reuse file IDs in document attachments.</p>

      <form className="form-grid" onSubmit={handleUpload}>
        <label htmlFor="upload-file">File</label>
        <input
          id="upload-file"
          type="file"
          onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
        />

        <label htmlFor="metadata-json">Metadata JSON</label>
        <textarea
          id="metadata-json"
          rows={3}
          value={metadataJson}
          onChange={(event) => setMetadataJson(event.target.value)}
        />

        <button type="submit" disabled={submitting}>
          {submitting ? "Uploading..." : "Upload File"}
        </button>
      </form>

      {error ? <p className="error-text">{error}</p> : null}
      {refreshing ? <p>Refreshing list...</p> : null}

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>MIME</th>
            <th>Size</th>
            <th>Checksum</th>
            <th>Uploader</th>
            <th>Created</th>
            <th>Download</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <strong>{item.originalName}</strong>
                <div>
                  <code>{item.id}</code>
                </div>
              </td>
              <td>{item.mimeType}</td>
              <td>{formatBytes(item.sizeBytes)}</td>
              <td>
                <code>{item.checksumSha256.slice(0, 16)}...</code>
              </td>
              <td>{item.uploadedBy?.name ?? "-"}</td>
              <td>{new Date(item.createdAt).toLocaleString()}</td>
              <td>
                <button type="button" onClick={() => void handleDownload(item)}>
                  Download
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 ? (
            <tr>
              <td colSpan={7}>No files uploaded yet.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </main>
  );
}
