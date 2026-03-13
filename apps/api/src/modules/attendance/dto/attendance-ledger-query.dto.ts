import { ApiPropertyOptional } from "@nestjs/swagger";
import { AttendanceLedgerStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class AttendanceLedgerQueryDto {
  @ApiPropertyOptional({ description: "Filter by work date from (inclusive)", example: "2026-03-01" })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: "Filter by work date to (inclusive)", example: "2026-03-31" })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ description: "Filter by employee ID" })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({ enum: AttendanceLedgerStatus, description: "Filter by ledger status" })
  @IsOptional()
  @IsEnum(AttendanceLedgerStatus)
  status?: AttendanceLedgerStatus;

  @ApiPropertyOptional({ default: 100, minimum: 1, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
