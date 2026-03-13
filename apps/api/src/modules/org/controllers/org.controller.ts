import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { MembershipRole } from "@prisma/client";

import { CurrentAuth } from "../../../common/decorators/auth-context.decorator";
import { ApiCompanyContextHeader } from "../../../common/decorators/api-company-context-header.decorator";
import { Roles } from "../../../common/decorators/roles.decorator";
import { SessionAuthGuard } from "../../../common/guards/session-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import type { AuthContext, RequestWithAuth } from "../../../common/auth/request-context";
import { getHeaderValue } from "../../../common/utils/request.util";
import { CreateBusinessSiteDto } from "../dto/create-business-site.dto";
import { CreateCompanyDto } from "../dto/create-company.dto";
import { CreateDepartmentDto } from "../dto/create-department.dto";
import { CreateLegalEntityDto } from "../dto/create-legal-entity.dto";
import { DepartmentQueryDto } from "../dto/department-query.dto";
import { UpdateCompanyDto } from "../dto/update-company.dto";
import { UpdateDepartmentDto } from "../dto/update-department.dto";
import { OrgService } from "../services/org.service";

const ORG_RW_ROLES: MembershipRole[] = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"];

@ApiTags("org")
@ApiBearerAuth()
@ApiCompanyContextHeader(false)
@Controller()
@UseGuards(SessionAuthGuard, RolesGuard)
export class OrgController {
  constructor(private readonly orgService: OrgService) {}

  @Get("companies")
  @ApiOperation({ summary: "List companies for current user" })
  listCompanies(@CurrentAuth() auth: AuthContext) {
    return this.orgService.listCompanies(auth);
  }

  @Post("companies")
  @Roles("SUPER_ADMIN")
  @ApiOperation({ summary: "Create company" })
  createCompany(@CurrentAuth() auth: AuthContext, @Body() dto: CreateCompanyDto, @Req() req: RequestWithAuth) {
    return this.orgService.createCompany(auth, dto, {
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }

  @Get("companies/:id")
  @ApiOperation({ summary: "Get company detail" })
  getCompany(@CurrentAuth() auth: AuthContext, @Param("id") companyId: string) {
    return this.orgService.getCompany(auth, companyId);
  }

  @Patch("companies/:id")
  @Roles(...ORG_RW_ROLES)
  @ApiOperation({ summary: "Update company" })
  updateCompany(
    @CurrentAuth() auth: AuthContext,
    @Param("id") companyId: string,
    @Body() dto: UpdateCompanyDto,
    @Req() req: RequestWithAuth
  ) {
    return this.orgService.updateCompany(auth, companyId, dto, {
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }

  @Get("legal-entities")
  @ApiOperation({ summary: "List legal entities" })
  listLegalEntities(@CurrentAuth() auth: AuthContext, @Query("companyId") companyId: string) {
    return this.orgService.listLegalEntities(auth, companyId);
  }

  @Post("legal-entities")
  @Roles(...ORG_RW_ROLES)
  @ApiOperation({ summary: "Create legal entity" })
  createLegalEntity(
    @CurrentAuth() auth: AuthContext,
    @Body() dto: CreateLegalEntityDto,
    @Req() req: RequestWithAuth
  ) {
    return this.orgService.createLegalEntity(auth, dto, {
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }

  @Get("business-sites")
  @ApiOperation({ summary: "List business sites" })
  listBusinessSites(@CurrentAuth() auth: AuthContext, @Query("companyId") companyId: string) {
    return this.orgService.listBusinessSites(auth, companyId);
  }

  @Post("business-sites")
  @Roles(...ORG_RW_ROLES)
  @ApiOperation({ summary: "Create business site" })
  createBusinessSite(
    @CurrentAuth() auth: AuthContext,
    @Body() dto: CreateBusinessSiteDto,
    @Req() req: RequestWithAuth
  ) {
    return this.orgService.createBusinessSite(auth, dto, {
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }

  @Get("departments")
  @ApiOperation({ summary: "List departments" })
  listDepartments(@CurrentAuth() auth: AuthContext, @Query() query: DepartmentQueryDto) {
    return this.orgService.listDepartments(auth, query.companyId);
  }

  @Get("departments/tree")
  @ApiOperation({ summary: "List department tree" })
  listDepartmentTree(@CurrentAuth() auth: AuthContext, @Query() query: DepartmentQueryDto) {
    return this.orgService.listDepartmentTree(auth, query.companyId);
  }

  @Post("departments")
  @Roles(...ORG_RW_ROLES)
  @ApiOperation({ summary: "Create department" })
  createDepartment(@CurrentAuth() auth: AuthContext, @Body() dto: CreateDepartmentDto, @Req() req: RequestWithAuth) {
    return this.orgService.createDepartment(auth, dto, {
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }

  @Patch("departments/:id")
  @Roles(...ORG_RW_ROLES)
  @ApiOperation({ summary: "Update department" })
  updateDepartment(
    @CurrentAuth() auth: AuthContext,
    @Param("id") departmentId: string,
    @Body() dto: UpdateDepartmentDto,
    @Req() req: RequestWithAuth
  ) {
    return this.orgService.updateDepartment(auth, departmentId, dto, {
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }

  @Delete("departments/:id")
  @Roles(...ORG_RW_ROLES)
  @ApiOperation({ summary: "Delete department" })
  deleteDepartment(@CurrentAuth() auth: AuthContext, @Param("id") departmentId: string, @Req() req: RequestWithAuth) {
    return this.orgService.deleteDepartment(auth, departmentId, {
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }
}
