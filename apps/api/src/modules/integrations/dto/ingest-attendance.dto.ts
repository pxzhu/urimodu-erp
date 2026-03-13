import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AttendanceIngestionSource, IntegrationType } from "@prisma/client";
import { Type } from "class-transformer";
import { IsArray, IsEnum, IsObject, IsOptional, IsString, ValidateNested } from "class-validator";

export class AttendanceInboundEventDto {
  @ApiProperty({ description: "External user identifier from source system", example: "ADT-EMP-10000004" })
  @IsString()
  externalUserId!: string;

  @ApiPropertyOptional({ description: "Internal employee number mapping hint", example: "10000004" })
  @IsOptional()
  @IsString()
  employeeNumber?: string;

  @ApiProperty({ description: "Source event type", example: "IN" })
  @IsString()
  eventType!: string;

  @ApiProperty({ description: "Event timestamp in ISO-8601", example: "2026-03-14T08:58:00+09:00" })
  @IsString()
  eventTimestamp!: string;

  @ApiPropertyOptional({ description: "Device ID", example: "GATE-A-01" })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ description: "Source site code", example: "SEOUL-HQ" })
  @IsOptional()
  @IsString()
  siteCode?: string;

  @ApiPropertyOptional({ description: "Optional explicit dedupe key" })
  @IsOptional()
  @IsString()
  dedupeKey?: string;

  @ApiPropertyOptional({ description: "Raw source payload", type: "object", additionalProperties: true })
  @IsOptional()
  @IsObject()
  rawPayload?: Record<string, unknown>;
}

export class IngestAttendanceEventDto {
  @ApiPropertyOptional({ description: "Target company ID" })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({ description: "Target company code", example: "ACME_KR" })
  @IsOptional()
  @IsString()
  companyCode?: string;

  @ApiProperty({ enum: IntegrationType, example: IntegrationType.GENERIC })
  @IsEnum(IntegrationType)
  provider!: IntegrationType;

  @ApiPropertyOptional({ enum: AttendanceIngestionSource, default: AttendanceIngestionSource.API })
  @IsOptional()
  @IsEnum(AttendanceIngestionSource)
  source?: AttendanceIngestionSource;

  @ApiProperty({ type: AttendanceInboundEventDto })
  @ValidateNested()
  @Type(() => AttendanceInboundEventDto)
  event!: AttendanceInboundEventDto;
}

export class IngestAttendanceBatchDto {
  @ApiPropertyOptional({ description: "Target company ID" })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({ description: "Target company code", example: "ACME_KR" })
  @IsOptional()
  @IsString()
  companyCode?: string;

  @ApiProperty({ enum: IntegrationType, example: IntegrationType.GENERIC })
  @IsEnum(IntegrationType)
  provider!: IntegrationType;

  @ApiPropertyOptional({ enum: AttendanceIngestionSource, default: AttendanceIngestionSource.API })
  @IsOptional()
  @IsEnum(AttendanceIngestionSource)
  source?: AttendanceIngestionSource;

  @ApiProperty({ type: [AttendanceInboundEventDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceInboundEventDto)
  events!: AttendanceInboundEventDto[];
}

export class ImportAttendanceCsvDto {
  @ApiPropertyOptional({ description: "Target company ID" })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({ description: "Target company code", example: "ACME_KR" })
  @IsOptional()
  @IsString()
  companyCode?: string;

  @ApiProperty({ enum: IntegrationType, example: IntegrationType.GENERIC })
  @IsEnum(IntegrationType)
  provider!: IntegrationType;

  @ApiPropertyOptional({ enum: AttendanceIngestionSource, default: AttendanceIngestionSource.CSV })
  @IsOptional()
  @IsEnum(AttendanceIngestionSource)
  source?: AttendanceIngestionSource;
}
