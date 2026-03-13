import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateDepartmentDto {
  @ApiProperty()
  @IsString()
  companyId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessSiteId?: string;

  @ApiProperty({ example: "ENG-PLATFORM" })
  @IsString()
  code!: string;

  @ApiProperty({ example: "플랫폼개발팀" })
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerEmployeeId?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
