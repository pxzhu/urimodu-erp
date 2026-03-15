import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AttendanceEventType,
  AttendanceIngestionSource,
  Prisma,
  type AttendanceLedgerStatus,
  type IntegrationType,
  type MembershipRole
} from "@prisma/client";
import { createHash } from "node:crypto";

import type { AuthContext } from "../../../common/auth/request-context";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { toSerializable } from "../../../common/utils/serialization.util";
import { AuditService } from "../../audit/services/audit.service";
import type { AttendanceLedgerQueryDto } from "../dto/attendance-ledger-query.dto";
import type { AttendanceRawQueryDto } from "../dto/attendance-raw-query.dto";
import type { CreateShiftPolicyDto } from "../dto/create-shift-policy.dto";
import type { UpdateShiftPolicyDto } from "../dto/update-shift-policy.dto";

const POLICY_RW_ROLES: MembershipRole[] = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"];

interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
  actorId?: string;
}

export interface IngestRawAttendanceEventInput {
  companyId: string;
  businessSiteId?: string;
  employeeId?: string | null;
  provider: IntegrationType;
  source: AttendanceIngestionSource;
  externalUserId: string;
  eventType: AttendanceEventType;
  eventTimestamp: Date;
  deviceId?: string;
  siteCode?: string;
  rawPayload: Prisma.InputJsonValue;
  dedupeKey?: string;
}

interface DateRange {
  gte?: Date;
  lte?: Date;
}

