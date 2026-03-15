"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../components/dashboard-nav";
import { KeyValueTableEditor, type KeyValueRow } from "../../components/key-value-table-editor";
import { SearchableEmployeeSelector } from "../../components/searchable-employee-selector";
import { useLocaleText, useUiShell } from "../../components/ui-shell-provider";
import { ApiError, apiRequest, requireCompanyId } from "../../lib/api";
import { loadSession, type LoginSession } from "../../lib/auth";

type ApprovalStepType = "APPROVE" | "CONSULT" | "AGREE" | "CC" | "RECEIVE";

interface FileItem {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: string | number;
  createdAt: string;
}

interface DocumentTemplateItem {
  id: string;
  key: string;
  name: string;
  category: string;
  version: number;
  schemaJson: unknown;
}

interface EmployeeItem {
  id: string;
  employeeNumber: string;
  nameKr: string;
}

interface DocumentListItem {
  id: string;
  title: string;
  category: string | null;
  status: string;
  currentVersionNo: number;
  updatedAt: string;
  template?: {
    id: string;
    name: string;
  } | null;
  approvalLine?: {
    id: string;
    status: string;
    currentOrder: number | null;
  } | null;
}

interface DocumentDetail {
  id: string;
  title: string;
  category: string | null;
  status: string;
  currentVersionNo: number;
  submittedAt: string | null;
  completedAt: string | null;
  template?: {
    id: string;
    key: string;
    name: string;
  } | null;
  versions: Array<{
    id: string;
    versionNo: number;
    createdAt: string;
    htmlSnapshot: string;
    authoredBy: {
      id: string;
      name: string;
      email: string;
    };
    pdfFile?: {
      id: string;
      originalName: string;
      mimeType: string;
      sizeBytes: string | number;
      createdAt: string;
    } | null;
    attachments: Array<{
      id: string;
      file: {
        id: string;
        originalName: string;
        mimeType: string;
        sizeBytes: string | number;
        createdAt: string;
      };
    }>;
  }>;
  approvalLine?: {
    id: string;
    status: string;
    currentOrder: number | null;
    submittedAt: string | null;
    completedAt: string | null;
    steps: Array<{
      id: string;
      orderNo: number;
      type: ApprovalStepType;
      status: string;
      comment: string | null;
      approverEmployeeId: string;
      approverEmployee: {
        id: string;
        employeeNumber: string;
        nameKr: string;
      };
    }>;
    actions: Array<{
      id: string;
      actionType: string;
      comment: string | null;
      createdAt: string;
      actor: {
        id: string;
        name: string;
        email: string;
      };
    }>;
  } | null;
}

function toggleSelection(current: string[], fileId: string): string[] {
  if (current.includes(fileId)) {
    return current.filter((id) => id !== fileId);
  }
  return [...current, fileId];
}

function rowsToContent(rows: KeyValueRow[]): Record<string, string> {
  return rows.reduce<Record<string, string>>((accumulator, row) => {
    const key = row.key.trim();
    if (!key) {
      return accumulator;
    }

    accumulator[key] = row.value.trim();
    return accumulator;
  }, {});
}

function readTemplateFields(template: DocumentTemplateItem | undefined): string[] {
  if (!template || typeof template.schemaJson !== "object" || !template.schemaJson) {
    return ["employeeNumber", "employeeName", "reason"];
  }

  const maybeFields = (template.schemaJson as { fields?: unknown }).fields;
  if (!Array.isArray(maybeFields)) {
    return ["employeeNumber", "employeeName", "reason"];
  }

  const normalized = maybeFields.filter((field): field is string => typeof field === "string" && field.length > 0);
  return normalized.length > 0 ? normalized : ["employeeNumber", "employeeName", "reason"];
}

function createRowsFromFields(fields: string[], previousRows: KeyValueRow[] = []): KeyValueRow[] {
  return fields.map((field) => ({
    key: field,
    value: previousRows.find((row) => row.key === field)?.value ?? ""
  }));
}

