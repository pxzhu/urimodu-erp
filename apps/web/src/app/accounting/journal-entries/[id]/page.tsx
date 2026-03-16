"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { DashboardNav } from "../../../../components/dashboard-nav";
import { useLocaleText } from "../../../../components/ui-shell-provider";
import { ApiError, apiRequest, requireCompanyId } from "../../../../lib/api";
import { loadSession } from "../../../../lib/auth";
import { translateStatus } from "../../../../lib/status-label";

interface JournalEntryDetail {
  id: string;
  number: string;
  entryDate: string;
  description: string | null;
  status: string;
  totalDebit: string;
  totalCredit: string;
  createdBy: {
    name: string;
    email: string;
  };
  lines: Array<{
    id: string;
    lineNo: number;
    description: string | null;
    debit: string;
    credit: string;
    account: {
      code: string;
      name: string;
      type: string;
    };
    vendor: {
      code: string;
      name: string;
    } | null;
    costCenter: {
      code: string;
      name: string;
    } | null;
    project: {
      code: string;
      name: string;
    } | null;
  }>;
}

export default function JournalEntryDetailPage() {
  const router = useRouter();
  const t = useLocaleText();
  const params = useParams<{ id: string }>();
  const journalEntryId = params.id;
  const [entry, setEntry] = useState<JournalEntryDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      const session = loadSession();
      if (!session) {
        router.push("/login");
        return;
      }

      try {
        const data = await apiRequest<JournalEntryDetail>(`/finance/journal-entries/${journalEntryId}`, {
          token: session.token,
          companyId: requireCompanyId(session)
        });
        setEntry(data);
      } catch (fetchError) {
        if (fetchError instanceof ApiError) {
          setError(fetchError.message);
        } else {
          setError(t("분개 상세를 불러오지 못했습니다.", "Failed to load journal entry detail"));
        }
      }
    }

    void run();
  }, [journalEntryId, router, t]);

  return (
    <main className="container with-shell">
      <DashboardNav />
      <section className="app-shell-content">
      <h1>{t("분개 상세", "Journal Entry Detail")}</h1>

      {error ? <p className="error-text">{error}</p> : null}

      {entry ? (
        <>
          <p>
            <strong>{entry.number}</strong> (<code>{entry.id}</code>)
          </p>
          <p>
            {t("전표일", "Date")}: {new Date(entry.entryDate).toLocaleDateString()} | {t("상태", "Status")}:{" "}
            {translateStatus(entry.status, t)}
          </p>
          <p>
            {t("생성자", "Created by")}: {entry.createdBy.name} ({entry.createdBy.email})
          </p>
          <p>
            {t("차변 / 대변", "Debit / Credit")}: {entry.totalDebit} / {entry.totalCredit}
          </p>
          <p>{t("설명", "Description")}: {entry.description ?? "-"}</p>

          <table className="data-table">
            <thead>
              <tr>
                <th>{t("번호", "No")}</th>
                <th>{t("계정과목", "Account")}</th>
                <th>{t("차변", "Debit")}</th>
                <th>{t("대변", "Credit")}</th>
                <th>{t("거래처", "Vendor")}</th>
                <th>{t("코스트센터", "Cost Center")}</th>
                <th>{t("프로젝트", "Project")}</th>
                <th>{t("설명", "Description")}</th>
              </tr>
            </thead>
            <tbody>
              {entry.lines.map((line) => (
                <tr key={line.id}>
                  <td>{line.lineNo}</td>
                  <td>
                    {line.account.code} {line.account.name}
                  </td>
                  <td>{line.debit}</td>
                  <td>{line.credit}</td>
                  <td>{line.vendor ? `${line.vendor.code} ${line.vendor.name}` : "-"}</td>
                  <td>{line.costCenter ? `${line.costCenter.code} ${line.costCenter.name}` : "-"}</td>
                  <td>{line.project ? `${line.project.code} ${line.project.name}` : "-"}</td>
                  <td>{line.description ?? "-"}</td>
                </tr>
              ))}
              {entry.lines.length === 0 ? (
                <tr>
                  <td colSpan={8}>{t("라인이 없습니다.", "No lines found.")}</td>
                </tr>
              ) : null}
            </tbody>
          </table>

          <p>
            <Link href="/accounting/journal-entries">{t("분개 목록으로", "Back to journal entries")}</Link>
          </p>
        </>
      ) : (
        <p>{t("로딩 중...", "Loading...")}</p>
      )}
      </section>
    </main>
  );
}
