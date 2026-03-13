import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ExpenseStatus } from "@prisma/client";
import { IsDateString, IsEnum, IsIn, IsOptional } from "class-validator";

export class CreateExpenseClaimExportJobDto {
  @ApiProperty({ enum: ["CSV", "JSON"], default: "CSV" })
  @IsIn(["CSV", "JSON"])
  format!: "CSV" | "JSON";

  @ApiPropertyOptional({ enum: ExpenseStatus })
  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;

  @ApiPropertyOptional({ description: "Created date from", example: "2026-03-01" })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: "Created date to", example: "2026-03-31" })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}
