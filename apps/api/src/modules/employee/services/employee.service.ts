import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";

import type { AuthContext } from "../../../common/auth/request-context";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { AuditService } from "../../audit/services/audit.service";
import type { CreateEmployeeDto } from "../dto/create-employee.dto";
import type { CreateJobTitleDto } from "../dto/create-job-title.dto";
import type { CreatePositionDto } from "../dto/create-position.dto";
import type { UpdateEmployeeDto } from "../dto/update-employee.dto";
import { toMaskedEmployee } from "./employee.presenter";

@Injectable()
export class EmployeeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  private assertCompanyAccess(auth: AuthContext, companyId: string): void {
    if (!auth.memberships.some((membership) => membership.companyId === companyId)) {
      throw new ForbiddenException("Company access denied");
    }
  }

  async listEmployees(auth: AuthContext, companyId: string) {
    this.assertCompanyAccess(auth, companyId);

    const employees = await this.prisma.employee.findMany({
      where: { companyId },
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, name: true } },
        jobTitle: { select: { id: true, name: true } }
      },
      orderBy: [{ employeeNumber: "asc" }]
    });

    return employees.map(toMaskedEmployee);
  }

  async getEmployee(auth: AuthContext, employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, name: true } },
        jobTitle: { select: { id: true, name: true } }
      }
    });

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }

    this.assertCompanyAccess(auth, employee.companyId);
    return toMaskedEmployee(employee);
  }

  async createEmployee(
    auth: AuthContext,
    dto: CreateEmployeeDto,
    requestMeta: { ipAddress?: string; userAgent?: string }
  ) {
    this.assertCompanyAccess(auth, dto.companyId);

    const employee = await this.prisma.employee.create({
      data: {
        companyId: dto.companyId,
        legalEntityId: dto.legalEntityId,
        businessSiteId: dto.businessSiteId,
        departmentId: dto.departmentId,
        positionId: dto.positionId,
        jobTitleId: dto.jobTitleId,
        managerId: dto.managerId,
        employeeNumber: dto.employeeNumber,
        nameKr: dto.nameKr,
        nameEn: dto.nameEn,
        workEmail: dto.workEmail,
        mobilePhone: dto.mobilePhone,
        nationalIdMasked: dto.nationalIdMasked,
        hireDate: new Date(dto.hireDate),
        employmentType: dto.employmentType
      },
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, name: true } },
        jobTitle: { select: { id: true, name: true } }
      }
    });

    await this.auditService.log({
      companyId: dto.companyId,
      actorId: auth.userId,
      entityType: "Employee",
      entityId: employee.id,
      action: "EMPLOYEE_CREATE",
      afterJson: employee,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    return toMaskedEmployee(employee);
  }

  async updateEmployee(
    auth: AuthContext,
    employeeId: string,
    dto: UpdateEmployeeDto,
    requestMeta: { ipAddress?: string; userAgent?: string }
  ) {
    const before = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!before) {
      throw new NotFoundException("Employee not found");
    }

    this.assertCompanyAccess(auth, before.companyId);

    const updated = await this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        ...dto,
        terminationDate: dto.terminationDate ? new Date(dto.terminationDate) : dto.terminationDate
      },
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, name: true } },
        jobTitle: { select: { id: true, name: true } }
      }
    });

    await this.auditService.log({
      companyId: before.companyId,
      actorId: auth.userId,
      entityType: "Employee",
      entityId: employeeId,
      action: "EMPLOYEE_UPDATE",
      beforeJson: before,
      afterJson: updated,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    return toMaskedEmployee(updated);
  }

  async deleteEmployee(auth: AuthContext, employeeId: string, requestMeta: { ipAddress?: string; userAgent?: string }) {
    const before = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!before) {
      throw new NotFoundException("Employee not found");
    }

    this.assertCompanyAccess(auth, before.companyId);

    await this.prisma.employee.delete({ where: { id: employeeId } });

    await this.auditService.log({
      companyId: before.companyId,
      actorId: auth.userId,
      entityType: "Employee",
      entityId: employeeId,
      action: "EMPLOYEE_DELETE",
      beforeJson: before,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    return { success: true };
  }

  async listPositions(auth: AuthContext, companyId: string) {
    this.assertCompanyAccess(auth, companyId);

    return this.prisma.position.findMany({
      where: { companyId },
      orderBy: { createdAt: "asc" }
    });
  }

  async createPosition(auth: AuthContext, dto: CreatePositionDto, requestMeta: { ipAddress?: string; userAgent?: string }) {
    this.assertCompanyAccess(auth, dto.companyId);

    const position = await this.prisma.position.create({
      data: {
        companyId: dto.companyId,
        code: dto.code,
        name: dto.name
      }
    });

    await this.auditService.log({
      companyId: dto.companyId,
      actorId: auth.userId,
      entityType: "Position",
      entityId: position.id,
      action: "POSITION_CREATE",
      afterJson: position,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    return position;
  }

  async listJobTitles(auth: AuthContext, companyId: string) {
    this.assertCompanyAccess(auth, companyId);

    return this.prisma.jobTitle.findMany({
      where: { companyId },
      orderBy: { createdAt: "asc" }
    });
  }

  async createJobTitle(auth: AuthContext, dto: CreateJobTitleDto, requestMeta: { ipAddress?: string; userAgent?: string }) {
    this.assertCompanyAccess(auth, dto.companyId);

    const jobTitle = await this.prisma.jobTitle.create({
      data: {
        companyId: dto.companyId,
        code: dto.code,
        name: dto.name
      }
    });

    await this.auditService.log({
      companyId: dto.companyId,
      actorId: auth.userId,
      entityType: "JobTitle",
      entityId: jobTitle.id,
      action: "JOB_TITLE_CREATE",
      afterJson: jobTitle,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    return jobTitle;
  }
}
