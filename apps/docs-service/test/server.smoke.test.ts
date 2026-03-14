import assert from "node:assert/strict";
import { once } from "node:events";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";

import type { Server } from "node:http";

import { createDocsServiceServer } from "../src/server";

let server: Server;
let baseUrl = "";

before(async () => {
  server = createDocsServiceServer();
  server.listen(0);
  await once(server, "listening");
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
});

test("docs-service health endpoint is available", async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    status: string;
    service: string;
    adapters: string[];
  };
  assert.equal(body.status, "ok");
  assert.equal(body.service, "docs-service");
  assert.ok(body.adapters.includes("hwpx"));
});

test("docs-service template list includes required Korean templates", async () => {
  const response = await fetch(`${baseUrl}/templates`);
  assert.equal(response.status, 200);
  const body = (await response.json()) as { templates: string[] };

  const expectedTemplates = [
    "leave-request.html",
    "expense-approval.html",
    "attendance-correction.html",
    "employment-certificate.html",
    "overtime-request.html"
  ];

  for (const templateName of expectedTemplates) {
    assert.ok(
      body.templates.includes(templateName),
      `missing template: ${templateName}`
    );
  }
});

test("docs-service can render PDF from HTML template payload", async () => {
  const response = await fetch(`${baseUrl}/render/pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: "Smoke Render",
      html: "<h1>근태 정정 요청</h1><p>테스트 본문</p>"
    })
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/pdf");

  const pdfBuffer = Buffer.from(await response.arrayBuffer());
  assert.ok(pdfBuffer.byteLength > 100, "rendered PDF should not be empty");
});

test("docs-service blocks template path traversal", async () => {
  const response = await fetch(`${baseUrl}/templates/%2E%2E%2F%2E%2E%2Fpackage.json`);
  assert.equal(response.status, 400);
});
