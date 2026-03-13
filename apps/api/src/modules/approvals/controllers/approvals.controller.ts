import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import type { AuthContext, RequestWithAuth } from "../../../common/auth/request-context";
import { CurrentAuth } from "../../../common/decorators/auth-context.decorator";
import { ApiCompanyContextHeader } from "../../../common/decorators/api-company-context-header.decorator";
import { SessionAuthGuard } from "../../../common/guards/session-auth.guard";
import { getHeaderValue } from "../../../common/utils/request.util";
import { ApprovalActionCommentDto } from "../dto/approval-action-comment.dto";
import { ConfigureApprovalLineDto } from "../dto/configure-approval-line.dto";
import { ApprovalsService } from "../services/approvals.service";

@ApiTags("approvals")
@ApiBearerAuth()
@ApiCompanyContextHeader(false)
@Controller("approvals")
@UseGuards(SessionAuthGuard)
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Post("lines")
  @ApiOperation({ summary: "Configure approval line for a document" })
  configureLine(@CurrentAuth() auth: AuthContext, @Body() dto: ConfigureApprovalLineDto, @Req() req: RequestWithAuth) {
    return this.approvalsService.configureLine(auth, dto, {
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }

  @Get("lines/:id")
  @ApiOperation({ summary: "Get approval line detail" })
  getLine(@CurrentAuth() auth: AuthContext, @Param("id") lineId: string) {
    return this.approvalsService.getLine(auth, lineId);
  }

  @Post("lines/:id/submit")
  @ApiOperation({ summary: "Submit approval line" })
  submit(@CurrentAuth() auth: AuthContext, @Param("id") lineId: string, @Req() req: RequestWithAuth) {
    return this.approvalsService.submit(auth, lineId, {
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }

  @Post("lines/:id/approve")
  @ApiOperation({ summary: "Approve current step" })
  approve(
    @CurrentAuth() auth: AuthContext,
    @Param("id") lineId: string,
    @Body() dto: ApprovalActionCommentDto,
    @Req() req: RequestWithAuth
  ) {
    return this.approvalsService.approve(auth, lineId, dto, {
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }

  @Post("lines/:id/reject")
  @ApiOperation({ summary: "Reject current step" })
  reject(
    @CurrentAuth() auth: AuthContext,
    @Param("id") lineId: string,
    @Body() dto: ApprovalActionCommentDto,
    @Req() req: RequestWithAuth
  ) {
    return this.approvalsService.reject(auth, lineId, dto, {
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }

  @Post("lines/:id/cancel")
  @ApiOperation({ summary: "Cancel approval line" })
  cancel(
    @CurrentAuth() auth: AuthContext,
    @Param("id") lineId: string,
    @Body() dto: ApprovalActionCommentDto,
    @Req() req: RequestWithAuth
  ) {
    return this.approvalsService.cancel(auth, lineId, dto, {
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }

  @Post("lines/:id/resubmit")
  @ApiOperation({ summary: "Resubmit canceled/rejected line" })
  resubmit(
    @CurrentAuth() auth: AuthContext,
    @Param("id") lineId: string,
    @Body() dto: ApprovalActionCommentDto,
    @Req() req: RequestWithAuth
  ) {
    return this.approvalsService.resubmit(auth, lineId, dto, {
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }

  @Get("inbox")
  @ApiOperation({ summary: "List approval tasks waiting for current user" })
  listInbox(@CurrentAuth() auth: AuthContext) {
    return this.approvalsService.listInbox(auth);
  }
}
