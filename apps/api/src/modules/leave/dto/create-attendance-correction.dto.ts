import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsDateString, IsOptional, IsString } from "class-validator";

export class CreateAttendanceCorrectionDto {
  @ApiProperty({ description: "Target work date", example: "2026-03-14" })
  @IsDateString()
  workDate!: string;

  @ApiPropertyOptional({ description: "Requested check-in timestamp", example: "2026-03-14T09:00:00+09:00" })
  @IsOptional()
  @IsDateString()
  requestedCheckInAt?: string;

  @ApiPropertyOptional({ description: "Requested check-out timestamp", example: "2026-03-14T18:00:00+09:00" })
  @IsOptional()
  @IsDateString()
  requestedCheckOutAt?: string;

  @ApiProperty({ description: "Reason for correction" })
  @IsString()
  reason!: string;

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

  @ApiPropertyOptional({ description: "Auto-create correction document and link it", default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  autoCreateDocument?: boolean;
}
