import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
} from "class-validator";

export interface MultiPromptItem {
  index: number;
  prompt: string;
  duration: string;
}

export class CreateVideoDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  opportunityId?: string;

  @IsString()
  taskId: string;

  @IsString()
  modelId: string;

  @IsOptional()
  @IsString()
  resolution?: string;

  @IsString()
  prompt: string;

  @IsOptional()
  @IsString()
  negativePrompt?: string;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsString()
  mode?: string;

  @IsOptional()
  @IsString()
  sound?: string;

  @IsOptional()
  @IsString()
  ratio?: string;

  @IsOptional()
  @IsNumber()
  cost?: number;

  @IsOptional()
  @IsBoolean()
  multiShot?: boolean;

  @IsOptional()
  @IsString()
  shotType?: "customize" | "intelligence";

  @IsOptional()
  @IsArray()
  multiPrompt?: MultiPromptItem[];

  @IsOptional()
  @IsNumber()
  startImageAssetId?: number;

  @IsOptional()
  @IsNumber()
  endImageAssetId?: number;
}

export class CreateMotionControlVideoDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  opportunityId?: string;

  @IsString()
  taskId: string;

  @IsString()
  modelId: string;

  @IsOptional()
  @IsString()
  prompt?: string;

  @IsOptional()
  @IsString()
  negativePrompt?: string;

  @IsString()
  characterOrientation: "image" | "video";

  @IsOptional()
  @IsString()
  keepOriginalSound?: "yes" | "no";

  @IsOptional()
  @IsString()
  mode?: "std" | "pro";

  @IsOptional()
  @IsNumber()
  cost?: number;

  @IsOptional()
  @IsNumber()
  characterImageAssetId?: number;

  @IsOptional()
  @IsNumber()
  referenceVideoAssetId?: number;
}
