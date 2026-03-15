"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../components/dashboard-nav";
import { ApiError, apiRequest, requireCompanyId } from "../../lib/api";
import { loadSession } from "../../lib/auth";

interface Company {
  id: string;
  code: string;
  name: string;
  defaultLocale: string;
  timezone: string;
}

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function fetchCompanies() {
    const session = loadSession();
    if (!session) {
      router.push("/login");
      return;
    }

    const data = await apiRequest<Company[]>("/companies", {
      token: session.token,
      companyId: requireCompanyId(session)
    });
    setCompanies(data);
  }

  useEffect(() => {
    void fetchCompanies();
  }, []);

  async function onCreateCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const session = loadSession();
    if (!session) {
      router.push("/login");
      return;
    }

    setError(null);

    try {
      await apiRequest<Company>("/companies", {
        method: "POST",
        token: session.token,
        companyId: requireCompanyId(session),
        body: {
          code,
          name
        }
      });

      setCode("");
      setName("");
      await fetchCompanies();
    } catch (createError) {
      if (createError instanceof ApiError) {
        setError(createError.message);
      } else {
        setError("Failed to create company");
      }
    }
  }

  return (
    <main className="container with-shell">
      <DashboardNav />
      <section className="app-shell-content">
      <h1>Companies</h1>
      <p>Company list and detail access for current memberships.</p>

      <form className="form-grid" onSubmit={onCreateCompany}>
        <h2>Create Company</h2>
        <label htmlFor="company-code">Code</label>
        <input id="company-code" value={code} onChange={(event) => setCode(event.target.value)} required />

        <label htmlFor="company-name">Name</label>
        <input id="company-name" value={name} onChange={(event) => setName(event.target.value)} required />

        <button type="submit">Create</button>
      </form>

      {error ? <p className="error-text">{error}</p> : null}

      <table className="data-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Locale</th>
            <th>Timezone</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((company) => (
            <tr key={company.id}>
              <td>{company.code}</td>
              <td>{company.name}</td>
              <td>{company.defaultLocale}</td>
              <td>{company.timezone}</td>
              <td>
                <Link href={`/companies/${company.id}`}>Open</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </section>
    </main>
  );
}
