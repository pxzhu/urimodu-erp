import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class CreateLegalEntityDto {
  @ApiProperty()
  @IsString()
  companyId!: string;

  @ApiProperty({ example: "ACME-KR-LE2" })
  @IsString()
  code!: string;

  @ApiProperty({ example: "주식회사 에이씨미코리아2" })
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  representativeName?: string;
}
