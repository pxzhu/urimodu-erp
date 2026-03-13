"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../../components/dashboard-nav";
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
      } catch (fetchError) {
        if (fetchError instanceof ApiError) {
          setError(fetchError.message);
        } else {
          setError("Failed to load chart of accounts");
        }
      }
    }

    void run();
  }, [router]);

  return (
    <main className="container">
      <DashboardNav />
      <h1>Chart of Accounts</h1>
      <p>Starter chart of accounts seeded for Korean ERP finance workflows.</p>

      {error ? <p className="error-text">{error}</p> : null}

      <table className="data-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Type</th>
            <th>Posting</th>
            <th>Parent</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.code}</td>
              <td>{row.name}</td>
              <td>{row.type}</td>
              <td>{row.isPosting ? "yes" : "no"}</td>
              <td>{row.parentId ?? "-"}</td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5}>No accounts found.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </main>
  );
}
