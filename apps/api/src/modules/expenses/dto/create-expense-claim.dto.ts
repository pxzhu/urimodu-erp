import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ExpenseStatus } from "@prisma/client";
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

export class CreateExpenseItemDto {
  @ApiProperty({ description: "Expense incurred date", example: "2026-03-14" })
  @IsDateString()
  incurredOn!: string;

  @ApiProperty({ description: "Expense category", example: "TRANSPORT" })
  @IsString()
  category!: string;

  @ApiPropertyOptional({ description: "Expense line description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "Vendor ID" })
  @IsOptional()
  @IsString()
  vendorId?: string;

  @ApiProperty({ description: "Net amount", example: 15000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ description: "VAT amount", example: 1500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  vatAmount?: number;

  @ApiPropertyOptional({ description: "Receipt/evidence FileObject ID" })
  @IsOptional()
  @IsString()
  receiptFileId?: string;
}

export class CreateExpenseClaimDto {
  @ApiProperty({ description: "Expense claim title" })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ description: "Employee ID (admin roles only). If omitted, current user's active employee profile is used." })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({ description: "Legal entity ID" })
  @IsOptional()
  @IsString()
  legalEntityId?: string;

  @ApiPropertyOptional({ description: "Cost center ID" })
  @IsOptional()
  @IsString()
  costCenterId?: string;

  @ApiPropertyOptional({ description: "Project ID" })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: "Linked document ID from document module" })
  @IsOptional()
  @IsString()
  documentId?: string;

  @ApiPropertyOptional({ description: "Currency code", default: "KRW" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ enum: ExpenseStatus, description: "Initial claim status", default: ExpenseStatus.DRAFT })
  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;

  @ApiProperty({ type: [CreateExpenseItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateExpenseItemDto)
  items!: CreateExpenseItemDto[];
}
