import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsObject, IsOptional, IsString } from "class-validator";

export class CreateVendorImportJobDto {
  @ApiProperty({ description: "Uploaded source FileObject ID (CSV or XLSX)" })
  @IsString()
  sourceFileId!: string;

  @ApiPropertyOptional({ description: "Optional import mapping metadata" })
  @IsOptional()
  @IsObject()
  mappingJson?: Record<string, unknown>;
}
