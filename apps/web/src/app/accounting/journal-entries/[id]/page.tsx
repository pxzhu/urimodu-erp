"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { DashboardNav } from "../../../../components/dashboard-nav";
import { ApiError, apiRequest, requireCompanyId } from "../../../../lib/api";
import { loadSession } from "../../../../lib/auth";

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
          setError("Failed to load journal entry detail");
        }
      }
    }

    void run();
  }, [journalEntryId, router]);

  return (
    <main className="container">
      <DashboardNav />
      <h1>Journal Entry Detail</h1>

      {error ? <p className="error-text">{error}</p> : null}

      {entry ? (
        <>
          <p>
            <strong>{entry.number}</strong> (<code>{entry.id}</code>)
          </p>
          <p>
            Date: {new Date(entry.entryDate).toLocaleDateString()} | Status: {entry.status}
          </p>
          <p>
            Created by: {entry.createdBy.name} ({entry.createdBy.email})
          </p>
          <p>
            Debit / Credit: {entry.totalDebit} / {entry.totalCredit}
          </p>
          <p>Description: {entry.description ?? "-"}</p>

          <table className="data-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Account</th>
                <th>Debit</th>
                <th>Credit</th>
                <th>Vendor</th>
                <th>Cost Center</th>
                <th>Project</th>
                <th>Description</th>
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
                  <td colSpan={8}>No lines found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>

          <p>
            <Link href="/accounting/journal-entries">Back to journal entries</Link>
          </p>
        </>
      ) : (
        <p>Loading...</p>
      )}
    </main>
  );
}
