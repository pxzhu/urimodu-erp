import fs from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

const baseUrl = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const email = process.env.SCREENSHOT_EMAIL ?? "admin@acme.local";
const password = process.env.SCREENSHOT_PASSWORD ?? "ChangeMe123!";

const shots = [
  {
    route: "/employees",
    file: "01-employees-directory.png",
    emptyText: "No employees yet."
  },
  {
    route: "/documents",
    file: "02-documents-and-templates.png",
    emptyText: "No documents yet."
  },
  {
    route: "/approvals",
    file: "03-approvals-inbox.png",
    emptyText: "No pending approvals in your inbox."
  },
  {
    route: "/attendance/ledger",
    file: "04-attendance-ledger.png",
    emptyText: "No normalized ledger rows found."
  },
  {
    route: "/expenses",
    file: "05-expense-claims.png",
    emptyText: "No expense claims yet."
  }
] as const;

test.describe.configure({ mode: "serial" });
test.use({
  viewport: { width: 1440, height: 900 },
  locale: "ko-KR",
  launchOptions: {
    args: ["--disable-web-security", "--disable-features=IsolateOrigins,site-per-process"]
  }
});
test.setTimeout(180_000);

test("capture README screenshots", async ({ page }) => {
  await fs.mkdir(path.resolve(process.cwd(), "docs/screenshots"), { recursive: true });

  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.locator('button[type="submit"]').click();
  await expect
    .poll(() => page.url(), { timeout: 20_000 })
    .toContain("/companies");

  for (const shot of shots) {
    await page.goto(`${baseUrl}${shot.route}`, { waitUntil: "networkidle" });
    await page.locator("main.container").waitFor({ state: "visible", timeout: 15_000 });

    const text = await page.locator("main.container").innerText();
    expect(text).not.toContain(shot.emptyText);

    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.resolve(process.cwd(), "docs/screenshots", shot.file),
      fullPage: true
    });
    console.log(`captured: ${shot.file}`);
  }
});
