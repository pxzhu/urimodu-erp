import { ApiPropertyOptional } from "@nestjs/swagger";
import { AttendanceIngestionSource, IntegrationType } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

function toBoolean(value: unknown): boolean | undefined {
  if (value === true || value === "true") {
    return true;
  }

  if (value === false || value === "false") {
    return false;
  }

  return undefined;
}

export class AttendanceRawQueryDto {
  @ApiPropertyOptional({ description: "Filter by event date from (inclusive)", example: "2026-03-01" })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: "Filter by event date to (inclusive)", example: "2026-03-31" })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ description: "Filter by employee ID" })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({ enum: IntegrationType, description: "Filter by integration provider" })
  @IsOptional()
  @IsEnum(IntegrationType)
  provider?: IntegrationType;

  @ApiPropertyOptional({ enum: AttendanceIngestionSource, description: "Filter by ingestion source" })
  @IsOptional()
  @IsEnum(AttendanceIngestionSource)
  source?: AttendanceIngestionSource;

  @ApiPropertyOptional({ description: "Filter normalized state" })
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  normalized?: boolean;

  @ApiPropertyOptional({ default: 100, minimum: 1, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
