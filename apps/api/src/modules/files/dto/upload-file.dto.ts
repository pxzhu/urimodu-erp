import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class UploadFileDto {
  @ApiPropertyOptional({
    description: "Optional JSON string metadata for file object",
    example: "{\"source\":\"document-form\",\"category\":\"approval-attachment\"}"
  })
  @IsOptional()
  @IsString()
  metadataJson?: string;
}
