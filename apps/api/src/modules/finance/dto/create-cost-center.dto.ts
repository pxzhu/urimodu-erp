import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class CreateCostCenterDto {
  @ApiProperty({ description: "Cost center code", example: "CC-HR" })
  @IsString()
  code!: string;

  @ApiProperty({ description: "Cost center name", example: "인사본부" })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: "Legal entity ID" })
  @IsOptional()
  @IsString()
  legalEntityId?: string;

  @ApiPropertyOptional({ description: "Active flag", default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
