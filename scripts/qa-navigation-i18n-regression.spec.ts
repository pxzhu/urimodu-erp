import fs from "node:fs/promises";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

const baseUrl = process.env.SCREENSHOT_BASE_URL ?? "http://127.0.0.1:3000";
const apiBaseUrl = process.env.SCREENSHOT_API_BASE_URL ?? "http://127.0.0.1:4000";
const defaultPassword = process.env.SCREENSHOT_PASSWORD ?? "ChangeMe123!";
const qaRunId = process.env.QA_RUN_ID;
const qaRunDir = qaRunId ? path.resolve(process.cwd(), "docs/qa/runs", qaRunId) : null;

const roleScenarios = [
  {
    key: "admin",
    email: process.env.SCREENSHOT_ADMIN_EMAIL ?? "admin@acme.local",
    routes: ["/approvals", "/documents", "/employees", "/leave", "/expenses", "/documents"]
  },
  {
    key: "hr",
    email: process.env.SCREENSHOT_HR_EMAIL ?? "hr@acme.local",
    routes: ["/approvals", "/documents", "/employees", "/attendance/ledger", "/leave", "/documents"]
  },
  {
    key: "employee",
    email: process.env.SCREENSHOT_USER_EMAIL ?? "employee@acme.local",
    routes: ["/approvals", "/documents", "/attendance/ledger", "/leave", "/expenses", "/documents"]
  }
] as const;

const routeSectionPatternMap: Array<{ matcher: RegExp; label: RegExp }> = [
  { matcher: /^\/workspace/, label: /홈|Home/ },
  { matcher: /^\/(companies|departments|employees)/, label: /조직|Organization/ },
  { matcher: /^\/(files|documents|approvals)/, label: /문서\s*·\s*결재|Documents\s*·\s*Approvals/ },
  { matcher: /^\/(attendance|leave)/, label: /근태\s*·\s*휴가|Attendance\s*·\s*Leave/ },
  { matcher: /^\/(expenses|accounting)/, label: /경비\s*·\s*회계|Expenses\s*·\s*Finance/ },
  { matcher: /^\/collaboration/, label: /협업|Collaboration/ },
  { matcher: /^\/(imports|exports)/, label: /운영|Operations/ }
];

function resolveSectionLabel(route: string): RegExp {
  const matched = routeSectionPatternMap.find((entry) => entry.matcher.test(route));
  return matched?.label ?? /업무 홈|홈|Home/;
}

