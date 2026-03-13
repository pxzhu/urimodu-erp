import { BadRequestException, Body, Controller, Get, Param, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";

import type { AuthContext, RequestWithAuth } from "../../../common/auth/request-context";
import { CurrentAuth } from "../../../common/decorators/auth-context.decorator";
import { ApiCompanyContextHeader } from "../../../common/decorators/api-company-context-header.decorator";
import { SessionAuthGuard } from "../../../common/guards/session-auth.guard";
import { getHeaderValue } from "../../../common/utils/request.util";
import { UploadFileDto } from "../dto/upload-file.dto";
import { FilesService } from "../services/files.service";

interface UploadedBinaryFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@ApiTags("files")
@ApiBearerAuth()
@ApiCompanyContextHeader(false)
@Controller("files")
@UseGuards(SessionAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post("upload")
  @ApiOperation({ summary: "Upload file to object storage" })
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary"
        },
        metadataJson: {
          type: "string",
          example: "{\"category\":\"approval-attachment\"}"
        }
      },
      required: ["file"]
    }
  })
  async upload(
    @CurrentAuth() auth: AuthContext,
    @UploadedFile() file: UploadedBinaryFile | undefined,
    @Body() dto: UploadFileDto,
    @Req() req: RequestWithAuth
  ) {
    if (!file) {
      throw new BadRequestException("file is required");
    }

    let metadata: Record<string, unknown> | undefined;
    if (dto.metadataJson) {
      try {
        metadata = JSON.parse(dto.metadataJson) as Record<string, unknown>;
      } catch {
        throw new BadRequestException("metadataJson must be valid JSON string");
      }
    }

    return this.filesService.upload(
      auth,
      {
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        buffer: file.buffer,
        metadata
      },
      {
        ipAddress: req.ip,
        userAgent: getHeaderValue(req.headers["user-agent"])
      }
    );
  }

  @Get()
  @ApiOperation({ summary: "List files in current company" })
  list(@CurrentAuth() auth: AuthContext) {
    return this.filesService.list(auth);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get file metadata" })
  getMetadata(@CurrentAuth() auth: AuthContext, @Param("id") fileId: string) {
    return this.filesService.getMetadata(auth, fileId);
  }

  @Get(":id/download")
  @ApiOperation({ summary: "Download file binary" })
  async download(@CurrentAuth() auth: AuthContext, @Param("id") fileId: string, @Res() res: Response) {
    const payload = await this.filesService.getDownload(auth, fileId);

    const dispositionFileName = encodeURIComponent(payload.file.originalName as string);
    res.setHeader("Content-Type", String(payload.file.mimeType));
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${dispositionFileName}`);
    payload.stream.pipe(res);
  }
}
