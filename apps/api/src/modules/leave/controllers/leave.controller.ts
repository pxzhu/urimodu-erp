import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import type { AuthContext, RequestWithAuth } from "../../../common/auth/request-context";
import { CurrentAuth } from "../../../common/decorators/auth-context.decorator";
import { ApiCompanyContextHeader } from "../../../common/decorators/api-company-context-header.decorator";
import { SessionAuthGuard } from "../../../common/guards/session-auth.guard";
import { getHeaderValue } from "../../../common/utils/request.util";
import type { AttendanceCorrectionQueryDto } from "../dto/attendance-correction-query.dto";
import type { CreateAttendanceCorrectionDto } from "../dto/create-attendance-correction.dto";
import type { CreateLeaveRequestDto } from "../dto/create-leave-request.dto";
import type { LeaveRequestQueryDto } from "../dto/leave-request-query.dto";
import { LeaveService } from "../services/leave.service";

@ApiTags("leave")
@ApiBearerAuth()
@ApiCompanyContextHeader(false)
@Controller()
@UseGuards(SessionAuthGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Get("leave/policies")
  @ApiOperation({ summary: "List leave policies" })
  listLeavePolicies(@CurrentAuth() auth: AuthContext) {
    return this.leaveService.listLeavePolicies(auth);
  }

  @Get("leave/requests")
  @ApiOperation({ summary: "List leave requests" })
  listLeaveRequests(@CurrentAuth() auth: AuthContext, @Query() query: LeaveRequestQueryDto) {
    return this.leaveService.listLeaveRequests(auth, query);
  }

  @Post("leave/requests")
  @ApiOperation({ summary: "Create leave request" })
  createLeaveRequest(@CurrentAuth() auth: AuthContext, @Body() dto: CreateLeaveRequestDto, @Req() req: RequestWithAuth) {
    return this.leaveService.createLeaveRequest(auth, dto, {
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }

  @Get("attendance-corrections")
  @ApiOperation({ summary: "List attendance correction requests" })
  listAttendanceCorrections(@CurrentAuth() auth: AuthContext, @Query() query: AttendanceCorrectionQueryDto) {
    return this.leaveService.listAttendanceCorrections(auth, query);
  }

  @Post("attendance-corrections")
  @ApiOperation({ summary: "Create attendance correction request" })
  createAttendanceCorrection(
    @CurrentAuth() auth: AuthContext,
    @Body() dto: CreateAttendanceCorrectionDto,
    @Req() req: RequestWithAuth
  ) {
    return this.leaveService.createAttendanceCorrection(auth, dto, {
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }
}
