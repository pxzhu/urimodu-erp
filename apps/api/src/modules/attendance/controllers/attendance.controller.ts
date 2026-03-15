import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { MembershipRole } from "@prisma/client";

import { AuthContext, RequestWithAuth } from "../../../common/auth/request-context";
import { CurrentAuth } from "../../../common/decorators/auth-context.decorator";
import { ApiCompanyContextHeader } from "../../../common/decorators/api-company-context-header.decorator";
import { Roles } from "../../../common/decorators/roles.decorator";
import { SessionAuthGuard } from "../../../common/guards/session-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { getHeaderValue } from "../../../common/utils/request.util";
import { AttendanceLedgerQueryDto } from "../dto/attendance-ledger-query.dto";
import { AttendanceRawQueryDto } from "../dto/attendance-raw-query.dto";
import { CreateShiftPolicyDto } from "../dto/create-shift-policy.dto";
import { UpdateShiftPolicyDto } from "../dto/update-shift-policy.dto";
import { AttendanceService } from "../services/attendance.service";

const SHIFT_POLICY_RW_ROLES: MembershipRole[] = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"];

@ApiTags("attendance")
@ApiBearerAuth()
@ApiCompanyContextHeader(false)
@Controller("attendance")
@UseGuards(SessionAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get("raw-events")
  @ApiOperation({ summary: "List raw attendance events" })
  listRawEvents(@CurrentAuth() auth: AuthContext, @Query() query: AttendanceRawQueryDto) {
    return this.attendanceService.listRawEvents(auth, query);
  }

  @Get("ledgers")
  @ApiOperation({ summary: "List normalized attendance ledgers" })
  listLedgers(@CurrentAuth() auth: AuthContext, @Query() query: AttendanceLedgerQueryDto) {
    return this.attendanceService.listLedger(auth, query);
  }

  @Get("shift-policies")
  @ApiOperation({ summary: "List shift policies" })
  listShiftPolicies(@CurrentAuth() auth: AuthContext) {
    return this.attendanceService.listShiftPolicies(auth);
  }

  @Post("shift-policies")
  @Roles(...SHIFT_POLICY_RW_ROLES)
  @ApiOperation({ summary: "Create shift policy" })
  createShiftPolicy(
    @CurrentAuth() auth: AuthContext,
    @Body() dto: CreateShiftPolicyDto,
    @Req() req: RequestWithAuth
  ) {
    return this.attendanceService.createShiftPolicy(auth, dto, {
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }

  @Patch("shift-policies/:id")
  @Roles(...SHIFT_POLICY_RW_ROLES)
  @ApiOperation({ summary: "Create next policy version from existing shift policy" })
  updateShiftPolicy(
    @CurrentAuth() auth: AuthContext,
    @Param("id") policyId: string,
    @Body() dto: UpdateShiftPolicyDto,
    @Req() req: RequestWithAuth
  ) {
    return this.attendanceService.updateShiftPolicy(auth, policyId, dto, {
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }
}
