import assert from "node:assert/strict";
import test from "node:test";

import { ApiError, requireCompanyId } from "../src/lib/api";
import { clearSession, loadSession, saveSession, type LoginSession } from "../src/lib/auth";

class MemoryStorage {
  private readonly entries = new Map<string, string>();

  getItem(key: string) {
    return this.entries.has(key) ? (this.entries.get(key) ?? null) : null;
  }

  setItem(key: string, value: string) {
    this.entries.set(key, value);
  }

  removeItem(key: string) {
    this.entries.delete(key);
  }
}

function withWindowMock(run: () => void | Promise<void>) {
  const originalWindow = (globalThis as { window?: unknown }).window;
  (globalThis as { window?: { localStorage: MemoryStorage } }).window = {
    localStorage: new MemoryStorage()
  };

  return Promise.resolve(run()).finally(() => {
    (globalThis as { window?: unknown }).window = originalWindow;
  });
}

test("saveSession/loadSession/clearSession manage local session storage", async () => {
  await withWindowMock(() => {
    const session: LoginSession = {
      token: "token_1",
      expiresAt: "2026-03-15T23:59:59.000Z",
      user: {
        id: "user_1",
        email: "admin@acme.local",
        name: "관리자"
      },
      memberships: [
        {
          companyId: "company_1",
          companyName: "Acme Korea",
          role: "SUPER_ADMIN"
        }
      ],
      defaultCompanyId: "company_1"
    };

    saveSession(session);
    assert.equal(loadSession()?.token, "token_1");

    clearSession();
    assert.equal(loadSession(), null);
  });
});

test("loadSession returns null for malformed JSON", async () => {
  await withWindowMock(() => {
    const storage = (window as { localStorage: MemoryStorage }).localStorage;
    storage.setItem("korean_erp_auth_session", "{not-json");
    assert.equal(loadSession(), null);
  });
});

test("requireCompanyId prefers defaultCompanyId and falls back to first membership", () => {
  assert.equal(
    requireCompanyId({
      token: "t",
      expiresAt: "x",
      user: { id: "u", email: "a@b.com", name: "A" },
      memberships: [{ companyId: "company_2", companyName: "Acme", role: "EMPLOYEE" }],
      defaultCompanyId: "company_1"
    }),
    "company_1"
  );

  assert.equal(
    requireCompanyId({
      token: "t",
      expiresAt: "x",
      user: { id: "u", email: "a@b.com", name: "A" },
      memberships: [{ companyId: "company_2", companyName: "Acme", role: "EMPLOYEE" }],
      defaultCompanyId: ""
    }),
    "company_2"
  );
});

test("ApiError keeps HTTP status and message", () => {
  const error = new ApiError(403, "Forbidden");
  assert.equal(error.status, 403);
  assert.equal(error.message, "Forbidden");
});
