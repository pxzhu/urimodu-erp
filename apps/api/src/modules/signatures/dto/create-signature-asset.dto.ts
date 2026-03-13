import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SignatureAssetType } from "@prisma/client";
import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";

export class CreateSignatureAssetDto {
  @ApiProperty({ description: "Uploaded FileObject ID" })
  @IsString()
  fileId!: string;

  @ApiProperty({ enum: SignatureAssetType })
  @IsEnum(SignatureAssetType)
  type!: SignatureAssetType;

  @ApiProperty({ description: "Label for signature/seal" })
  @IsString()
  label!: string;

  @ApiPropertyOptional({ description: "Set as default asset for this user/type", default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
