"use client";

import Link from "next/link";

import { useLocaleText, useUiShell } from "../components/ui-shell-provider";

export default function HomePage() {
  const t = useLocaleText();
  const { locale, toggleLocale, theme, toggleTheme } = useUiShell();

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

      <h1>{t("우리모두ERP", "Urimodu ERP")}</h1>
      <p>
        {t(
          "한국형 업무 흐름에 맞춘 사용자 설치형 오픈소스 ERP/워크플랫폼입니다.",
          "A self-hosted open-source ERP/work platform designed for Korean business workflows."
        )}
      </p>
      <ul>
        <li>Web: Next.js</li>
        <li>API: NestJS + Swagger</li>
        <li>Worker: Redis queue-ready</li>
        <li>Storage: PostgreSQL + Redis + MinIO</li>
      </ul>
      <p>
        {t("헬스 체크", "Health endpoint")}: <code>/health</code>
      </p>
      <p>
        <Link href="/login">{t("로그인 화면 열기", "Open login page")}</Link>
      </p>
    </main>
  );
}
