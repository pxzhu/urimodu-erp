import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { MembershipRole } from "@prisma/client";

import { AuthContext, RequestWithAuth } from "../../../common/auth/request-context";
import { CurrentAuth } from "../../../common/decorators/auth-context.decorator";
import { ApiCompanyContextHeader } from "../../../common/decorators/api-company-context-header.decorator";
import { Roles } from "../../../common/decorators/roles.decorator";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { SessionAuthGuard } from "../../../common/guards/session-auth.guard";
import { getHeaderValue } from "../../../common/utils/request.util";
import { CreateExpenseClaimExportJobDto } from "../dto/create-expense-claim-export-job.dto";
import { CreateVendorImportJobDto } from "../dto/create-vendor-import-job.dto";
import { ExportJobQueryDto } from "../dto/export-job-query.dto";
import { ImportJobQueryDto } from "../dto/import-job-query.dto";
import { ImportExportService } from "../services/import-export.service";

const JOB_WRITE_ROLES: MembershipRole[] = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"];

@ApiTags("import-export")
@ApiBearerAuth()
@ApiCompanyContextHeader(false)
@Controller("import-export")
@UseGuards(SessionAuthGuard, RolesGuard)
export class ImportExportController {
  constructor(private readonly importExportService: ImportExportService) {}

  @Get("import-jobs")
  @ApiOperation({ summary: "List import jobs" })
  listImportJobs(@CurrentAuth() auth: AuthContext, @Query() query: ImportJobQueryDto) {
    return this.importExportService.listImportJobs(auth, query);
  }

  @Get("import-jobs/:id")
  @ApiOperation({ summary: "Get import job detail" })
  getImportJob(@CurrentAuth() auth: AuthContext, @Param("id") importJobId: string) {
    return this.importExportService.getImportJob(auth, importJobId);
  }

  @Post("import-jobs/vendors")
  @Roles(...JOB_WRITE_ROLES)
  @ApiOperation({ summary: "Create vendor import job (CSV/XLSX)" })
  createVendorImportJob(
    @CurrentAuth() auth: AuthContext,
    @Body() dto: CreateVendorImportJobDto,
    @Req() req: RequestWithAuth
  ) {
    return this.importExportService.createVendorImportJob(auth, dto, {
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }

  @Get("export-jobs")
  @ApiOperation({ summary: "List export jobs" })
  listExportJobs(@CurrentAuth() auth: AuthContext, @Query() query: ExportJobQueryDto) {
    return this.importExportService.listExportJobs(auth, query);
  }

  @Get("export-jobs/:id")
  @ApiOperation({ summary: "Get export job detail" })
  getExportJob(@CurrentAuth() auth: AuthContext, @Param("id") exportJobId: string) {
    return this.importExportService.getExportJob(auth, exportJobId);
  }

  @Post("export-jobs/expense-claims")
  @Roles(...JOB_WRITE_ROLES)
  @ApiOperation({ summary: "Create expense claim export job (CSV/JSON)" })
  createExpenseClaimExportJob(
    @CurrentAuth() auth: AuthContext,
    @Body() dto: CreateExpenseClaimExportJobDto,
    @Req() req: RequestWithAuth
  ) {
    return this.importExportService.createExpenseClaimExportJob(auth, dto, {
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }
}
