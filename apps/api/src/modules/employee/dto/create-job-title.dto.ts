import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class CreateJobTitleDto {
  @ApiProperty()
  @IsString()
  companyId!: string;

  @ApiProperty({ example: "TEAM_LEAD" })
  @IsString()
  code!: string;

  @ApiProperty({ example: "팀장" })
  @IsString()
  name!: string;
}
