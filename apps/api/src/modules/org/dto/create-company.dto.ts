import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreateCompanyDto {
  @ApiProperty({ example: "ACME_KR_2" })
  @IsString()
  @MaxLength(50)
  code!: string;

  @ApiProperty({ example: "Acme Korea Second Entity" })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ default: "ko-KR" })
  @IsOptional()
  @IsString()
  defaultLocale?: string;

  @ApiPropertyOptional({ default: "Asia/Seoul" })
  @IsOptional()
  @IsString()
  timezone?: string;
}
