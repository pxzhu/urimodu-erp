"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { DashboardNav } from "../../../../components/dashboard-nav";
import { ApiError, apiRequest, requireCompanyId } from "../../../../lib/api";
import { loadSession } from "../../../../lib/auth";

interface NamedEntity {
  id: string;
  name: string;
  code: string;
}

interface EmployeeDetail {
  id: string;
  nameKr: string;
  department?: { id: string; name: string } | null;
  position?: { id: string; name: string } | null;
  jobTitle?: { id: string; name: string } | null;
  employmentStatus: string;
}

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const employeeId = params.id;

  const [departments, setDepartments] = useState<NamedEntity[]>([]);
  const [positions, setPositions] = useState<NamedEntity[]>([]);
  const [jobTitles, setJobTitles] = useState<NamedEntity[]>([]);

  const [nameKr, setNameKr] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [positionId, setPositionId] = useState("");
  const [jobTitleId, setJobTitleId] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("ACTIVE");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      const session = loadSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const companyId = requireCompanyId(session);

      const [employee, departmentList, positionList, jobTitleList] = await Promise.all([
        apiRequest<EmployeeDetail>(`/employees/${employeeId}`, {
          token: session.token,
          companyId
        }),
        apiRequest<NamedEntity[]>(`/departments?companyId=${companyId}`, {
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

      setNameKr(employee.nameKr);
      setDepartmentId(employee.department?.id ?? "");
      setPositionId(employee.position?.id ?? "");
      setJobTitleId(employee.jobTitle?.id ?? "");
      setEmploymentStatus(employee.employmentStatus);

      setDepartments(departmentList);
      setPositions(positionList);
      setJobTitles(jobTitleList);
    }

    void run();
  }, [employeeId]);

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
      await apiRequest(`/employees/${employeeId}`, {
        method: "PATCH",
        token: session.token,
        companyId,
        body: {
          nameKr,
          departmentId: departmentId || null,
          positionId: positionId || null,
          jobTitleId: jobTitleId || null,
          employmentStatus
        }
      });

      router.push(`/employees/${employeeId}`);
    } catch (updateError) {
      if (updateError instanceof ApiError) {
        setError(updateError.message);
      } else {
        setError("Failed to update employee");
      }
    }
  }

  return (
    <main className="container">
      <DashboardNav />
      <h1>Edit Employee</h1>
      <form className="form-grid" onSubmit={onSubmit}>
        <label htmlFor="employee-name">Name (Korean)</label>
        <input id="employee-name" value={nameKr} onChange={(event) => setNameKr(event.target.value)} />

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

        <label htmlFor="employment-status">Employment Status</label>
        <select
          id="employment-status"
          value={employmentStatus}
          onChange={(event) => setEmploymentStatus(event.target.value)}
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="ON_LEAVE">ON_LEAVE</option>
          <option value="TERMINATED">TERMINATED</option>
        </select>

        <button type="submit">Save</button>
      </form>

      {error ? <p className="error-text">{error}</p> : null}
    </main>
  );
}
