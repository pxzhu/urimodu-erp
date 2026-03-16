"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../../components/dashboard-nav";
import { useLocaleText } from "../../../components/ui-shell-provider";
import { ApiError, apiRequest, requireCompanyId } from "../../../lib/api";
import { loadSession } from "../../../lib/auth";

interface AccountItem {
  id: string;
  code: string;
  name: string;
  type: string;
  isPosting: boolean;
  parentId: string | null;
}

export default function AccountsPage() {
  const router = useRouter();
  const t = useLocaleText();
  const [rows, setRows] = useState<AccountItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      const session = loadSession();
      if (!session) {
        router.push("/login");
        return;
      }

      try {
        const data = await apiRequest<AccountItem[]>("/finance/accounts?limit=500", {
          token: session.token,
          companyId: requireCompanyId(session)
        });
        setRows(data);
        setError(null);
      } catch (fetchError) {
        if (fetchError instanceof ApiError) {
          setError(fetchError.message);
        } else {
          setError(t("계정과목 목록을 불러오지 못했습니다.", "Failed to load chart of accounts."));
        }
      }
    }

    void run();
  }, [router]);

  return (
    <main className="container with-shell">
      <DashboardNav />
      <section className="app-shell-content">
      <h1>{t("계정과목", "Chart of Accounts")}</h1>
      <p>{t("한국형 ERP 재무 흐름을 위한 기본 계정과목입니다.", "Starter chart of accounts seeded for Korean ERP finance workflows.")}</p>

      {error ? <p className="error-text">{error}</p> : null}

      <table className="data-table">
        <thead>
          <tr>
            <th>{t("코드", "Code")}</th>
            <th>{t("이름", "Name")}</th>
            <th>{t("유형", "Type")}</th>
            <th>{t("전표 가능", "Posting")}</th>
            <th>{t("상위 계정", "Parent")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.code}</td>
              <td>{row.name}</td>
              <td>{row.type}</td>
              <td>{row.isPosting ? t("예", "yes") : t("아니오", "no")}</td>
              <td>{row.parentId ?? "-"}</td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5}>{t("계정과목이 없습니다.", "No accounts found.")}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
      </section>
    </main>
  );
}
