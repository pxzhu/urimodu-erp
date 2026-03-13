import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsObject, IsOptional, IsString, Max, Min } from "class-validator";

export class UpdateShiftPolicyDto {
  @ApiPropertyOptional({ description: "Policy name" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: "Timezone", example: "Asia/Seoul" })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: "Work start minute of day", example: 540 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1439)
  workStartMinutes?: number;

  @ApiPropertyOptional({ description: "Work end minute of day", example: 1080 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1439)
  workEndMinutes?: number;

  @ApiPropertyOptional({ description: "Break minutes", example: 60 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(720)
  breakMinutes?: number;

  @ApiPropertyOptional({ description: "Grace minutes", example: 10 })
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

  @ApiPropertyOptional({ description: "Set as default policy" })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isDefault?: boolean;
}
