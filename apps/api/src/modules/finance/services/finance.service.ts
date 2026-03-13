import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  JournalEntryStatus,
  Prisma,
  type AccountType,
  type MembershipRole
} from "@prisma/client";

import type { AuthContext } from "../../../common/auth/request-context";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { toSerializable } from "../../../common/utils/serialization.util";
import { AuditService } from "../../audit/services/audit.service";
import type { AccountQueryDto } from "../dto/account-query.dto";
import type { CreateCostCenterDto } from "../dto/create-cost-center.dto";
import type { CreateJournalEntryDto, CreateJournalEntryLineDto } from "../dto/create-journal-entry.dto";
import type { CreateProjectDto } from "../dto/create-project.dto";
import type { CreateVendorDto } from "../dto/create-vendor.dto";
import type { JournalEntryQueryDto } from "../dto/journal-entry-query.dto";

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

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeText(value: string): string {
  return value.trim();
}

function isPrismaUniqueError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  private assertAdminRole(auth: AuthContext) {
    if (!ADMIN_ROLES.includes(auth.role)) {
      throw new ForbiddenException("Role not allowed");
    }
  }

  private buildEntryDateRange(fromDate?: string, toDate?: string) {
    return {
      gte: fromDate ? dateOnlyStart(fromDate) : undefined,
      lte: toDate ? dateOnlyEnd(toDate) : undefined
    };
  }

  private async validateLegalEntity(companyId: string, legalEntityId?: string) {
    if (!legalEntityId) {
      return;
    }

    const legalEntity = await this.prisma.legalEntity.findUnique({
      where: { id: legalEntityId },
      select: { id: true, companyId: true }
    });

    if (!legalEntity || legalEntity.companyId !== companyId) {
      throw new BadRequestException("Invalid legalEntityId");
    }
  }

  private async validateJournalLineDimensions(companyId: string, lines: CreateJournalEntryLineDto[]) {
    const vendorIds = [...new Set(lines.map((line) => line.vendorId).filter((value): value is string => Boolean(value)))];
    const costCenterIds = [
      ...new Set(lines.map((line) => line.costCenterId).filter((value): value is string => Boolean(value)))
    ];
    const projectIds = [...new Set(lines.map((line) => line.projectId).filter((value): value is string => Boolean(value)))];

    if (vendorIds.length > 0) {
      const rows = await this.prisma.vendor.findMany({
        where: {
          id: { in: vendorIds },
          companyId
        },
        select: { id: true }
      });
      const found = new Set(rows.map((row) => row.id));
      const invalid = vendorIds.find((id) => !found.has(id));
      if (invalid) {
        throw new BadRequestException(`Invalid vendorId: ${invalid}`);
      }
    }

    if (costCenterIds.length > 0) {
      const rows = await this.prisma.costCenter.findMany({
        where: {
          id: { in: costCenterIds },
          companyId
        },
        select: { id: true }
      });
      const found = new Set(rows.map((row) => row.id));
      const invalid = costCenterIds.find((id) => !found.has(id));
      if (invalid) {
        throw new BadRequestException(`Invalid costCenterId: ${invalid}`);
      }
    }

    if (projectIds.length > 0) {
      const rows = await this.prisma.project.findMany({
        where: {
          id: { in: projectIds },
          companyId
        },
        select: { id: true }
      });
      const found = new Set(rows.map((row) => row.id));
      const invalid = projectIds.find((id) => !found.has(id));
      if (invalid) {
        throw new BadRequestException(`Invalid projectId: ${invalid}`);
      }
    }
  }

  private async validateLineAccounts(companyId: string, lines: CreateJournalEntryLineDto[]) {
    const accountIds = [...new Set(lines.map((line) => line.accountId))];
    const accounts = await this.prisma.account.findMany({
      where: {
        id: { in: accountIds },
        companyId,
        isActive: true
      },
      select: {
        id: true,
        type: true,
        isPosting: true
      }
    });

    const accountMap = new Map(accounts.map((account) => [account.id, account]));

    for (const accountId of accountIds) {
      const account = accountMap.get(accountId);
      if (!account) {
        throw new BadRequestException(`Invalid accountId: ${accountId}`);
      }

      if (!account.isPosting) {
        throw new BadRequestException(`Account ${accountId} is not a posting account`);
      }
    }

    return accountMap;
  }

  private validateJournalLines(lines: CreateJournalEntryLineDto[]) {
    if (lines.length < 2) {
      throw new BadRequestException("At least two journal lines are required");
    }

    const normalizedLines = lines.map((line, index) => {
      const debit = line.debit !== undefined ? toDecimal(line.debit) : new Prisma.Decimal(0);
      const credit = line.credit !== undefined ? toDecimal(line.credit) : new Prisma.Decimal(0);

      const hasDebit = debit.greaterThan(0);
      const hasCredit = credit.greaterThan(0);

      if ((hasDebit && hasCredit) || (!hasDebit && !hasCredit)) {
        throw new BadRequestException(`Line ${index + 1}: provide either debit or credit amount`);
      }

      return {
        lineNo: index + 1,
        accountId: line.accountId,
        vendorId: line.vendorId,
        costCenterId: line.costCenterId,
        projectId: line.projectId,
        description: line.description?.trim() || null,
        debit,
        credit
      };
    });

    const totals = normalizedLines.reduce(
      (sum, line) => ({
        debit: sum.debit.plus(line.debit),
        credit: sum.credit.plus(line.credit)
      }),
      {
        debit: new Prisma.Decimal(0),
        credit: new Prisma.Decimal(0)
      }
    );

    if (!totals.debit.equals(totals.credit)) {
      throw new BadRequestException("Total debit and credit must be equal");
    }

    if (totals.debit.lessThanOrEqualTo(0)) {
      throw new BadRequestException("Journal entry total must be greater than zero");
    }

    return {
      lines: normalizedLines,
      totalDebit: totals.debit,
      totalCredit: totals.credit
    };
  }

  private async allocateJournalNumber(companyId: string, entryDate: Date): Promise<string> {
    const yyyymmdd = entryDate.toISOString().slice(0, 10).replaceAll("-", "");

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const serial = Math.floor(Math.random() * 900_000) + 100_000;
      const number = `JE-${yyyymmdd}-${serial}`;
      const exists = await this.prisma.journalEntry.findUnique({
        where: {
          companyId_number: {
            companyId,
            number
          }
        },
        select: { id: true }
      });

      if (!exists) {
        return number;
      }
    }

    throw new ConflictException("Failed to allocate journal entry number");
  }

  async listAccounts(auth: AuthContext, query: AccountQueryDto) {
    const accounts = await this.prisma.account.findMany({
      where: {
        companyId: auth.companyId,
        type: query.type,
        isActive: true
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        isPosting: true,
        parentId: true,
        createdAt: true
      },
      orderBy: [{ code: "asc" }, { name: "asc" }],
      take: query.limit ?? 200
    });

    return toSerializable(accounts);
  }

  async listVendors(auth: AuthContext) {
    const vendors = await this.prisma.vendor.findMany({
      where: { companyId: auth.companyId },
      orderBy: [{ code: "asc" }, { name: "asc" }]
    });

    return toSerializable(vendors);
  }

  async createVendor(auth: AuthContext, dto: CreateVendorDto, requestMeta: RequestMeta) {
    this.assertAdminRole(auth);
    await this.validateLegalEntity(auth.companyId, dto.legalEntityId);

    try {
      const created = await this.prisma.vendor.create({
        data: {
          companyId: auth.companyId,
          legalEntityId: dto.legalEntityId,
          code: normalizeCode(dto.code),
          name: normalizeText(dto.name),
          registrationNumber: dto.registrationNumber?.trim() || null,
          isActive: dto.isActive ?? true
        }
      });

      await this.auditService.log({
        companyId: auth.companyId,
        actorId: auth.userId,
        entityType: "Vendor",
        entityId: created.id,
        action: "VENDOR_CREATE",
        afterJson: created,
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent
      });

      return toSerializable(created);
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new ConflictException("Vendor code already exists");
      }
      throw error;
    }
  }

  async listCostCenters(auth: AuthContext) {
    const costCenters = await this.prisma.costCenter.findMany({
      where: { companyId: auth.companyId },
      orderBy: [{ code: "asc" }, { name: "asc" }]
    });

    return toSerializable(costCenters);
  }

  async createCostCenter(auth: AuthContext, dto: CreateCostCenterDto, requestMeta: RequestMeta) {
    this.assertAdminRole(auth);
    await this.validateLegalEntity(auth.companyId, dto.legalEntityId);

    try {
      const created = await this.prisma.costCenter.create({
        data: {
          companyId: auth.companyId,
          legalEntityId: dto.legalEntityId,
          code: normalizeCode(dto.code),
          name: normalizeText(dto.name),
          isActive: dto.isActive ?? true
        }
      });

      await this.auditService.log({
        companyId: auth.companyId,
        actorId: auth.userId,
        entityType: "CostCenter",
        entityId: created.id,
        action: "COST_CENTER_CREATE",
        afterJson: created,
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent
      });

      return toSerializable(created);
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new ConflictException("Cost center code already exists");
      }
      throw error;
    }
  }

  async listProjects(auth: AuthContext) {
    const projects = await this.prisma.project.findMany({
      where: { companyId: auth.companyId },
      orderBy: [{ code: "asc" }, { name: "asc" }]
    });

    return toSerializable(projects);
  }

  async createProject(auth: AuthContext, dto: CreateProjectDto, requestMeta: RequestMeta) {
    this.assertAdminRole(auth);
    await this.validateLegalEntity(auth.companyId, dto.legalEntityId);

    if (dto.startDate && dto.endDate && parseDateOnly(dto.startDate).getTime() > parseDateOnly(dto.endDate).getTime()) {
      throw new BadRequestException("startDate must be before or equal to endDate");
    }

    try {
      const created = await this.prisma.project.create({
        data: {
          companyId: auth.companyId,
          legalEntityId: dto.legalEntityId,
          code: normalizeCode(dto.code),
          name: normalizeText(dto.name),
          status: dto.status?.trim() || null,
          startDate: dto.startDate ? parseDateOnly(dto.startDate) : null,
          endDate: dto.endDate ? parseDateOnly(dto.endDate) : null
        }
      });

      await this.auditService.log({
        companyId: auth.companyId,
        actorId: auth.userId,
        entityType: "Project",
        entityId: created.id,
        action: "PROJECT_CREATE",
        afterJson: created,
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent
      });

      return toSerializable(created);
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new ConflictException("Project code already exists");
      }
      throw error;
    }
  }

  async listJournalEntries(auth: AuthContext, query: JournalEntryQueryDto) {
    const entries = await this.prisma.journalEntry.findMany({
      where: {
        companyId: auth.companyId,
        status: query.status,
        entryDate: this.buildEntryDateRange(query.fromDate, query.toDate)
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        expenseClaim: {
          select: {
            id: true,
            title: true,
            status: true
          }
        },
        _count: {
          select: {
            lines: true
          }
        }
      },
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
      take: query.limit ?? 100
    });

    return toSerializable(entries);
  }

  async getJournalEntry(auth: AuthContext, journalEntryId: string) {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id: journalEntryId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        postedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        expenseClaim: {
          select: {
            id: true,
            title: true,
            status: true
          }
        },
        lines: {
          include: {
            account: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true
              }
            },
            vendor: {
              select: {
                id: true,
                code: true,
                name: true
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
            }
          },
          orderBy: { lineNo: "asc" }
        }
      }
    });

    if (!entry) {
      throw new NotFoundException("Journal entry not found");
    }

    if (entry.companyId !== auth.companyId) {
      throw new ForbiddenException("Journal entry access denied");
    }

    return toSerializable(entry);
  }

  async createJournalEntry(auth: AuthContext, dto: CreateJournalEntryDto, requestMeta: RequestMeta) {
    this.assertAdminRole(auth);
    await this.validateLegalEntity(auth.companyId, dto.legalEntityId);

    if (dto.expenseClaimId) {
      const claim = await this.prisma.expenseClaim.findUnique({
        where: { id: dto.expenseClaimId },
        select: { id: true, companyId: true }
      });

      if (!claim || claim.companyId !== auth.companyId) {
        throw new BadRequestException("Invalid expenseClaimId");
      }
    }

    const parsedEntryDate = parseDateOnly(dto.entryDate);
    const validated = this.validateJournalLines(dto.lines);
    await this.validateLineAccounts(auth.companyId, dto.lines);
    await this.validateJournalLineDimensions(auth.companyId, dto.lines);

    const number = await this.allocateJournalNumber(auth.companyId, parsedEntryDate);

    const created = await this.prisma.$transaction(async (transaction) => {
      return transaction.journalEntry.create({
        data: {
          companyId: auth.companyId,
          legalEntityId: dto.legalEntityId,
          expenseClaimId: dto.expenseClaimId,
          number,
          entryDate: parsedEntryDate,
          description: dto.description?.trim() || null,
          status: dto.status ?? JournalEntryStatus.DRAFT,
          totalDebit: validated.totalDebit,
          totalCredit: validated.totalCredit,
          createdById: auth.userId,
          lines: {
            create: validated.lines.map((line) => ({
              lineNo: line.lineNo,
              accountId: line.accountId,
              vendorId: line.vendorId,
              costCenterId: line.costCenterId,
              projectId: line.projectId,
              description: line.description,
              debit: line.debit,
              credit: line.credit
            }))
          }
        }
      });
    });

    await this.auditService.log({
      companyId: auth.companyId,
      actorId: auth.userId,
      entityType: "JournalEntry",
      entityId: created.id,
      action: "JOURNAL_ENTRY_CREATE",
      afterJson: {
        number: created.number,
        status: created.status,
        totalDebit: created.totalDebit,
        totalCredit: created.totalCredit,
        lineCount: dto.lines.length
      },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    return this.getJournalEntry(auth, created.id);
  }

  async listAccountTypes(): Promise<AccountType[]> {
    return ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];
  }
}
