import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { MembershipRole } from "@prisma/client";

import type { AuthContext } from "../../../common/auth/request-context";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { AuditService } from "../../audit/services/audit.service";
import type { CreateBusinessSiteDto } from "../dto/create-business-site.dto";
import type { CreateCompanyDto } from "../dto/create-company.dto";
import type { CreateDepartmentDto } from "../dto/create-department.dto";
import type { CreateLegalEntityDto } from "../dto/create-legal-entity.dto";
import type { UpdateCompanyDto } from "../dto/update-company.dto";
import type { UpdateDepartmentDto } from "../dto/update-department.dto";

@Injectable()
export class OrgService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  private assertCompanyAccess(auth: AuthContext, companyId: string): void {
    if (!auth.memberships.some((membership) => membership.companyId === companyId)) {
      throw new ForbiddenException("Company access denied");
    }
  }

  async listCompanies(auth: AuthContext) {
    const companyIds = auth.memberships.map((membership) => membership.companyId);
    return this.prisma.company.findMany({
      where: { id: { in: companyIds } },
      orderBy: { createdAt: "asc" }
    });
  }

  async getCompany(auth: AuthContext, companyId: string) {
    this.assertCompanyAccess(auth, companyId);

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        legalEntities: { orderBy: { createdAt: "asc" } },
        businessSites: { orderBy: { createdAt: "asc" } }
      }
    });

    if (!company) {
      throw new NotFoundException("Company not found");
    }

    return company;
  }

  async createCompany(auth: AuthContext, dto: CreateCompanyDto, requestMeta: { ipAddress?: string; userAgent?: string }) {
    const company = await this.prisma.company.create({
      data: {
        code: dto.code,
        name: dto.name,
        defaultLocale: dto.defaultLocale ?? "ko-KR",
        timezone: dto.timezone ?? "Asia/Seoul"
      }
    });

    await this.prisma.companyMembership.create({
      data: {
        companyId: company.id,
        userId: auth.userId,
        role: "SUPER_ADMIN"
      }
    });

    await this.auditService.log({
      companyId: company.id,
      actorId: auth.userId,
      entityType: "Company",
      entityId: company.id,
      action: "COMPANY_CREATE",
      afterJson: company,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    return company;
  }

  async updateCompany(
    auth: AuthContext,
    companyId: string,
    dto: UpdateCompanyDto,
    requestMeta: { ipAddress?: string; userAgent?: string }
  ) {
    this.assertCompanyAccess(auth, companyId);

    const before = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!before) {
      throw new NotFoundException("Company not found");
    }

    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data: dto
    });

    await this.auditService.log({
      companyId,
      actorId: auth.userId,
      entityType: "Company",
      entityId: companyId,
      action: "COMPANY_UPDATE",
      beforeJson: before,
      afterJson: updated,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    return updated;
  }

  async listLegalEntities(auth: AuthContext, companyId: string) {
    this.assertCompanyAccess(auth, companyId);

    return this.prisma.legalEntity.findMany({
      where: { companyId },
      orderBy: { createdAt: "asc" }
    });
  }

  async createLegalEntity(
    auth: AuthContext,
    dto: CreateLegalEntityDto,
    requestMeta: { ipAddress?: string; userAgent?: string }
  ) {
    this.assertCompanyAccess(auth, dto.companyId);

    const legalEntity = await this.prisma.legalEntity.create({
      data: {
        companyId: dto.companyId,
        code: dto.code,
        name: dto.name,
        registrationNumber: dto.registrationNumber,
        representativeName: dto.representativeName
      }
    });

    await this.auditService.log({
      companyId: dto.companyId,
      actorId: auth.userId,
      entityType: "LegalEntity",
      entityId: legalEntity.id,
      action: "LEGAL_ENTITY_CREATE",
      afterJson: legalEntity,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    return legalEntity;
  }

  async listBusinessSites(auth: AuthContext, companyId: string) {
    this.assertCompanyAccess(auth, companyId);

    return this.prisma.businessSite.findMany({
      where: { companyId },
      orderBy: { createdAt: "asc" }
    });
  }

  async createBusinessSite(
    auth: AuthContext,
    dto: CreateBusinessSiteDto,
    requestMeta: { ipAddress?: string; userAgent?: string }
  ) {
    this.assertCompanyAccess(auth, dto.companyId);

    const site = await this.prisma.businessSite.create({
      data: {
        companyId: dto.companyId,
        legalEntityId: dto.legalEntityId,
        code: dto.code,
        name: dto.name,
        address: dto.address,
        timezone: dto.timezone ?? "Asia/Seoul"
      }
    });

    await this.auditService.log({
      companyId: dto.companyId,
      actorId: auth.userId,
      entityType: "BusinessSite",
      entityId: site.id,
      action: "BUSINESS_SITE_CREATE",
      afterJson: site,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    return site;
  }

  async listDepartments(auth: AuthContext, companyId: string) {
    this.assertCompanyAccess(auth, companyId);

    return this.prisma.department.findMany({
      where: { companyId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    });
  }

  async listDepartmentTree(auth: AuthContext, companyId: string) {
    const departments = await this.listDepartments(auth, companyId);
    const byParent = new Map<string | null, typeof departments>();

    for (const department of departments) {
      const parentId = department.parentId ?? null;
      const group = byParent.get(parentId) ?? [];
      group.push(department);
      byParent.set(parentId, group);
    }

    const buildTree = (parentId: string | null): unknown[] => {
      const children = byParent.get(parentId) ?? [];
      return children.map((department) => ({
        ...department,
        children: buildTree(department.id)
      }));
    };

    return buildTree(null);
  }

  async createDepartment(
    auth: AuthContext,
    dto: CreateDepartmentDto,
    requestMeta: { ipAddress?: string; userAgent?: string }
  ) {
    this.assertCompanyAccess(auth, dto.companyId);

    const department = await this.prisma.department.create({
      data: {
        companyId: dto.companyId,
        businessSiteId: dto.businessSiteId,
        code: dto.code,
        name: dto.name,
        parentId: dto.parentId,
        managerEmployeeId: dto.managerEmployeeId,
        sortOrder: dto.sortOrder ?? 0
      }
    });

    await this.auditService.log({
      companyId: dto.companyId,
      actorId: auth.userId,
      entityType: "Department",
      entityId: department.id,
      action: "DEPARTMENT_CREATE",
      afterJson: department,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    return department;
  }

  async updateDepartment(
    auth: AuthContext,
    departmentId: string,
    dto: UpdateDepartmentDto,
    requestMeta: { ipAddress?: string; userAgent?: string }
  ) {
    const before = await this.prisma.department.findUnique({ where: { id: departmentId } });
    if (!before) {
      throw new NotFoundException("Department not found");
    }

    this.assertCompanyAccess(auth, before.companyId);

    const updated = await this.prisma.department.update({
      where: { id: departmentId },
      data: dto
    });

    await this.auditService.log({
      companyId: before.companyId,
      actorId: auth.userId,
      entityType: "Department",
      entityId: departmentId,
      action: "DEPARTMENT_UPDATE",
      beforeJson: before,
      afterJson: updated,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    return updated;
  }

  async deleteDepartment(auth: AuthContext, departmentId: string, requestMeta: { ipAddress?: string; userAgent?: string }) {
    const before = await this.prisma.department.findUnique({ where: { id: departmentId } });
    if (!before) {
      throw new NotFoundException("Department not found");
    }

    this.assertCompanyAccess(auth, before.companyId);

    await this.prisma.department.delete({ where: { id: departmentId } });

    await this.auditService.log({
      companyId: before.companyId,
      actorId: auth.userId,
      entityType: "Department",
      entityId: departmentId,
      action: "DEPARTMENT_DELETE",
      beforeJson: before,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    return { success: true };
  }

  hasRole(auth: AuthContext, roles: MembershipRole[]): boolean {
    return roles.includes(auth.role);
  }
}
