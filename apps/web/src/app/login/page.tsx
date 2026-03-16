"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { useLocaleText, useUiShell } from "../../components/ui-shell-provider";
import { ApiError, apiRequest } from "../../lib/api";
import { saveSession, type LoginSession } from "../../lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const t = useLocaleText();
  const { locale, toggleLocale, theme, toggleTheme } = useUiShell();
  const [email, setEmail] = useState("admin@acme.local");
  const [password, setPassword] = useState("ChangeMe123!");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const session = await apiRequest<LoginSession>("/auth/login", {
        method: "POST",
        body: {
          email,
          password,
          provider: "local"
        }
      });

      saveSession(session);
      router.push("/companies");
    } catch (submissionError) {
      if (submissionError instanceof ApiError) {
        setError(submissionError.message);
      } else {
        setError(t("로그인 중 오류가 발생했습니다.", "Unexpected login error."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container login-shell">
      <section className="login-hero">
        <p className="login-eyebrow">URIMODU ERP</p>
        <h1>{t("한국형 업무 운영을 위한 통합 플랫폼", "Unified operations platform for Korean teams")}</h1>
        <p>
          {t(
            "인사, 근태, 결재, 경비, 회계를 하나의 흐름으로 연결해 조직 운영을 더 안정적으로 관리합니다.",
            "Connect HR, attendance, approvals, expenses, and finance in one operational flow."
          )}
        </p>
        <ul className="login-feature-list">
          <li>{t("문서·결재 중심 업무 흐름", "Document and approval centric workflows")}</li>
          <li>{t("근태/휴가/정정의 통합 처리", "Unified attendance, leave, and correction handling")}</li>
          <li>{t("감사 로그 기반 변경 이력", "Audit-first traceability for business changes")}</li>
        </ul>
      </section>

      <section className="login-panel">
        <div className="inline-actions login-toolbar">
          <button type="button" onClick={toggleLocale}>
            {locale === "ko" ? "EN" : "KO"}
          </button>
          <button type="button" onClick={toggleTheme}>
            {theme === "dark" ? t("라이트", "Light") : t("다크", "Dark")}
          </button>
        </div>

        <h2>{t("로그인", "Sign In")}</h2>
        <p className="empty-note">
          {t(
            "로컬 개발 인증이 활성화되어 있습니다. 시드 계정으로 로그인해 기능을 확인하세요.",
            "Local development auth is enabled. Sign in with seeded credentials."
          )}
        </p>
        <p className="login-credential">
          {t("기본 계정", "Default credential")}: <code>admin@acme.local / ChangeMe123!</code>
        </p>

        <form className="form-grid" onSubmit={onSubmit}>
          <label htmlFor="email">Email</label>
          <input id="email" value={email} onChange={(event) => setEmail(event.target.value)} />

          <label htmlFor="password">{t("비밀번호", "Password")}</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <button type="submit" disabled={submitting}>
            {submitting ? t("로그인 중...", "Signing in...") : t("로그인", "Sign in")}
          </button>
        </form>
        {error ? <p className="error-text">{error}</p> : null}
      </section>
    </main>
  );
}
