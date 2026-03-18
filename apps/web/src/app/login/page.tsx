"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useLocaleText, useUiShell } from "../../components/ui-shell-provider";
import { ApiError, apiRequest } from "../../lib/api";
import { saveSession, type LoginSession } from "../../lib/auth";
import styles from "./page.module.css";

const SAVED_LOGIN_ID_KEY = "korean_erp_saved_login_id";

export default function LoginPage() {
  const router = useRouter();
  const t = useLocaleText();
  const { locale, toggleLocale, theme, toggleTheme } = useUiShell();
  const [email, setEmail] = useState("admin@acme.local");
  const [password, setPassword] = useState("ChangeMe123!");
  const [rememberId, setRememberId] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const savedId = window.localStorage.getItem(SAVED_LOGIN_ID_KEY);
    if (savedId && savedId.trim().length > 0) {
      setEmail(savedId);
      setRememberId(true);
      return;
    }
    setRememberId(false);
  }, []);

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
      if (rememberId) {
        window.localStorage.setItem(SAVED_LOGIN_ID_KEY, email.trim());
      } else {
        window.localStorage.removeItem(SAVED_LOGIN_ID_KEY);
      }
      router.push("/workspace");
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
    <main className={styles.loginRoot}>
      <div className={styles.topControls}>
        <button type="button" className="nav-chip" onClick={toggleLocale}>
          {locale === "ko" ? "EN" : "KO"}
        </button>
        <button type="button" className="nav-chip" onClick={toggleTheme}>
          {theme === "dark" ? t("라이트", "Light") : t("다크", "Dark")}
        </button>
      </div>

      <section className={styles.loginFrame}>
        <aside className={styles.brandPanel}>
          <div className={styles.brandInner}>
            <p className={styles.brandEyebrow}>Urimodu ERP</p>
            <h1 className={styles.brandTitle}>{t("우리모두ERP", "Urimodu ERP")}</h1>
            <p className={styles.brandDesc}>
              {t(
                "인사, 근태, 결재, 경비를 한 화면에서 빠르게 연결하는 한국형 업무 플랫폼",
                "A Korean-first operations platform connecting HR, attendance, approvals, and expenses."
              )}
            </p>
          </div>
          <p className={styles.brandQuote}>
            {t("안되는 것이 실패가 아니라 포기하는 것이 실패다", "Failure is not trying and failing. Failure is giving up.")}
          </p>
        </aside>

        <section className={styles.formPanel}>
          <form className={styles.form} onSubmit={onSubmit}>
            <h2>{t("로그인", "Sign In")}</h2>
            <p className={styles.formHint}>
              {t("시드 계정으로 바로 체험 가능합니다.", "Use seeded credentials for quick access.")}
            </p>

            <label htmlFor="email">{t("아이디", "Login ID")}</label>
            <input
              id="email"
              type="text"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@acme.local"
            />

            <label htmlFor="password">{t("비밀번호", "Password")}</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />

            <label className={styles.rememberRow} htmlFor="remember-id">
              <input
                id="remember-id"
                type="checkbox"
                checked={rememberId}
                onChange={(event) => setRememberId(event.target.checked)}
              />
              <span>{t("ID 저장", "Remember ID")}</span>
            </label>

            <button type="submit" className={styles.submitButton} disabled={submitting}>
              {submitting ? t("로그인 중...", "Signing in...") : t("로그인", "Login")}
            </button>

            <p className={styles.seedHint}>
              {t("기본 계정", "Default")}: <code>admin@acme.local / ChangeMe123!</code>
            </p>
            {error ? <p className="error-text">{error}</p> : null}
          </form>
        </section>
      </section>
    </main>
  );
}
