import { ApiPropertyOptional } from "@nestjs/swagger";
import { JournalEntryStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";

export class JournalEntryQueryDto {
  @ApiPropertyOptional({ enum: JournalEntryStatus })
  @IsOptional()
  @IsEnum(JournalEntryStatus)
  status?: JournalEntryStatus;

  @ApiPropertyOptional({ description: "Entry date from", example: "2026-03-01" })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: "Entry date to", example: "2026-03-31" })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ description: "Max rows", default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(300)
  limit?: number;
}
