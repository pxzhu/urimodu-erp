"use client";

import { FormEvent, type ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardNav } from "../../components/dashboard-nav";
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
        setError("Failed to create department");
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
    <main className="container">
      <DashboardNav />
      <h1>Departments</h1>
      <p>Flat list and tree view for Korean org structures.</p>

      <form className="form-grid" onSubmit={onCreateDepartment}>
        <h2>Create Department</h2>

        <label htmlFor="department-code">Code</label>
        <input id="department-code" value={code} onChange={(event) => setCode(event.target.value)} required />

        <label htmlFor="department-name">Name</label>
        <input id="department-name" value={name} onChange={(event) => setName(event.target.value)} required />

        <label htmlFor="department-parent">Parent</label>
        <select id="department-parent" value={parentId} onChange={(event) => setParentId(event.target.value)}>
          <option value="">(none)</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.code} - {department.name}
            </option>
          ))}
        </select>

        <button type="submit">Create</button>
      </form>

      {error ? <p className="error-text">{error}</p> : null}

      <h2>Department Tree</h2>
      <ul>{tree.map(renderNode)}</ul>
    </main>
  );
}
