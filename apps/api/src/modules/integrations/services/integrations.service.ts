import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { AttendanceIngestionSource, IntegrationType, type Prisma } from "@prisma/client";

import { PrismaService } from "../../../common/prisma/prisma.service";
import { AttendanceService } from "../../attendance/services/attendance.service";
import { createDefaultAttendanceAdapters } from "../adapters/generic-access-control.adapter";
import type {
  AttendanceInboundEvent,
  AttendanceIntegrationAdapter,
  AttendanceNormalizedEvent
} from "../contracts/attendance-integration.contract";
import type { ImportAttendanceCsvDto, IngestAttendanceBatchDto, IngestAttendanceEventDto } from "../dto/ingest-attendance.dto";

interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
  integrationKey?: string;
}

interface SiteCacheValue {
  businessSiteId?: string;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const next = line[index + 1];
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function toRawPayload(input: {
  provider: IntegrationType;
  source: AttendanceIngestionSource;
  originalEvent: AttendanceInboundEvent;
  normalizedEvent: AttendanceNormalizedEvent;
}): Prisma.InputJsonValue {
  return {
    provider: input.provider,
    source: input.source,
    originalEvent: input.originalEvent,
    normalizedEvent: {
      ...input.normalizedEvent,
        eventTimestamp: input.normalizedEvent.eventTimestamp.toISOString()
      }
  } as unknown as Prisma.InputJsonValue;
}

@Injectable()
export class IntegrationsService {
  private readonly ingressKey = process.env.INTEGRATION_INGEST_API_KEY ?? "dev-integration-key";
  private readonly adapters: Map<IntegrationType, AttendanceIntegrationAdapter> = createDefaultAttendanceAdapters();

  constructor(
    private readonly prisma: PrismaService,
    private readonly attendanceService: AttendanceService
  ) {}

  private assertIngressKey(integrationKey?: string) {
    if (!integrationKey || integrationKey !== this.ingressKey) {
      throw new UnauthorizedException("Invalid integration ingress key");
    }
  }

  private getAdapter(provider: IntegrationType): AttendanceIntegrationAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new BadRequestException(`Attendance integration adapter not configured for provider: ${provider}`);
    }

