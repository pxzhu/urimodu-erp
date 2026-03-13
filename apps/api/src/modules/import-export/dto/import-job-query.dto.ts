import { ApiPropertyOptional } from "@nestjs/swagger";
import { JobStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class ImportJobQueryDto {
  @ApiPropertyOptional({ enum: JobStatus })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiPropertyOptional({ description: "Import type filter", example: "VENDOR" })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: "Max rows", default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
