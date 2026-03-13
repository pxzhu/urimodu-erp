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
