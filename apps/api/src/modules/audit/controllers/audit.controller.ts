import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { MembershipRole } from "@prisma/client";

import { CurrentAuth } from "../../../common/decorators/auth-context.decorator";
import { ApiCompanyContextHeader } from "../../../common/decorators/api-company-context-header.decorator";
import { Roles } from "../../../common/decorators/roles.decorator";
import type { AuthContext } from "../../../common/auth/request-context";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { SessionAuthGuard } from "../../../common/guards/session-auth.guard";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { AuditLogQueryDto } from "../dto/audit-log-query.dto";

const AUDIT_VIEW_ROLES: MembershipRole[] = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"];

@ApiTags("audit")
@ApiBearerAuth()
@ApiCompanyContextHeader(false)
@Controller("audit-logs")
@UseGuards(SessionAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: "List audit logs" })
  @Roles(...AUDIT_VIEW_ROLES)
  async list(@CurrentAuth() auth: AuthContext, @Query() query: AuditLogQueryDto) {
    const companyId = query.companyId ?? auth.companyId;

    return this.prisma.auditLog.findMany({
      where: {
        companyId,
        entityType: query.entityType,
        entityId: query.entityId
      },
      orderBy: { createdAt: "desc" },
      take: query.limit ?? 50
    });
  }
}
