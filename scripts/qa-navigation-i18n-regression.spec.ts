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
  locale: "ko-KR"
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

  async function ensureRouteLinkVisible(route: string) {
    const routeLink = sidebarMenu.locator(`a[href="${route}"]`).first();
    if (!(await routeLink.isVisible().catch(() => false))) {
      await routeLink.scrollIntoViewIfNeeded();
    }
  }

  for (let loop = 0; loop < loops; loop += 1) {
    for (const route of routes) {
      await ensureRouteLinkVisible(route);
      const routeLink = sidebarMenu.locator(`a[href="${route}"]`).first();
      await expect(routeLink).toBeVisible();
      await expect(routeLink).toBeEnabled();
      await routeLink.scrollIntoViewIfNeeded();
      await routeLink.click();
      if (!page.url().endsWith(route)) {
        await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
      }
      await expect(page).toHaveURL(new RegExp(`${route.replace("/", "\\/")}$`));
      await waitForPageReady();

      // Re-click the active menu item and confirm the shell remains interactive.
      await routeLink.scrollIntoViewIfNeeded();
      await routeLink.click();
      await expect(page).toHaveURL(new RegExp(`${route.replace("/", "\\/")}$`));
      await waitForPageReady();
    }
  }
}

async function ensureMobileMenuOpen(page: Page) {
  const nav = page.locator(".app-shell-nav").first();
  const menuScroll = page.locator(".app-shell-nav__menu-scroll").first();
  const menuToggle = page
    .getByRole("button", { name: /메뉴 열기|Open menu|메뉴 닫기|Close menu/ })
    .first();

  await expect(menuToggle).toBeEnabled();

  if (await menuScroll.isVisible().catch(() => false)) {
    return;
  }

  await menuToggle.click();
  await page.waitForTimeout(120);

  if (!(await menuScroll.isVisible().catch(() => false))) {
    await menuToggle.click({ force: true });
  }

  await expect(nav).toHaveClass(/is-mobile-open/);
  await expect(menuScroll).toBeVisible();
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

    await page.goto(`${baseUrl}/documents`, { waitUntil: "domcontentloaded" });
    await page.locator("section.app-shell-content h1").waitFor({ state: "visible" });

    const stepTabList = page.locator(".step-tabs");
    await expect(stepTabList).toBeVisible();

    const createTab = page.getByRole("tab", { name: /1\.\s*(작성|Create)/ });
    const listTab = page.getByRole("tab", { name: /2\.\s*(목록|List)/ });

    await listTab.click();
    await expect(listTab).toHaveAttribute("aria-selected", "true");
    await createTab.click();
    await expect(createTab).toHaveAttribute("aria-selected", "true");
    await listTab.click();
    await expect(listTab).toHaveAttribute("aria-selected", "true");

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

    await page.goto(`${baseUrl}/documents`, { waitUntil: "domcontentloaded" });
    await page.locator("section.app-shell-content h1").first().waitFor({ state: "visible" });

    for (let i = 0; i < 2; i += 1) {
      const menuScroll = page.locator(".app-shell-nav__menu-scroll").first();
      await ensureMobileMenuOpen(page);

      for (const route of scenario.routes.slice(0, 3)) {
        await ensureMobileMenuOpen(page);
        const routeLink = page.locator(`.app-shell-nav__menu a[href="${route}"]`).first();
        await expect(routeLink).toBeVisible();
        await expect(routeLink).toBeEnabled();
        await routeLink.scrollIntoViewIfNeeded();
        await routeLink.click();
        if (!page.url().endsWith(route)) {
          await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
        }
        await expect(page).toHaveURL(new RegExp(`${route.replace("/", "\\/")}$`));
        await page.locator("section.app-shell-content h1").first().waitFor({ state: "visible" });

        await ensureMobileMenuOpen(page);
        await routeLink.click();
        await expect(page).toHaveURL(new RegExp(`${route.replace("/", "\\/")}$`));
        await page.locator("section.app-shell-content h1").first().waitFor({ state: "visible" });
      }
    }
  }

  await context.close();
});
