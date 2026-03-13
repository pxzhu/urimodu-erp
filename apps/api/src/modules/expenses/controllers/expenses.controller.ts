import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import type { AuthContext, RequestWithAuth } from "../../../common/auth/request-context";
import { CurrentAuth } from "../../../common/decorators/auth-context.decorator";
import { ApiCompanyContextHeader } from "../../../common/decorators/api-company-context-header.decorator";
import { SessionAuthGuard } from "../../../common/guards/session-auth.guard";
import { getHeaderValue } from "../../../common/utils/request.util";
import type { CreateExpenseClaimDto } from "../dto/create-expense-claim.dto";
import type { ExpenseClaimQueryDto } from "../dto/expense-claim-query.dto";
import { ExpensesService } from "../services/expenses.service";

@ApiTags("expenses")
@ApiBearerAuth()
@ApiCompanyContextHeader(false)
@Controller("expenses")
@UseGuards(SessionAuthGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get("claims")
  @ApiOperation({ summary: "List expense claims" })
  listClaims(@CurrentAuth() auth: AuthContext, @Query() query: ExpenseClaimQueryDto) {
    return this.expensesService.listClaims(auth, query);
  }

  @Get("claims/:id")
  @ApiOperation({ summary: "Get expense claim detail" })
  getClaim(@CurrentAuth() auth: AuthContext, @Param("id") claimId: string) {
    return this.expensesService.getClaim(auth, claimId);
  }

  @Post("claims")
  @ApiOperation({ summary: "Create expense claim" })
  createClaim(@CurrentAuth() auth: AuthContext, @Body() dto: CreateExpenseClaimDto, @Req() req: RequestWithAuth) {
    return this.expensesService.createClaim(auth, dto, {
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }
}
