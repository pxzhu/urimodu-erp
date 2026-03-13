import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ExpenseStatus, Prisma, type MembershipRole } from "@prisma/client";

import type { AuthContext } from "../../../common/auth/request-context";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { toSerializable } from "../../../common/utils/serialization.util";
import { AuditService } from "../../audit/services/audit.service";
import type { CreateExpenseClaimDto } from "../dto/create-expense-claim.dto";
import type { ExpenseClaimQueryDto } from "../dto/expense-claim-query.dto";

interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

const ADMIN_ROLES: MembershipRole[] = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"];

function dateOnlyStart(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function dateOnlyEnd(value: string): Date {
  return new Date(`${value}T23:59:59.999Z`);
}

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toString());
}

function normalizeCurrency(input?: string): string {
  if (!input) {
    return "KRW";
  }

  return input.trim().toUpperCase() || "KRW";
}

function sumClaimTotal(items: CreateExpenseClaimDto["items"]): Prisma.Decimal {
  return items.reduce((sum, item) => {
    const net = toDecimal(item.amount);
    const vat = item.vatAmount !== undefined ? toDecimal(item.vatAmount) : new Prisma.Decimal(0);
    return sum.plus(net).plus(vat);
  }, new Prisma.Decimal(0));
}

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  private isAdminRole(role: MembershipRole): boolean {
    return ADMIN_ROLES.includes(role);
  }

  private async resolveCurrentEmployee(auth: AuthContext) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        companyId: auth.companyId,
        userId: auth.userId,
        employmentStatus: "ACTIVE"
      },
      select: {
        id: true,
        employeeNumber: true,
        nameKr: true,
        legalEntityId: true
      }
    });

    if (!employee) {
      throw new ForbiddenException("Active employee profile is required");
    }

    return employee;
  }

  private buildCreatedAtRange(fromDate?: string, toDate?: string) {
    return {
      gte: fromDate ? dateOnlyStart(fromDate) : undefined,
      lte: toDate ? dateOnlyEnd(toDate) : undefined
    };
  }

  private async resolveClaimEmployee(auth: AuthContext, requestedEmployeeId?: string) {
    const currentEmployee = await this.resolveCurrentEmployee(auth);

    if (!requestedEmployeeId) {
      return currentEmployee;
    }

    if (requestedEmployeeId === currentEmployee.id) {
      return currentEmployee;
    }

    if (!this.isAdminRole(auth.role)) {
      throw new ForbiddenException("Only admin roles can create claims for another employee");
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: requestedEmployeeId },
      select: {
        id: true,
        companyId: true,
        employeeNumber: true,
        nameKr: true,
        legalEntityId: true
      }
    });

    if (!employee || employee.companyId !== auth.companyId) {
      throw new NotFoundException("Employee not found");
    }

    return employee;
  }

  private async validateOptionalReference(input: {
    companyId: string;
    legalEntityId?: string;
    costCenterId?: string;
    projectId?: string;
    documentId?: string;
  }) {
    if (input.legalEntityId) {
      const legalEntity = await this.prisma.legalEntity.findUnique({
        where: { id: input.legalEntityId },
        select: { id: true, companyId: true }
      });

      if (!legalEntity || legalEntity.companyId !== input.companyId) {
        throw new BadRequestException("Invalid legalEntityId");
      }
    }

    if (input.costCenterId) {
      const costCenter = await this.prisma.costCenter.findUnique({
        where: { id: input.costCenterId },
        select: { id: true, companyId: true }
      });

      if (!costCenter || costCenter.companyId !== input.companyId) {
        throw new BadRequestException("Invalid costCenterId");
      }
    }

    if (input.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: input.projectId },
        select: { id: true, companyId: true }
      });

      if (!project || project.companyId !== input.companyId) {
        throw new BadRequestException("Invalid projectId");
      }
    }

    if (input.documentId) {
      const document = await this.prisma.document.findUnique({
        where: { id: input.documentId },
        select: { id: true, companyId: true }
      });

      if (!document || document.companyId !== input.companyId) {
        throw new BadRequestException("Invalid documentId");
      }
    }
  }

  private async validateItemReferences(companyId: string, dto: CreateExpenseClaimDto) {
    const vendorIds = [...new Set(dto.items.map((item) => item.vendorId).filter((value): value is string => Boolean(value)))];
    const receiptFileIds = [
      ...new Set(dto.items.map((item) => item.receiptFileId).filter((value): value is string => Boolean(value)))
    ];

    if (vendorIds.length > 0) {
      const vendors = await this.prisma.vendor.findMany({
        where: {
          id: { in: vendorIds },
          companyId
        },
        select: { id: true }
      });
      const found = new Set(vendors.map((vendor) => vendor.id));
      const invalid = vendorIds.find((id) => !found.has(id));
      if (invalid) {
        throw new BadRequestException(`Invalid vendorId: ${invalid}`);
      }
    }

    if (receiptFileIds.length > 0) {
      const files = await this.prisma.fileObject.findMany({
        where: {
          id: { in: receiptFileIds },
          companyId,
          status: "ACTIVE"
        },
        select: { id: true }
      });

      const found = new Set(files.map((file) => file.id));
      const invalid = receiptFileIds.find((id) => !found.has(id));
      if (invalid) {
        throw new BadRequestException(`Invalid receiptFileId: ${invalid}`);
      }
    }
  }

  async listClaims(auth: AuthContext, query: ExpenseClaimQueryDto) {
    let employeeIdFilter = query.employeeId;

    if (!this.isAdminRole(auth.role)) {
      const currentEmployee = await this.resolveCurrentEmployee(auth);
      employeeIdFilter = currentEmployee.id;
    }

    const claims = await this.prisma.expenseClaim.findMany({
      where: {
        companyId: auth.companyId,
        status: query.status,
        employeeId: employeeIdFilter,
        createdAt: this.buildCreatedAtRange(query.fromDate, query.toDate)
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            nameKr: true
          }
        },
        costCenter: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        project: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        _count: {
          select: {
            items: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: query.limit ?? 100
    });

    return toSerializable(claims);
  }

  async getClaim(auth: AuthContext, claimId: string) {
    const claim = await this.prisma.expenseClaim.findUnique({
      where: { id: claimId },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            nameKr: true
          }
        },
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        costCenter: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        project: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        document: {
          select: {
            id: true,
            title: true,
            status: true
          }
        },
        items: {
          include: {
            vendor: {
              select: {
                id: true,
                code: true,
                name: true
              }
            },
            receiptFile: {
              select: {
                id: true,
                originalName: true,
                mimeType: true,
                sizeBytes: true,
                createdAt: true
              }
            }
          },
          orderBy: [{ incurredOn: "asc" }, { createdAt: "asc" }]
        },
        journalEntries: {
          select: {
            id: true,
            number: true,
            status: true,
            entryDate: true,
            totalDebit: true,
            totalCredit: true
          },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!claim) {
      throw new NotFoundException("Expense claim not found");
    }

    if (claim.companyId !== auth.companyId) {
      throw new ForbiddenException("Expense claim access denied");
    }

    if (!this.isAdminRole(auth.role)) {
      const currentEmployee = await this.resolveCurrentEmployee(auth);
      if (claim.employeeId !== currentEmployee.id) {
        throw new ForbiddenException("Expense claim access denied");
      }
    }

    return toSerializable(claim);
  }

  async createClaim(auth: AuthContext, dto: CreateExpenseClaimDto, requestMeta: RequestMeta) {
    const claimEmployee = await this.resolveClaimEmployee(auth, dto.employeeId);

    await this.validateOptionalReference({
      companyId: auth.companyId,
      legalEntityId: dto.legalEntityId,
      costCenterId: dto.costCenterId,
      projectId: dto.projectId,
      documentId: dto.documentId
    });

    await this.validateItemReferences(auth.companyId, dto);

    const totalAmount = sumClaimTotal(dto.items);

    const created = await this.prisma.$transaction(async (transaction) => {
      const claim = await transaction.expenseClaim.create({
        data: {
          companyId: auth.companyId,
          legalEntityId: dto.legalEntityId ?? claimEmployee.legalEntityId,
          employeeId: claimEmployee.id,
          submittedById: auth.userId,
          documentId: dto.documentId,
          costCenterId: dto.costCenterId,
          projectId: dto.projectId,
          title: dto.title.trim(),
          status: dto.status ?? ExpenseStatus.DRAFT,
          currency: normalizeCurrency(dto.currency),
          totalAmount
        }
      });

      await transaction.expenseItem.createMany({
        data: dto.items.map((item) => ({
          claimId: claim.id,
          incurredOn: parseDateOnly(item.incurredOn),
          category: item.category.trim(),
          description: item.description?.trim() || null,
          vendorId: item.vendorId,
          amount: toDecimal(item.amount),
          vatAmount: item.vatAmount !== undefined ? toDecimal(item.vatAmount) : null,
          receiptFileId: item.receiptFileId
        }))
      });

      return claim;
    });

    await this.auditService.log({
      companyId: auth.companyId,
      actorId: auth.userId,
      entityType: "ExpenseClaim",
      entityId: created.id,
      action: "EXPENSE_CLAIM_CREATE",
      afterJson: {
        title: created.title,
        employeeId: created.employeeId,
        status: created.status,
        currency: created.currency,
        totalAmount,
        itemCount: dto.items.length
      },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    return this.getClaim(auth, created.id);
  }
}
