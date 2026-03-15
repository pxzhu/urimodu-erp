"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../components/dashboard-nav";
import { KeyValueTableEditor, type KeyValueRow } from "../../components/key-value-table-editor";
import { useLocaleText } from "../../components/ui-shell-provider";
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

function rowsToObject(rows: KeyValueRow[]): Record<string, string> {
  return rows.reduce<Record<string, string>>((accumulator, row) => {
    const key = row.key.trim();
    if (!key) {
      return accumulator;
    }

    accumulator[key] = row.value.trim();
    return accumulator;
  }, {});
}

export default function FilesPage() {
  const router = useRouter();
  const t = useLocaleText();
  const [session, setSession] = useState<LoginSession | null>(null);
  const [items, setItems] = useState<FileItem[]>([]);
  const [metadataRows, setMetadataRows] = useState<KeyValueRow[]>([
    { key: "category", value: "approval-attachment" },
    { key: "note", value: "" }
  ]);
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
      setError(t("먼저 파일을 선택해주세요.", "Please choose a file first."));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const metadataObject = rowsToObject(metadataRows);

      const payload = new FormData();
      payload.append("file", selectedFile);
      if (Object.keys(metadataObject).length > 0) {
        payload.append("metadataJson", JSON.stringify(metadataObject));
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
        setError(t("업로드 중 오류가 발생했습니다.", "Unexpected upload error."));
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
        setError(t("파일 다운로드에 실패했습니다.", "Failed to download file."));
      }
    }
  }

  return (
    <main className="container with-shell">
      <DashboardNav />
      <section className="app-shell-content">
      <h1>{t("파일 보관함", "File Storage")}</h1>
      <p>
        {t(
          "MinIO 저장소에 업로드하고 문서/경비 증빙에 재사용하세요. 메타데이터는 표 형태로 입력합니다.",
          "Upload to MinIO-backed storage and reuse for documents/expenses. Metadata is entered in table form."
        )}
      </p>

      <form className="form-grid" onSubmit={handleUpload}>
        <label htmlFor="upload-file">{t("파일", "File")}</label>
        <input
          id="upload-file"
          type="file"
          onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
        />

        <fieldset>
          <legend>{t("파일 메타데이터", "File metadata")}</legend>
          <KeyValueTableEditor rows={metadataRows} onChange={setMetadataRows} />
        </fieldset>

        <button type="submit" disabled={submitting}>
          {submitting ? t("업로드 중...", "Uploading...") : t("파일 업로드", "Upload file")}
        </button>
      </form>

      {error ? <p className="error-text">{error}</p> : null}
      {refreshing ? <p>{t("목록 갱신 중...", "Refreshing list...")}</p> : null}

      <table className="data-table">
        <thead>
          <tr>
            <th>{t("파일명", "Name")}</th>
            <th>MIME</th>
            <th>{t("크기", "Size")}</th>
            <th>{t("해시", "Checksum")}</th>
            <th>{t("업로더", "Uploader")}</th>
            <th>{t("생성일", "Created")}</th>
            <th>{t("다운로드", "Download")}</th>
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
                  {t("다운로드", "Download")}
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 ? (
            <tr>
              <td colSpan={7}>{t("아직 업로드된 파일이 없습니다.", "No files uploaded yet.")}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
      </section>
    </main>
  );
}
