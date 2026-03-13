import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class CreatePositionDto {
  @ApiProperty()
  @IsString()
  companyId!: string;

  @ApiProperty({ example: "SENIOR_MANAGER" })
  @IsString()
  code!: string;

  @ApiProperty({ example: "차장" })
  @IsString()
  name!: string;
}
