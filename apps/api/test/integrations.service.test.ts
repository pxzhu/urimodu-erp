import assert from "node:assert/strict";
import test from "node:test";

import { AttendanceIngestionSource, IntegrationType } from "@prisma/client";

import type { PrismaService } from "../src/common/prisma/prisma.service";
import { IntegrationsService } from "../src/modules/integrations/services/integrations.service";
import type { AttendanceService } from "../src/modules/attendance/services/attendance.service";

test("IntegrationsService ingestBatch handles inserted + deduped counts", async () => {
  const attendanceService = {
    resolveCompany: async () => ({ id: "company_1" }),
    resolveEmployeeForExternalIdentity: async () => ({ id: "emp_1", employeeNumber: "10000004" }),
    ingestRawEvent: async ({ externalUserId }: { externalUserId: string }) => ({
      deduped: externalUserId.endsWith("dup"),
      rawEvent: {
        id: `raw_${externalUserId}`,
        externalUserId
      }
    })
  } as unknown as AttendanceService;

  const prisma = {
    businessSite: {
      findUnique: async () => ({ id: "site_1" })
    }
  } as unknown as PrismaService;

  const service = new IntegrationsService(prisma, attendanceService);

  const result = await service.ingestBatch(
    {
      companyId: "company_1",
      provider: IntegrationType.GENERIC,
      source: AttendanceIngestionSource.API,
      events: [
        {
          externalUserId: "ADT-EMP-10000004",
          employeeNumber: "10000004",
          eventType: "IN",
          eventTimestamp: "2026-03-14T08:58:00+09:00",
          deviceId: "GATE-A-01",
          siteCode: "SEOUL-HQ"
        },
        {
          externalUserId: "ADT-EMP-10000004-dup",
          employeeNumber: "10000004",
          eventType: "IN",
          eventTimestamp: "2026-03-14T08:58:00+09:00",
          deviceId: "GATE-A-01",
          siteCode: "SEOUL-HQ"
        }
      ]
    },
    {
      integrationKey: "dev-integration-key"
    }
  );

  assert.equal(result.total, 2);
  assert.equal(result.inserted, 1);
  assert.equal(result.deduped, 1);
  assert.equal(result.results.length, 2);
});

test("IntegrationsService importCsv parses header csv and ingests events", async () => {
  const attendanceService = {
    resolveCompany: async () => ({ id: "company_1" }),
    resolveEmployeeForExternalIdentity: async () => ({ id: "emp_2", employeeNumber: "10000002" }),
    ingestRawEvent: async () => ({
      deduped: false,
      rawEvent: {
        id: "raw_1"
      }
    })
  } as unknown as AttendanceService;

  const prisma = {
    businessSite: {
      findUnique: async () => ({ id: "site_1" })
    }
  } as unknown as PrismaService;

  const service = new IntegrationsService(prisma, attendanceService);

  const csv = [
    "provider,external_user_id,event_type,event_timestamp,device_id,site_code",
    "GENERIC,ADT-EMP-10000002,IN,2026-03-14T09:07:00+09:00,GATE-A-01,SEOUL-HQ",
    "GENERIC,ADT-EMP-10000002,OUT,2026-03-14T18:05:00+09:00,GATE-A-01,SEOUL-HQ"
  ].join("\n");

  const result = await service.importCsv(
    {
      companyCode: "ACME_KR",
      provider: IntegrationType.GENERIC,
      source: AttendanceIngestionSource.CSV
    },
    Buffer.from(csv, "utf8"),
    {
      integrationKey: "dev-integration-key"
    }
  );

  assert.equal(result.total, 2);
  assert.equal(result.inserted, 2);
  assert.equal(result.deduped, 0);
});