export default function DocumentsPage() {
  const router = useRouter();
  const t = useLocaleText();
  const { isAdminView } = useUiShell();

  const [session, setSession] = useState<LoginSession | null>(null);
  const [templates, setTemplates] = useState<DocumentTemplateItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const [selectedDocument, setSelectedDocument] = useState<DocumentDetail | null>(null);

  const [templateId, setTemplateId] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [contentRows, setContentRows] = useState<KeyValueRow[]>([]);
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<string[]>([]);

  const [versionTitle, setVersionTitle] = useState("");
  const [versionRows, setVersionRows] = useState<KeyValueRow[]>([]);
  const [versionAttachmentIds, setVersionAttachmentIds] = useState<string[]>([]);
  const [approverEmployeeIds, setApproverEmployeeIds] = useState<string[]>([]);

  const [submitInProgress, setSubmitInProgress] = useState(false);
  const [savingInProgress, setSavingInProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const companyId = useMemo(() => (session ? requireCompanyId(session) : ""), [session]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === templateId),
    [templates, templateId]
  );

  useEffect(() => {
    const fields = readTemplateFields(selectedTemplate);
    setContentRows((current) => createRowsFromFields(fields, current));
    setVersionRows((current) => createRowsFromFields(fields, current));
  }, [selectedTemplate]);

  async function refreshReferences(activeSession: LoginSession) {
    const activeCompanyId = requireCompanyId(activeSession);
    const [nextTemplates, nextDocuments, nextEmployees, nextFiles] = await Promise.all([
      apiRequest<DocumentTemplateItem[]>("/document-templates", {
        token: activeSession.token,
        companyId: activeCompanyId
      }),
      apiRequest<DocumentListItem[]>("/documents", {
        token: activeSession.token,
        companyId: activeCompanyId
      }),
      apiRequest<EmployeeItem[]>(`/employees?companyId=${activeCompanyId}`, {
        token: activeSession.token,
        companyId: activeCompanyId
      }),
      apiRequest<FileItem[]>("/files", {
        token: activeSession.token,
        companyId: activeCompanyId
      })
    ]);

    setTemplates(nextTemplates);
    setDocuments(nextDocuments);
    setEmployees(nextEmployees);
    setFiles(nextFiles);

    if (!templateId && nextTemplates[0]?.id) {
      setTemplateId(nextTemplates[0].id);
    }
    if (!selectedDocumentId && nextDocuments[0]?.id) {
      setSelectedDocumentId(nextDocuments[0].id);
    }
  }

  async function loadDocumentDetail(activeSession: LoginSession, documentId: string) {
    const detail = await apiRequest<DocumentDetail>(`/documents/${documentId}`, {
      token: activeSession.token,
      companyId: requireCompanyId(activeSession)
    });
    setSelectedDocument(detail);

    if (detail.approvalLine?.steps.length) {
      setApproverEmployeeIds(detail.approvalLine.steps.map((step) => step.approverEmployeeId));
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
      await refreshReferences(loaded);
    }

    void run();
  }, [router]);

  useEffect(() => {
    async function run() {
      if (!session || !selectedDocumentId) {
        setSelectedDocument(null);
        return;
      }
      await loadDocumentDetail(session, selectedDocumentId);
    }

    void run();
  }, [session, selectedDocumentId]);

  function setFriendlyError(actionError: unknown) {
    if (actionError instanceof ApiError) {
      setError(actionError.message);
      return;
    }
    if (actionError instanceof Error) {
      setError(actionError.message);
      return;
    }
    setError(t("요청 처리 중 오류가 발생했습니다.", "Unexpected request error."));
  }

  async function handleCreateDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !templateId) {
      return;
    }

    setSavingInProgress(true);
    setError(null);
    setSuccess(null);

    try {
      const created = await apiRequest<DocumentDetail>("/documents", {
        method: "POST",
        token: session.token,
        companyId,
        body: {
          templateId,
          title: title.trim() || undefined,
          category: category.trim() || undefined,
          contentJson: rowsToContent(contentRows),
          attachmentFileIds: selectedAttachmentIds
        }
      });

      setSelectedDocumentId(created.id);
      setSelectedAttachmentIds([]);
      setTitle("");
      setCategory("");
      await refreshReferences(session);
      await loadDocumentDetail(session, created.id);
      setSuccess(t("템플릿 기반 문서를 생성했습니다.", "Document created from template."));
    } catch (actionError) {
      setFriendlyError(actionError);
    } finally {
      setSavingInProgress(false);
    }
  }

  async function handleAddVersion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !selectedDocumentId) {
      return;
    }

    setSavingInProgress(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await apiRequest<DocumentDetail>(`/documents/${selectedDocumentId}/versions`, {
        method: "POST",
        token: session.token,
        companyId,
        body: {
          title: versionTitle.trim() || undefined,
          contentJson: rowsToContent(versionRows),
          attachmentFileIds: versionAttachmentIds
        }
      });

      setSelectedDocument(updated);
      setVersionAttachmentIds([]);
      setVersionTitle("");
      await refreshReferences(session);
      setSuccess(t("문서 버전을 추가했습니다.", "New document version added."));
    } catch (actionError) {
      setFriendlyError(actionError);
    } finally {
      setSavingInProgress(false);
    }
  }

  async function handleConfigureApprovalLine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !selectedDocumentId) {
      return;
    }

    setSavingInProgress(true);
    setError(null);
    setSuccess(null);

    try {
      if (approverEmployeeIds.length === 0) {
        throw new Error(t("결재자를 최소 1명 선택해주세요.", "Select at least one approver."));
      }

      await apiRequest(`/approvals/lines`, {
        method: "POST",
        token: session.token,
        companyId,
        body: {
          documentId: selectedDocumentId,
          steps: approverEmployeeIds.map((approverEmployeeId, index) => ({
            orderNo: index + 1,
            type: "APPROVE",
            approverEmployeeId
          }))
        }
      });

      await loadDocumentDetail(session, selectedDocumentId);
      setSuccess(t("결재선을 저장했습니다.", "Approval line configured."));
    } catch (actionError) {
      setFriendlyError(actionError);
    } finally {
      setSavingInProgress(false);
    }
  }

  async function handleSubmitApproval() {
    if (!session || !selectedDocument?.approvalLine?.id) {
      return;
    }

    setSubmitInProgress(true);
    setError(null);
    setSuccess(null);
    try {
      await apiRequest(`/approvals/lines/${selectedDocument.approvalLine.id}/submit`, {
        method: "POST",
        token: session.token,
        companyId
      });
      await loadDocumentDetail(session, selectedDocument.id);
      await refreshReferences(session);
      setSuccess(t("결재 요청을 상신했습니다.", "Approval line submitted."));
    } catch (actionError) {
      setFriendlyError(actionError);
    } finally {
      setSubmitInProgress(false);
    }
  }

  async function downloadFile(fileId: string, fileName: string) {
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

  async function handleRenderPdf(versionNo?: number) {
    if (!session || !selectedDocumentId) {
      return;
    }

    setSubmitInProgress(true);
    setError(null);
    setSuccess(null);
    try {
      const rendered = await apiRequest<{ pdfFileId: string }>(`/documents/${selectedDocumentId}/render-pdf`, {
        method: "POST",
        token: session.token,
        companyId,
        body: {
          versionNo
        }
      });
      await loadDocumentDetail(session, selectedDocumentId);
      await refreshReferences(session);
      await downloadFile(rendered.pdfFileId, `${selectedDocument?.title ?? "document"}.pdf`);
      setSuccess(t("PDF를 생성하고 다운로드했습니다.", "PDF rendered and downloaded."));
    } catch (actionError) {
      setFriendlyError(actionError);
    } finally {
      setSubmitInProgress(false);
    }
  }

  return (
    <main className="container with-shell">
      <DashboardNav />
      <section className="app-shell-content">
      <h1>{t("문서/결재", "Documents")}</h1>
      <p>
        {t(
          "JSON 직접 입력 대신 템플릿 필드 표 입력으로 문서를 작성하고 결재선을 설정하세요.",
          "Create documents using template field tables (without direct JSON editing) and configure approval lines."
        )}{" "}
        <Link href="/files">{t("첨부 파일은 파일함에서 먼저 업로드", "Upload attachments in Files first")}</Link>
      </p>

      {!isAdminView ? (
        <p className="role-note">
          {t("사용자 권한에서도 문서 작성/상신은 가능하지만 템플릿 운영 권한은 제한될 수 있습니다.", "User role can draft/submit documents, but template administration may be restricted.")}
        </p>
      ) : null}

      <section className="section-grid">
        <form className="form-grid" onSubmit={handleCreateDocument}>
          <h2>{t("문서 작성", "Create Document")}</h2>

          <label htmlFor="template-id">{t("템플릿", "Template")}</label>
          <select id="template-id" value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} ({template.key})
              </option>
            ))}
          </select>

          <label htmlFor="document-title">{t("제목 (선택)", "Title (optional)")}</label>
          <input id="document-title" value={title} onChange={(event) => setTitle(event.target.value)} />

          <label htmlFor="document-category">{t("카테고리 재정의 (선택)", "Category override (optional)")}</label>
          <input id="document-category" value={category} onChange={(event) => setCategory(event.target.value)} />

          <fieldset>
            <legend>{t("문서 입력 항목", "Document input fields")}</legend>
            <KeyValueTableEditor rows={contentRows} onChange={setContentRows} keyReadOnly hideRemove />
          </fieldset>

          <fieldset>
            <legend>{t("초기 첨부파일", "Initial Attachments")}</legend>
            <div className="checkbox-grid">
              {files.map((file) => (
                <label key={file.id}>
                  <input
                    type="checkbox"
                    checked={selectedAttachmentIds.includes(file.id)}
                    onChange={() => setSelectedAttachmentIds((current) => toggleSelection(current, file.id))}
                  />
                  {file.originalName}
                </label>
              ))}
              {files.length === 0 ? <span>{t("업로드된 파일이 없습니다.", "No uploaded files yet.")}</span> : null}
            </div>
          </fieldset>

          <button type="submit" disabled={savingInProgress}>
            {savingInProgress ? t("저장 중...", "Saving...") : t("문서 생성", "Create Document")}
          </button>
        </form>

        <div className="form-grid">
          <h2>{t("문서 목록", "Document List")}</h2>
          <select
            value={selectedDocumentId}
            onChange={(event) => setSelectedDocumentId(event.target.value)}
            aria-label="Select document"
          >
            <option value="">{t("문서를 선택하세요", "Select a document")}</option>
            {documents.map((document) => (
              <option key={document.id} value={document.id}>
                {document.title} ({document.status})
              </option>
            ))}
          </select>

          <table className="data-table">
            <thead>
              <tr>
                <th>{t("제목", "Title")}</th>
                <th>{t("상태", "Status")}</th>
                <th>{t("버전", "Version")}</th>
                <th>{t("템플릿", "Template")}</th>
                <th>{t("결재", "Approval")}</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id}>
                  <td>{document.title}</td>
                  <td>{document.status}</td>
                  <td>v{document.currentVersionNo}</td>
                  <td>{document.template?.name ?? "-"}</td>
                  <td>{document.approvalLine?.status ?? "-"}</td>
                </tr>
              ))}
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={5}>{t("문서가 없습니다.", "No documents yet.")}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {error ? <p className="error-text">{error}</p> : null}
      {success ? <p className="success-text">{success}</p> : null}

      {selectedDocument ? (
        <>
          <section className="section-grid">
            <form className="form-grid" onSubmit={handleAddVersion}>
              <h2>{t("버전 추가", "Add Version")}</h2>
              <p>
                {t("현재 상태", "Current status")}: <strong>{selectedDocument.status}</strong>, {t("버전", "version")}: <strong>v{selectedDocument.currentVersionNo}</strong>
              </p>

              <label htmlFor="version-title">{t("제목 수정 (선택)", "Title update (optional)")}</label>
              <input id="version-title" value={versionTitle} onChange={(event) => setVersionTitle(event.target.value)} />

              <fieldset>
                <legend>{t("버전 입력 항목", "Version input fields")}</legend>
                <KeyValueTableEditor rows={versionRows} onChange={setVersionRows} keyReadOnly hideRemove />
              </fieldset>

              <fieldset>
                <legend>{t("버전 첨부파일", "Version Attachments")}</legend>
                <div className="checkbox-grid">
                  {files.map((file) => (
                    <label key={file.id}>
                      <input
                        type="checkbox"
                        checked={versionAttachmentIds.includes(file.id)}
                        onChange={() => setVersionAttachmentIds((current) => toggleSelection(current, file.id))}
                      />
                      {file.originalName}
                    </label>
                  ))}
                  {files.length === 0 ? <span>{t("업로드된 파일이 없습니다.", "No uploaded files yet.")}</span> : null}
                </div>
              </fieldset>

              <button type="submit" disabled={savingInProgress}>
                {savingInProgress ? t("저장 중...", "Saving...") : t("버전 추가", "Add Version")}
              </button>
            </form>

            <form className="form-grid" onSubmit={handleConfigureApprovalLine}>
              <h2>{t("결재선 설정", "Configure Approval Line")}</h2>
              <SearchableEmployeeSelector
                employees={employees}
                selectedEmployeeIds={approverEmployeeIds}
                onChange={setApproverEmployeeIds}
                label={t("결재자 선택 (순서는 선택 순서 기준)", "Select approvers (order follows selection)")}
                placeholder={t("홍길동처럼 이름 일부로 검색", "Type part of a name")}
              />

              <div className="inline-actions">
                <button type="submit" disabled={savingInProgress}>
                  {savingInProgress ? t("저장 중...", "Saving...") : t("결재선 저장", "Save Approval Line")}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmitApproval()}
                  disabled={!selectedDocument.approvalLine?.id || submitInProgress}
                >
                  {submitInProgress ? t("상신 중...", "Submitting...") : t("결재 상신", "Submit For Approval")}
                </button>
                <button
                  type="button"
                  onClick={() => void handleRenderPdf(selectedDocument.currentVersionNo)}
                  disabled={submitInProgress}
                >
                  {t("PDF 생성/다운로드", "Render + Download PDF")}
                </button>
              </div>
            </form>
          </section>

          <h2>{t("문서 버전", "Document Versions")}</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("버전", "Version")}</th>
                <th>{t("작성자", "Author")}</th>
                <th>{t("첨부파일", "Attachments")}</th>
                <th>PDF</th>
                <th>{t("생성일", "Created")}</th>
              </tr>
            </thead>
            <tbody>
              {selectedDocument.versions.map((version) => (
                <tr key={version.id}>
                  <td>v{version.versionNo}</td>
                  <td>{version.authoredBy.name}</td>
                  <td>{version.attachments.map((attachment) => attachment.file.originalName).join(", ") || "-"}</td>
                  <td>
                    {version.pdfFile ? (
                      <button type="button" onClick={() => void downloadFile(version.pdfFile!.id, version.pdfFile!.originalName)}>
                        {version.pdfFile.originalName}
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>{new Date(version.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>{t("결재 이력", "Approval Trail")}</h2>
          {selectedDocument.approvalLine ? (
            <>
              <p>
                {t("결재선 상태", "Line status")}: <strong>{selectedDocument.approvalLine.status}</strong>
              </p>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("순서", "Order")}</th>
                    <th>{t("유형", "Type")}</th>
                    <th>{t("결재자", "Approver")}</th>
                    <th>{t("상태", "Status")}</th>
                    <th>{t("코멘트", "Comment")}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDocument.approvalLine.steps.map((step) => (
                    <tr key={step.id}>
                      <td>{step.orderNo}</td>
                      <td>{step.type}</td>
                      <td>
                        {step.approverEmployee.employeeNumber} {step.approverEmployee.nameKr}
                      </td>
                      <td>{step.status}</td>
                      <td>{step.comment ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("액션", "Action")}</th>
                    <th>{t("실행자", "Actor")}</th>
                    <th>{t("코멘트", "Comment")}</th>
                    <th>{t("시각", "At")}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDocument.approvalLine.actions.map((action) => (
                    <tr key={action.id}>
                      <td>{action.actionType}</td>
                      <td>{action.actor.name}</td>
                      <td>{action.comment ?? "-"}</td>
                      <td>{new Date(action.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                  {selectedDocument.approvalLine.actions.length === 0 ? (
                    <tr>
                      <td colSpan={4}>{t("아직 결재 액션이 없습니다.", "No approval actions yet.")}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </>
          ) : (
            <p>{t("아직 결재선이 설정되지 않았습니다.", "No approval line configured yet.")}</p>
          )}
        </>
      ) : null}
      </section>
    </main>
  );
}
