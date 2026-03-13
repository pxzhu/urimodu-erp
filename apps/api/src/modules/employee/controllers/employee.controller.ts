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
import { CreateEmployeeDto } from "../dto/create-employee.dto";
import { CreateJobTitleDto } from "../dto/create-job-title.dto";
import { CreatePositionDto } from "../dto/create-position.dto";
import { EmployeeQueryDto } from "../dto/employee-query.dto";
import { UpdateEmployeeDto } from "../dto/update-employee.dto";
import { EmployeeService } from "../services/employee.service";

const EMPLOYEE_RW_ROLES: MembershipRole[] = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"];

@ApiTags("employee")
@ApiBearerAuth()
@ApiCompanyContextHeader(false)
@Controller()
@UseGuards(SessionAuthGuard, RolesGuard)
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Get("employees")
  @ApiOperation({ summary: "List employees" })
  listEmployees(@CurrentAuth() auth: AuthContext, @Query() query: EmployeeQueryDto) {
    return this.employeeService.listEmployees(auth, query.companyId);
  }

  @Get("employees/:id")
  @ApiOperation({ summary: "Get employee detail" })
  getEmployee(@CurrentAuth() auth: AuthContext, @Param("id") employeeId: string) {
    return this.employeeService.getEmployee(auth, employeeId);
  }

  @Post("employees")
  @Roles(...EMPLOYEE_RW_ROLES)
  @ApiOperation({ summary: "Create employee" })
  createEmployee(@CurrentAuth() auth: AuthContext, @Body() dto: CreateEmployeeDto, @Req() req: RequestWithAuth) {
    return this.employeeService.createEmployee(auth, dto, {
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }

  @Patch("employees/:id")
  @Roles(...EMPLOYEE_RW_ROLES)
  @ApiOperation({ summary: "Update employee" })
  updateEmployee(
    @CurrentAuth() auth: AuthContext,
    @Param("id") employeeId: string,
    @Body() dto: UpdateEmployeeDto,
    @Req() req: RequestWithAuth
  ) {
    return this.employeeService.updateEmployee(auth, employeeId, dto, {
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }

  @Delete("employees/:id")
  @Roles(...EMPLOYEE_RW_ROLES)
  @ApiOperation({ summary: "Delete employee" })
  deleteEmployee(@CurrentAuth() auth: AuthContext, @Param("id") employeeId: string, @Req() req: RequestWithAuth) {
    return this.employeeService.deleteEmployee(auth, employeeId, {
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }

  @Get("positions")
  @ApiOperation({ summary: "List positions" })
  listPositions(@CurrentAuth() auth: AuthContext, @Query("companyId") companyId: string) {
    return this.employeeService.listPositions(auth, companyId);
  }

  @Post("positions")
  @Roles(...EMPLOYEE_RW_ROLES)
  @ApiOperation({ summary: "Create position" })
  createPosition(@CurrentAuth() auth: AuthContext, @Body() dto: CreatePositionDto, @Req() req: RequestWithAuth) {
    return this.employeeService.createPosition(auth, dto, {
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }

  @Get("job-titles")
  @ApiOperation({ summary: "List job titles" })
  listJobTitles(@CurrentAuth() auth: AuthContext, @Query("companyId") companyId: string) {
    return this.employeeService.listJobTitles(auth, companyId);
  }

  @Post("job-titles")
  @Roles(...EMPLOYEE_RW_ROLES)
  @ApiOperation({ summary: "Create job title" })
  createJobTitle(@CurrentAuth() auth: AuthContext, @Body() dto: CreateJobTitleDto, @Req() req: RequestWithAuth) {
    return this.employeeService.createJobTitle(auth, dto, {
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }
}
