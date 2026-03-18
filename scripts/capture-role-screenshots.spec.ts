import fs from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

const baseUrl = process.env.SCREENSHOT_BASE_URL ?? "http://127.0.0.1:3000";
const apiBaseUrl = process.env.SCREENSHOT_API_BASE_URL ?? "http://127.0.0.1:4000";
const defaultPassword = process.env.SCREENSHOT_PASSWORD ?? "ChangeMe123!";

const roles = [
  {
    key: "admin",
    email: process.env.SCREENSHOT_ADMIN_EMAIL ?? "admin@acme.local",
    password: process.env.SCREENSHOT_ADMIN_PASSWORD ?? defaultPassword
  },
  {
    key: "user",
    email: process.env.SCREENSHOT_USER_EMAIL ?? "employee@acme.local",
    password: process.env.SCREENSHOT_USER_PASSWORD ?? defaultPassword
  }
] as const;

const pages = [
  {
    route: "/workspace",
    file: "00-workspace-hub.png",
    readySelector: "section.app-shell-content h1"
  },
  {
    route: "/employees",
    file: "01-employees-directory.png",
    readySelector: "section.app-shell-content h1"
  },
  {
    route: "/documents",
    file: "02-documents-and-templates.png",
    readySelector: "section.app-shell-content h1"
  },
  {
    route: "/approvals",
    file: "03-approvals-inbox.png",
    readySelector: "section.app-shell-content h1"
  },
  {
    route: "/attendance/ledger",
    file: "04-attendance-ledger.png",
    readySelector: "section.app-shell-content h1"
  },
  {
    route: "/expenses",
    file: "05-expense-claims.png",
    readySelector: "section.app-shell-content h1"
  },
  {
    route: "/workspace",
    file: "06-workspace-overview.png",
    readySelector: "section.app-shell-content h1"
  },
  {
    route: "/collaboration",
    file: "07-collaboration-hub.png",
    readySelector: "section.app-shell-content h1"
  }
] as const;

test.describe.configure({ mode: "serial" });
test.use({
  viewport: { width: 1512, height: 982 },
  locale: "ko-KR",
  launchOptions: {
    args: ["--disable-web-security", "--disable-features=IsolateOrigins,site-per-process"]
  }
});
test.setTimeout(240_000);

async function createSession(input: { email: string; password: string }) {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      provider: "local"
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to create session for ${input.email}: ${body}`);
  }

  return (await response.json()) as unknown;
}

test("capture admin/user README screenshots", async ({ browser }) => {
  await fs.mkdir(path.resolve(process.cwd(), "docs/screenshots"), { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1512, height: 982 },
    locale: "ko-KR"
  });
  const page = await context.newPage();

  for (const role of roles) {
    const session = await createSession(role);
    await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
    await page.evaluate((sessionPayload) => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.localStorage.setItem("korean_erp_auth_session", JSON.stringify(sessionPayload));
      window.localStorage.setItem("korean_erp_ui_locale", "ko");
      window.localStorage.setItem("korean_erp_ui_theme", "light");
    }, session);
    await page.goto(`${baseUrl}/workspace`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(new RegExp("\\/workspace$"));

    for (const target of pages) {
      await page.goto(`${baseUrl}${target.route}`, { waitUntil: "domcontentloaded" });
      await page
        .locator("shellSelector" in target ? target.shellSelector : "main.container.with-shell")
        .waitFor({ state: "visible", timeout: 20_000 });
      await page.locator(target.readySelector).first().waitFor({ state: "visible", timeout: 20_000 });
      await page.waitForFunction(
        () => {
          const text = document.body.innerText;
          return !text.includes("Loading...") && !text.includes("로딩 중...");
        },
        {},
        { timeout: 20_000 }
      );
      await page.waitForTimeout(900);

      const outputPath = path.resolve(process.cwd(), "docs/screenshots", `${role.key}-${target.file}`);
      await page.screenshot({ path: outputPath, fullPage: true });
      console.log(`captured: ${role.key}-${target.file}`);
    }
  }

  await context.close();
});
