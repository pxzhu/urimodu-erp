import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { EmploymentType } from "@prisma/client";
import { IsDateString, IsEmail, IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateEmployeeDto {
  @ApiProperty()
  @IsString()
  companyId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legalEntityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessSiteId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  positionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobTitleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiProperty({ example: "10000010" })
  @IsString()
  employeeNumber!: string;

  @ApiProperty({ example: "김개발" })
  @IsString()
  @MaxLength(100)
  nameKr!: string;

  @ApiPropertyOptional({ example: "Dev Kim" })
  @IsOptional()
  @IsString()
  nameEn?: string;

  @ApiPropertyOptional({ example: "dev.kim@acme.local" })
  @IsOptional()
  @IsEmail()
  workEmail?: string;

  @ApiPropertyOptional({ example: "010-1234-5678" })
  @IsOptional()
  @IsString()
  mobilePhone?: string;

  @ApiPropertyOptional({ example: "900101-1******" })
  @IsOptional()
  @IsString()
  nationalIdMasked?: string;

  @ApiProperty({ example: "2025-01-01" })
  @IsDateString()
  hireDate!: string;

  @ApiProperty({ enum: EmploymentType, example: EmploymentType.FULL_TIME })
  @IsEnum(EmploymentType)
  employmentType!: EmploymentType;
}
