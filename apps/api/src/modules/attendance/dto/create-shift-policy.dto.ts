import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsObject, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateShiftPolicyDto {
  @ApiPropertyOptional({ description: "Optional business site ID" })
  @IsOptional()
  @IsString()
  businessSiteId?: string;

  @ApiProperty({ description: "Policy code", example: "DEFAULT_9_TO_6" })
  @IsString()
  code!: string;

  @ApiProperty({ description: "Policy name", example: "기본 09:00~18:00" })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: "Policy version (auto-increment when omitted)", example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number;

  @ApiPropertyOptional({ description: "Timezone", example: "Asia/Seoul" })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ description: "Work start minute of day", example: 540 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1439)
  workStartMinutes!: number;

  @ApiProperty({ description: "Work end minute of day", example: 1080 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1439)
  workEndMinutes!: number;

  @ApiPropertyOptional({ description: "Break minutes", example: 60, default: 60 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(720)
  breakMinutes?: number;

  @ApiPropertyOptional({ description: "Grace minutes for late judgment", example: 10, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(180)
  graceMinutes?: number;

  @ApiPropertyOptional({ description: "Additional policy rules JSON", type: "object", additionalProperties: true })
  @IsOptional()
  @IsObject()
  rulesJson?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Mark as default policy", default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isDefault?: boolean;
}
