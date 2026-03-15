"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../../components/dashboard-nav";
import { ApiError, apiRequest, requireCompanyId } from "../../../lib/api";
import { loadSession } from "../../../lib/auth";

interface NamedEntity {
  id: string;
  name: string;
  code: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface Employee {
  id: string;
}

export default function NewEmployeePage() {
  const router = useRouter();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<NamedEntity[]>([]);
  const [jobTitles, setJobTitles] = useState<NamedEntity[]>([]);

  const [employeeNumber, setEmployeeNumber] = useState("");
  const [nameKr, setNameKr] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [hireDate, setHireDate] = useState(new Date().toISOString().slice(0, 10));
  const [departmentId, setDepartmentId] = useState("");
  const [positionId, setPositionId] = useState("");
  const [jobTitleId, setJobTitleId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLookups() {
      const session = loadSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const companyId = requireCompanyId(session);

      const [departmentList, positionList, titleList] = await Promise.all([
        apiRequest<Department[]>(`/departments?companyId=${companyId}`, {
          token: session.token,
          companyId
        }),
        apiRequest<NamedEntity[]>(`/positions?companyId=${companyId}`, {
          token: session.token,
          companyId
        }),
        apiRequest<NamedEntity[]>(`/job-titles?companyId=${companyId}`, {
          token: session.token,
          companyId
        })
      ]);

      setDepartments(departmentList);
      setPositions(positionList);
      setJobTitles(titleList);
    }

    void loadLookups();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const session = loadSession();
    if (!session) {
      router.push("/login");
      return;
    }

    const companyId = requireCompanyId(session);
    setError(null);

    try {
      const created = await apiRequest<Employee>("/employees", {
        method: "POST",
        token: session.token,
        companyId,
        body: {
          companyId,
          employeeNumber,
          nameKr,
          workEmail: workEmail || undefined,
          hireDate,
          employmentType: "FULL_TIME",
          departmentId: departmentId || undefined,
          positionId: positionId || undefined,
          jobTitleId: jobTitleId || undefined
        }
      });

      router.push(`/employees/${created.id}`);
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.message);
      } else {
        setError("Failed to create employee");
      }
    }
  }

  return (
    <main className="container with-shell">
      <DashboardNav />
      <section className="app-shell-content">
      <h1>Create Employee</h1>

      <form className="form-grid" onSubmit={onSubmit}>
        <label htmlFor="employee-number">Employee Number</label>
        <input
          id="employee-number"
          value={employeeNumber}
          onChange={(event) => setEmployeeNumber(event.target.value)}
          required
        />

        <label htmlFor="employee-name">Name (Korean)</label>
        <input id="employee-name" value={nameKr} onChange={(event) => setNameKr(event.target.value)} required />

        <label htmlFor="employee-email">Work Email</label>
        <input
          id="employee-email"
          value={workEmail}
          type="email"
          onChange={(event) => setWorkEmail(event.target.value)}
        />

        <label htmlFor="hire-date">Hire Date</label>
        <input id="hire-date" type="date" value={hireDate} onChange={(event) => setHireDate(event.target.value)} />

        <label htmlFor="department-id">Department</label>
        <select id="department-id" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
          <option value="">(none)</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.code} - {department.name}
            </option>
          ))}
        </select>

        <label htmlFor="position-id">Position</label>
        <select id="position-id" value={positionId} onChange={(event) => setPositionId(event.target.value)}>
          <option value="">(none)</option>
          {positions.map((position) => (
            <option key={position.id} value={position.id}>
              {position.code} - {position.name}
            </option>
          ))}
        </select>

        <label htmlFor="job-title-id">Job Title</label>
        <select id="job-title-id" value={jobTitleId} onChange={(event) => setJobTitleId(event.target.value)}>
          <option value="">(none)</option>
          {jobTitles.map((title) => (
            <option key={title.id} value={title.id}>
              {title.code} - {title.name}
            </option>
          ))}
        </select>

        <button type="submit">Create Employee</button>
      </form>

      {error ? <p className="error-text">{error}</p> : null}
      </section>
    </main>
  );
}
