import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ApprovalStepType, LeaveUnit, Prisma, type MembershipRole } from "@prisma/client";

import type { AuthContext } from "../../../common/auth/request-context";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { toSerializable } from "../../../common/utils/serialization.util";
import { ApprovalsService } from "../../approvals/services/approvals.service";
import { AuditService } from "../../audit/services/audit.service";
import { DocumentsService } from "../../documents/services/documents.service";
import type { CreateAttendanceCorrectionDto } from "../dto/create-attendance-correction.dto";
import type { CreateLeaveRequestDto } from "../dto/create-leave-request.dto";
import type { AttendanceCorrectionQueryDto } from "../dto/attendance-correction-query.dto";
import type { LeaveRequestQueryDto } from "../dto/leave-request-query.dto";

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

function dateDiffInclusive(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / 86_400_000) + 1;
}

@Injectable()
export class LeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly documentsService: DocumentsService,
    private readonly approvalsService: ApprovalsService
  ) {}

  private async resolveCurrentEmployee(auth: AuthContext) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        companyId: auth.companyId,
        userId: auth.userId,
        employmentStatus: "ACTIVE"
      },
      select: {
        id: true,
        companyId: true,
        employeeNumber: true,
        nameKr: true
      }
    });

    if (!employee) {
      throw new ForbiddenException("Active employee profile is required");
    }

    return employee;
  }

  private resolveDateRange(fromDate?: string, toDate?: string) {
    return {
      gte: fromDate ? dateOnlyStart(fromDate) : undefined,
      lte: toDate ? dateOnlyEnd(toDate) : undefined
    };
  }

  private isAdminRole(role: MembershipRole): boolean {
    return ADMIN_ROLES.includes(role);
  }

  private async findTemplate(companyId: string, key: string) {
    return this.prisma.documentTemplate.findFirst({
      where: {
        key,
        isActive: true,
        OR: [{ companyId }, { isSystem: true }]
      },
      orderBy: [{ companyId: "desc" }, { version: "desc" }]
    });
  }

  private calculateLeaveQuantity(dto: CreateLeaveRequestDto, startDate: Date, endDate: Date): Prisma.Decimal {
    if (dto.quantity !== undefined) {
      return new Prisma.Decimal(dto.quantity.toString());
    }

    if (dto.unit === LeaveUnit.DAY) {
      return new Prisma.Decimal(dateDiffInclusive(startDate, endDate).toString());
    }

    if (dto.unit === LeaveUnit.HALF_DAY_AM || dto.unit === LeaveUnit.HALF_DAY_PM) {
      return new Prisma.Decimal("0.5");
    }

    return new Prisma.Decimal("1");
  }

  private async configureApprovalLineIfRequested(input: {
    auth: AuthContext;
    documentId: string;
    approverEmployeeIds?: string[];
    requestMeta: RequestMeta;
  }): Promise<string | null> {
    const approverEmployeeIds = input.approverEmployeeIds ?? [];
    if (approverEmployeeIds.length === 0) {
      return null;
    }

    const line = await this.approvalsService.configureLine(
      input.auth,
      {
        documentId: input.documentId,
        steps: approverEmployeeIds.map((approverEmployeeId, index) => ({
          orderNo: index + 1,
          type: ApprovalStepType.APPROVE,
          approverEmployeeId
        }))
      },
      {
        ipAddress: input.requestMeta.ipAddress,
        userAgent: input.requestMeta.userAgent
      }
    );

    const lineId = (line as { id?: string }).id;
    if (!lineId) {
      throw new BadRequestException("Failed to configure approval line");
    }

    await this.approvalsService.submit(input.auth, lineId, {
      ipAddress: input.requestMeta.ipAddress,
      userAgent: input.requestMeta.userAgent
    });

    return lineId;
  }

  async listLeavePolicies(auth: AuthContext) {
    const policies = await this.prisma.leavePolicy.findMany({
      where: { companyId: auth.companyId },
      orderBy: [{ code: "asc" }, { name: "asc" }]
    });

    return toSerializable(policies);
  }

  async listLeaveRequests(auth: AuthContext, query: LeaveRequestQueryDto) {
    let employeeIdFilter = query.employeeId;

    if (!this.isAdminRole(auth.role)) {
      const employee = await this.resolveCurrentEmployee(auth);
      employeeIdFilter = employee.id;
    }

    const requests = await this.prisma.leaveRequest.findMany({
      where: {
        companyId: auth.companyId,
        status: query.status,
        employeeId: employeeIdFilter,
        startDate: this.resolveDateRange(query.fromDate, query.toDate)
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            nameKr: true
          }
        },
        leavePolicy: {
          select: {
            id: true,
            code: true,
            name: true,
            unit: true
          }
        },
        document: {
          select: {
            id: true,
            title: true,
            status: true,
            currentVersionNo: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: query.limit ?? 100
    });

    return toSerializable(requests);
  }

  async createLeaveRequest(auth: AuthContext, dto: CreateLeaveRequestDto, requestMeta: RequestMeta) {
    const employee = await this.resolveCurrentEmployee(auth);
    const leavePolicy = await this.prisma.leavePolicy.findUnique({ where: { id: dto.leavePolicyId } });

    if (!leavePolicy || leavePolicy.companyId !== auth.companyId) {
      throw new NotFoundException("Leave policy not found");
    }

    const startDate = parseDateOnly(dto.startDate);
    const endDate = parseDateOnly(dto.endDate);

    if (startDate.getTime() > endDate.getTime()) {
      throw new BadRequestException("startDate must be before or equal to endDate");
    }

    const quantity = this.calculateLeaveQuantity(dto, startDate, endDate);

    let documentId: string | null = null;
    let approvalLineId: string | null = null;

    if (dto.autoCreateDocument !== false) {
      const template = await this.findTemplate(auth.companyId, "leave-request");
      if (template) {
        const document = await this.documentsService.createDocument(
          auth,
          {
            templateId: template.id,
            title: `휴가 신청서 - ${employee.nameKr} (${dto.startDate})`,
            category: "attendance",
            contentJson: {
              employeeNumber: employee.employeeNumber,
              employeeName: employee.nameKr,
              leaveType: leavePolicy.name,
              startDate: dto.startDate,
              endDate: dto.endDate,
              reason: dto.reason ?? ""
            },
            attachmentFileIds: dto.attachmentFileIds ?? []
          },
          {
            ipAddress: requestMeta.ipAddress,
            userAgent: requestMeta.userAgent
          }
        );

        documentId = (document as { id?: string }).id ?? null;

        if (documentId) {
          approvalLineId = await this.configureApprovalLineIfRequested({
            auth,
            documentId,
            approverEmployeeIds: dto.approverEmployeeIds,
            requestMeta
          });
        }
      }
    }

    const created = await this.prisma.leaveRequest.create({
      data: {
        companyId: auth.companyId,
        employeeId: employee.id,
        leavePolicyId: leavePolicy.id,
        documentId,
        startDate,
        endDate,
        unit: dto.unit,
        quantity,
        reason: dto.reason
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            nameKr: true
          }
        },
        leavePolicy: {
          select: {
            id: true,
            code: true,
            name: true,
            unit: true
          }
        },
        document: {
          select: {
            id: true,
            title: true,
            status: true,
            currentVersionNo: true
          }
        }
      }
    });

    await this.auditService.log({
      companyId: auth.companyId,
      actorId: auth.userId,
      entityType: "LeaveRequest",
      entityId: created.id,
      action: "LEAVE_REQUEST_CREATE",
      afterJson: {
        leavePolicyId: leavePolicy.id,
        startDate,
        endDate,
        unit: dto.unit,
        quantity,
        documentId,
        approvalLineId
      },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    return toSerializable(created);
  }

  async listAttendanceCorrections(auth: AuthContext, query: AttendanceCorrectionQueryDto) {
    let employeeIdFilter = query.employeeId;

    if (!this.isAdminRole(auth.role)) {
      const employee = await this.resolveCurrentEmployee(auth);
      employeeIdFilter = employee.id;
    }

    const corrections = await this.prisma.attendanceCorrection.findMany({
      where: {
        companyId: auth.companyId,
        status: query.status,
        employeeId: employeeIdFilter,
        workDate: this.resolveDateRange(query.fromDate, query.toDate)
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            nameKr: true
          }
        },
        attendanceLedger: {
          select: {
            id: true,
            status: true,
            workDate: true,
            checkInAt: true,
            checkOutAt: true,
            needsReview: true
          }
        },
        document: {
          select: {
            id: true,
            title: true,
            status: true,
            currentVersionNo: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: query.limit ?? 100
    });

    return toSerializable(corrections);
  }

  async createAttendanceCorrection(auth: AuthContext, dto: CreateAttendanceCorrectionDto, requestMeta: RequestMeta) {
    const employee = await this.resolveCurrentEmployee(auth);

    if (!dto.requestedCheckInAt && !dto.requestedCheckOutAt) {
      throw new BadRequestException("At least one of requestedCheckInAt or requestedCheckOutAt is required");
    }

    const workDate = parseDateOnly(dto.workDate);

    const ledger = await this.prisma.attendanceLedger.findUnique({
      where: {
        companyId_employeeId_workDate: {
          companyId: auth.companyId,
          employeeId: employee.id,
          workDate
        }
      },
      select: {
        id: true
      }
    });

    let documentId: string | null = null;
    let approvalLineId: string | null = null;

    if (dto.autoCreateDocument !== false) {
      const template = await this.findTemplate(auth.companyId, "attendance-correction");
      if (template) {
        const document = await this.documentsService.createDocument(
          auth,
          {
            templateId: template.id,
            title: `근태 정정 요청서 - ${employee.nameKr} (${dto.workDate})`,
            category: "attendance",
            contentJson: {
              employeeNumber: employee.employeeNumber,
              workDate: dto.workDate,
              requestedCheckInAt: dto.requestedCheckInAt ?? "",
              requestedCheckOutAt: dto.requestedCheckOutAt ?? "",
              reason: dto.reason
            },
            attachmentFileIds: dto.attachmentFileIds ?? []
          },
          {
            ipAddress: requestMeta.ipAddress,
            userAgent: requestMeta.userAgent
          }
        );

        documentId = (document as { id?: string }).id ?? null;

        if (documentId) {
          approvalLineId = await this.configureApprovalLineIfRequested({
            auth,
            documentId,
            approverEmployeeIds: dto.approverEmployeeIds,
            requestMeta
          });
        }
      }
    }

    const created = await this.prisma.attendanceCorrection.create({
      data: {
        companyId: auth.companyId,
        employeeId: employee.id,
        attendanceLedgerId: ledger?.id,
        documentId,
        workDate,
        requestedCheckInAt: dto.requestedCheckInAt ? new Date(dto.requestedCheckInAt) : undefined,
        requestedCheckOutAt: dto.requestedCheckOutAt ? new Date(dto.requestedCheckOutAt) : undefined,
        reason: dto.reason
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            nameKr: true
          }
        },
        attendanceLedger: {
          select: {
            id: true,
            status: true,
            workDate: true,
            checkInAt: true,
            checkOutAt: true,
            needsReview: true
          }
        },
        document: {
          select: {
            id: true,
            title: true,
            status: true,
            currentVersionNo: true
          }
        }
      }
    });

    await this.auditService.log({
      companyId: auth.companyId,
      actorId: auth.userId,
      entityType: "AttendanceCorrection",
      entityId: created.id,
      action: "ATTENDANCE_CORRECTION_CREATE",
      afterJson: {
        workDate,
        requestedCheckInAt: created.requestedCheckInAt,
        requestedCheckOutAt: created.requestedCheckOutAt,
        documentId,
        approvalLineId,
        attendanceLedgerId: ledger?.id
      },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    return toSerializable(created);
  }
}
