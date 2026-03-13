import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class DepartmentQueryDto {
  @ApiProperty()
  @IsString()
  companyId!: string;
}
