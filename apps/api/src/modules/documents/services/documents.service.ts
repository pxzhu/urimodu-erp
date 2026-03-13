import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { DocumentStatus, Prisma, type Document } from "@prisma/client";

import type { AuthContext } from "../../../common/auth/request-context";
import { toSerializable } from "../../../common/utils/serialization.util";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { FilesService } from "../../files/services/files.service";
import { AuditService } from "../../audit/services/audit.service";
import type { CreateDocumentDto } from "../dto/create-document.dto";
import type { AddDocumentVersionDto } from "../dto/add-document-version.dto";
import type { RenderDocumentPdfDto } from "../dto/render-document-pdf.dto";
import { DocumentRenderService } from "./document-render.service";
import { renderHtmlTemplate } from "./document-template.util";

interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
    private readonly auditService: AuditService,
    private readonly documentRenderService: DocumentRenderService
  ) {}

  private assertCompanyAccess(auth: AuthContext, document: Document) {
    if (document.companyId !== auth.companyId) {
      throw new ForbiddenException("Document access denied");
    }
  }

  private async getOwnerEmployeeId(auth: AuthContext): Promise<string | null> {
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

  private async validateAttachmentFiles(companyId: string, fileIds: string[]) {
    if (fileIds.length === 0) {
      return;
    }

    const uniqueFileIds = [...new Set(fileIds)];
    const files = await this.prisma.fileObject.findMany({
      where: {
        id: { in: uniqueFileIds },
        companyId,
        status: "ACTIVE"
      },
      select: { id: true }
    });

    const foundIds = new Set(files.map((file) => file.id));
    const missingId = uniqueFileIds.find((fileId) => !foundIds.has(fileId));
    if (missingId) {
      throw new BadRequestException(`Invalid attachment file id: ${missingId}`);
    }
  }

  async listTemplates(auth: AuthContext) {
    const templates = await this.prisma.documentTemplate.findMany({
      where: {
        isActive: true,
        OR: [{ companyId: auth.companyId }, { isSystem: true }]
      },
      orderBy: [{ category: "asc" }, { name: "asc" }, { version: "desc" }]
    });

    return toSerializable(templates);
  }

  async listDocuments(auth: AuthContext) {
    const documents = await this.prisma.document.findMany({
      where: { companyId: auth.companyId },
      include: {
        template: true,
        approvalLine: {
          select: {
            id: true,
            status: true,
            currentOrder: true
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    return toSerializable(documents);
  }

  async getDocument(auth: AuthContext, documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        template: true,
        versions: {
          include: {
            authoredBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            pdfFile: {
              select: {
                id: true,
                originalName: true,
                mimeType: true,
                sizeBytes: true,
                createdAt: true
              }
            },
            attachments: {
              include: {
                file: {
                  select: {
                    id: true,
                    originalName: true,
                    mimeType: true,
                    sizeBytes: true,
                    createdAt: true
                  }
                }
              },
              orderBy: { createdAt: "asc" }
            }
          },
          orderBy: { versionNo: "desc" }
        },
        approvalLine: {
          include: {
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
        }
      }
    });

    if (!document) {
      throw new NotFoundException("Document not found");
    }

    this.assertCompanyAccess(auth, document);
    return toSerializable(document);
  }

  async createDocument(auth: AuthContext, dto: CreateDocumentDto, requestMeta: RequestMeta) {
    const template = await this.prisma.documentTemplate.findUnique({ where: { id: dto.templateId } });

    if (!template || !template.isActive) {
      throw new NotFoundException("Document template not found");
    }

    if (template.companyId && template.companyId !== auth.companyId) {
      throw new ForbiddenException("Template access denied");
    }

    const attachmentFileIds = dto.attachmentFileIds ?? [];
    await this.validateAttachmentFiles(auth.companyId, attachmentFileIds);

    const ownerEmployeeId = await this.getOwnerEmployeeId(auth);
    const renderedHtml = renderHtmlTemplate(template.htmlTemplate, dto.contentJson);
    const title = dto.title?.trim() || `${template.name} ${new Date().toISOString().slice(0, 10)}`;

    const created = await this.prisma.$transaction(async (transaction) => {
      const document = await transaction.document.create({
        data: {
          companyId: auth.companyId,
          ownerEmployeeId,
          templateId: template.id,
          title,
          category: dto.category ?? template.category,
          status: DocumentStatus.DRAFT,
          currentVersionNo: 1
        }
      });

      const version = await transaction.documentVersion.create({
        data: {
          documentId: document.id,
          versionNo: 1,
          authoredById: auth.userId,
          contentJson: toInputJson(dto.contentJson),
          htmlSnapshot: renderedHtml
        }
      });

      if (attachmentFileIds.length > 0) {
        await transaction.documentVersionAttachment.createMany({
          data: attachmentFileIds.map((fileId) => ({
            documentVersionId: version.id,
            fileId
          }))
        });
      }

      return { documentId: document.id };
    });

    await this.auditService.log({
      companyId: auth.companyId,
      actorId: auth.userId,
      entityType: "Document",
      entityId: created.documentId,
      action: "DOCUMENT_CREATE",
      afterJson: {
        templateId: template.id,
        title,
        attachmentCount: attachmentFileIds.length
      },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    return this.getDocument(auth, created.documentId);
  }

  async addVersion(auth: AuthContext, documentId: string, dto: AddDocumentVersionDto, requestMeta: RequestMeta) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { template: true }
    });

    if (!document) {
      throw new NotFoundException("Document not found");
    }

    this.assertCompanyAccess(auth, document);

    if (!document.template) {
      throw new BadRequestException("Document template is required to create next version");
    }

    const attachmentFileIds = dto.attachmentFileIds ?? [];
    await this.validateAttachmentFiles(auth.companyId, attachmentFileIds);

    const nextVersionNo = document.currentVersionNo + 1;
    const renderedHtml = renderHtmlTemplate(document.template.htmlTemplate, dto.contentJson);

    await this.prisma.$transaction(async (transaction) => {
      const version = await transaction.documentVersion.create({
        data: {
          documentId,
          versionNo: nextVersionNo,
          authoredById: auth.userId,
          contentJson: toInputJson(dto.contentJson),
          htmlSnapshot: renderedHtml
        }
      });

      if (attachmentFileIds.length > 0) {
        await transaction.documentVersionAttachment.createMany({
          data: attachmentFileIds.map((fileId) => ({
            documentVersionId: version.id,
            fileId
          }))
        });
      }

      await transaction.document.update({
        where: { id: documentId },
        data: {
          currentVersionNo: nextVersionNo,
          status: DocumentStatus.DRAFT,
          title: dto.title?.trim() || document.title,
          completedAt: null
        }
      });
    });

    await this.auditService.log({
      companyId: auth.companyId,
      actorId: auth.userId,
      entityType: "Document",
      entityId: documentId,
      action: "DOCUMENT_VERSION_CREATE",
      afterJson: {
        versionNo: nextVersionNo,
        attachmentCount: attachmentFileIds.length
      },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    return this.getDocument(auth, documentId);
  }

  async renderPdf(auth: AuthContext, documentId: string, dto: RenderDocumentPdfDto | undefined, requestMeta: RequestMeta) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document) {
      throw new NotFoundException("Document not found");
    }

    this.assertCompanyAccess(auth, document);

    const targetVersionNo = dto?.versionNo ?? document.currentVersionNo;

    const version = await this.prisma.documentVersion.findUnique({
      where: {
        documentId_versionNo: {
          documentId,
          versionNo: targetVersionNo
        }
      }
    });

    if (!version) {
      throw new NotFoundException("Document version not found");
    }

    const pdfBytes = await this.documentRenderService.renderPdf({
      title: document.title,
      html: version.htmlSnapshot
    });

    const pdfFile = await this.filesService.createFileObject(
      auth,
      {
        originalName: `${document.title.replace(/[^a-zA-Z0-9._-]/g, "_")}-v${targetVersionNo}.pdf`,
        mimeType: "application/pdf",
        sizeBytes: pdfBytes.byteLength,
        buffer: pdfBytes,
        metadata: {
          source: "document-render",
          documentId,
          versionNo: targetVersionNo
        } as Prisma.InputJsonValue
      },
      requestMeta,
      {
        action: "DOCUMENT_PDF_FILE_CREATE",
        entityType: "Document",
        entityId: documentId
      }
    );

    await this.prisma.documentVersion.update({
      where: {
        documentId_versionNo: {
          documentId,
          versionNo: targetVersionNo
        }
      },
      data: {
        pdfFileId: String(pdfFile.id)
      }
    });

    await this.auditService.log({
      companyId: auth.companyId,
      actorId: auth.userId,
      entityType: "Document",
      entityId: documentId,
      action: "DOCUMENT_RENDER_PDF",
      afterJson: {
        versionNo: targetVersionNo,
        pdfFileId: pdfFile.id
      },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    return {
      documentId,
      versionNo: targetVersionNo,
      pdfFileId: pdfFile.id,
      downloadPath: `/files/${pdfFile.id}/download`
    };
  }
}
