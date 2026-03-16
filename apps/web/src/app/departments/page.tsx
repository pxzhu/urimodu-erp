"use client";

import { FormEvent, type ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../components/dashboard-nav";
import { useLocaleText } from "../../components/ui-shell-provider";
import { ApiError, apiRequest, requireCompanyId } from "../../lib/api";
import { loadSession } from "../../lib/auth";

interface Department {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  children?: Department[];
}

export default function DepartmentsPage() {
  const router = useRouter();
  const t = useLocaleText();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [tree, setTree] = useState<Department[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function fetchDepartments() {
    const session = loadSession();
    if (!session) {
      router.push("/login");
      return;
    }

    const companyId = requireCompanyId(session);

    const list = await apiRequest<Department[]>(`/departments?companyId=${companyId}`, {
      token: session.token,
      companyId
    });

    const treeData = await apiRequest<Department[]>(`/departments/tree?companyId=${companyId}`, {
      token: session.token,
      companyId
    });

    setDepartments(list);
    setTree(treeData);
    setError(null);
  }

  useEffect(() => {
    void fetchDepartments();
  }, []);

  async function onCreateDepartment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = loadSession();
    if (!session) {
      router.push("/login");
      return;
    }

    const companyId = requireCompanyId(session);
    setError(null);

    try {
      await apiRequest<Department>("/departments", {
        method: "POST",
        token: session.token,
        companyId,
        body: {
          companyId,
          code,
          name,
          parentId: parentId || undefined
        }
      });

      setCode("");
      setName("");
      setParentId("");
      await fetchDepartments();
    } catch (createError) {
      if (createError instanceof ApiError) {
        setError(createError.message);
      } else {
        setError(t("부서 생성에 실패했습니다.", "Failed to create department."));
      }
    }
  }

  function renderNode(node: Department): ReactNode {
    return (
      <li key={node.id}>
        {node.code} - {node.name}
        {node.children && node.children.length > 0 ? <ul>{node.children.map(renderNode)}</ul> : null}
      </li>
    );
  }

  return (
    <main className="container with-shell">
      <DashboardNav />
      <section className="app-shell-content">
      <h1>{t("부서", "Departments")}</h1>
      <p>{t("한국형 조직 구조를 위한 평면 목록과 트리 뷰입니다.", "Flat list and tree view for Korean org structures.")}</p>

      <form className="form-grid" onSubmit={onCreateDepartment}>
        <h2>{t("부서 생성", "Create Department")}</h2>

        <label htmlFor="department-code">{t("코드", "Code")}</label>
        <input id="department-code" value={code} onChange={(event) => setCode(event.target.value)} required />

        <label htmlFor="department-name">{t("이름", "Name")}</label>
        <input id="department-name" value={name} onChange={(event) => setName(event.target.value)} required />

        <label htmlFor="department-parent">{t("상위 부서", "Parent")}</label>
        <select id="department-parent" value={parentId} onChange={(event) => setParentId(event.target.value)}>
          <option value="">{t("(없음)", "(none)")}</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.code} - {department.name}
            </option>
          ))}
        </select>

        <button type="submit">{t("생성", "Create")}</button>
      </form>

      {error ? <p className="error-text">{error}</p> : null}

      <h2>{t("부서 트리", "Department Tree")}</h2>
      <ul>{tree.map(renderNode)}</ul>
      </section>
    </main>
  );
}
