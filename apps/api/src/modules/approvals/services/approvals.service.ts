import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  ApprovalLineStatus,
  ApprovalStepStatus,
  ApprovalStepType,
  CorrectionStatus,
  DocumentStatus,
  LeaveRequestStatus,
  Prisma,
  type ApprovalLine,
  type MembershipRole
} from "@prisma/client";

import type { AuthContext } from "../../../common/auth/request-context";
import { toSerializable } from "../../../common/utils/serialization.util";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { AuditService } from "../../audit/services/audit.service";
import type { ConfigureApprovalLineDto } from "../dto/configure-approval-line.dto";
import type { ApprovalActionCommentDto } from "../dto/approval-action-comment.dto";

interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

const ADMIN_ROLES: MembershipRole[] = ["SUPER_ADMIN", "ORG_ADMIN", "HR_MANAGER"];

function toInputJson(value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value as Prisma.InputJsonValue;
}

function mapBusinessStatusFromApproval(lineStatus: ApprovalLineStatus): {
  leaveStatus: LeaveRequestStatus;
  correctionStatus: CorrectionStatus;
} {
  switch (lineStatus) {
    case ApprovalLineStatus.APPROVED:
      return {
        leaveStatus: LeaveRequestStatus.APPROVED,
        correctionStatus: CorrectionStatus.APPROVED
      };
    case ApprovalLineStatus.REJECTED:
      return {
        leaveStatus: LeaveRequestStatus.REJECTED,
        correctionStatus: CorrectionStatus.REJECTED
      };
    case ApprovalLineStatus.CANCELED:
      return {
        leaveStatus: LeaveRequestStatus.CANCELED,
        correctionStatus: CorrectionStatus.CANCELED
      };
    case ApprovalLineStatus.DRAFT:
    case ApprovalLineStatus.IN_REVIEW:
      return {
        leaveStatus: LeaveRequestStatus.REQUESTED,
        correctionStatus: CorrectionStatus.REQUESTED
      };
    default:
      return {
        leaveStatus: LeaveRequestStatus.REQUESTED,
        correctionStatus: CorrectionStatus.REQUESTED
      };
  }
}

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  private isActionableStep(type: ApprovalStepType): boolean {
    return type === "APPROVE" || type === "AGREE" || type === "CONSULT";
  }

  private async resolveEmployeeIdForUser(auth: AuthContext) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        companyId: auth.companyId,
        userId: auth.userId,
        employmentStatus: "ACTIVE"
      },
      select: { id: true }
    });

    return employee?.id ?? null;
  }

  private async assertDocumentAccess(auth: AuthContext, documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        companyId: true,
        status: true
      }
    });

    if (!document) {
      throw new NotFoundException("Document not found");
    }

    if (document.companyId !== auth.companyId) {
      throw new ForbiddenException("Document access denied");
    }

    return document;
  }

  private async getLineForCompany(auth: AuthContext, lineId: string) {
    const line = await this.prisma.approvalLine.findUnique({
      where: { id: lineId },
      include: {
        document: true,
        steps: {
          include: {
            approverEmployee: {
              select: {
                id: true,
                userId: true,
                employeeNumber: true,
                nameKr: true
              }
            }
          },
          orderBy: { orderNo: "asc" }
        },
        actions: {
          include: {
            actor: {
              select: {
                id: true,
                email: true,
                name: true
              }
            }
          },
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!line) {
      throw new NotFoundException("Approval line not found");
    }

    if (line.document.companyId !== auth.companyId) {
      throw new ForbiddenException("Approval line access denied");
    }

    return line;
  }

  private async moveForwardToNextActionable(lineId: string, fromOrderNo: number): Promise<number | null> {
    const steps = await this.prisma.approvalStep.findMany({
      where: { lineId },
      orderBy: { orderNo: "asc" }
    });

    for (const step of steps) {
      if (step.orderNo <= fromOrderNo) {
        continue;
      }

      if (!this.isActionableStep(step.type)) {
        if (step.status === "WAITING" || step.status === "PENDING") {
          await this.prisma.approvalStep.update({
            where: { id: step.id },
            data: {
              status: ApprovalStepStatus.APPROVED,
              actedAt: new Date(),
              comment: step.comment ?? "Auto acknowledged"
            }
          });
        }
        continue;
      }

      if (step.status === "WAITING") {
        await this.prisma.approvalStep.update({
          where: { id: step.id },
          data: {
            status: ApprovalStepStatus.PENDING
          }
        });
      }

      return step.orderNo;
    }

    return null;
  }

  private async syncBusinessStatusForDocument(input: {
    auth: AuthContext;
    lineId: string;
    documentId: string;
    lineStatus: ApprovalLineStatus;
    requestMeta: RequestMeta;
  }) {
    const mappedStatus = mapBusinessStatusFromApproval(input.lineStatus);

    const [leaveRequests, corrections] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where: {
          companyId: input.auth.companyId,
          documentId: input.documentId
        },
        select: {
          id: true,
          status: true
        }
      }),
      this.prisma.attendanceCorrection.findMany({
        where: {
          companyId: input.auth.companyId,
          documentId: input.documentId
        },
        select: {
          id: true,
          status: true
        }
      })
    ]);

    for (const request of leaveRequests) {
      if (request.status === mappedStatus.leaveStatus) {
        continue;
      }

      const updated = await this.prisma.leaveRequest.update({
        where: { id: request.id },
        data: {
          status: mappedStatus.leaveStatus
        }
      });

      await this.auditService.log({
        companyId: input.auth.companyId,
        actorId: input.auth.userId,
        entityType: "LeaveRequest",
        entityId: updated.id,
        action: "LEAVE_REQUEST_STATUS_SYNC_FROM_APPROVAL",
        beforeJson: {
          status: request.status
        },
        afterJson: {
          status: updated.status,
          approvalLineId: input.lineId,
          approvalStatus: input.lineStatus,
          documentId: input.documentId
        },
        ipAddress: input.requestMeta.ipAddress,
        userAgent: input.requestMeta.userAgent
      });
    }

    for (const correction of corrections) {
      if (correction.status === mappedStatus.correctionStatus) {
        continue;
      }

      const updated = await this.prisma.attendanceCorrection.update({
        where: { id: correction.id },
        data: {
          status: mappedStatus.correctionStatus
        }
      });

      await this.auditService.log({
        companyId: input.auth.companyId,
        actorId: input.auth.userId,
        entityType: "AttendanceCorrection",
        entityId: updated.id,
        action: "ATTENDANCE_CORRECTION_STATUS_SYNC_FROM_APPROVAL",
        beforeJson: {
          status: correction.status
        },
        afterJson: {
          status: updated.status,
          approvalLineId: input.lineId,
          approvalStatus: input.lineStatus,
          documentId: input.documentId
        },
        ipAddress: input.requestMeta.ipAddress,
        userAgent: input.requestMeta.userAgent
      });
    }
  }

  async configureLine(auth: AuthContext, dto: ConfigureApprovalLineDto, requestMeta: RequestMeta) {
    if (dto.steps.length === 0) {
      throw new BadRequestException("At least one approval step is required");
    }

    await this.assertDocumentAccess(auth, dto.documentId);

    const uniqueOrders = new Set<number>();
    for (const step of dto.steps) {
      if (uniqueOrders.has(step.orderNo)) {
        throw new BadRequestException(`Duplicated step order: ${step.orderNo}`);
      }
      uniqueOrders.add(step.orderNo);

      const approver = await this.prisma.employee.findUnique({ where: { id: step.approverEmployeeId } });
      if (!approver || approver.companyId !== auth.companyId) {
        throw new BadRequestException(`Invalid approver employee id: ${step.approverEmployeeId}`);
      }
    }

    const sortedSteps = [...dto.steps].sort((left, right) => left.orderNo - right.orderNo);
    const submitterEmployeeId = await this.resolveEmployeeIdForUser(auth);

    const existingLine = await this.prisma.approvalLine.findUnique({ where: { documentId: dto.documentId } });

    let lineId: string;
    if (!existingLine) {
      const created = await this.prisma.approvalLine.create({
        data: {
          documentId: dto.documentId,
          submittedByEmployeeId: submitterEmployeeId,
          status: ApprovalLineStatus.DRAFT,
          currentOrder: null
        }
      });
      lineId = created.id;
    } else {
      if (existingLine.status === ApprovalLineStatus.IN_REVIEW) {
        throw new BadRequestException("Cannot reconfigure line while approval is in review");
      }

      await this.prisma.approvalAction.deleteMany({ where: { lineId: existingLine.id } });
      await this.prisma.approvalStep.deleteMany({ where: { lineId: existingLine.id } });

      await this.prisma.approvalLine.update({
        where: { id: existingLine.id },
        data: {
          submittedByEmployeeId: submitterEmployeeId,
          status: ApprovalLineStatus.DRAFT,
          currentOrder: null,
          submittedAt: null,
          completedAt: null
        }
      });

      lineId = existingLine.id;
    }

    await this.prisma.approvalStep.createMany({
      data: sortedSteps.map((step) => ({
        lineId,
        orderNo: step.orderNo,
        type: step.type,
        approverEmployeeId: step.approverEmployeeId,
        status: ApprovalStepStatus.WAITING
      }))
    });

    await this.auditService.log({
      companyId: auth.companyId,
      actorId: auth.userId,
      entityType: "ApprovalLine",
      entityId: lineId,
      action: "APPROVAL_LINE_CONFIGURE",
      afterJson: {
        documentId: dto.documentId,
        steps: sortedSteps
      },
      metadataJson: toInputJson({ note: dto.note }),
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    return this.getLine(auth, lineId);
  }

  async submit(auth: AuthContext, lineId: string, requestMeta: RequestMeta) {
    const line = await this.getLineForCompany(auth, lineId);

    if (line.status !== ApprovalLineStatus.DRAFT) {
      throw new BadRequestException("Only draft lines can be submitted");
    }

    const submitterEmployeeId = await this.resolveEmployeeIdForUser(auth);
    if (!submitterEmployeeId) {
      throw new BadRequestException("Submitter employee mapping is required");
    }

    await this.prisma.approvalStep.updateMany({
      where: { lineId },
      data: {
        status: ApprovalStepStatus.WAITING,
        actedAt: null,
        comment: null
      }
    });

    const nextOrder = await this.moveForwardToNextActionable(lineId, 0);

    if (nextOrder === null) {
      await this.prisma.approvalLine.update({
        where: { id: lineId },
        data: {
          submittedByEmployeeId: submitterEmployeeId,
          status: ApprovalLineStatus.APPROVED,
          currentOrder: null,
          submittedAt: new Date(),
          completedAt: new Date()
        }
      });

      await this.prisma.document.update({
        where: { id: line.documentId },
        data: {
          status: DocumentStatus.APPROVED,
          submittedAt: new Date(),
          completedAt: new Date()
        }
      });
    } else {
      await this.prisma.approvalLine.update({
        where: { id: lineId },
        data: {
          submittedByEmployeeId: submitterEmployeeId,
          status: ApprovalLineStatus.IN_REVIEW,
          currentOrder: nextOrder,
          submittedAt: new Date(),
          completedAt: null
        }
      });

      await this.prisma.document.update({
        where: { id: line.documentId },
        data: {
          status: DocumentStatus.IN_REVIEW,
          submittedAt: new Date(),
          completedAt: null
        }
      });
    }

    await this.prisma.approvalAction.create({
      data: {
        lineId,
        actorId: auth.userId,
        actionType: "SUBMIT"
      }
    });

    await this.syncBusinessStatusForDocument({
      auth,
      lineId,
      documentId: line.documentId,
      lineStatus: nextOrder === null ? ApprovalLineStatus.APPROVED : ApprovalLineStatus.IN_REVIEW,
      requestMeta
    });

    await this.auditService.log({
      companyId: auth.companyId,
      actorId: auth.userId,
      entityType: "ApprovalLine",
      entityId: lineId,
      action: "APPROVAL_SUBMIT",
      afterJson: {
        status: nextOrder === null ? ApprovalLineStatus.APPROVED : ApprovalLineStatus.IN_REVIEW,
        currentOrder: nextOrder
      },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    return this.getLine(auth, lineId);
  }

  async approve(auth: AuthContext, lineId: string, dto: ApprovalActionCommentDto, requestMeta: RequestMeta) {
    const line = await this.getLineForCompany(auth, lineId);

    if (line.status !== ApprovalLineStatus.IN_REVIEW || !line.currentOrder) {
      throw new BadRequestException("Approval line is not in actionable state");
    }

    const actorEmployeeId = await this.resolveEmployeeIdForUser(auth);
    if (!actorEmployeeId) {
      throw new BadRequestException("Approver employee mapping is required");
    }

    const currentStep = line.steps.find((step) => step.orderNo === line.currentOrder);
    if (!currentStep || currentStep.status !== ApprovalStepStatus.PENDING) {
      throw new BadRequestException("Current approval step is not pending");
    }

    if (currentStep.approverEmployeeId !== actorEmployeeId) {
      throw new ForbiddenException("Only assigned approver can approve this step");
    }

    await this.prisma.approvalStep.update({
      where: { id: currentStep.id },
      data: {
        status: ApprovalStepStatus.APPROVED,
        actedAt: new Date(),
        comment: dto.comment ?? null
      }
    });

    await this.prisma.approvalAction.create({
      data: {
        lineId,
        stepId: currentStep.id,
        actorId: auth.userId,
        actionType: "APPROVE",
        comment: dto.comment
      }
    });

    const nextOrder = await this.moveForwardToNextActionable(lineId, currentStep.orderNo);

    if (nextOrder === null) {
      await this.prisma.approvalLine.update({
        where: { id: lineId },
        data: {
          status: ApprovalLineStatus.APPROVED,
          currentOrder: null,
          completedAt: new Date()
        }
      });

      await this.prisma.document.update({
        where: { id: line.documentId },
        data: {
          status: DocumentStatus.APPROVED,
          completedAt: new Date()
        }
      });
    } else {
      await this.prisma.approvalLine.update({
        where: { id: lineId },
        data: {
          status: ApprovalLineStatus.IN_REVIEW,
          currentOrder: nextOrder
        }
      });
    }

    await this.syncBusinessStatusForDocument({
      auth,
      lineId,
      documentId: line.documentId,
      lineStatus: nextOrder === null ? ApprovalLineStatus.APPROVED : ApprovalLineStatus.IN_REVIEW,
      requestMeta
    });

    await this.auditService.log({
      companyId: auth.companyId,
      actorId: auth.userId,
      entityType: "ApprovalLine",
      entityId: lineId,
      action: "APPROVAL_APPROVE",
      metadataJson: toInputJson({ comment: dto.comment, stepId: currentStep.id }),
      afterJson: {
        nextOrder,
        status: nextOrder === null ? ApprovalLineStatus.APPROVED : ApprovalLineStatus.IN_REVIEW
      },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    return this.getLine(auth, lineId);
  }

  async reject(auth: AuthContext, lineId: string, dto: ApprovalActionCommentDto, requestMeta: RequestMeta) {
    const line = await this.getLineForCompany(auth, lineId);

    if (line.status !== ApprovalLineStatus.IN_REVIEW || !line.currentOrder) {
      throw new BadRequestException("Approval line is not in actionable state");
    }

    const actorEmployeeId = await this.resolveEmployeeIdForUser(auth);
    if (!actorEmployeeId) {
      throw new BadRequestException("Approver employee mapping is required");
    }

    const currentStep = line.steps.find((step) => step.orderNo === line.currentOrder);
    if (!currentStep || currentStep.status !== ApprovalStepStatus.PENDING) {
      throw new BadRequestException("Current approval step is not pending");
    }

    if (currentStep.approverEmployeeId !== actorEmployeeId) {
      throw new ForbiddenException("Only assigned approver can reject this step");
    }

    await this.prisma.approvalStep.update({
      where: { id: currentStep.id },
      data: {
        status: ApprovalStepStatus.REJECTED,
        actedAt: new Date(),
        comment: dto.comment ?? null
      }
    });

    await this.prisma.approvalLine.update({
      where: { id: lineId },
      data: {
        status: ApprovalLineStatus.REJECTED,
        currentOrder: null,
        completedAt: new Date()
      }
    });

    await this.prisma.document.update({
      where: { id: line.documentId },
      data: {
        status: DocumentStatus.REJECTED,
        completedAt: new Date()
      }
    });

    await this.prisma.approvalAction.create({
      data: {
        lineId,
        stepId: currentStep.id,
        actorId: auth.userId,
        actionType: "REJECT",
        comment: dto.comment
      }
    });

    await this.syncBusinessStatusForDocument({
      auth,
      lineId,
      documentId: line.documentId,
      lineStatus: ApprovalLineStatus.REJECTED,
      requestMeta
    });

    await this.auditService.log({
      companyId: auth.companyId,
      actorId: auth.userId,
      entityType: "ApprovalLine",
      entityId: lineId,
      action: "APPROVAL_REJECT",
      metadataJson: toInputJson({ comment: dto.comment, stepId: currentStep.id }),
      afterJson: {
        status: ApprovalLineStatus.REJECTED
      },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    return this.getLine(auth, lineId);
  }

  async cancel(auth: AuthContext, lineId: string, dto: ApprovalActionCommentDto, requestMeta: RequestMeta) {
    const line = await this.getLineForCompany(auth, lineId);

    const cancellableStatuses: ApprovalLineStatus[] = [
      ApprovalLineStatus.DRAFT,
      ApprovalLineStatus.IN_REVIEW,
      ApprovalLineStatus.REJECTED
    ];
    if (!cancellableStatuses.includes(line.status)) {
      throw new BadRequestException("Cannot cancel this approval line state");
    }

    const actorEmployeeId = await this.resolveEmployeeIdForUser(auth);

    if (
      line.submittedByEmployeeId &&
      line.submittedByEmployeeId !== actorEmployeeId &&
      !ADMIN_ROLES.includes(auth.role)
    ) {
      throw new ForbiddenException("Only submitter or admin role can cancel this line");
    }

    await this.prisma.approvalStep.updateMany({
      where: {
        lineId,
        status: {
          in: [ApprovalStepStatus.PENDING, ApprovalStepStatus.WAITING]
        }
      },
      data: {
        status: ApprovalStepStatus.CANCELED,
        actedAt: new Date(),
        comment: dto.comment ?? "Canceled"
      }
    });

    await this.prisma.approvalLine.update({
      where: { id: lineId },
      data: {
        status: ApprovalLineStatus.CANCELED,
        currentOrder: null,
        completedAt: new Date()
      }
    });

    await this.prisma.document.update({
      where: { id: line.documentId },
      data: {
        status: DocumentStatus.CANCELED,
        completedAt: new Date()
      }
    });

    await this.prisma.approvalAction.create({
      data: {
        lineId,
        actorId: auth.userId,
        actionType: "CANCEL",
        comment: dto.comment
      }
    });

    await this.syncBusinessStatusForDocument({
      auth,
      lineId,
      documentId: line.documentId,
      lineStatus: ApprovalLineStatus.CANCELED,
      requestMeta
    });

    await this.auditService.log({
      companyId: auth.companyId,
      actorId: auth.userId,
      entityType: "ApprovalLine",
      entityId: lineId,
      action: "APPROVAL_CANCEL",
      metadataJson: toInputJson({ comment: dto.comment }),
      afterJson: {
        status: ApprovalLineStatus.CANCELED
      },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    return this.getLine(auth, lineId);
  }

  async resubmit(auth: AuthContext, lineId: string, dto: ApprovalActionCommentDto, requestMeta: RequestMeta) {
    const line = await this.getLineForCompany(auth, lineId);

    const resubmittableStatuses: ApprovalLineStatus[] = [ApprovalLineStatus.REJECTED, ApprovalLineStatus.CANCELED];
    if (!resubmittableStatuses.includes(line.status)) {
      throw new BadRequestException("Only rejected or canceled lines can be resubmitted");
    }

    const submitterEmployeeId = await this.resolveEmployeeIdForUser(auth);
    if (!submitterEmployeeId) {
      throw new BadRequestException("Submitter employee mapping is required");
    }

    await this.prisma.approvalStep.updateMany({
      where: { lineId },
      data: {
        status: ApprovalStepStatus.WAITING,
        actedAt: null,
        comment: null
      }
    });

    const nextOrder = await this.moveForwardToNextActionable(lineId, 0);

    if (nextOrder === null) {
      await this.prisma.approvalLine.update({
        where: { id: lineId },
        data: {
          submittedByEmployeeId: submitterEmployeeId,
          status: ApprovalLineStatus.APPROVED,
          currentOrder: null,
          submittedAt: new Date(),
          completedAt: new Date()
        }
      });

      await this.prisma.document.update({
        where: { id: line.documentId },
        data: {
          status: DocumentStatus.APPROVED,
          submittedAt: new Date(),
          completedAt: new Date()
        }
      });
    } else {
      await this.prisma.approvalLine.update({
        where: { id: lineId },
        data: {
          submittedByEmployeeId: submitterEmployeeId,
          status: ApprovalLineStatus.IN_REVIEW,
          currentOrder: nextOrder,
          submittedAt: new Date(),
          completedAt: null
        }
      });

      await this.prisma.document.update({
        where: { id: line.documentId },
        data: {
          status: DocumentStatus.IN_REVIEW,
          submittedAt: new Date(),
          completedAt: null
        }
      });
    }

    await this.prisma.approvalAction.create({
      data: {
        lineId,
        actorId: auth.userId,
        actionType: "RESUBMIT",
        comment: dto.comment
      }
    });

    await this.syncBusinessStatusForDocument({
      auth,
      lineId,
      documentId: line.documentId,
      lineStatus: nextOrder === null ? ApprovalLineStatus.APPROVED : ApprovalLineStatus.IN_REVIEW,
      requestMeta
    });

    await this.auditService.log({
      companyId: auth.companyId,
      actorId: auth.userId,
      entityType: "ApprovalLine",
      entityId: lineId,
      action: "APPROVAL_RESUBMIT",
      metadataJson: toInputJson({ comment: dto.comment }),
      afterJson: {
        status: nextOrder === null ? ApprovalLineStatus.APPROVED : ApprovalLineStatus.IN_REVIEW,
        currentOrder: nextOrder
      },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    return this.getLine(auth, lineId);
  }

  async getLine(auth: AuthContext, lineId: string) {
    const line = await this.getLineForCompany(auth, lineId);
    return toSerializable(line);
  }

  async listInbox(auth: AuthContext) {
    const actorEmployeeId = await this.resolveEmployeeIdForUser(auth);
    if (!actorEmployeeId) {
      return [];
    }

    const lines = await this.prisma.approvalLine.findMany({
      where: {
        status: ApprovalLineStatus.IN_REVIEW,
        document: {
          companyId: auth.companyId
        }
      },
      include: {
        document: true,
        steps: {
          include: {
            approverEmployee: {
              select: {
                id: true,
                employeeNumber: true,
                nameKr: true,
                userId: true
              }
            }
          },
          orderBy: { orderNo: "asc" }
        }
      },
      orderBy: { submittedAt: "asc" }
    });

    const inbox = lines.filter((line) => {
      if (!line.currentOrder) {
        return false;
      }

      return line.steps.some(
        (step) =>
          step.orderNo === line.currentOrder &&
          step.status === ApprovalStepStatus.PENDING &&
          step.approverEmployeeId === actorEmployeeId
      );
    });

    return toSerializable(inbox);
  }
}
