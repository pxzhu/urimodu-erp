"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../components/dashboard-nav";
import { ApiError, apiRequest, requireCompanyId } from "../../lib/api";
import { loadSession, type LoginSession } from "../../lib/auth";
import { useLocaleText, useUiShell } from "../../components/ui-shell-provider";

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
  const t = useLocaleText();
  const { isAdminView } = useUiShell();
  const [session, setSession] = useState<LoginSession | null>(null);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [workingEmployeeId, setWorkingEmployeeId] = useState<string | null>(null);

  const companyId = useMemo(() => (session ? requireCompanyId(session) : ""), [session]);

  async function refresh(activeSession: LoginSession) {
    const data = await apiRequest<EmployeeItem[]>(`/employees?companyId=${requireCompanyId(activeSession)}`, {
      token: activeSession.token,
      companyId: requireCompanyId(activeSession)
    });

    setEmployees(data);
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
          setError(t("직원 목록을 불러오지 못했습니다.", "Failed to load employees."));
        }
      }
    }

    void run();
  }, [router, t]);

  const filteredEmployees = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return employees;
    }

    return employees.filter((employee) => {
      const searchable = `${employee.nameKr} ${employee.employeeNumber} ${employee.department?.name ?? ""}`.toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [employees, query]);

  async function deactivateEmployee(employee: EmployeeItem) {
    if (!session || !isAdminView) {
      return;
    }

    setWorkingEmployeeId(employee.id);
    setError(null);

    try {
      await apiRequest(`/employees/${employee.id}`, {
        method: "PATCH",
        token: session.token,
        companyId,
        body: {
          employmentStatus: "TERMINATED",
          terminationDate: new Date().toISOString().slice(0, 10)
        }
      });

      await refresh(session);
    } catch (deactivateError) {
      if (deactivateError instanceof ApiError) {
        setError(deactivateError.message);
      } else {
        setError(t("직원 비활성 처리에 실패했습니다.", "Failed to deactivate employee."));
      }
    } finally {
      setWorkingEmployeeId(null);
    }
  }

  return (
    <main className="container with-shell">
      <DashboardNav />
      <section className="app-shell-content">
      <h1>{t("직원 관리", "Employee Directory")}</h1>
      <p>
        {t(
          "직원 정보를 이 화면에서 생성/수정하고, 퇴사 처리는 삭제 대신 비활성 상태로 관리합니다.",
          "Create/update employees here, and use deactivate status instead of hard delete."
        )}
      </p>

      {!isAdminView ? (
        <p className="role-note">
          {t(
            "사용자 권한에서는 직원 조회만 가능합니다.",
            "User role is view-only for employee management."
          )}
        </p>
      ) : null}

      <div className="inline-actions">
        {isAdminView ? <Link href="/employees/new">{t("신규 직원 등록", "Create employee")}</Link> : null}
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("이름/사번/부서 검색 (예: 홍)", "Search by name/number/department")}
        />
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <table className="data-table">
        <thead>
          <tr>
            <th>{t("사번", "No.")}</th>
            <th>{t("이름", "Name")}</th>
            <th>{t("부서", "Department")}</th>
            <th>{t("직위", "Position")}</th>
            <th>{t("직책", "Title")}</th>
            <th>{t("이메일", "Email")}</th>
            <th>{t("상태", "Status")}</th>
            <th>{t("동작", "Actions")}</th>
          </tr>
        </thead>
        <tbody>
          {filteredEmployees.map((employee) => {
            const isInactive = employee.employmentStatus === "TERMINATED";

            return (
              <tr key={employee.id}>
                <td>{employee.employeeNumber}</td>
                <td>{employee.nameKr}</td>
                <td>{employee.department?.name ?? "-"}</td>
                <td>{employee.position?.name ?? "-"}</td>
                <td>{employee.jobTitle?.name ?? "-"}</td>
                <td>{employee.workEmail ?? "-"}</td>
                <td>{isInactive ? t("비활성", "Inactive") : employee.employmentStatus}</td>
                <td>
                  <div className="inline-actions">
                    <Link href={`/employees/${employee.id}`}>{t("상세", "Detail")}</Link>
                    {isAdminView ? <Link href={`/employees/${employee.id}/edit`}>{t("수정", "Edit")}</Link> : null}
                    {isAdminView ? (
                      <button
                        type="button"
                        disabled={isInactive || workingEmployeeId === employee.id}
                        onClick={() => void deactivateEmployee(employee)}
                      >
                        {workingEmployeeId === employee.id
                          ? t("처리중...", "Working...")
                          : t("비활성", "Deactivate")}
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
          {filteredEmployees.length === 0 ? (
            <tr>
              <td colSpan={8}>{t("조회 결과가 없습니다.", "No employees found.")}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
      </section>
    </main>
  );
}
