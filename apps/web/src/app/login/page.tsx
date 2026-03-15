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
    <main className="container">
      <div className="inline-actions" style={{ justifyContent: "flex-end" }}>
        <button type="button" onClick={toggleLocale}>
          {locale === "ko" ? "EN" : "KO"}
        </button>
        <button type="button" onClick={toggleTheme}>
          {theme === "dark" ? t("라이트", "Light") : t("다크", "Dark")}
        </button>
      </div>

      <h1>{t("로그인", "Sign In")}</h1>
      <p>{t("로컬 개발 인증이 활성화되어 있습니다. 시드 계정으로 로그인하세요.", "Local development auth is enabled. Use seeded users to continue.")}</p>
      <p>
        {t("기본 계정", "Default credential")}: <code>admin@acme.local / ChangeMe123!</code>
      </p>
      <form className="form-grid" onSubmit={onSubmit}>
        <label htmlFor="email">Email</label>
        <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />

        <label htmlFor="password">{t("비밀번호", "Password")}</label>
        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

        <button type="submit" disabled={submitting}>
          {submitting ? t("로그인 중...", "Signing in...") : t("로그인", "Sign in")}
        </button>
      </form>
      {error ? <p className="error-text">{error}</p> : null}
    </main>
  );
}
