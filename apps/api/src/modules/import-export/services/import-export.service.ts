import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { JobStatus, Prisma, type MembershipRole } from "@prisma/client";

import type { AuthContext } from "../../../common/auth/request-context";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { toSerializable } from "../../../common/utils/serialization.util";
import { AuditService } from "../../audit/services/audit.service";
import { FilesService } from "../../files/services/files.service";
import type { CreateExpenseClaimExportJobDto } from "../dto/create-expense-claim-export-job.dto";
import type { CreateVendorImportJobDto } from "../dto/create-vendor-import-job.dto";
import type { ExportJobQueryDto } from "../dto/export-job-query.dto";
import type { ImportJobQueryDto } from "../dto/import-job-query.dto";

interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

const ADMIN_ROLES: MembershipRole[] = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"];

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

@Injectable()
export class ImportExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly filesService: FilesService
  ) {}

  private assertAdminRole(auth: AuthContext) {
    if (!ADMIN_ROLES.includes(auth.role)) {
      throw new ForbiddenException("Role not allowed");
    }
  }

  async listImportJobs(auth: AuthContext, query: ImportJobQueryDto) {
    const jobs = await this.prisma.importJob.findMany({
      where: {
        companyId: auth.companyId,
        status: query.status,
        type: query.type
      },
      include: {
        sourceFile: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            rows: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: query.limit ?? 50
    });

    return toSerializable(jobs);
  }

  async getImportJob(auth: AuthContext, importJobId: string) {
    const job = await this.prisma.importJob.findUnique({
      where: { id: importJobId },
      include: {
        sourceFile: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            createdAt: true
          }
        },
        rows: {
          orderBy: { rowNo: "asc" }
        }
      }
    });

    if (!job) {
      throw new NotFoundException("Import job not found");
    }

    if (job.companyId !== auth.companyId) {
      throw new ForbiddenException("Import job access denied");
    }

    return toSerializable(job);
  }

  async createVendorImportJob(auth: AuthContext, dto: CreateVendorImportJobDto, requestMeta: RequestMeta) {
    this.assertAdminRole(auth);

    const sourceFile = await this.filesService.getFileByIdForCompany(auth.companyId, dto.sourceFileId);

    const createdJob = await this.prisma.importJob.create({
      data: {
        companyId: auth.companyId,
        requestedById: auth.userId,
        type: "VENDOR",
        status: JobStatus.PENDING,
        sourceFileId: sourceFile.id,
        mappingJson: dto.mappingJson ? toInputJson(dto.mappingJson) : undefined,
        startedAt: null,
        finishedAt: null,
        errorMessage: null
      }
    });

    await this.auditService.log({
      companyId: auth.companyId,
      actorId: auth.userId,
      entityType: "ImportJob",
      entityId: createdJob.id,
      action: "IMPORT_JOB_CREATE",
      afterJson: {
        type: createdJob.type,
        status: createdJob.status,
        sourceFileId: createdJob.sourceFileId
      },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    return this.getImportJob(auth, createdJob.id);
  }

  async listExportJobs(auth: AuthContext, query: ExportJobQueryDto) {
    const jobs = await this.prisma.exportJob.findMany({
      where: {
        companyId: auth.companyId,
        status: query.status,
        type: query.type
      },
      include: {
        resultFile: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: query.limit ?? 50
    });

    return toSerializable(jobs);
  }

  async getExportJob(auth: AuthContext, exportJobId: string) {
    const job = await this.prisma.exportJob.findUnique({
      where: { id: exportJobId },
      include: {
        resultFile: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            createdAt: true
          }
        }
      }
    });

    if (!job) {
      throw new NotFoundException("Export job not found");
    }

    if (job.companyId !== auth.companyId) {
      throw new ForbiddenException("Export job access denied");
    }

    return toSerializable(job);
  }

  async createExpenseClaimExportJob(auth: AuthContext, dto: CreateExpenseClaimExportJobDto, requestMeta: RequestMeta) {
    this.assertAdminRole(auth);

    const createdJob = await this.prisma.exportJob.create({
      data: {
        companyId: auth.companyId,
        requestedById: auth.userId,
        type: "EXPENSE_CLAIMS",
        status: JobStatus.PENDING,
        filterJson: toInputJson({
          format: dto.format,
          status: dto.status,
          fromDate: dto.fromDate,
          toDate: dto.toDate
        }),
        startedAt: null,
        finishedAt: null,
        resultFileId: null,
        errorMessage: null
      }
    });

    await this.auditService.log({
      companyId: auth.companyId,
      actorId: auth.userId,
      entityType: "ExportJob",
      entityId: createdJob.id,
      action: "EXPORT_JOB_CREATE",
      afterJson: {
        type: createdJob.type,
        status: createdJob.status,
        format: dto.format
      },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    return this.getExportJob(auth, createdJob.id);
  }
}
