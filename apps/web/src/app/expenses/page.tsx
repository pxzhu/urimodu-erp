"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../components/dashboard-nav";
import { ApiError, apiRequest, requireCompanyId } from "../../lib/api";
import { loadSession, type LoginSession } from "../../lib/auth";

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
  const [session, setSession] = useState<LoginSession | null>(null);
  const [claims, setClaims] = useState<ExpenseClaimListItem[]>([]);
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenterItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);

  const [form, setForm] = useState({
    title: "",
    currency: "KRW",
    costCenterId: "",
    projectId: "",
    items: [{ ...DEFAULT_ITEM }]
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const companyId = useMemo(() => (session ? requireCompanyId(session) : ""), [session]);

  async function refresh(activeSession: LoginSession) {
    const [claimData, vendorData, costCenterData, projectData] = await Promise.all([
      apiRequest<ExpenseClaimListItem[]>("/expenses/claims?limit=100", {
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

    setClaims(claimData);
    setVendors(vendorData);
    setCostCenters(costCenterData);
    setProjects(projectData);
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
          setError("Failed to load expense data");
        }
      }
    }

    void run();
  }, [router]);

  function updateItem(index: number, key: keyof ExpenseItemForm, value: string) {
    setForm((current) => {
      const nextItems = current.items.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        return {
          ...item,
          [key]: value
        };
      });

      return {
        ...current,
        items: nextItems
      };
    });
  }

  function addItem() {
    setForm((current) => ({
      ...current,
      items: [...current.items, { ...DEFAULT_ITEM }]
    }));
  }

  function removeItem(index: number) {
    setForm((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index)
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

      setSuccess("Expense claim created.");
      setForm({
        title: "",
        currency: "KRW",
        costCenterId: "",
        projectId: "",
        items: [{ ...DEFAULT_ITEM }]
      });
      await refresh(session);
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.message);
      } else {
        setError("Failed to create expense claim");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container">
      <DashboardNav />
      <h1>Expense Claims</h1>
      <p>Create expense claims and link evidence files via existing FileObject IDs.</p>

      <form className="form-grid" onSubmit={(event) => void handleSubmit(event)}>
        <label>
          Title
          <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
        </label>

        <label>
          Currency
          <input
            value={form.currency}
            onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))}
            maxLength={3}
            required
          />
        </label>

        <label>
          Cost center
          <select
            value={form.costCenterId}
            onChange={(event) => setForm((current) => ({ ...current, costCenterId: event.target.value }))}
          >
            <option value="">(none)</option>
            {costCenters.map((costCenter) => (
              <option key={costCenter.id} value={costCenter.id}>
                {costCenter.code} - {costCenter.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Project
          <select value={form.projectId} onChange={(event) => setForm((current) => ({ ...current, projectId: event.target.value }))}>
            <option value="">(none)</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} - {project.name}
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend>Expense items</legend>
          {form.items.map((item, index) => (
            <div key={`item-${index}`} className="step-row">
              <label>
                Date
                <input
                  type="date"
                  value={item.incurredOn}
                  onChange={(event) => updateItem(index, "incurredOn", event.target.value)}
                  required
                />
              </label>

              <label>
                Category
                <input
                  value={item.category}
                  onChange={(event) => updateItem(index, "category", event.target.value)}
                  required
                />
              </label>

              <label>
                Vendor
                <select value={item.vendorId} onChange={(event) => updateItem(index, "vendorId", event.target.value)}>
                  <option value="">(none)</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.code} - {vendor.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Amount
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.amount}
                  onChange={(event) => updateItem(index, "amount", event.target.value)}
                  required
                />
              </label>

              <label>
                VAT
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.vatAmount}
                  onChange={(event) => updateItem(index, "vatAmount", event.target.value)}
                />
              </label>

              <label>
                Receipt FileObject ID
                <input
                  value={item.receiptFileId}
                  onChange={(event) => updateItem(index, "receiptFileId", event.target.value)}
                  placeholder="file_xxx"
                />
              </label>

              <label>
                Description
                <input value={item.description} onChange={(event) => updateItem(index, "description", event.target.value)} />
              </label>

              <div className="inline-actions">
                <button type="button" onClick={() => removeItem(index)} disabled={form.items.length === 1}>
                  Remove item
                </button>
              </div>
            </div>
          ))}

          <div className="inline-actions">
            <button type="button" onClick={addItem}>
              Add item
            </button>
          </div>
        </fieldset>

        <button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create expense claim"}
        </button>
      </form>

      {error ? <p className="error-text">{error}</p> : null}
      {success ? <p className="success-text">{success}</p> : null}

      <table className="data-table">
        <thead>
          <tr>
            <th>Claim</th>
            <th>Employee</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Cost Center / Project</th>
            <th>Items</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {claims.map((claim) => (
            <tr key={claim.id}>
              <td>
                <Link href={`/expenses/${claim.id}`}>{claim.title}</Link>
                <div>
                  <code>{claim.id}</code>
                </div>
              </td>
              <td>
                {claim.employee.employeeNumber} {claim.employee.nameKr}
              </td>
              <td>
                {claim.totalAmount} {claim.currency}
              </td>
              <td>{claim.status}</td>
              <td>
                {claim.costCenter ? `${claim.costCenter.code}` : "-"} / {claim.project ? `${claim.project.code}` : "-"}
              </td>
              <td>{claim._count.items}</td>
              <td>{new Date(claim.createdAt).toLocaleString()}</td>
            </tr>
          ))}
          {claims.length === 0 ? (
            <tr>
              <td colSpan={7}>No expense claims yet.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </main>
  );
}
