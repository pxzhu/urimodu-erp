import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, Min } from "class-validator";

export class RenderDocumentPdfDto {
  @ApiPropertyOptional({ description: "Version number to render (defaults to current version)" })
  @IsOptional()
  @IsInt()
  @Min(1)
  versionNo?: number;
}
