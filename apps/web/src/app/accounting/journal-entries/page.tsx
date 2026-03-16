"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../../components/dashboard-nav";
import { useLocaleText } from "../../../components/ui-shell-provider";
import { ApiError, apiRequest, requireCompanyId } from "../../../lib/api";
import { loadSession, type LoginSession } from "../../../lib/auth";

interface AccountItem {
  id: string;
  code: string;
  name: string;
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

interface JournalEntryItem {
  id: string;
  number: string;
  entryDate: string;
  description: string | null;
  status: string;
  totalDebit: string;
  totalCredit: string;
  _count: {
    lines: number;
  };
}

interface JournalLineForm {
  accountId: string;
  vendorId: string;
  costCenterId: string;
  projectId: string;
  description: string;
  debit: string;
  credit: string;
}

const JOURNAL_STATUS_LABELS: Record<string, { ko: string; en: string }> = {
  DRAFT: { ko: "초안", en: "Draft" },
  POSTED: { ko: "전기 완료", en: "Posted" },
  CANCELED: { ko: "취소", en: "Canceled" }
};

const DEFAULT_LINE: JournalLineForm = {
  accountId: "",
  vendorId: "",
  costCenterId: "",
  projectId: "",
  description: "",
  debit: "",
  credit: ""
};

export default function JournalEntriesPage() {
  const router = useRouter();
  const t = useLocaleText();
  const [session, setSession] = useState<LoginSession | null>(null);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenterItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [entries, setEntries] = useState<JournalEntryItem[]>([]);

  const [form, setForm] = useState({
    entryDate: new Date().toISOString().slice(0, 10),
    description: "",
    lines: [{ ...DEFAULT_LINE }, { ...DEFAULT_LINE }]
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const companyId = useMemo(() => (session ? requireCompanyId(session) : ""), [session]);

  function translateStatus(value: string): string {
    const normalized = value.toUpperCase();
    const matched = JOURNAL_STATUS_LABELS[normalized];
    if (!matched) {
      return value;
    }
    return t(matched.ko, matched.en);
  }

  async function refresh(activeSession: LoginSession) {
    const [entryData, accountData, vendorData, costCenterData, projectData] = await Promise.all([
      apiRequest<JournalEntryItem[]>("/finance/journal-entries?limit=100", {
        token: activeSession.token,
        companyId: requireCompanyId(activeSession)
      }),
      apiRequest<AccountItem[]>("/finance/accounts?limit=500", {
        token: activeSession.token,
        companyId: requireCompanyId(activeSession)
      }),
      apiRequest<VendorItem[]>("/finance/vendors", {
        token: activeSession.token,
        companyId: requireCompanyId(activeSession)
      }),
      apiRequest<CostCenterItem[]>("/finance/cost-centers", {
        token: activeSession.token,
        companyId: requireCompanyId(activeSession)
      }),
      apiRequest<ProjectItem[]>("/finance/projects", {
        token: activeSession.token,
        companyId: requireCompanyId(activeSession)
      })
    ]);

    setEntries(entryData);
    setAccounts(accountData);
    setVendors(vendorData);
    setCostCenters(costCenterData);
    setProjects(projectData);
    setError(null);

    if (!form.lines[0]?.accountId && accountData.length >= 2) {
      const first = accountData[0];
      const second = accountData[1];
      if (first && second) {
        setForm((current) => ({
          ...current,
          lines: current.lines.map((line, index) => ({
            ...line,
            accountId: index === 0 ? first.id : index === 1 ? second.id : line.accountId
          }))
        }));
      }
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

      try {
        await refresh(loaded);
      } catch (refreshError) {
        if (refreshError instanceof ApiError) {
          setError(refreshError.message);
        } else {
          setError(t("분개 데이터를 불러오지 못했습니다.", "Failed to load journal entry data."));
        }
      }
    }

    void run();
  }, [router]);

  function updateLine(index: number, key: keyof JournalLineForm, value: string) {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => (lineIndex === index ? { ...line, [key]: value } : line))
    }));
  }

  function addLine() {
    setForm((current) => ({
      ...current,
      lines: [...current.lines, { ...DEFAULT_LINE }]
    }));
  }

  function removeLine(index: number) {
    setForm((current) => ({
      ...current,
      lines: current.lines.filter((_, lineIndex) => lineIndex !== index)
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await apiRequest("/finance/journal-entries", {
        method: "POST",
        token: session.token,
        companyId,
        body: {
          entryDate: form.entryDate,
          description: form.description || undefined,
          lines: form.lines.map((line) => ({
            accountId: line.accountId,
            vendorId: line.vendorId || undefined,
            costCenterId: line.costCenterId || undefined,
            projectId: line.projectId || undefined,
            description: line.description || undefined,
            debit: line.debit ? Number(line.debit) : undefined,
            credit: line.credit ? Number(line.credit) : undefined
          }))
        }
      });

      setSuccess(t("분개를 생성했습니다.", "Journal entry created."));
      setForm({
        entryDate: new Date().toISOString().slice(0, 10),
        description: "",
        lines: [{ ...DEFAULT_LINE }, { ...DEFAULT_LINE }]
      });
      await refresh(session);
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.message);
      } else {
        setError(t("분개 생성에 실패했습니다.", "Failed to create journal entry."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container with-shell">
      <DashboardNav />
      <section className="app-shell-content">
      <h1>{t("분개", "Journal Entries")}</h1>
      <p>{t("차변/대변 균형 분개를 생성하고 분개 목록을 검토하세요.", "Create balanced journal entries and review accounting ledger headers.")}</p>

      <form className="form-grid" onSubmit={(event) => void handleSubmit(event)}>
        <label>
          {t("전표일", "Entry date")}
          <input
            type="date"
            value={form.entryDate}
            onChange={(event) => setForm((current) => ({ ...current, entryDate: event.target.value }))}
            required
          />
        </label>

        <label>
          {t("적요", "Description")}
          <input
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />
        </label>

        <fieldset>
          <legend>{t("분개 라인", "Lines")}</legend>
          {form.lines.map((line, index) => (
            <div key={`line-${index}`} className="step-row">
              <label>
                {t("계정", "Account")}
                <select value={line.accountId} onChange={(event) => updateLine(index, "accountId", event.target.value)} required>
                  <option value="">{t("계정을 선택하세요", "Select account")}</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                {t("차변", "Debit")}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.debit}
                  onChange={(event) => updateLine(index, "debit", event.target.value)}
                />
              </label>

              <label>
                {t("대변", "Credit")}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.credit}
                  onChange={(event) => updateLine(index, "credit", event.target.value)}
                />
              </label>

              <label>
                {t("거래처", "Vendor")}
                <select value={line.vendorId} onChange={(event) => updateLine(index, "vendorId", event.target.value)}>
                  <option value="">{t("(없음)", "(none)")}</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.code} - {vendor.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                {t("코스트센터", "Cost center")}
                <select
                  value={line.costCenterId}
                  onChange={(event) => updateLine(index, "costCenterId", event.target.value)}
                >
                  <option value="">{t("(없음)", "(none)")}</option>
                  {costCenters.map((costCenter) => (
                    <option key={costCenter.id} value={costCenter.id}>
                      {costCenter.code} - {costCenter.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                {t("프로젝트", "Project")}
                <select value={line.projectId} onChange={(event) => updateLine(index, "projectId", event.target.value)}>
                  <option value="">{t("(없음)", "(none)")}</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.code} - {project.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                {t("라인 설명", "Description")}
                <input
                  value={line.description}
                  onChange={(event) => updateLine(index, "description", event.target.value)}
                />
              </label>

              <div className="inline-actions">
                <button type="button" onClick={() => removeLine(index)} disabled={form.lines.length <= 2}>
                  {t("라인 삭제", "Remove line")}
                </button>
              </div>
            </div>
          ))}

          <div className="inline-actions">
            <button type="button" onClick={addLine}>
              {t("라인 추가", "Add line")}
            </button>
          </div>
        </fieldset>

        <button type="submit" disabled={submitting}>
          {submitting ? t("생성 중...", "Creating...") : t("분개 생성", "Create journal entry")}
        </button>
      </form>

      {error ? <p className="error-text">{error}</p> : null}
      {success ? <p className="success-text">{success}</p> : null}

      <table className="data-table">
        <thead>
          <tr>
            <th>{t("전표번호", "Number")}</th>
            <th>{t("전표일", "Date")}</th>
            <th>{t("적요", "Description")}</th>
            <th>{t("상태", "Status")}</th>
            <th>{t("차변", "Debit")}</th>
            <th>{t("대변", "Credit")}</th>
            <th>{t("라인 수", "Lines")}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td>
                <Link href={`/accounting/journal-entries/${entry.id}`}>{entry.number}</Link>
              </td>
              <td>{new Date(entry.entryDate).toLocaleDateString()}</td>
              <td>{entry.description ?? "-"}</td>
              <td>{translateStatus(entry.status)}</td>
              <td>{entry.totalDebit}</td>
              <td>{entry.totalCredit}</td>
              <td>{entry._count.lines}</td>
            </tr>
          ))}
          {entries.length === 0 ? (
            <tr>
              <td colSpan={7}>{t("분개가 없습니다.", "No journal entries yet.")}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
      </section>
    </main>
  );
}
