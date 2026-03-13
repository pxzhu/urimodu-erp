import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ApprovalStepType } from "@prisma/client";
import { Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Min, ValidateNested } from "class-validator";

export class ApprovalStepInputDto {
  @ApiProperty({ description: "Step order number", example: 1 })
  @IsInt()
  @Min(1)
  orderNo!: number;

  @ApiProperty({ enum: ApprovalStepType, description: "Approval step type" })
  @IsEnum(ApprovalStepType)
  type!: ApprovalStepType;

  @ApiProperty({ description: "Approver employee ID" })
  @IsString()
  approverEmployeeId!: string;
}

export class ConfigureApprovalLineDto {
  @ApiProperty({ description: "Document ID" })
  @IsString()
  documentId!: string;

  @ApiProperty({ type: [ApprovalStepInputDto], description: "Approval routing steps" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalStepInputDto)
  steps!: ApprovalStepInputDto[];

  @ApiPropertyOptional({ description: "Optional note" })
  @IsOptional()
  @IsString()
  note?: string;
}
