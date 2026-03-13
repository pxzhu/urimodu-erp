import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { JournalEntryStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested
} from "class-validator";

export class CreateJournalEntryLineDto {
  @ApiProperty({ description: "Account ID" })
  @IsString()
  accountId!: string;

  @ApiPropertyOptional({ description: "Vendor ID" })
  @IsOptional()
  @IsString()
  vendorId?: string;

  @ApiPropertyOptional({ description: "Cost center ID" })
  @IsOptional()
  @IsString()
  costCenterId?: string;

  @ApiPropertyOptional({ description: "Project ID" })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: "Line description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "Debit amount", example: 10000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  debit?: number;

  @ApiPropertyOptional({ description: "Credit amount", example: 10000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  credit?: number;
}

export class CreateJournalEntryDto {
  @ApiProperty({ description: "Entry date", example: "2026-03-14" })
  @IsDateString()
  entryDate!: string;

  @ApiPropertyOptional({ description: "Journal description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "Legal entity ID" })
  @IsOptional()
  @IsString()
  legalEntityId?: string;

  @ApiPropertyOptional({ description: "Linked expense claim ID" })
  @IsOptional()
  @IsString()
  expenseClaimId?: string;

  @ApiPropertyOptional({ enum: JournalEntryStatus, default: JournalEntryStatus.DRAFT })
  @IsOptional()
  @IsEnum(JournalEntryStatus)
  status?: JournalEntryStatus;

  @ApiProperty({ type: [CreateJournalEntryLineDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreateJournalEntryLineDto)
  lines!: CreateJournalEntryLineDto[];
}
