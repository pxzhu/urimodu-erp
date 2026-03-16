"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { DashboardNav } from "../../../components/dashboard-nav";
import { useLocaleText } from "../../../components/ui-shell-provider";
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

function translateEmploymentStatus(status: string, t: (ko: string, en: string) => string): string {
  const normalized = status.toUpperCase();
  if (normalized === "ACTIVE") {
    return t("재직", "ACTIVE");
  }
  if (normalized === "ON_LEAVE") {
    return t("휴직", "ON_LEAVE");
  }
  if (normalized === "TERMINATED") {
    return t("비활성", "Inactive");
  }
  return status;
}

export default function EmployeeDetailPage() {
  const router = useRouter();
  const t = useLocaleText();
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
      <h1>{t("직원 상세", "Employee Detail")}</h1>
      {employee ? (
        <>
          <p>
            <strong>{employee.nameKr}</strong> ({employee.employeeNumber})
          </p>
          <p>{t("상태", "Status")}: {translateEmploymentStatus(employee.employmentStatus, t)}</p>
          <p>{t("부서", "Department")}: {employee.department?.name ?? "-"}</p>
          <p>{t("직위", "Position")}: {employee.position?.name ?? "-"}</p>
          <p>{t("직책", "Job Title")}: {employee.jobTitle?.name ?? "-"}</p>
          <p>{t("이메일(마스킹)", "Email (masked)")}: {employee.workEmail ?? "-"}</p>
          <p>{t("휴대폰(마스킹)", "Phone (masked)")}: {employee.mobilePhone ?? "-"}</p>
          <p>{t("주민번호(마스킹)", "National ID (masked)")}: {employee.nationalIdMasked ?? "-"}</p>
          <p>{t("입사일", "Hire Date")}: {employee.hireDate.slice(0, 10)}</p>

          <p>
            <Link href={`/employees/${employee.id}/edit`}>{t("수정", "Edit")}</Link>
          </p>
        </>
      ) : (
        <p>{t("로딩 중...", "Loading...")}</p>
      )}
      </section>
    </main>
  );
}
