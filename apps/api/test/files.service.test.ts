import assert from "node:assert/strict";
import test from "node:test";

import type { PrismaService } from "../src/common/prisma/prisma.service";
import { FilesService } from "../src/modules/files/services/files.service";
import type { AuditService } from "../src/modules/audit/services/audit.service";
import type { ObjectStorage } from "../src/common/storage/storage.interface";

test("FilesService createFileObject stores object metadata and writes audit log", async () => {
  const auditLogs: Array<{ action: string; [key: string]: unknown }> = [];
  const storageInputs: Array<{ key: string; contentType: string; body: Buffer; metadata?: Record<string, string> }> =
    [];

  const prisma = {
    fileObject: {
      create: async ({ data }: { data: Record<string, unknown> }) => ({
        id: "file_1",
        companyId: data.companyId,
        uploadedById: data.uploadedById,
        bucket: data.bucket,
        storageKey: data.storageKey,
        originalName: data.originalName,
        mimeType: data.mimeType,
        extension: data.extension,
        sizeBytes: BigInt(data.sizeBytes as bigint),
        checksumSha256: data.checksumSha256,
        status: "ACTIVE",
        metadata: data.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
        uploadedBy: {
          id: "user_1",
          email: "admin@acme.local",
          name: "관리자"
        }
      })
    }
  } as unknown as PrismaService;

  const auditService = {
    async log(input: { action: string; [key: string]: unknown }) {
      auditLogs.push(input);
      return input;
    }
  } as unknown as AuditService;

  const storage = {
    async putObject(input: {
      key: string;
      contentType: string;
      body: Buffer;
      metadata?: Record<string, string>;
    }) {
      storageInputs.push(input);
      return { key: input.key };
    },
    async getObject() {
      throw new Error("Not needed in this test");
    }
  } as unknown as ObjectStorage;

  const service = new FilesService(prisma, auditService, storage);
  const result = await service.createFileObject(
    {
      userId: "user_1",
      sessionId: "session_1",
      companyId: "company_1",
      role: "SUPER_ADMIN",
      memberships: [{ companyId: "company_1", role: "SUPER_ADMIN", companyName: "Acme Korea" }],
      token: "token"
    },
    {
      originalName: "Approval Form 2026.pdf",
      mimeType: "application/pdf",
      sizeBytes: 12,
      buffer: Buffer.from("hello-world"),
      metadata: { category: "approval" }
    },
    { ipAddress: "127.0.0.1", userAgent: "node-test" }
  );

  assert.equal(storageInputs.length, 1);
  assert.equal(storageInputs[0]?.contentType, "application/pdf");
  assert.equal(storageInputs[0]?.metadata?.["x-company-id"], "company_1");
  assert.equal(storageInputs[0]?.metadata?.["x-uploaded-by"], "user_1");

  assert.equal(result.originalName, "Approval Form 2026.pdf");
  assert.equal(result.mimeType, "application/pdf");
  assert.equal(result.sizeBytes, "12");
  assert.equal(typeof result.storageKey, "string");
  assert.equal(typeof result.checksumSha256, "string");
  assert.equal((result.checksumSha256 as string).length, 64);

  assert.equal(auditLogs.some((entry) => entry.action === "FILE_UPLOAD"), true);
});