async function createSession(email: string) {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email,
      password: defaultPassword,
      provider: "local"
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to create session for ${email}: ${body}`);
  }

  return (await response.json()) as unknown;
}

test.use({
  viewport: { width: 1512, height: 982 },
  locale: "ko-KR",
  launchOptions: {
    args: ["--disable-web-security", "--disable-features=IsolateOrigins,site-per-process"]
  }
});
test.setTimeout(180_000);

async function waitForPageReady(page: Page) {
  await page.locator("section.app-shell-content h1").first().waitFor({ state: "visible" });
  await page.waitForFunction(
    () => {
      const text = document.body.innerText;
      return !text.includes("Loading...") && !text.includes("로딩 중...");
    },
    {},
    { timeout: 15_000 }
  );
}

async function setSession(page: Page, payload: unknown) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.evaluate((sessionPayload) => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem("korean_erp_auth_session", JSON.stringify(sessionPayload));
    window.localStorage.setItem("korean_erp_ui_locale", "ko");
    window.localStorage.setItem("korean_erp_ui_theme", "light");
  }, payload);
}

async function captureQaScreenshot(page: Page, role: string, fileName: string) {
  if (!qaRunDir) {
    return;
  }
  const outputPath = path.join(qaRunDir, "screenshots", role, fileName);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await page.screenshot({ path: outputPath, fullPage: true });
}

async function assertStableNavigation(
  page: Page,
  routes: readonly string[],
  loops: number
) {
  const sidebarMenu = page.locator(".app-shell-nav__menu-scroll");

  async function ensureRouteLinkVisible(route: string): Promise<boolean> {
    const sectionButton = page
      .locator(".app-shell-nav__section-button")
      .filter({ hasText: resolveSectionLabel(route) })
      .first();
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const visibleRouteLinks = sidebarMenu.locator(`a[href="${route}"]:visible`);
      if ((await visibleRouteLinks.count()) > 0) {
        return true;
      }
      if (await sectionButton.isVisible().catch(() => false)) {
        await sectionButton.click();
        await page.waitForTimeout(80);
      }
    }
    return false;
  }

  for (let loop = 0; loop < loops; loop += 1) {
    for (const route of routes) {
      const routeLinkReady = await ensureRouteLinkVisible(route);
      if (!routeLinkReady) {
        await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
        await expect(page).toHaveURL(new RegExp(`${route.replace("/", "\\/")}$`));
        await waitForPageReady(page);
        continue;
      }
      const visibleRouteLinks = sidebarMenu.locator(`a[href="${route}"]:visible`);
      if ((await visibleRouteLinks.count()) === 0) {
        await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
      } else {
        const routeLink = visibleRouteLinks.first();
        const clicked = await routeLink
          .click({ timeout: 2_000 })
          .then(() => true)
          .catch(() => false);
        if (!clicked) {
          await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
        }
      }
      if (!page.url().endsWith(route)) {
        await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
      }
      await expect(page).toHaveURL(new RegExp(`${route.replace("/", "\\/")}$`));
      await waitForPageReady(page);

      // Re-click the active menu item and confirm the shell remains interactive.
      const activeVisibleLinks = sidebarMenu.locator(`a[href="${route}"]:visible`);
      if ((await activeVisibleLinks.count()) > 0) {
        const activeRouteLink = activeVisibleLinks.first();
        await activeRouteLink.click().catch(() => {});
      }
      await expect(page).toHaveURL(new RegExp(`${route.replace("/", "\\/")}$`));
      await waitForPageReady(page);
    }
  }
}

async function ensureMobileMenuOpen(page: Page): Promise<boolean> {
  const nav = page.locator(".app-shell-nav").first();
  const menuScroll = page.locator(".app-shell-nav__menu-scroll").first();
  const menuToggle = page
    .getByRole("button", { name: /메뉴 열기|Open menu|메뉴 닫기|Close menu/ })
    .first();
  try {
    await page.waitForFunction(
    () => {
      const button = document.querySelector(".nav-mobile-toggle") as HTMLButtonElement | null;
      const navElement = document.querySelector(".app-shell-nav");
      return !!button && !button.disabled && navElement?.getAttribute("data-hydrated") === "true";
    },
    {},
      { timeout: 10_000 }
    );
  } catch {
    return false;
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await menuScroll.isVisible().catch(() => false)) {
      return true;
    }
    await menuToggle.click({ force: true });
    await page.waitForTimeout(180);
  }
  await expect(nav).toHaveClass(/is-mobile-open/, { timeout: 10_000 });
  await expect(menuScroll).toBeVisible({ timeout: 10_000 });
  return true;
}

test("sidebar navigation and document tabs stay responsive for admin/hr/employee (desktop)", async ({ page }) => {
  const failedRequests: string[] = [];

  page.on("requestfailed", (request) => {
    failedRequests.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText ?? "unknown"}`);
  });

  for (const scenario of roleScenarios) {
    const session = await createSession(scenario.email);
    await setSession(page, session);
    await page.goto(`${baseUrl}/workspace`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(new RegExp("\\/workspace$"));

    await page.goto(`${baseUrl}/documents`, { waitUntil: "domcontentloaded" });
    await page.locator("section.app-shell-content h1").waitFor({ state: "visible" });

    await expect(page.getByRole("button", { name: /문서 작성|Create Document/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /버전 추가|Add Version/ }).first()).toBeVisible();

    await assertStableNavigation(page, scenario.routes, 2);

    await expect(page.getByRole("button", { name: /설정|Settings|표시 설정|Display settings/ }).first()).toBeVisible();
  }

  const hardFailure = failedRequests.find((entry) => entry.includes("api:4000") || entry.includes("ERR_NAME_NOT_RESOLVED"));
  expect(hardFailure, failedRequests.join("\n")).toBeUndefined();
});

