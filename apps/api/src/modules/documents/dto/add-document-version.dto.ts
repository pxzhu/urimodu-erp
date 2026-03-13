import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsObject, IsOptional, IsString } from "class-validator";

export class AddDocumentVersionDto {
  @ApiProperty({
    description: "Canonical JSON payload for new version",
    type: "object",
    additionalProperties: true
  })
  @IsObject()
  contentJson!: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Title update" })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ type: [String], description: "FileObject IDs for attachments" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentFileIds?: string[];
}
