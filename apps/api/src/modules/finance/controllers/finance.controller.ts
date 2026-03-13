import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { MembershipRole } from "@prisma/client";

import type { AuthContext, RequestWithAuth } from "../../../common/auth/request-context";
import { CurrentAuth } from "../../../common/decorators/auth-context.decorator";
import { ApiCompanyContextHeader } from "../../../common/decorators/api-company-context-header.decorator";
import { Roles } from "../../../common/decorators/roles.decorator";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { SessionAuthGuard } from "../../../common/guards/session-auth.guard";
import { getHeaderValue } from "../../../common/utils/request.util";
import type { AccountQueryDto } from "../dto/account-query.dto";
import type { CreateCostCenterDto } from "../dto/create-cost-center.dto";
import type { CreateJournalEntryDto } from "../dto/create-journal-entry.dto";
import type { CreateProjectDto } from "../dto/create-project.dto";
import type { CreateVendorDto } from "../dto/create-vendor.dto";
import type { JournalEntryQueryDto } from "../dto/journal-entry-query.dto";
import { FinanceService } from "../services/finance.service";

const FINANCE_WRITE_ROLES: MembershipRole[] = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"];

@ApiTags("finance")
@ApiBearerAuth()
@ApiCompanyContextHeader(false)
@Controller("finance")
@UseGuards(SessionAuthGuard, RolesGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get("accounts")
  @ApiOperation({ summary: "List chart of accounts" })
  listAccounts(@CurrentAuth() auth: AuthContext, @Query() query: AccountQueryDto) {
    return this.financeService.listAccounts(auth, query);
  }

  @Get("vendors")
  @ApiOperation({ summary: "List vendors" })
  listVendors(@CurrentAuth() auth: AuthContext) {
    return this.financeService.listVendors(auth);
  }

  @Post("vendors")
  @Roles(...FINANCE_WRITE_ROLES)
  @ApiOperation({ summary: "Create vendor" })
  createVendor(@CurrentAuth() auth: AuthContext, @Body() dto: CreateVendorDto, @Req() req: RequestWithAuth) {
    return this.financeService.createVendor(auth, dto, {
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }

  @Get("cost-centers")
  @ApiOperation({ summary: "List cost centers" })
  listCostCenters(@CurrentAuth() auth: AuthContext) {
    return this.financeService.listCostCenters(auth);
  }

  @Post("cost-centers")
  @Roles(...FINANCE_WRITE_ROLES)
  @ApiOperation({ summary: "Create cost center" })
  createCostCenter(@CurrentAuth() auth: AuthContext, @Body() dto: CreateCostCenterDto, @Req() req: RequestWithAuth) {
    return this.financeService.createCostCenter(auth, dto, {
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }

  @Get("projects")
  @ApiOperation({ summary: "List projects" })
  listProjects(@CurrentAuth() auth: AuthContext) {
    return this.financeService.listProjects(auth);
  }

  @Post("projects")
  @Roles(...FINANCE_WRITE_ROLES)
  @ApiOperation({ summary: "Create project" })
  createProject(@CurrentAuth() auth: AuthContext, @Body() dto: CreateProjectDto, @Req() req: RequestWithAuth) {
    return this.financeService.createProject(auth, dto, {
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }

  @Get("journal-entries")
  @ApiOperation({ summary: "List journal entries" })
  listJournalEntries(@CurrentAuth() auth: AuthContext, @Query() query: JournalEntryQueryDto) {
    return this.financeService.listJournalEntries(auth, query);
  }

  @Get("journal-entries/:id")
  @ApiOperation({ summary: "Get journal entry detail" })
  getJournalEntry(@CurrentAuth() auth: AuthContext, @Param("id") journalEntryId: string) {
    return this.financeService.getJournalEntry(auth, journalEntryId);
  }

  @Post("journal-entries")
  @Roles(...FINANCE_WRITE_ROLES)
  @ApiOperation({ summary: "Create journal entry" })
  createJournalEntry(
    @CurrentAuth() auth: AuthContext,
    @Body() dto: CreateJournalEntryDto,
    @Req() req: RequestWithAuth
  ) {
    return this.financeService.createJournalEntry(auth, dto, {
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }
}
