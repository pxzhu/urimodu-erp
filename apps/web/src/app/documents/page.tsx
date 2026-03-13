"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../components/dashboard-nav";
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

interface ApprovalStepDraft {
  rowId: string;
  orderNo: number;
  type: ApprovalStepType;
  approverEmployeeId: string;
}

function createStepRow(orderNo: number, approverEmployeeId: string): ApprovalStepDraft {
  return {
    rowId: `${Date.now()}-${Math.random()}`,
    orderNo,
    type: "APPROVE",
    approverEmployeeId
  };
}

function prettyJson(input: unknown): string {
  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return "{}";
  }
}

export default function DocumentsPage() {
  const router = useRouter();
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
  const [contentJsonText, setContentJsonText] = useState(
    prettyJson({
      employeeNumber: "10000003",
      employeeName: "일반직원",
      reason: "사유를 입력하세요"
    })
  );
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<string[]>([]);

  const [versionTitle, setVersionTitle] = useState("");
  const [versionContentJsonText, setVersionContentJsonText] = useState(prettyJson({ reason: "수정 사유" }));
  const [versionAttachmentIds, setVersionAttachmentIds] = useState<string[]>([]);

  const [steps, setSteps] = useState<ApprovalStepDraft[]>([]);
  const [submitInProgress, setSubmitInProgress] = useState(false);
  const [savingInProgress, setSavingInProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const companyId = useMemo(() => (session ? requireCompanyId(session) : ""), [session]);

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
    if (steps.length === 0) {
      setSteps([createStepRow(1, nextEmployees[0]?.id ?? "")]);
    }
  }

  async function loadDocumentDetail(activeSession: LoginSession, documentId: string) {
    const detail = await apiRequest<DocumentDetail>(`/documents/${documentId}`, {
      token: activeSession.token,
      companyId: requireCompanyId(activeSession)
    });
    setSelectedDocument(detail);
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
    setError("Unexpected request error");
  }

  function toggleSelection(current: string[], fileId: string): string[] {
    if (current.includes(fileId)) {
      return current.filter((id) => id !== fileId);
    }
    return [...current, fileId];
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
      const contentJson = JSON.parse(contentJsonText) as Record<string, unknown>;
      const created = await apiRequest<DocumentDetail>("/documents", {
        method: "POST",
        token: session.token,
        companyId,
        body: {
          templateId,
          title: title.trim() || undefined,
          category: category.trim() || undefined,
          contentJson,
          attachmentFileIds: selectedAttachmentIds
        }
      });

      setSelectedDocumentId(created.id);
      setSelectedAttachmentIds([]);
      setTitle("");
      setCategory("");
      await refreshReferences(session);
      await loadDocumentDetail(session, created.id);
      setSuccess("Document created from template.");
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
      const contentJson = JSON.parse(versionContentJsonText) as Record<string, unknown>;
      const updated = await apiRequest<DocumentDetail>(`/documents/${selectedDocumentId}/versions`, {
        method: "POST",
        token: session.token,
        companyId,
        body: {
          title: versionTitle.trim() || undefined,
          contentJson,
          attachmentFileIds: versionAttachmentIds
        }
      });

      setSelectedDocument(updated);
      setVersionAttachmentIds([]);
      setVersionTitle("");
      await refreshReferences(session);
      setSuccess("New document version added.");
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
      const normalizedSteps = [...steps]
        .map((step) => ({
          orderNo: Number(step.orderNo),
          type: step.type,
          approverEmployeeId: step.approverEmployeeId
        }))
        .sort((left, right) => left.orderNo - right.orderNo);

      if (normalizedSteps.some((step) => !step.approverEmployeeId)) {
        throw new Error("Every step requires an approver.");
      }

      await apiRequest(`/approvals/lines`, {
        method: "POST",
        token: session.token,
        companyId,
        body: {
          documentId: selectedDocumentId,
          steps: normalizedSteps
        }
      });

      await loadDocumentDetail(session, selectedDocumentId);
      setSuccess("Approval line configured.");
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
      setSuccess("Approval line submitted.");
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
      const rendered = await apiRequest<{
        pdfFileId: string;
      }>(`/documents/${selectedDocumentId}/render-pdf`, {
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
      setSuccess("PDF rendered and downloaded.");
    } catch (actionError) {
      setFriendlyError(actionError);
    } finally {
      setSubmitInProgress(false);
    }
  }

  return (
    <main className="container">
      <DashboardNav />
      <h1>Documents</h1>
      <p>
        Template-based document flow with JSON + HTML + PDF canonical model. For raw file uploads, use{" "}
        <Link href="/files">Files</Link>.
      </p>

      <section className="section-grid">
        <form className="form-grid" onSubmit={handleCreateDocument}>
          <h2>Create Document</h2>

          <label htmlFor="template-id">Template</label>
          <select id="template-id" value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} ({template.key})
              </option>
            ))}
          </select>

          <label htmlFor="document-title">Title (optional)</label>
          <input id="document-title" value={title} onChange={(event) => setTitle(event.target.value)} />

          <label htmlFor="document-category">Category override (optional)</label>
          <input id="document-category" value={category} onChange={(event) => setCategory(event.target.value)} />

          <label htmlFor="document-content-json">Content JSON</label>
          <textarea
            id="document-content-json"
            rows={8}
            value={contentJsonText}
            onChange={(event) => setContentJsonText(event.target.value)}
          />

          <fieldset>
            <legend>Initial Attachments</legend>
            <div className="checkbox-grid">
              {files.map((file) => (
                <label key={file.id}>
                  <input
                    type="checkbox"
                    checked={selectedAttachmentIds.includes(file.id)}
                    onChange={() =>
                      setSelectedAttachmentIds((current) => toggleSelection(current, file.id))
                    }
                  />
                  {file.originalName}
                </label>
              ))}
              {files.length === 0 ? <span>No uploaded files yet.</span> : null}
            </div>
          </fieldset>

          <button type="submit" disabled={savingInProgress}>
            {savingInProgress ? "Saving..." : "Create Document"}
          </button>
        </form>

        <div className="form-grid">
          <h2>Document List</h2>
          <select
            value={selectedDocumentId}
            onChange={(event) => setSelectedDocumentId(event.target.value)}
            aria-label="Select document"
          >
            <option value="">Select a document</option>
            {documents.map((document) => (
              <option key={document.id} value={document.id}>
                {document.title} ({document.status})
              </option>
            ))}
          </select>

          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Version</th>
                <th>Template</th>
                <th>Approval</th>
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
                  <td colSpan={5}>No documents yet.</td>
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
              <h2>Add Version</h2>
              <p>
                Current status: <strong>{selectedDocument.status}</strong>, version:{" "}
                <strong>v{selectedDocument.currentVersionNo}</strong>
              </p>

              <label htmlFor="version-title">Title update (optional)</label>
              <input
                id="version-title"
                value={versionTitle}
                onChange={(event) => setVersionTitle(event.target.value)}
              />

              <label htmlFor="version-content-json">Version Content JSON</label>
              <textarea
                id="version-content-json"
                rows={8}
                value={versionContentJsonText}
                onChange={(event) => setVersionContentJsonText(event.target.value)}
              />

              <fieldset>
                <legend>Version Attachments</legend>
                <div className="checkbox-grid">
                  {files.map((file) => (
                    <label key={file.id}>
                      <input
                        type="checkbox"
                        checked={versionAttachmentIds.includes(file.id)}
                        onChange={() =>
                          setVersionAttachmentIds((current) => toggleSelection(current, file.id))
                        }
                      />
                      {file.originalName}
                    </label>
                  ))}
                  {files.length === 0 ? <span>No uploaded files yet.</span> : null}
                </div>
              </fieldset>

              <button type="submit" disabled={savingInProgress}>
                {savingInProgress ? "Saving..." : "Add Version"}
              </button>
            </form>

            <form className="form-grid" onSubmit={handleConfigureApprovalLine}>
              <h2>Configure Approval Line</h2>
              {steps.map((step, index) => (
                <div key={step.rowId} className="step-row">
                  <label>
                    Order
                    <input
                      type="number"
                      min={1}
                      value={step.orderNo}
                      onChange={(event) => {
                        const nextOrderNo = Number(event.target.value || 1);
                        setSteps((current) =>
                          current.map((currentStep) =>
                            currentStep.rowId === step.rowId
                              ? { ...currentStep, orderNo: nextOrderNo }
                              : currentStep
                          )
                        );
                      }}
                    />
                  </label>

                  <label>
                    Type
                    <select
                      value={step.type}
                      onChange={(event) => {
                        const nextType = event.target.value as ApprovalStepType;
                        setSteps((current) =>
                          current.map((currentStep) =>
                            currentStep.rowId === step.rowId ? { ...currentStep, type: nextType } : currentStep
                          )
                        );
                      }}
                    >
                      <option value="APPROVE">APPROVE</option>
                      <option value="CONSULT">CONSULT</option>
                      <option value="AGREE">AGREE</option>
                      <option value="CC">CC</option>
                      <option value="RECEIVE">RECEIVE</option>
                    </select>
                  </label>

                  <label>
                    Approver
                    <select
                      value={step.approverEmployeeId}
                      onChange={(event) => {
                        const nextApprover = event.target.value;
                        setSteps((current) =>
                          current.map((currentStep) =>
                            currentStep.rowId === step.rowId
                              ? { ...currentStep, approverEmployeeId: nextApprover }
                              : currentStep
                          )
                        );
                      }}
                    >
                      <option value="">Select employee</option>
                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.employeeNumber} - {employee.nameKr}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setSteps((current) => current.filter((currentStep) => currentStep.rowId !== step.rowId));
                    }}
                    disabled={steps.length === 1}
                  >
                    Remove
                  </button>
                  <span>Step #{index + 1}</span>
                </div>
              ))}

              <div className="inline-actions">
                <button
                  type="button"
                  onClick={() => setSteps((current) => [...current, createStepRow(current.length + 1, "")])}
                >
                  Add Step
                </button>
                <button type="submit" disabled={savingInProgress}>
                  {savingInProgress ? "Saving..." : "Save Approval Line"}
                </button>
              </div>

              <div className="inline-actions">
                <button
                  type="button"
                  onClick={() => void handleSubmitApproval()}
                  disabled={!selectedDocument.approvalLine?.id || submitInProgress}
                >
                  {submitInProgress ? "Submitting..." : "Submit For Approval"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleRenderPdf(selectedDocument.currentVersionNo)}
                  disabled={submitInProgress}
                >
                  Render + Download PDF
                </button>
              </div>
            </form>
          </section>

          <h2>Document Versions</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Version</th>
                <th>Author</th>
                <th>Attachments</th>
                <th>PDF</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {selectedDocument.versions.map((version) => (
                <tr key={version.id}>
                  <td>v{version.versionNo}</td>
                  <td>{version.authoredBy.name}</td>
                  <td>
                    {version.attachments.map((attachment) => attachment.file.originalName).join(", ") || "-"}
                  </td>
                  <td>
                    {version.pdfFile ? (
                      <button
                        type="button"
                        onClick={() => void downloadFile(version.pdfFile!.id, version.pdfFile!.originalName)}
                      >
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

          <h2>Approval Trail</h2>
          {selectedDocument.approvalLine ? (
            <>
              <p>
                Line status: <strong>{selectedDocument.approvalLine.status}</strong>
              </p>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Type</th>
                    <th>Approver</th>
                    <th>Status</th>
                    <th>Comment</th>
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
                    <th>Action</th>
                    <th>Actor</th>
                    <th>Comment</th>
                    <th>At</th>
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
                      <td colSpan={4}>No approval actions yet.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </>
          ) : (
            <p>No approval line configured yet.</p>
          )}
        </>
      ) : null}
    </main>
  );
}
