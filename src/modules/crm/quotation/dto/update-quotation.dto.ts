import { IsString, IsOptional, IsNumber, IsArray } from "class-validator";

export class UpdateQuotationDto {
  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  vatRate?: number;

  @IsOptional()
  @IsArray()
  details?: any[];
}
