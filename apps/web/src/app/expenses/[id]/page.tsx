"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { DashboardNav } from "../../../components/dashboard-nav";
import { ApiError, apiRequest, requireCompanyId } from "../../../lib/api";
import { loadSession, type LoginSession } from "../../../lib/auth";

interface ExpenseClaimDetail {
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
  document: {
    id: string;
    title: string;
    status: string;
  } | null;
  items: Array<{
    id: string;
    incurredOn: string;
    category: string;
    description: string | null;
    amount: string;
    vatAmount: string | null;
    vendor: {
      code: string;
      name: string;
    } | null;
    receiptFile: {
      id: string;
      originalName: string;
    } | null;
  }>;
  journalEntries: Array<{
    id: string;
    number: string;
    status: string;
  }>;
}

export default function ExpenseClaimDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const claimId = params.id;
  const [session, setSession] = useState<LoginSession | null>(null);
  const [claim, setClaim] = useState<ExpenseClaimDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      const loaded = loadSession();
      if (!loaded) {
        router.push("/login");
        return;
      }

      setSession(loaded);

      try {
        const data = await apiRequest<ExpenseClaimDetail>(`/expenses/claims/${claimId}`, {
          token: loaded.token,
          companyId: requireCompanyId(loaded)
        });
        setClaim(data);
      } catch (fetchError) {
        if (fetchError instanceof ApiError) {
          setError(fetchError.message);
        } else {
          setError("Failed to load expense claim detail");
        }
      }
    }

    void run();
  }, [claimId, router]);

  async function downloadReceipt(fileId: string, fileName: string) {
    if (!session) {
      return;
    }

    const blob = await apiRequest<Blob>(`/files/${fileId}/download`, {
      token: session.token,
      companyId: requireCompanyId(session),
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

  return (
    <main className="container">
      <DashboardNav />
      <h1>Expense Claim Detail</h1>

      {error ? <p className="error-text">{error}</p> : null}

      {claim ? (
        <>
          <p>
            <strong>{claim.title}</strong> (<code>{claim.id}</code>)
          </p>
          <p>
            Employee: {claim.employee.employeeNumber} {claim.employee.nameKr}
          </p>
          <p>
            Status: {claim.status} | Total: {claim.totalAmount} {claim.currency}
          </p>
          <p>
            Cost Center / Project: {claim.costCenter?.code ?? "-"} / {claim.project?.code ?? "-"}
          </p>
          <p>Created: {new Date(claim.createdAt).toLocaleString()}</p>
          <p>
            Document: {claim.document ? <Link href={`/documents`}>{claim.document.title}</Link> : "-"}
          </p>

          <h2>Items</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Vendor</th>
                <th>Amount</th>
                <th>VAT</th>
                <th>Description</th>
                <th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {claim.items.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.incurredOn).toLocaleDateString()}</td>
                  <td>{item.category}</td>
                  <td>{item.vendor ? `${item.vendor.code} ${item.vendor.name}` : "-"}</td>
                  <td>{item.amount}</td>
                  <td>{item.vatAmount ?? "-"}</td>
                  <td>{item.description ?? "-"}</td>
                  <td>
                    {item.receiptFile ? (
                      <button type="button" onClick={() => void downloadReceipt(item.receiptFile!.id, item.receiptFile!.originalName)}>
                        Download
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
              {claim.items.length === 0 ? (
                <tr>
                  <td colSpan={7}>No items.</td>
                </tr>
              ) : null}
            </tbody>
          </table>

          <h2>Linked Journal Entries</h2>
          <ul>
            {claim.journalEntries.map((entry) => (
              <li key={entry.id}>
                <Link href={`/accounting/journal-entries/${entry.id}`}>{entry.number}</Link> ({entry.status})
              </li>
            ))}
            {claim.journalEntries.length === 0 ? <li>No journal entries linked.</li> : null}
          </ul>

          <p>
            <Link href="/expenses">Back to expense claims</Link>
          </p>
        </>
      ) : (
        <p>Loading...</p>
      )}
    </main>
  );
}
