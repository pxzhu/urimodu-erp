"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../components/dashboard-nav";
import { useLocaleText } from "../../components/ui-shell-provider";
import { ApiError, apiRequest, requireCompanyId } from "../../lib/api";
import { loadSession, type LoginSession } from "../../lib/auth";
import { translateStatus } from "../../lib/status-label";
import styles from "./page.module.css";

interface ExpenseClaimListItem {
  id: string;
  title: string;
  status: string;
  currency: string;
  totalAmount: string;
  createdAt: string;
  employee: {
    employeeNumber: string;
    nameKr: string;
  };
  costCenter: {
    code: string;
    name: string;
  } | null;
  project: {
    code: string;
    name: string;
  } | null;
  _count: {
    items: number;
  };
}

interface VendorItem {
  id: string;
  code: string;
  name: string;
}

interface CostCenterItem {
  id: string;
  code: string;
  name: string;
}

interface ProjectItem {
  id: string;
  code: string;
  name: string;
}

interface FileItem {
  id: string;
  originalName: string;
  mimeType: string;
}

interface ExpenseItemForm {
  incurredOn: string;
  category: string;
  description: string;
  vendorId: string;
  amount: string;
  vatAmount: string;
  receiptFileId: string;
}

const DEFAULT_ITEM: ExpenseItemForm = {
  incurredOn: new Date().toISOString().slice(0, 10),
  category: "GENERAL",
  description: "",
  vendorId: "",
  amount: "",
  vatAmount: "",
  receiptFileId: ""
};