function dateOnlyStart(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function dateOnlyEnd(value: string): Date {
  return new Date(`${value}T23:59:59.999Z`);
}

function normalizeShiftMinutes(input: { workStartMinutes: number; workEndMinutes: number }) {
  if (input.workStartMinutes === input.workEndMinutes) {
    throw new BadRequestException("workStartMinutes and workEndMinutes cannot be equal");
  }
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function toNullableInputJson(value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  private assertCompanyAccess(auth: AuthContext, companyId: string) {
    if (!auth.memberships.some((membership) => membership.companyId === companyId)) {
      throw new ForbiddenException("Company access denied");
    }
  }

  private assertPolicyWriteRole(auth: AuthContext) {
    if (!POLICY_RW_ROLES.includes(auth.role)) {
      throw new ForbiddenException("Role not allowed for shift policy write");
    }
  }

  private buildDateRange(fromDate?: string, toDate?: string): DateRange {
    const range: DateRange = {};
    if (fromDate) {
      range.gte = dateOnlyStart(fromDate);
    }

    if (toDate) {
      range.lte = dateOnlyEnd(toDate);
    }

    return range;
  }

  private buildDedupeHash(input: IngestRawAttendanceEventInput): string {
    const fingerprint = [
      input.companyId,
      input.provider,
      input.source,
      input.externalUserId,
      input.eventType,
      input.eventTimestamp.toISOString(),
      input.deviceId ?? "",
      input.siteCode ?? "",
      input.businessSiteId ?? "",
      input.employeeId ?? "",
      input.dedupeKey ?? ""
    ].join("|");

    return createHash("sha256").update(fingerprint).digest("hex");
  }

  async listRawEvents(auth: AuthContext, query: AttendanceRawQueryDto) {
    const companyId = auth.companyId;
    const dateRange = this.buildDateRange(query.fromDate, query.toDate);

    const events = await this.prisma.attendanceRawEvent.findMany({
      where: {
        companyId,
        employeeId: query.employeeId,
        provider: query.provider,
        source: query.source,
        normalized: query.normalized,
        eventTimestamp: dateRange
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            nameKr: true
          }
        },
        businessSite: {
          select: {
            id: true,
            code: true,
            name: true
          }
        }
      },
      orderBy: [{ eventTimestamp: "desc" }, { createdAt: "desc" }],
      take: query.limit ?? 100
    });

    return toSerializable(events);
  }

  async listLedger(auth: AuthContext, query: AttendanceLedgerQueryDto) {
    const companyId = auth.companyId;
    const dateRange = this.buildDateRange(query.fromDate, query.toDate);

    const ledgers = await this.prisma.attendanceLedger.findMany({
      where: {
        companyId,
        employeeId: query.employeeId,
        status: query.status,
        workDate: dateRange
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            nameKr: true
          }
        },
        shiftPolicy: {
          select: {
            id: true,
            code: true,
            name: true,
            version: true
          }
        },
        sourceEvents: {
          include: {
            rawEvent: {
              select: {
                id: true,
                provider: true,
                source: true,
                eventType: true,
                eventTimestamp: true,
                externalUserId: true,
                deviceId: true,
                siteCode: true,
                dedupeHash: true
              }
            }
          },
          orderBy: {
            rawEvent: {
              eventTimestamp: "asc"
            }
          }
        }
      },
      orderBy: [{ workDate: "desc" }, { updatedAt: "desc" }],
      take: query.limit ?? 100
    });

    return toSerializable(ledgers);
  }

  async listShiftPolicies(auth: AuthContext) {
    const policies = await this.prisma.shiftPolicy.findMany({
      where: { companyId: auth.companyId },
      include: {
        businessSite: {
          select: {
            id: true,
            code: true,
            name: true
          }
        }
      },
      orderBy: [{ code: "asc" }, { version: "desc" }]
    });

    return toSerializable(policies);
  }

  async createShiftPolicy(auth: AuthContext, dto: CreateShiftPolicyDto, requestMeta: RequestMeta) {
    this.assertPolicyWriteRole(auth);
    normalizeShiftMinutes(dto);

    if (dto.businessSiteId) {
      const site = await this.prisma.businessSite.findUnique({ where: { id: dto.businessSiteId } });
      if (!site || site.companyId !== auth.companyId) {
        throw new BadRequestException("Invalid businessSiteId");
      }
    }

    const latest = await this.prisma.shiftPolicy.findFirst({
      where: {
        companyId: auth.companyId,
        code: dto.code
      },
      orderBy: { version: "desc" }
    });

    const version = dto.version ?? (latest ? latest.version + 1 : 1);

    const created = await this.prisma.$transaction(async (transaction) => {
      if (dto.isDefault) {
        await transaction.shiftPolicy.updateMany({
          where: {
            companyId: auth.companyId,
            isDefault: true
          },
          data: {
            isDefault: false
          }
        });
      }

      return transaction.shiftPolicy.create({
        data: {
          companyId: auth.companyId,
          businessSiteId: dto.businessSiteId,
          code: dto.code,
          name: dto.name,
          version,
          timezone: dto.timezone ?? "Asia/Seoul",
          workStartMinutes: dto.workStartMinutes,
          workEndMinutes: dto.workEndMinutes,
          breakMinutes: dto.breakMinutes ?? 60,
          graceMinutes: dto.graceMinutes ?? 0,
          rulesJson: dto.rulesJson ? toInputJson(dto.rulesJson) : undefined,
          isDefault: dto.isDefault ?? false
        }
      });
    });

    await this.auditService.log({
      companyId: auth.companyId,
      actorId: requestMeta.actorId ?? auth.userId,
      entityType: "ShiftPolicy",
      entityId: created.id,
      action: "SHIFT_POLICY_CREATE",
      afterJson: created,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    return toSerializable(created);
  }

  async updateShiftPolicy(auth: AuthContext, policyId: string, dto: UpdateShiftPolicyDto, requestMeta: RequestMeta) {
    this.assertPolicyWriteRole(auth);

    const existing = await this.prisma.shiftPolicy.findUnique({ where: { id: policyId } });
    if (!existing) {
      throw new NotFoundException("Shift policy not found");
    }

    this.assertCompanyAccess(auth, existing.companyId);

    const workStartMinutes = dto.workStartMinutes ?? existing.workStartMinutes;
    const workEndMinutes = dto.workEndMinutes ?? existing.workEndMinutes;
    normalizeShiftMinutes({ workStartMinutes, workEndMinutes });

    const nextVersion = existing.version + 1;

    const createdVersion = await this.prisma.$transaction(async (transaction) => {
      if (dto.isDefault) {
        await transaction.shiftPolicy.updateMany({
          where: {
            companyId: auth.companyId,
            isDefault: true
          },
          data: {
            isDefault: false
          }
        });
      }

      return transaction.shiftPolicy.create({
        data: {
          companyId: existing.companyId,
          businessSiteId: existing.businessSiteId,
          code: existing.code,
          name: dto.name ?? existing.name,
          version: nextVersion,
          timezone: dto.timezone ?? existing.timezone,
          workStartMinutes,
          workEndMinutes,
          breakMinutes: dto.breakMinutes ?? existing.breakMinutes,
          graceMinutes: dto.graceMinutes ?? existing.graceMinutes,
          rulesJson: dto.rulesJson ? toInputJson(dto.rulesJson) : toNullableInputJson(existing.rulesJson),
          isDefault: dto.isDefault ?? existing.isDefault
        }
      });
    });

    await this.auditService.log({
      companyId: auth.companyId,
      actorId: requestMeta.actorId ?? auth.userId,
      entityType: "ShiftPolicy",
      entityId: createdVersion.id,
      action: "SHIFT_POLICY_VERSION_CREATE",
      beforeJson: existing,
      afterJson: createdVersion,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    return toSerializable(createdVersion);
  }

  async ingestRawEvent(input: IngestRawAttendanceEventInput, requestMeta: RequestMeta) {
    const dedupeHash = this.buildDedupeHash(input);

    try {
      const created = await this.prisma.attendanceRawEvent.create({
        data: {
          companyId: input.companyId,
          businessSiteId: input.businessSiteId,
          employeeId: input.employeeId,
          provider: input.provider,
          source: input.source,
          externalUserId: input.externalUserId,
          eventType: input.eventType,
          eventTimestamp: input.eventTimestamp,
          deviceId: input.deviceId,
          siteCode: input.siteCode,
          dedupeHash,
          rawPayload: input.rawPayload
        }
      });

      await this.auditService.log({
        companyId: input.companyId,
        actorId: requestMeta.actorId,
        entityType: "AttendanceRawEvent",
        entityId: created.id,
        action: "ATTENDANCE_RAW_INGEST",
        afterJson: {
          provider: created.provider,
          source: created.source,
          externalUserId: created.externalUserId,
          eventType: created.eventType,
          eventTimestamp: created.eventTimestamp,
          dedupeHash: created.dedupeHash
        },
        metadataJson: toInputJson({
          ingestVia: requestMeta.actorId ? "internal-user" : "integration",
          userAgent: requestMeta.userAgent
        }),
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent
      });

      return {
        deduped: false,
        rawEvent: toSerializable(created)
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await this.prisma.attendanceRawEvent.findUnique({
          where: {
            companyId_dedupeHash: {
              companyId: input.companyId,
              dedupeHash
            }
          }
        });

        if (!existing) {
          throw error;
        }

        return {
          deduped: true,
          rawEvent: toSerializable(existing)
        };
      }

      throw error;
    }
  }

  async resolveEmployeeForExternalIdentity(input: {
    companyId: string;
    provider: IntegrationType;
    externalUserId: string;
    employeeNumber?: string;
  }) {
    if (input.employeeNumber) {
      const employee = await this.prisma.employee.findUnique({
        where: {
          companyId_employeeNumber: {
            companyId: input.companyId,
            employeeNumber: input.employeeNumber
          }
        },
        select: {
          id: true,
          employeeNumber: true
        }
      });

      if (employee) {
        await this.prisma.employeeExternalIdentity
          .upsert({
            where: {
              provider_externalUserId: {
                provider: input.provider,
                externalUserId: input.externalUserId
              }
            },
            update: {
              employeeId: employee.id
            },
            create: {
              employeeId: employee.id,
              provider: input.provider,
              externalUserId: input.externalUserId
            }
          })
          .catch(() => undefined);

        return employee;
      }
    }

    const identity = await this.prisma.employeeExternalIdentity.findUnique({
      where: {
        provider_externalUserId: {
          provider: input.provider,
          externalUserId: input.externalUserId
        }
      },
      include: {
        employee: {
          select: {
            id: true,
            companyId: true,
            employeeNumber: true
          }
        }
      }
    });

    if (!identity || identity.employee.companyId !== input.companyId) {
      return null;
    }

    return {
      id: identity.employee.id,
      employeeNumber: identity.employee.employeeNumber
    };
  }

  async resolveCompany(input: { companyId?: string; companyCode?: string }) {
    if (input.companyId) {
      const byId = await this.prisma.company.findUnique({ where: { id: input.companyId } });
      if (!byId) {
        throw new NotFoundException("Company not found");
      }

      return byId;
    }

    if (input.companyCode) {
      const byCode = await this.prisma.company.findUnique({ where: { code: input.companyCode } });
      if (!byCode) {
        throw new NotFoundException("Company not found");
      }

      return byCode;
    }

    throw new BadRequestException("companyId or companyCode is required");
  }

  parseLedgerStatus(value: string): AttendanceLedgerStatus {
    const normalized = value.trim().toUpperCase();

    switch (normalized) {
      case "NORMAL":
      case "LATE":
      case "EARLY_LEAVE":
      case "ABSENT":
      case "ON_LEAVE":
      case "HOLIDAY":
      case "WEEKEND":
      case "NEEDS_REVIEW":
        return normalized;
      default:
        throw new BadRequestException(`Invalid attendance ledger status: ${value}`);
    }
  }
}