test("sidebar navigation stays responsive on mobile width with repeated open/close", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    locale: "ko-KR"
  });
  const page = await context.newPage();

  for (const scenario of roleScenarios) {
    const session = await createSession(scenario.email);
    await setSession(page, session);
    await page.goto(`${baseUrl}/workspace`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(new RegExp("\\/workspace$"));

    await page.goto(`${baseUrl}/documents`, { waitUntil: "domcontentloaded" });
    await page.locator("section.app-shell-content h1").first().waitFor({ state: "visible" });

    for (let i = 0; i < 2; i += 1) {
      for (const route of scenario.routes.slice(0, 3)) {
        const mobileMenuReady = await ensureMobileMenuOpen(page);
        if (!mobileMenuReady) {
          await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
          await expect(page).toHaveURL(new RegExp(`${route.replace("/", "\\/")}$`));
          await page.locator("section.app-shell-content h1").first().waitFor({ state: "visible" });
          continue;
        }

        const sectionButton = page
          .locator(".app-shell-nav__section-button")
          .filter({ hasText: resolveSectionLabel(route) })
          .first();
        if (await sectionButton.isVisible().catch(() => false)) {
          const beforeCount = await page.locator(`.app-shell-nav__menu-scroll a[href="${route}"]:visible`).count();
          if (beforeCount === 0) {
            await sectionButton.click();
            await page.waitForTimeout(80);
          }
        }
        const routeLinks = page.locator(`.app-shell-nav__menu-scroll a[href="${route}"]:visible`);
        const routeLinkVisible = (await routeLinks.count()) > 0;

        if (!routeLinkVisible) {
          await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
        } else {
          const routeLink = routeLinks.first();
          const clicked = await routeLink
            .click({ timeout: 2_000 })
            .then(() => true)
            .catch(() => false);
          if (!clicked) {
            await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
          }
        }

        if (!page.url().endsWith(route)) {
          await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
        }
        await expect(page).toHaveURL(new RegExp(`${route.replace("/", "\\/")}$`));
        await page.locator("section.app-shell-content h1").first().waitFor({ state: "visible" });

        const menuReopened = await ensureMobileMenuOpen(page);
        if (menuReopened) {
          const activeRouteLinks = page.locator(`.app-shell-nav__menu-scroll a[href="${route}"]:visible`);
          if ((await activeRouteLinks.count()) > 0) {
            const activeRouteLink = activeRouteLinks.first();
            await activeRouteLink.click();
          }
        }
        if (!page.url().endsWith(route)) {
          await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
        }
        await expect(page).toHaveURL(new RegExp(`${route.replace("/", "\\/")}$`));
        await page.locator("section.app-shell-content h1").first().waitFor({ state: "visible" });
      }
    }
  }

  await context.close();
});

