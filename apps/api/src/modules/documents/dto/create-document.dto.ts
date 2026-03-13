import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsObject, IsOptional, IsString } from "class-validator";

export class CreateDocumentDto {
  @ApiProperty({ description: "Document template ID" })
  @IsString()
  templateId!: string;

  @ApiPropertyOptional({ description: "Document title override" })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: "Category override" })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: "Canonical JSON payload for template rendering", type: "object" })
  @IsObject()
  contentJson!: Record<string, unknown>;

  @ApiPropertyOptional({ type: [String], description: "FileObject IDs for initial attachments" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentFileIds?: string[];
}
