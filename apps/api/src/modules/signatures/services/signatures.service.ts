import { Injectable } from "@nestjs/common";

import type { AuthContext } from "../../../common/auth/request-context";
import { toSerializable } from "../../../common/utils/serialization.util";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { AuditService } from "../../audit/services/audit.service";
import { FilesService } from "../../files/services/files.service";
import type { CreateSignatureAssetDto } from "../dto/create-signature-asset.dto";

interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class SignaturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
    private readonly auditService: AuditService
  ) {}

  async listMine(auth: AuthContext) {
    const assets = await this.prisma.signatureAsset.findMany({
      where: {
        companyId: auth.companyId,
        ownerUserId: auth.userId
      },
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
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }]
    });

    return toSerializable(assets);
  }

  async create(auth: AuthContext, dto: CreateSignatureAssetDto, requestMeta: RequestMeta) {
    await this.filesService.getFileByIdForCompany(auth.companyId, dto.fileId);

    if (dto.isDefault) {
      await this.prisma.signatureAsset.updateMany({
        where: {
          companyId: auth.companyId,
          ownerUserId: auth.userId,
          type: dto.type
        },
        data: {
          isDefault: false
        }
      });
    }

    const asset = await this.prisma.signatureAsset.create({
      data: {
        companyId: auth.companyId,
        ownerUserId: auth.userId,
        fileId: dto.fileId,
        type: dto.type,
        label: dto.label,
        isDefault: dto.isDefault ?? false
      },
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
      }
    });

    await this.auditService.log({
      companyId: auth.companyId,
      actorId: auth.userId,
      entityType: "SignatureAsset",
      entityId: asset.id,
      action: "SIGNATURE_ASSET_CREATE",
      afterJson: {
        fileId: dto.fileId,
        type: dto.type,
        label: dto.label,
        isDefault: dto.isDefault ?? false
      },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    return toSerializable(asset);
  }
}
