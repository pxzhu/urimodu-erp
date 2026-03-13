import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { LeaveUnit } from "@prisma/client";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateLeaveRequestDto {
  @ApiProperty({ description: "Leave policy ID" })
  @IsString()
  leavePolicyId!: string;

  @ApiProperty({ description: "Leave start date", example: "2026-03-18" })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: "Leave end date", example: "2026-03-19" })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ enum: LeaveUnit, example: LeaveUnit.DAY })
  @IsEnum(LeaveUnit)
  unit!: LeaveUnit;

  @ApiPropertyOptional({ description: "Quantity override (auto-calculated if omitted)", example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.25)
  @Max(365)
  quantity?: number;

  @ApiPropertyOptional({ description: "Request reason" })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ type: [String], description: "Attachment file IDs for generated request document" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentFileIds?: string[];

  @ApiPropertyOptional({ type: [String], description: "Approver employee IDs for auto-created approval line" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  approverEmployeeIds?: string[];

  @ApiPropertyOptional({ description: "Auto-create request document and link it", default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  autoCreateDocument?: boolean;
}
