import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "admin@acme.local" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "ChangeMe123!" })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ example: "local", default: "local" })
  @IsOptional()
  @IsString()
  provider?: string;
}
