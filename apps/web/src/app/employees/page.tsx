"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../components/dashboard-nav";
import { apiRequest, requireCompanyId } from "../../lib/api";
import { loadSession } from "../../lib/auth";

interface EmployeeItem {
  id: string;
  employeeNumber: string;
  nameKr: string;
  workEmail: string | null;
  mobilePhone: string | null;
  employmentStatus: string;
  department?: { id: string; name: string } | null;
  position?: { id: string; name: string } | null;
  jobTitle?: { id: string; name: string } | null;
}

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);

  useEffect(() => {
    async function run() {
      const session = loadSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const companyId = requireCompanyId(session);
      const data = await apiRequest<EmployeeItem[]>(`/employees?companyId=${companyId}`, {
        token: session.token,
        companyId
      });

      setEmployees(data);
    }

    void run();
  }, []);

  return (
    <main className="container">
      <DashboardNav />
      <h1>Employees</h1>
      <p>
        Employee number-based master data with separated department, position, and job title.
      </p>

      <p>
        <Link href="/employees/new">Create New Employee</Link>
      </p>

      <table className="data-table">
        <thead>
          <tr>
            <th>No.</th>
            <th>Name</th>
            <th>Department</th>
            <th>Position</th>
            <th>Title</th>
            <th>Email (masked)</th>
            <th>Status</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => (
            <tr key={employee.id}>
              <td>{employee.employeeNumber}</td>
              <td>{employee.nameKr}</td>
              <td>{employee.department?.name ?? "-"}</td>
              <td>{employee.position?.name ?? "-"}</td>
              <td>{employee.jobTitle?.name ?? "-"}</td>
              <td>{employee.workEmail ?? "-"}</td>
              <td>{employee.employmentStatus}</td>
              <td>
                <Link href={`/employees/${employee.id}`}>Open</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