    return adapter;
  }

  private async resolveSiteCache(input: {
    companyId: string;
    siteCode?: string;
    cache: Map<string, SiteCacheValue>;
  }): Promise<SiteCacheValue> {
    if (!input.siteCode) {
      return {};
    }

    const key = `${input.companyId}:${input.siteCode}`;
    const cached = input.cache.get(key);
    if (cached) {
      return cached;
    }

    const site = await this.prisma.businessSite.findUnique({
      where: {
        companyId_code: {
          companyId: input.companyId,
          code: input.siteCode
        }
      },
      select: {
        id: true
      }
    });

    const value = {
      businessSiteId: site?.id
    };

    input.cache.set(key, value);
    return value;
  }

  private async persistEvent(input: {
    companyId: string;
    provider: IntegrationType;
    source: AttendanceIngestionSource;
    event: AttendanceInboundEvent;
    normalized: AttendanceNormalizedEvent;
    requestMeta: RequestMeta;
    siteCache: Map<string, SiteCacheValue>;
  }) {
    const mappedEmployee = await this.attendanceService.resolveEmployeeForExternalIdentity({
      companyId: input.companyId,
      provider: input.provider,
      externalUserId: input.normalized.externalUserId,
      employeeNumber: input.normalized.employeeNumber
    });

    const siteInfo = await this.resolveSiteCache({
      companyId: input.companyId,
      siteCode: input.normalized.siteCode,
      cache: input.siteCache
    });

    return this.attendanceService.ingestRawEvent(
      {
        companyId: input.companyId,
        businessSiteId: siteInfo.businessSiteId,
        employeeId: mappedEmployee?.id,
        provider: input.provider,
        source: input.source,
        externalUserId: input.normalized.externalUserId,
        eventType: input.normalized.eventType,
        eventTimestamp: input.normalized.eventTimestamp,
        deviceId: input.normalized.deviceId,
        siteCode: input.normalized.siteCode,
        dedupeKey: input.normalized.dedupeKey,
        rawPayload: toRawPayload({
          provider: input.provider,
          source: input.source,
          originalEvent: input.event,
          normalizedEvent: input.normalized
        })
      },
      {
        ipAddress: input.requestMeta.ipAddress,
        userAgent: input.requestMeta.userAgent,
        actorId: `integration:${input.provider}`
      }
    );
  }

  async ingestEvent(dto: IngestAttendanceEventDto, requestMeta: RequestMeta) {
    this.assertIngressKey(requestMeta.integrationKey);

    const company = await this.attendanceService.resolveCompany({
      companyId: dto.companyId,
      companyCode: dto.companyCode
    });

    const adapter = this.getAdapter(dto.provider);
    const normalized = adapter.normalize(dto.event);

    const result = await this.persistEvent({
      companyId: company.id,
      provider: dto.provider,
      source: dto.source ?? AttendanceIngestionSource.API,
      event: dto.event,
      normalized,
      requestMeta,
      siteCache: new Map<string, SiteCacheValue>()
    });

    return {
      companyId: company.id,
      provider: dto.provider,
      source: dto.source ?? AttendanceIngestionSource.API,
      deduped: result.deduped,
      rawEvent: result.rawEvent
    };
  }

  async ingestBatch(dto: IngestAttendanceBatchDto, requestMeta: RequestMeta) {
    this.assertIngressKey(requestMeta.integrationKey);

    const company = await this.attendanceService.resolveCompany({
      companyId: dto.companyId,
      companyCode: dto.companyCode
    });

    if (dto.events.length === 0) {
      throw new BadRequestException("events must not be empty");
    }

    const adapter = this.getAdapter(dto.provider);
    const source = dto.source ?? AttendanceIngestionSource.API;
    const siteCache = new Map<string, SiteCacheValue>();

    let inserted = 0;
    let deduped = 0;
    const eventResults: Array<{ deduped: boolean; rawEvent: unknown }> = [];

    for (const event of dto.events) {
      const normalized = adapter.normalize(event);
      const result = await this.persistEvent({
        companyId: company.id,
        provider: dto.provider,
        source,
        event,
        normalized,
        requestMeta,
        siteCache
      });

      if (result.deduped) {
        deduped += 1;
      } else {
        inserted += 1;
      }

      eventResults.push(result);
    }

    return {
      companyId: company.id,
      provider: dto.provider,
      source,
      total: dto.events.length,
      inserted,
      deduped,
      results: eventResults
    };
  }

  async importCsv(dto: ImportAttendanceCsvDto, csvBuffer: Buffer, requestMeta: RequestMeta) {
    this.assertIngressKey(requestMeta.integrationKey);

    const company = await this.attendanceService.resolveCompany({
      companyId: dto.companyId,
      companyCode: dto.companyCode
    });

    const csvText = csvBuffer.toString("utf8").replace(/^\uFEFF/, "");
    const lines = csvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      throw new BadRequestException("CSV file is empty");
    }

    const parsedRows = lines.map(parseCsvLine);

    const firstRow = parsedRows[0] ?? [];
    const loweredHeader = firstRow.map((cell) => cell.toLowerCase());
    const hasHeader = loweredHeader.includes("externaluserid") || loweredHeader.includes("external_user_id");

    const columnIndex = {
      provider: hasHeader ? loweredHeader.findIndex((cell) => ["provider"].includes(cell)) : 0,
      externalUserId: hasHeader
        ? loweredHeader.findIndex((cell) => ["externaluserid", "external_user_id"].includes(cell))
        : 1,
      employeeNumber: hasHeader
        ? loweredHeader.findIndex((cell) => ["employeenumber", "employee_number"].includes(cell))
        : 2,
      eventType: hasHeader ? loweredHeader.findIndex((cell) => ["eventtype", "event_type"].includes(cell)) : 3,
      eventTimestamp: hasHeader
        ? loweredHeader.findIndex((cell) => ["eventtimestamp", "event_timestamp", "timestamp"].includes(cell))
        : 4,
      deviceId: hasHeader ? loweredHeader.findIndex((cell) => ["deviceid", "device_id"].includes(cell)) : 5,
      siteCode: hasHeader ? loweredHeader.findIndex((cell) => ["sitecode", "site_code"].includes(cell)) : 6
    };

    const rows = hasHeader ? parsedRows.slice(1) : parsedRows;

    const events: AttendanceInboundEvent[] = [];
    let rowNumber = hasHeader ? 2 : 1;
    for (const row of rows) {
      const externalUserId = row[columnIndex.externalUserId] ?? "";
      const eventType = row[columnIndex.eventType] ?? "";
      const eventTimestamp = row[columnIndex.eventTimestamp] ?? "";

      if (!externalUserId || !eventType || !eventTimestamp) {
        rowNumber += 1;
        continue;
      }

      const rowProviderValue = columnIndex.provider >= 0 ? row[columnIndex.provider] : undefined;
      const rowProvider = rowProviderValue ? String(rowProviderValue).trim().toUpperCase() : undefined;

      const resolvedProvider = rowProvider
        ? (IntegrationType[rowProvider as keyof typeof IntegrationType] ?? dto.provider)
        : dto.provider;

      if (resolvedProvider !== dto.provider) {
        throw new BadRequestException(
          `CSV row ${rowNumber} provider mismatch: expected ${dto.provider}, got ${resolvedProvider}`
        );
      }

      events.push({
        externalUserId,
        employeeNumber: row[columnIndex.employeeNumber] || undefined,
        eventType,
        eventTimestamp,
        deviceId: row[columnIndex.deviceId] || undefined,
        siteCode: row[columnIndex.siteCode] || undefined,
        rawPayload: {
          rowNumber,
          rawRow: row
        }
      });

      rowNumber += 1;
    }

    if (events.length === 0) {
      throw new BadRequestException("No valid attendance events found in CSV");
    }

    return this.ingestBatch(
      {
        companyId: company.id,
        provider: dto.provider,
        source: dto.source ?? AttendanceIngestionSource.CSV,
        events
      },
      requestMeta
    );
  }
}
