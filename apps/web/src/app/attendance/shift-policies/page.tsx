"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../../components/dashboard-nav";
import { ApiError, apiRequest, requireCompanyId } from "../../../lib/api";
import { loadSession, type LoginSession } from "../../../lib/auth";

interface ShiftPolicyItem {
  id: string;
  code: string;
  name: string;
  version: number;
  timezone: string;
  workStartMinutes: number;
  workEndMinutes: number;
  breakMinutes: number;
  graceMinutes: number;
  isDefault: boolean;
}

export default function ShiftPoliciesPage() {
  const router = useRouter();
  const [session, setSession] = useState<LoginSession | null>(null);
  const [policies, setPolicies] = useState<ShiftPolicyItem[]>([]);
  const [createForm, setCreateForm] = useState({
    code: "",
    name: "",
    workStartMinutes: "540",
    workEndMinutes: "1080",
    breakMinutes: "60",
    graceMinutes: "10",
    isDefault: false
  });
  const [updateForm, setUpdateForm] = useState({
    policyId: "",
    name: "",
    workStartMinutes: "",
    workEndMinutes: "",
    breakMinutes: "",
    graceMinutes: "",
    isDefault: false
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const companyId = useMemo(() => (session ? requireCompanyId(session) : ""), [session]);

  async function refresh(activeSession: LoginSession) {
    const data = await apiRequest<ShiftPolicyItem[]>("/attendance/shift-policies", {
      token: activeSession.token,
      companyId: requireCompanyId(activeSession)
    });
    setPolicies(data);

    if (data.length > 0 && !updateForm.policyId) {
      const first = data[0];
      if (first) {
        setUpdateForm((current) => ({
          ...current,
          policyId: first.id
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
      } catch (loadError) {
        if (loadError instanceof ApiError) {
          setError(loadError.message);
        } else {
          setError("Failed to load shift policies");
        }
      }
    }

    void run();
  }, [router]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      return;
    }

    setWorking(true);
    setError(null);
    setSuccess(null);

    try {
      await apiRequest("/attendance/shift-policies", {
        method: "POST",
        token: session.token,
        companyId,
        body: {
          code: createForm.code,
          name: createForm.name,
          workStartMinutes: Number(createForm.workStartMinutes),
          workEndMinutes: Number(createForm.workEndMinutes),
          breakMinutes: Number(createForm.breakMinutes),
          graceMinutes: Number(createForm.graceMinutes),
          isDefault: createForm.isDefault
        }
      });

      setSuccess("Shift policy created.");
      await refresh(session);
    } catch (createError) {
      if (createError instanceof ApiError) {
        setError(createError.message);
      } else {
        setError("Failed to create shift policy");
      }
    } finally {
      setWorking(false);
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !updateForm.policyId) {
      return;
    }

    setWorking(true);
    setError(null);
    setSuccess(null);

    try {
      await apiRequest(`/attendance/shift-policies/${updateForm.policyId}`, {
        method: "PATCH",
        token: session.token,
        companyId,
        body: {
          name: updateForm.name || undefined,
          workStartMinutes: updateForm.workStartMinutes ? Number(updateForm.workStartMinutes) : undefined,
          workEndMinutes: updateForm.workEndMinutes ? Number(updateForm.workEndMinutes) : undefined,
          breakMinutes: updateForm.breakMinutes ? Number(updateForm.breakMinutes) : undefined,
          graceMinutes: updateForm.graceMinutes ? Number(updateForm.graceMinutes) : undefined,
          isDefault: updateForm.isDefault
        }
      });

      setSuccess("New shift policy version created.");
      setUpdateForm((current) => ({
        ...current,
        name: "",
        workStartMinutes: "",
        workEndMinutes: "",
        breakMinutes: "",
        graceMinutes: "",
        isDefault: false
      }));
      await refresh(session);
    } catch (updateError) {
      if (updateError instanceof ApiError) {
        setError(updateError.message);
      } else {
        setError("Failed to update shift policy");
      }
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="container">
      <DashboardNav />
      <h1>Shift Policy Management</h1>
      <p>Create or version shift policies used by attendance normalization.</p>

      <section className="section-grid">
        <form className="form-grid" onSubmit={(event) => void handleCreate(event)}>
          <h3>Create Policy</h3>
          <label>
            Code
            <input
              value={createForm.code}
              onChange={(event) => setCreateForm((current) => ({ ...current, code: event.target.value }))}
              required
            />
          </label>
          <label>
            Name
            <input
              value={createForm.name}
              onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
          </label>
          <label>
            Work start minutes
            <input
              type="number"
              value={createForm.workStartMinutes}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, workStartMinutes: event.target.value }))
              }
              required
            />
          </label>
          <label>
            Work end minutes
            <input
              type="number"
              value={createForm.workEndMinutes}
              onChange={(event) => setCreateForm((current) => ({ ...current, workEndMinutes: event.target.value }))}
              required
            />
          </label>
          <label>
            Break minutes
            <input
              type="number"
              value={createForm.breakMinutes}
              onChange={(event) => setCreateForm((current) => ({ ...current, breakMinutes: event.target.value }))}
              required
            />
          </label>
          <label>
            Grace minutes
            <input
              type="number"
              value={createForm.graceMinutes}
              onChange={(event) => setCreateForm((current) => ({ ...current, graceMinutes: event.target.value }))}
              required
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={createForm.isDefault}
              onChange={(event) => setCreateForm((current) => ({ ...current, isDefault: event.target.checked }))}
            />{" "}
            Set as default
          </label>
          <button type="submit" disabled={working}>
            Create
          </button>
        </form>

        <form className="form-grid" onSubmit={(event) => void handleUpdate(event)}>
          <h3>Create Next Version</h3>
          <label>
            Target policy
            <select
              value={updateForm.policyId}
              onChange={(event) => setUpdateForm((current) => ({ ...current, policyId: event.target.value }))}
            >
              {policies.map((policy) => (
                <option key={policy.id} value={policy.id}>
                  {policy.code} v{policy.version} ({policy.name})
                </option>
              ))}
            </select>
          </label>
          <label>
            Name override
            <input
              value={updateForm.name}
              onChange={(event) => setUpdateForm((current) => ({ ...current, name: event.target.value }))}
            />
          </label>
          <label>
            Work start minutes override
            <input
              type="number"
              value={updateForm.workStartMinutes}
              onChange={(event) =>
                setUpdateForm((current) => ({ ...current, workStartMinutes: event.target.value }))
              }
            />
          </label>
          <label>
            Work end minutes override
            <input
              type="number"
              value={updateForm.workEndMinutes}
              onChange={(event) => setUpdateForm((current) => ({ ...current, workEndMinutes: event.target.value }))}
            />
          </label>
          <label>
            Break minutes override
            <input
              type="number"
              value={updateForm.breakMinutes}
              onChange={(event) => setUpdateForm((current) => ({ ...current, breakMinutes: event.target.value }))}
            />
          </label>
          <label>
            Grace minutes override
            <input
              type="number"
              value={updateForm.graceMinutes}
              onChange={(event) => setUpdateForm((current) => ({ ...current, graceMinutes: event.target.value }))}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={updateForm.isDefault}
              onChange={(event) => setUpdateForm((current) => ({ ...current, isDefault: event.target.checked }))}
            />{" "}
            Set new version as default
          </label>
          <button type="submit" disabled={working || !updateForm.policyId}>
            Create next version
          </button>
        </form>
      </section>

      {error ? <p className="error-text">{error}</p> : null}
      {success ? <p className="success-text">{success}</p> : null}

      <table className="data-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Version</th>
            <th>Work Time</th>
            <th>Break/Grace</th>
            <th>Default</th>
          </tr>
        </thead>
        <tbody>
          {policies.map((policy) => (
            <tr key={policy.id}>
              <td>{policy.code}</td>
              <td>{policy.name}</td>
              <td>{policy.version}</td>
              <td>
                {policy.workStartMinutes} ~ {policy.workEndMinutes}
              </td>
              <td>
                {policy.breakMinutes}/{policy.graceMinutes}
              </td>
              <td>{policy.isDefault ? "yes" : "no"}</td>
            </tr>
          ))}
          {policies.length === 0 ? (
            <tr>
              <td colSpan={6}>No shift policies found.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </main>
  );
}