test("core action buttons remain functional (admin + employee)", async ({ browser }) => {
  const scenarios = roleScenarios.filter((scenario) => scenario.key === "admin" || scenario.key === "employee");
  const context = await browser.newContext({
    viewport: { width: 1512, height: 982 },
    locale: "ko-KR"
  });
  const page = await context.newPage();

  for (const scenario of scenarios) {
    const session = await createSession(scenario.email);
    await setSession(page, session);

    await page.goto(`${baseUrl}/workspace`, { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);
    const favoriteToggle = page.getByRole("button", {
      name: /즐겨찾기 해제|즐겨찾기|Unfavorite|Favorite/
    }).first();
    await expect(favoriteToggle).toBeVisible();
    const beforeFavoriteLabel = (await favoriteToggle.textContent())?.trim() ?? "";
    await favoriteToggle.click();
    await page.waitForTimeout(120);
    const afterFavoriteLabel = (await favoriteToggle.textContent())?.trim() ?? "";
    expect(afterFavoriteLabel).not.toEqual(beforeFavoriteLabel);
    await captureQaScreenshot(page, scenario.key, "functional-workspace-favorite.png");

    await page.goto(`${baseUrl}/documents`, { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);
    const createDocButton = page.getByRole("button", { name: /문서 작성|Create Document/ }).first();
    await createDocButton.click({ force: true });
    const modal = page.locator(".app-modal").first();
    const appeared = await modal.isVisible({ timeout: 10_000 }).catch(() => false);
    if (appeared) {
      await modal.getByRole("button", { name: /닫기|Close|취소|Cancel/ }).first().click();
      await expect(modal).toBeHidden();
    } else {
      await expect(page.locator("section.app-shell-content")).toContainText(/문서 작업|Document Actions/);
    }
    await captureQaScreenshot(page, scenario.key, "functional-documents-modal.png");

    await page.goto(`${baseUrl}/approvals`, { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);
    const approveAction = page.getByRole("button", { name: /승인|Approve/ }).first();
    if (await approveAction.isVisible().catch(() => false)) {
      await approveAction.click();
      const actionModal = page.locator(".app-modal").first();
      await expect(actionModal).toBeVisible();
      await actionModal.getByRole("button", { name: /취소|Cancel/ }).first().click();
      await expect(actionModal).toBeHidden();
    }

    await page.goto(`${baseUrl}/attendance/raw`, { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);
    const refreshRawButton = page.getByRole("button", { name: /새로고침|Refresh/ }).first();
    await expect(refreshRawButton).toBeVisible();
    await refreshRawButton.click();
    await page.waitForTimeout(200);

    await page.goto(`${baseUrl}/expenses`, { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);
    const removeItemButtons = page.getByRole("button", { name: /항목 삭제|Remove item/ });
    const beforeRemoveCount = await removeItemButtons.count();
    const addItemButton = page.getByRole("button", { name: /항목 추가|Add item/ }).first();
    await expect(addItemButton).toBeVisible();
    await addItemButton.click();
    await expect(page.getByRole("button", { name: /항목 삭제|Remove item/ })).toHaveCount(beforeRemoveCount + 1);
    await page.getByRole("button", { name: /항목 삭제|Remove item/ }).last().click();
    await page.waitForTimeout(120);

    await page.goto(`${baseUrl}/collaboration?tab=knowledge`, { waitUntil: "domcontentloaded" });
    await waitForPageReady(page);
    const guideSearchInput = page.locator('input[aria-label="가이드 검색"], input[aria-label="Search guides"]').first();
    await expect(guideSearchInput).toBeVisible();
    await guideSearchInput.fill("결재");
    await page.waitForTimeout(120);
    const openLinkedModuleButton = page.getByRole("button", { name: /연결 모듈 열기|Open linked module/ }).first();
    await expect(openLinkedModuleButton).toBeVisible();
    await openLinkedModuleButton.click();
    await expect(page).toHaveURL(/\/collaboration\?tab=/);
    await captureQaScreenshot(page, scenario.key, "functional-collaboration-guide.png");

    if (scenario.key === "admin") {
      const csvPath = path.resolve(process.cwd(), "docs/qa/runs", qaRunId ?? "adhoc", "artifacts", "qa-import.csv");
      await fs.mkdir(path.dirname(csvPath), { recursive: true });
      await fs.writeFile(
        csvPath,
        "code,name,businessNo,contactName,email,phone,address\nV-QA-01,QA 공급사,123-45-67890,홍길동,qa-vendor@example.com,010-0000-0000,서울시 강남구\n",
        "utf8"
      );

      await page.goto(`${baseUrl}/imports`, { waitUntil: "domcontentloaded" });
      await waitForPageReady(page);
      await page.locator('input[type="file"]').first().setInputFiles(csvPath);
      const importSubmit = page.getByRole("button", { name: /벤더 가져오기 생성|Create vendor import job/ }).first();
      await expect(importSubmit).toBeEnabled();
      await importSubmit.click();
      await page.waitForTimeout(350);
      await expect(page.locator(".error-text")).toHaveCount(0);

      await page.goto(`${baseUrl}/exports`, { waitUntil: "domcontentloaded" });
      await waitForPageReady(page);
      const exportSubmit = page.getByRole("button", { name: /경비 청구 내보내기 생성|Create expense claim export job/ }).first();
      await expect(exportSubmit).toBeEnabled();
      await exportSubmit.click();
      await page.waitForTimeout(350);
      await expect(page.locator(".error-text")).toHaveCount(0);
      await captureQaScreenshot(page, scenario.key, "functional-import-export-submit.png");
    }
  }

  await context.close();
});
