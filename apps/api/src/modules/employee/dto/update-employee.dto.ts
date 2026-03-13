import { ApiPropertyOptional } from "@nestjs/swagger";
import { EmploymentStatus, EmploymentType } from "@prisma/client";
import { IsDateString, IsEmail, IsEnum, IsOptional, IsString } from "class-validator";

export class UpdateEmployeeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legalEntityId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessSiteId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  positionId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobTitleId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nameKr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nameEn?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  workEmail?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mobilePhone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nationalIdMasked?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  terminationDate?: string | null;

  @ApiPropertyOptional({ enum: EmploymentType })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ enum: EmploymentStatus })
  @IsOptional()
  @IsEnum(EmploymentStatus)
  employmentStatus?: EmploymentStatus;
}
