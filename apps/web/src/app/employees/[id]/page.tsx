"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { DashboardNav } from "../../../components/dashboard-nav";
import { apiRequest, requireCompanyId } from "../../../lib/api";
import { loadSession } from "../../../lib/auth";

interface EmployeeDetail {
  id: string;
  employeeNumber: string;
  nameKr: string;
  nameEn: string | null;
  workEmail: string | null;
  mobilePhone: string | null;
  nationalIdMasked: string | null;
  hireDate: string;
  terminationDate: string | null;
  employmentType: string;
  employmentStatus: string;
  department?: { id: string; name: string } | null;
  position?: { id: string; name: string } | null;
  jobTitle?: { id: string; name: string } | null;
}

export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const employeeId = params.id;
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);

  useEffect(() => {
    async function run() {
      const session = loadSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const data = await apiRequest<EmployeeDetail>(`/employees/${employeeId}`, {
        token: session.token,
        companyId: requireCompanyId(session)
      });

      setEmployee(data);
    }

    void run();
  }, [employeeId]);

  return (
    <main className="container with-shell">
      <DashboardNav />
      <section className="app-shell-content">
      <h1>Employee Detail</h1>
      {employee ? (
        <>
          <p>
            <strong>{employee.nameKr}</strong> ({employee.employeeNumber})
          </p>
          <p>Status: {employee.employmentStatus}</p>
          <p>Department: {employee.department?.name ?? "-"}</p>
          <p>Position: {employee.position?.name ?? "-"}</p>
          <p>Job Title: {employee.jobTitle?.name ?? "-"}</p>
          <p>Email (masked): {employee.workEmail ?? "-"}</p>
          <p>Phone (masked): {employee.mobilePhone ?? "-"}</p>
          <p>National ID (masked): {employee.nationalIdMasked ?? "-"}</p>
          <p>Hire Date: {employee.hireDate.slice(0, 10)}</p>

          <p>
            <Link href={`/employees/${employee.id}/edit`}>Edit</Link>
          </p>
        </>
      ) : (
        <p>Loading...</p>
      )}
      </section>
    </main>
  );
}
