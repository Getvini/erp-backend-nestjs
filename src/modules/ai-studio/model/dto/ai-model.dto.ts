import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsObject,
} from "class-validator";

export class CreateAiModelDto {
  @IsString()
  providerId: string;

  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  modelType?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  supportsMotionControl?: boolean;

  @IsOptional()
  @IsBoolean()
  supportsElements?: boolean;

  @IsOptional()
  @IsInt()
  costPerSecond?: number;

  @IsOptional()
  @IsObject()
  capabilities?: object;
}

export class UpdateAiModelDto {
  @IsOptional()
  @IsString()
  providerId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  modelType?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  supportsMotionControl?: boolean;

  @IsOptional()
  @IsBoolean()
  supportsElements?: boolean;

  @IsOptional()
  @IsInt()
  costPerSecond?: number;

  @IsOptional()
  @IsObject()
  capabilities?: object;
}
