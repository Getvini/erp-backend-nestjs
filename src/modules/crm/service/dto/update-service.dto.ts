import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
} from "class-validator";

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  costPrice?: number;

  @IsOptional()
  @IsNumber()
  overheadCost?: number;

  @IsOptional()
  @IsBoolean()
  isAI?: boolean;

  @IsOptional()
  @IsArray()
  jobs?: any[];
}

export class BulkDeleteServicesDto {
  @IsArray()
  ids: string[];
}
