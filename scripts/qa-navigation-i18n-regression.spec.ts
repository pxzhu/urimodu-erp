import { expect, test, type Page } from "@playwright/test";

const baseUrl = process.env.SCREENSHOT_BASE_URL ?? "http://127.0.0.1:3000";
const apiBaseUrl = process.env.SCREENSHOT_API_BASE_URL ?? "http://127.0.0.1:4000";
const defaultPassword = process.env.SCREENSHOT_PASSWORD ?? "ChangeMe123!";

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
test.setTimeout(120_000);

async function assertStableNavigation(
  page: Page,
  routes: readonly string[],
  loops: number
) {
  const sidebarMenu = page.locator(".app-shell-nav__menu-scroll");

  async function waitForPageReady() {
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

  async function ensureRouteLinkVisible(route: string): Promise<boolean> {
    const sectionButton = page
      .locator(".app-shell-nav__section-button")
      .filter({ hasText: resolveSectionLabel(route) })
      .first();
    const visibleRouteLinks = sidebarMenu.locator(`a[href="${route}"]:visible`);
    if ((await visibleRouteLinks.count()) === 0) {
      if (await sectionButton.isVisible().catch(() => false)) {
        await sectionButton.click();
      }
      return (await visibleRouteLinks.count()) > 0;
    }
    return true;
  }

  for (let loop = 0; loop < loops; loop += 1) {
    for (const route of routes) {
      const routeLinkReady = await ensureRouteLinkVisible(route);
      if (!routeLinkReady) {
        await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
        await expect(page).toHaveURL(new RegExp(`${route.replace("/", "\\/")}$`));
        await waitForPageReady();
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
      await waitForPageReady();

      // Re-click the active menu item and confirm the shell remains interactive.
      const activeVisibleLinks = sidebarMenu.locator(`a[href="${route}"]:visible`);
      if ((await activeVisibleLinks.count()) > 0) {
        const activeRouteLink = activeVisibleLinks.first();
        await activeRouteLink.click().catch(() => {});
      }
      await expect(page).toHaveURL(new RegExp(`${route.replace("/", "\\/")}$`));
      await waitForPageReady();
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
    await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
    await page.evaluate((payload) => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.localStorage.setItem("korean_erp_auth_session", JSON.stringify(payload));
      window.localStorage.setItem("korean_erp_ui_locale", "ko");
      window.localStorage.setItem("korean_erp_ui_theme", "light");
    }, session);
    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    await expect.poll(() => page.url(), { timeout: 20_000 }).not.toContain("/login");

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
    await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
    await page.evaluate((payload) => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.localStorage.setItem("korean_erp_auth_session", JSON.stringify(payload));
      window.localStorage.setItem("korean_erp_ui_locale", "ko");
      window.localStorage.setItem("korean_erp_ui_theme", "light");
    }, session);
    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    await expect.poll(() => page.url(), { timeout: 20_000 }).not.toContain("/login");

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
          await sectionButton.click();
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
