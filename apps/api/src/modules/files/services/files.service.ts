import { createHash, randomUUID } from "node:crypto";
import { extname } from "node:path";

import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma, type FileObject } from "@prisma/client";

import type { AuthContext } from "../../../common/auth/request-context";
import { OBJECT_STORAGE } from "../../../common/storage/storage.constants";
import type { ObjectStorage } from "../../../common/storage/storage.interface";
import { toSerializable } from "../../../common/utils/serialization.util";
import { AuditService } from "../../audit/services/audit.service";
import { PrismaService } from "../../../common/prisma/prisma.service";

interface FileUploadInput {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
  metadata?: Prisma.InputJsonValue;
}

interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

function toInputJson(value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value as Prisma.InputJsonValue;
}

function normalizeExtension(fileName: string): string | null {
  const extension = extname(fileName).trim().toLowerCase();
  return extension ? extension.replace(/^\./, "") : null;
}

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage
  ) {}

  private buildStorageKey(companyId: string, originalName: string): string {
    const datePrefix = new Date().toISOString().slice(0, 10);
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    return `${companyId}/${datePrefix}/${randomUUID()}-${safeName}`;
  }

  private toResponse(file: FileObject & { uploadedBy?: { id: string; email: string; name: string } | null }) {
    return toSerializable({
      ...file,
      sizeBytes: file.sizeBytes,
      uploadedBy: file.uploadedBy ?? null
    });
  }

  async createFileObject(
    auth: AuthContext,
    input: FileUploadInput,
    requestMeta: RequestMeta,
    options?: { action?: string; entityType?: string; entityId?: string }
  ) {
    if (!input.originalName || input.sizeBytes <= 0 || !input.buffer.byteLength) {
      throw new BadRequestException("Valid file input is required");
    }

    const storageKey = this.buildStorageKey(auth.companyId, input.originalName);
    const checksumSha256 = createHash("sha256").update(input.buffer).digest("hex");

    await this.storage.putObject({
      key: storageKey,
      contentType: input.mimeType,
      body: input.buffer,
      metadata: {
        "x-company-id": auth.companyId,
        "x-uploaded-by": auth.userId
      }
    });

    const created = await this.prisma.fileObject.create({
      data: {
        companyId: auth.companyId,
        uploadedById: auth.userId,
        bucket: process.env.MINIO_BUCKET ?? "erp-files",
        storageKey,
        originalName: input.originalName,
        mimeType: input.mimeType,
        extension: normalizeExtension(input.originalName),
        sizeBytes: BigInt(input.sizeBytes),
        checksumSha256,
        metadata: toInputJson(input.metadata)
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    await this.auditService.log({
      companyId: auth.companyId,
      actorId: auth.userId,
      entityType: options?.entityType ?? "FileObject",
      entityId: options?.entityId ?? created.id,
      action: options?.action ?? "FILE_UPLOAD",
      afterJson: {
        fileId: created.id,
        storageKey: created.storageKey,
        originalName: created.originalName,
        mimeType: created.mimeType,
        sizeBytes: created.sizeBytes.toString(),
        checksumSha256: created.checksumSha256
      },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    return this.toResponse(created);
  }

  async upload(
    auth: AuthContext,
    input: FileUploadInput,
    requestMeta: RequestMeta
  ) {
    return this.createFileObject(auth, input, requestMeta);
  }

  async list(auth: AuthContext) {
    const files = await this.prisma.fileObject.findMany({
      where: {
        companyId: auth.companyId,
        status: "ACTIVE"
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return files.map((file) => this.toResponse(file));
  }

  async getMetadata(auth: AuthContext, fileId: string) {
    const file = await this.prisma.fileObject.findUnique({
      where: { id: fileId },
      include: {
        uploadedBy: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    if (!file) {
      throw new NotFoundException("File not found");
    }

    if (file.companyId !== auth.companyId) {
      throw new ForbiddenException("File access denied");
    }

    return this.toResponse(file);
  }

  async getFileByIdForCompany(companyId: string, fileId: string) {
    const file = await this.prisma.fileObject.findUnique({ where: { id: fileId } });

    if (!file) {
      throw new NotFoundException("File not found");
    }

    if (file.companyId !== companyId) {
      throw new ForbiddenException("File access denied");
    }

    return file;
  }

  async getDownload(auth: AuthContext, fileId: string) {
    const file = await this.getFileByIdForCompany(auth.companyId, fileId);
    const object = await this.storage.getObject(file.storageKey);

    return {
      file: this.toResponse(file),
      stream: object.stream
    };
  }
}
