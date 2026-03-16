import { expect, test } from "@playwright/test";

const baseUrl = process.env.SCREENSHOT_BASE_URL ?? "http://127.0.0.1:3000";
const apiBaseUrl = process.env.SCREENSHOT_API_BASE_URL ?? "http://127.0.0.1:4000";
const defaultPassword = process.env.SCREENSHOT_PASSWORD ?? "ChangeMe123!";

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

test("sidebar navigation and document tabs stay responsive in Korean mode", async ({ page }) => {
  const session = await createSession(process.env.SCREENSHOT_ADMIN_EMAIL ?? "admin@acme.local");
  const failedRequests: string[] = [];

  page.on("requestfailed", (request) => {
    failedRequests.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText ?? "unknown"}`);
  });

  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.evaluate((payload) => {
    window.localStorage.setItem("korean_erp_auth_session", JSON.stringify(payload));
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

  const menuRouteSequence = [
    "/approvals",
    "/documents",
    "/employees",
    "/documents"
  ];

  const sidebarMenu = page.locator(".app-shell-nav__menu");
  for (const route of menuRouteSequence) {
    await sidebarMenu.locator(`a[href="${route}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`${route.replace("/", "\\/")}$`));
    await page.locator("section.app-shell-content h1").waitFor({ state: "visible" });
    await page.waitForFunction(
      () => {
        const text = document.body.innerText;
        return !text.includes("Loading...") && !text.includes("로딩 중...");
      },
      {},
      { timeout: 15_000 }
    );
  }

  await page.goto(`${baseUrl}/departments`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: "부서" })).toBeVisible();

  await page.goto(`${baseUrl}/accounting/accounts`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: "계정과목" })).toBeVisible();

  await page.goto(`${baseUrl}/exports`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: "내보내기 작업" })).toBeVisible();

  const hardFailure = failedRequests.find((entry) => entry.includes("api:4000") || entry.includes("ERR_NAME_NOT_RESOLVED"));
  expect(hardFailure, failedRequests.join("\n")).toBeUndefined();
});
