import { BadRequestException, Body, Controller, Headers, Post, Req, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";

import type { RequestWithAuth } from "../../../common/auth/request-context";
import { getHeaderValue } from "../../../common/utils/request.util";
import { ImportAttendanceCsvDto, IngestAttendanceBatchDto, IngestAttendanceEventDto } from "../dto/ingest-attendance.dto";
import { IntegrationsService } from "../services/integrations.service";

interface UploadedBinaryFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@ApiTags("integrations")
@ApiHeader({
  name: "x-integration-key",
  required: true,
  description: "Ingress key for integration/agent ingestion"
})
@Controller("integrations")
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Post("attendance/raw")
  @ApiOperation({ summary: "Ingest a single raw attendance event" })
  ingestRawAttendance(
    @Body() dto: IngestAttendanceEventDto,
    @Headers("x-integration-key") integrationKey: string | undefined,
    @Req() req: RequestWithAuth
  ) {
    return this.integrationsService.ingestEvent(dto, {
      integrationKey,
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }

  @Post("attendance/raw/batch")
  @ApiOperation({ summary: "Ingest a batch of raw attendance events" })
  ingestRawAttendanceBatch(
    @Body() dto: IngestAttendanceBatchDto,
    @Headers("x-integration-key") integrationKey: string | undefined,
    @Req() req: RequestWithAuth
  ) {
    return this.integrationsService.ingestBatch(dto, {
      integrationKey,
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }

  @Post("attendance/raw/csv")
  @ApiOperation({ summary: "Import raw attendance events from CSV" })
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        companyId: { type: "string" },
        companyCode: { type: "string", example: "ACME_KR" },
        provider: { type: "string", example: "GENERIC" },
        source: { type: "string", example: "CSV" }
      },
      required: ["file", "provider"]
    }
  })
  async importRawAttendanceCsv(
    @UploadedFile() file: UploadedBinaryFile | undefined,
    @Body() dto: ImportAttendanceCsvDto,
    @Headers("x-integration-key") integrationKey: string | undefined,
    @Req() req: RequestWithAuth
  ) {
    if (!file) {
      throw new BadRequestException("file is required");
    }

    return this.integrationsService.importCsv(dto, file.buffer, {
      integrationKey,
      ipAddress: req.ip,
      userAgent: getHeaderValue(req.headers["user-agent"])
    });
  }
}
