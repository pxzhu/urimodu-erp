"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { DashboardNav } from "../../../components/dashboard-nav";
import { ApiError, apiRequest, requireCompanyId } from "../../../lib/api";
import { loadSession } from "../../../lib/auth";

interface LegalEntity {
  id: string;
  code: string;
  name: string;
}

interface BusinessSite {
  id: string;
  code: string;
  name: string;
  address: string | null;
}

interface CompanyDetail {
  id: string;
  code: string;
  name: string;
  defaultLocale: string;
  timezone: string;
  legalEntities: LegalEntity[];
  businessSites: BusinessSite[];
}

export default function CompanyDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const companyId = params.id;

  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [legalCode, setLegalCode] = useState("");
  const [legalName, setLegalName] = useState("");
  const [siteCode, setSiteCode] = useState("");
  const [siteName, setSiteName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function fetchCompany() {
    const session = loadSession();
    if (!session) {
      router.push("/login");
      return;
    }

    const data = await apiRequest<CompanyDetail>(`/companies/${companyId}`, {
      token: session.token,
      companyId: requireCompanyId(session)
    });
    setCompany(data);
  }

  useEffect(() => {
    void fetchCompany();
  }, [companyId]);

  async function onCreateLegalEntity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = loadSession();
    if (!session) {
      router.push("/login");
      return;
    }

    setError(null);
    try {
      await apiRequest<LegalEntity>("/legal-entities", {
        method: "POST",
        token: session.token,
        companyId: requireCompanyId(session),
        body: {
          companyId,
          code: legalCode,
          name: legalName
        }
      });

      setLegalCode("");
      setLegalName("");
      await fetchCompany();
    } catch (createError) {
      if (createError instanceof ApiError) {
        setError(createError.message);
      } else {
        setError("Failed to create legal entity");
      }
    }
  }

  async function onCreateBusinessSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = loadSession();
    if (!session) {
      router.push("/login");
      return;
    }

    setError(null);

    try {
      await apiRequest<BusinessSite>("/business-sites", {
        method: "POST",
        token: session.token,
        companyId: requireCompanyId(session),
        body: {
          companyId,
          code: siteCode,
          name: siteName
        }
      });

      setSiteCode("");
      setSiteName("");
      await fetchCompany();
    } catch (createError) {
      if (createError instanceof ApiError) {
        setError(createError.message);
      } else {
        setError("Failed to create business site");
      }
    }
  }

  return (
    <main className="container">
      <DashboardNav />
      <h1>Company Detail</h1>
      {company ? (
        <>
          <p>
            <strong>{company.name}</strong> ({company.code})
          </p>
          <p>
            Locale: {company.defaultLocale} | Timezone: {company.timezone}
          </p>

          <section className="section-grid">
            <form className="form-grid" onSubmit={onCreateLegalEntity}>
              <h2>Add Legal Entity</h2>
              <label htmlFor="legal-code">Code</label>
              <input id="legal-code" value={legalCode} onChange={(event) => setLegalCode(event.target.value)} required />
              <label htmlFor="legal-name">Name</label>
              <input id="legal-name" value={legalName} onChange={(event) => setLegalName(event.target.value)} required />
              <button type="submit">Create</button>
            </form>

            <form className="form-grid" onSubmit={onCreateBusinessSite}>
              <h2>Add Business Site</h2>
              <label htmlFor="site-code">Code</label>
              <input id="site-code" value={siteCode} onChange={(event) => setSiteCode(event.target.value)} required />
              <label htmlFor="site-name">Name</label>
              <input id="site-name" value={siteName} onChange={(event) => setSiteName(event.target.value)} required />
              <button type="submit">Create</button>
            </form>
          </section>

          <h2>Legal Entities</h2>
          <ul>
            {company.legalEntities.map((legalEntity) => (
              <li key={legalEntity.id}>
                {legalEntity.code} - {legalEntity.name}
              </li>
            ))}
          </ul>

          <h2>Business Sites</h2>
          <ul>
            {company.businessSites.map((site) => (
              <li key={site.id}>
                {site.code} - {site.name} {site.address ? `(${site.address})` : ""}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>Loading...</p>
      )}

      {error ? <p className="error-text">{error}</p> : null}
    </main>
  );
}
