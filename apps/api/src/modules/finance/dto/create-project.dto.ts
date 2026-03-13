import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsString } from "class-validator";

export class CreateProjectDto {
  @ApiProperty({ description: "Project code", example: "PRJ-2026-ERP" })
  @IsString()
  code!: string;

  @ApiProperty({ description: "Project name", example: "ERP 고도화" })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: "Legal entity ID" })
  @IsOptional()
  @IsString()
  legalEntityId?: string;

  @ApiPropertyOptional({ description: "Project status", example: "ACTIVE" })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "Start date", example: "2026-03-01" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: "End date", example: "2026-12-31" })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
