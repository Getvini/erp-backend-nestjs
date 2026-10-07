import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsObject,
} from "class-validator";
import { Transform } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

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

export class QueryAiModelDto {
  @ApiPropertyOptional({ description: "Mã nhà cung cấp" })
  @IsOptional()
  @IsString()
  providerCode?: string;

  @ApiPropertyOptional({ description: "Loại model" })
  @IsOptional()
  @IsString()
  modelType?: string;

  @ApiPropertyOptional({ description: "Trạng thái kích hoạt" })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true" || value === true) return true;
    if (value === "false" || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: "Có hỗ trợ Motion Control" })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true" || value === true) return true;
    if (value === "false" || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  supportsMotionControl?: boolean;

  @ApiPropertyOptional({ description: "Có hỗ trợ Elements" })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true" || value === true) return true;
    if (value === "false" || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  supportsElements?: boolean;
}
