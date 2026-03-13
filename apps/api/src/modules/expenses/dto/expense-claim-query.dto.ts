import { ApiPropertyOptional } from "@nestjs/swagger";
import { ExpenseStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class ExpenseClaimQueryDto {
  @ApiPropertyOptional({ enum: ExpenseStatus })
  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;

  @ApiPropertyOptional({ description: "Employee ID filter" })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({ description: "Created date from (YYYY-MM-DD)", example: "2026-03-01" })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: "Created date to (YYYY-MM-DD)", example: "2026-03-31" })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ description: "Max rows", default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
