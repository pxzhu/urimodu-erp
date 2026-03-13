import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class CreateVendorDto {
  @ApiProperty({ description: "Vendor code", example: "VEND-001" })
  @IsString()
  code!: string;

  @ApiProperty({ description: "Vendor name", example: "서울교통 주식회사" })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: "Legal entity ID" })
  @IsOptional()
  @IsString()
  legalEntityId?: string;

  @ApiPropertyOptional({ description: "Business registration number" })
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiPropertyOptional({ description: "Active flag", default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
