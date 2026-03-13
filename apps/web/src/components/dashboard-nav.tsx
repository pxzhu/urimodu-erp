"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { apiRequest } from "../lib/api";
import { clearSession, loadSession } from "../lib/auth";

export function DashboardNav() {
  const router = useRouter();
  const session = loadSession();

  async function handleLogout() {
    if (session) {
      try {
        await apiRequest<{ success: true }>("/auth/logout", {
          method: "POST",
          token: session.token,
          companyId: session.defaultCompanyId
        });
      } catch {
        // local logout should still proceed.
      }
    }

    clearSession();
    router.push("/login");
  }

  return (
    <nav className="top-nav">
      <div className="top-nav__left">
        <Link href="/companies">Companies</Link>
        <Link href="/departments">Departments</Link>
        <Link href="/employees">Employees</Link>
        <Link href="/files">Files</Link>
        <Link href="/documents">Documents</Link>
        <Link href="/approvals">Approvals</Link>
        <Link href="/attendance/raw">Attendance Raw</Link>
        <Link href="/attendance/ledger">Attendance Ledger</Link>
        <Link href="/leave">Leave</Link>
        <Link href="/attendance/corrections">Corrections</Link>
        <Link href="/attendance/shift-policies">Shift Policies</Link>
        <Link href="/expenses">Expenses</Link>
        <Link href="/accounting/accounts">Accounts</Link>
        <Link href="/accounting/journal-entries">Journal Entries</Link>
        <Link href="/imports">Imports</Link>
        <Link href="/exports">Exports</Link>
      </div>
      <div className="top-nav__right">
        <span>{session?.user.name ?? "Guest"}</span>
        <button type="button" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}
