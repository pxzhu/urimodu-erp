import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../../common/prisma/prisma.service";

interface AuditLogInput {
  companyId?: string | null;
  actorId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  beforeJson?: unknown;
  afterJson?: unknown;
  metadataJson?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}

function toInputJson(value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value as Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput) {
    return this.prisma.auditLog.create({
      data: {
        companyId: input.companyId,
        actorId: input.actorId,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        beforeJson: toInputJson(input.beforeJson),
        afterJson: toInputJson(input.afterJson),
        metadataJson: toInputJson(input.metadataJson),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent
      }
    });
  }
}
