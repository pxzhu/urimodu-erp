import { ApiPropertyOptional } from "@nestjs/swagger";
import { CorrectionStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class AttendanceCorrectionQueryDto {
  @ApiPropertyOptional({ enum: CorrectionStatus })
  @IsOptional()
  @IsEnum(CorrectionStatus)
  status?: CorrectionStatus;

  @ApiPropertyOptional({ description: "Filter by employee ID (admin/hr roles)" })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({ description: "Work date filter from (inclusive)", example: "2026-03-01" })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: "Work date filter to (inclusive)", example: "2026-03-31" })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ default: 100, minimum: 1, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
