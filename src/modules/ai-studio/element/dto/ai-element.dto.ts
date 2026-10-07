import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsIn,
  MaxLength,
} from "class-validator";

export class CreateElementDto {
  @IsString()
  providerId: string;

  @IsIn(["image_refer", "video_refer"])
  referenceType: "image_refer" | "video_refer";

  @IsString()
  @MaxLength(20)
  elementName: string;

  @IsString()
  @MaxLength(100)
  elementDescription: string;

  @IsOptional()
  @IsString()
  elementVoiceId?: string;

  @IsOptional()
  @IsNumber()
  frontalImageAssetId?: number;

  @IsOptional()
  @IsArray()
  referImageAssetIds?: number[];

  @IsOptional()
  @IsNumber()
  videoAssetId?: number;
}