export default function ExpensesPage() {
  const router = useRouter();
  const t = useLocaleText();
  const [session, setSession] = useState<LoginSession | null>(null);
  const [claims, setClaims] = useState<ExpenseClaimListItem[]>([]);
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenterItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);

  const [form, setForm] = useState({
    title: "",
    currency: "KRW",
    costCenterId: "",
    projectId: "",
    items: [{ ...DEFAULT_ITEM }]
  });

  const [submitting, setSubmitting] = useState(false);
  const [uploadingItemIndex, setUploadingItemIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const companyId = useMemo(() => (session ? requireCompanyId(session) : ""), [session]);

  async function refresh(activeSession: LoginSession) {
    const activeCompanyId = requireCompanyId(activeSession);
    const [claimData, vendorData, costCenterData, projectData, fileData] = await Promise.all([
      apiRequest<ExpenseClaimListItem[]>("/expenses/claims?limit=100", {
        token: activeSession.token,
        companyId: activeCompanyId
      }),
      apiRequest<VendorItem[]>("/finance/vendors", {
        token: activeSession.token,
        companyId: activeCompanyId
      }),
      apiRequest<CostCenterItem[]>("/finance/cost-centers", {
        token: activeSession.token,
        companyId: activeCompanyId
      }),
      apiRequest<ProjectItem[]>("/finance/projects", {
        token: activeSession.token,
        companyId: activeCompanyId
      }),
      apiRequest<FileItem[]>("/files", {
        token: activeSession.token,
        companyId: activeCompanyId
      })
    ]);

    setClaims(claimData);
    setVendors(vendorData);
    setCostCenters(costCenterData);
    setProjects(projectData);
    setFiles(fileData.filter((file) => file.mimeType.startsWith("image/")));
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
        await refresh(loaded);
      } catch (refreshError) {
        if (refreshError instanceof ApiError) {
          setError(refreshError.message);
        } else {
          setError(t("경비 데이터를 불러오지 못했습니다.", "Failed to load expense data."));
        }
      }
    }

    void run();
  }, [router, t]);

  const metrics = useMemo(() => {
    const draft = claims.filter((claim) => claim.status === "DRAFT").length;
    const inReview = claims.filter((claim) => claim.status === "IN_REVIEW" || claim.status === "PENDING").length;
    const approved = claims.filter((claim) => claim.status === "APPROVED").length;
    const noProject = claims.filter((claim) => !claim.project).length;
    return { draft, inReview, approved, noProject };
  }, [claims]);

  function updateItem(index: number, key: keyof ExpenseItemForm, value: string) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item))
    }));
  }

  function addItem() {
    setForm((current) => ({ ...current, items: [...current.items, { ...DEFAULT_ITEM }] }));
  }

  function removeItem(index: number) {
    setForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }));
  }

  async function uploadReceiptForItem(index: number, file: File) {
    if (!session) return;
    setUploadingItemIndex(index);
    setError(null);

    try {
      const uploadPayload = new FormData();
      uploadPayload.append("file", file);
      uploadPayload.append("metadataJson", JSON.stringify({ category: "expense-receipt", source: "expenses-ui" }));

      const uploaded = await apiRequest<FileItem>("/files/upload", {
        method: "POST",
        token: session.token,
        companyId,
        body: uploadPayload
      });

      updateItem(index, "receiptFileId", uploaded.id);
      await refresh(session);
      setSuccess(t("영수증 이미지를 업로드했습니다.", "Receipt image uploaded."));
    } catch (uploadError) {
      if (uploadError instanceof ApiError) {
        setError(uploadError.message);
      } else {
        setError(t("영수증 업로드에 실패했습니다.", "Failed to upload receipt."));
      }
    } finally {
      setUploadingItemIndex(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await apiRequest("/expenses/claims", {
        method: "POST",
        token: session.token,
        companyId,
        body: {
          title: form.title,
          currency: form.currency,
          costCenterId: form.costCenterId || undefined,
          projectId: form.projectId || undefined,
          items: form.items.map((item) => ({
            incurredOn: item.incurredOn,
            category: item.category,
            description: item.description || undefined,
            vendorId: item.vendorId || undefined,
            amount: Number(item.amount),
            vatAmount: item.vatAmount ? Number(item.vatAmount) : undefined,
            receiptFileId: item.receiptFileId || undefined
          }))
        }
      });

      setSuccess(t("경비 청구를 생성했습니다.", "Expense claim created."));
      setForm({ title: "", currency: "KRW", costCenterId: "", projectId: "", items: [{ ...DEFAULT_ITEM }] });
      await refresh(session);
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.message);
      } else {
        setError(t("경비 청구 생성에 실패했습니다.", "Failed to create expense claim."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container with-shell">
      <DashboardNav />
      <section className="app-shell-content">
        <h1>{t("경비 청구", "Expense Claims")}</h1>
        <p>
          {t(
            "경비 등록 화면을 상태 흐름과 예외 중심으로 보이도록 재구성했습니다.",
            "The expense screen is reorganized around claim flow and exception handling."
          )}
        </p>

        <section className={styles.metricGrid}>
          <article className={styles.metricCard}><p>{t("작성중", "Draft")}</p><strong>{metrics.draft}</strong><span>{t("제출 전 청구", "Claims before submit")}</span></article>
          <article className={styles.metricCard}><p>{t("승인 대기", "In review")}</p><strong>{metrics.inReview}</strong><span>{t("승인/검토 중", "Waiting for review")}</span></article>
          <article className={styles.metricCard}><p>{t("승인 완료", "Approved")}</p><strong>{metrics.approved}</strong><span>{t("지급/후속 처리 대상", "Ready for payout or posting")}</span></article>
          <article className={styles.metricCard}><p>{t("프로젝트 미지정", "No project")}</p><strong>{metrics.noProject}</strong><span>{t("운영 점검 필요", "Needs review")}</span></article>
        </section>

        <section className={styles.alertGrid}>
          <article className={styles.alertCard}><strong>{t("상태 흐름", "Claim flow")}</strong><span>{t("작성중 → 제출 → 검토/승인 → 지급 흐름을 기준으로 관리하세요.", "Manage claims with a draft → submit → review → payout flow.")}</span></article>
          <article className={styles.alertCard}><strong>{t("증빙 우선", "Evidence first")}</strong><span>{t("영수증이 먼저 첨부될수록 반려 가능성이 줄어듭니다.", "Attaching evidence first reduces the chance of rejection.")}</span></article>
          <article className={styles.alertCard}><strong>{t("분류 정확성", "Classification")}</strong><span>{t("코스트센터/프로젝트를 연결하면 후속 정산이 쉬워집니다.", "Linking cost center and project makes downstream accounting easier.")}</span></article>
        </section>

        <form className={`form-grid ${styles.formSection}`} onSubmit={(event) => void handleSubmit(event)}>
          <label>
            {t("제목", "Title")}
            <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
          </label>

          <label>
            {t("통화", "Currency")}
            <input value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} maxLength={3} required />
          </label>

          <label>
            {t("코스트센터", "Cost center")}
            <select value={form.costCenterId} onChange={(event) => setForm((current) => ({ ...current, costCenterId: event.target.value }))}>
              <option value="">{t("선택 안함", "(none)")}</option>
              {costCenters.map((costCenter) => <option key={costCenter.id} value={costCenter.id}>{costCenter.code} - {costCenter.name}</option>)}
            </select>
          </label>

          <label>
            {t("프로젝트", "Project")}
            <select value={form.projectId} onChange={(event) => setForm((current) => ({ ...current, projectId: event.target.value }))}>
              <option value="">{t("선택 안함", "(none)")}</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.code} - {project.name}</option>)}
            </select>
          </label>

          <fieldset>
            <legend>{t("경비 항목", "Expense items")}</legend>
            {form.items.map((item, index) => (
              <div key={`item-${index}`} className="step-row">
                <label>
                  {t("사용일", "Date")}
                  <input type="date" value={item.incurredOn} onChange={(event) => updateItem(index, "incurredOn", event.target.value)} required />
                </label>
                <label>
                  {t("카테고리", "Category")}
                  <input value={item.category} onChange={(event) => updateItem(index, "category", event.target.value)} required />
                </label>
                <label>
                  {t("거래처", "Vendor")}
                  <select value={item.vendorId} onChange={(event) => updateItem(index, "vendorId", event.target.value)}>
                    <option value="">{t("선택 안함", "(none)")}</option>
                    {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.code} - {vendor.name}</option>)}
                  </select>
                </label>
                <label>
                  {t("금액", "Amount")}
                  <input type="number" min="0" step="0.01" value={item.amount} onChange={(event) => updateItem(index, "amount", event.target.value)} required />
                </label>
                <label>
                  VAT
                  <input type="number" min="0" step="0.01" value={item.vatAmount} onChange={(event) => updateItem(index, "vatAmount", event.target.value)} />
                </label>
                <label>
                  {t("상세 설명", "Description")}
                  <input value={item.description} onChange={(event) => updateItem(index, "description", event.target.value)} />
                </label>
                <label>
                  {t("영수증 이미지 업로드", "Upload receipt image")}
                  <input type="file" accept="image/*" onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadReceiptForItem(index, file);
                    event.currentTarget.value = "";
                  }} />
                </label>
                <label>
                  {t("영수증 선택", "Choose receipt")}
                  <select value={item.receiptFileId} onChange={(event) => updateItem(index, "receiptFileId", event.target.value)}>
                    <option value="">{t("선택 안함", "(none)")}</option>
                    {files.map((file) => <option key={file.id} value={file.id}>{file.originalName}</option>)}
                  </select>
                </label>
                <div className="inline-actions">
                  <button type="button" onClick={() => removeItem(index)} disabled={form.items.length === 1}>{t("항목 삭제", "Remove item")}</button>
                  {uploadingItemIndex === index ? <span>{t("영수증 업로드 중...", "Uploading receipt...")}</span> : null}
                </div>
              </div>
            ))}
            <button type="button" onClick={addItem}>{t("항목 추가", "Add item")}</button>
          </fieldset>

          <button type="submit" disabled={submitting}>{submitting ? t("생성 중...", "Creating...") : t("경비 청구 생성", "Create expense claim")}</button>
        </form>

        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="success-text">{success}</p> : null}

        <section className={styles.listSection}>
          <h2>{t("청구 목록", "Claim list")}</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("제목", "Title")}</th>
                <th>{t("작성자", "Employee")}</th>
                <th>{t("상태", "Status")}</th>
                <th>{t("금액", "Amount")}</th>
                <th>{t("코스트센터", "Cost center")}</th>
                <th>{t("프로젝트", "Project")}</th>
                <th>{t("항목 수", "Items")}</th>
                <th>{t("생성일", "Created")}</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((claim) => (
                <tr key={claim.id}>
                  <td><Link href={`/expenses/${claim.id}`}>{claim.title}</Link></td>
                  <td>{claim.employee.employeeNumber} {claim.employee.nameKr}</td>
                  <td>{translateStatus(claim.status, t)}</td>
                  <td>{claim.totalAmount} {claim.currency}</td>
                  <td>{claim.costCenter ? `${claim.costCenter.code} ${claim.costCenter.name}` : "-"}</td>
                  <td>{claim.project ? `${claim.project.code} ${claim.project.name}` : "-"}</td>
                  <td>{claim._count.items}</td>
                  <td>{new Date(claim.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {claims.length === 0 ? (
                <tr><td colSpan={8}>{t("경비 청구가 없습니다.", "No expense claims yet.")}</td></tr>
              ) : null}
            </tbody>
          </table>
        </section>
      </section>
    </main>
  );
}
