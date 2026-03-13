import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class EmployeeQueryDto {
  @ApiProperty()
  @IsString()
  companyId!: string;
}
