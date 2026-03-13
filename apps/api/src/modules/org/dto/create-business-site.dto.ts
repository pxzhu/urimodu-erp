import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class CreateBusinessSiteDto {
  @ApiProperty()
  @IsString()
  companyId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legalEntityId?: string;

  @ApiProperty({ example: "DAEJEON-RND" })
  @IsString()
  code!: string;

  @ApiProperty({ example: "대전 R&D 센터" })
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ default: "Asia/Seoul" })
  @IsOptional()
  @IsString()
  timezone?: string;
}
