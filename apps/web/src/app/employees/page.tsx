"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../components/dashboard-nav";
import { ApiError, apiRequest, requireCompanyId } from "../../lib/api";
import { loadSession, type LoginSession } from "../../lib/auth";
import { useLocaleText, useUiShell } from "../../components/ui-shell-provider";
import styles from "./page.module.css";

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

function translateEmploymentStatus(status: string, t: (ko: string, en: string) => string): string {
  const normalized = status.toUpperCase();
  if (normalized === "ACTIVE") return t("재직", "ACTIVE");
  if (normalized === "ON_LEAVE") return t("휴직", "ON_LEAVE");
  if (normalized === "TERMINATED") return t("비활성", "Inactive");
  return status;
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
  const [statusFilter, setStatusFilter] = useState("ALL");

  const companyId = useMemo(() => (session ? requireCompanyId(session) : ""), [session]);

  async function refresh(activeSession: LoginSession) {
    const data = await apiRequest<EmployeeItem[]>(`/employees?companyId=${requireCompanyId(activeSession)}`, {
      token: activeSession.token,
      companyId: requireCompanyId(activeSession)
    });

    setEmployees(data);
    setError(null);
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

  const metrics = useMemo(() => {
    const active = employees.filter((employee) => employee.employmentStatus === "ACTIVE").length;
    const onLeave = employees.filter((employee) => employee.employmentStatus === "ON_LEAVE").length;
    const inactive = employees.filter((employee) => employee.employmentStatus === "TERMINATED").length;
    const missingDept = employees.filter((employee) => !employee.department).length;
    return { active, onLeave, inactive, missingDept };
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return employees.filter((employee) => {
      if (statusFilter !== "ALL" && employee.employmentStatus !== statusFilter) {
        return false;
      }
      if (!normalizedQuery) return true;
      const searchable = `${employee.nameKr} ${employee.employeeNumber} ${employee.department?.name ?? ""}`.toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [employees, query, statusFilter]);

  async function deactivateEmployee(employee: EmployeeItem) {
    if (!session || !isAdminView) return;

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
            "단순 직원 목록이 아니라 현재 조직 운영 상태와 예외를 함께 보는 디렉터리로 정리했습니다.",
            "This directory highlights operational employee signals instead of only showing a plain list."
          )}
        </p>

        {!isAdminView ? (
          <p className="role-note">{t("사용자 권한에서는 직원 조회만 가능합니다.", "User role is view-only for employee management.")}</p>
        ) : null}

        <section className={styles.metricGrid}>
          <article className={styles.metricCard}><p>{t("재직", "Active")}</p><strong>{metrics.active}</strong><span>{t("현재 재직 인원", "Current active employees")}</span></article>
          <article className={styles.metricCard}><p>{t("휴직", "On leave")}</p><strong>{metrics.onLeave}</strong><span>{t("휴직 상태 인원", "Employees on leave")}</span></article>
          <article className={styles.metricCard}><p>{t("비활성", "Inactive")}</p><strong>{metrics.inactive}</strong><span>{t("퇴사/비활성", "Terminated or inactive")}</span></article>
          <article className={styles.metricCard}><p>{t("부서 미지정", "No department")}</p><strong>{metrics.missingDept}</strong><span>{t("운영 점검 필요", "Needs operational review")}</span></article>
        </section>

        <section className={styles.alertGrid}>
          <article className={styles.alertCard}><strong>{t("운영 점검", "Operational review")}</strong><span>{t(`${metrics.missingDept}명의 직원은 부서가 지정되지 않았습니다.`, `${metrics.missingDept} employees are missing department assignment.`)}</span></article>
          <article className={styles.alertCard}><strong>{t("권한/상태 확인", "Status checks")}</strong><span>{t("비활성 전환은 삭제 대신 상태 관리로 처리합니다.", "Handle offboarding via status transitions instead of delete.")}</span></article>
          <article className={styles.alertCard}><strong>{t("HR 작업 흐름", "HR workflow")}</strong><span>{t("검색/필터를 활용해 운영 리스크를 먼저 정리하세요.", "Use search and status filters to clear operational risks first.")}</span></article>
        </section>

        <section className={styles.filterBar}>
          <div className="inline-actions">
            {isAdminView ? <Link href="/employees/new">{t("신규 직원 등록", "Create employee")}</Link> : null}
            <button type="button" onClick={() => session && void refresh(session)}>{t("새로고침", "Refresh")}</button>
          </div>
          <div className="inline-actions">
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">{t("전체 상태", "All statuses")}</option>
              <option value="ACTIVE">{t("재직", "Active")}</option>
              <option value="ON_LEAVE">{t("휴직", "On leave")}</option>
              <option value="TERMINATED">{t("비활성", "Inactive")}</option>
            </select>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("이름/사번/부서 검색", "Search by name/number/department")}
            />
          </div>
        </section>

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
                  <td>{translateEmploymentStatus(employee.employmentStatus, t)}</td>
                  <td>
                    <div className="inline-actions">
                      <Link href={`/employees/${employee.id}`}>{t("상세", "Detail")}</Link>
                      {isAdminView ? <Link href={`/employees/${employee.id}/edit`}>{t("수정", "Edit")}</Link> : null}
                      {isAdminView ? (
                        <button type="button" disabled={isInactive || workingEmployeeId === employee.id} onClick={() => void deactivateEmployee(employee)}>
                          {workingEmployeeId === employee.id ? t("처리중...", "Working...") : t("비활성", "Deactivate")}
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
