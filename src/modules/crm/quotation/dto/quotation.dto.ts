import { IsString, IsOptional, IsNumber, IsArray } from "class-validator";

export class CreateQuotationDto {
  @IsString({ message: "Mã cơ hội không được để trống" })
  opportunityId: string;

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

export class RejectQuotationDto {
  @IsString({ message: "Lý do từ chối không được để trống" })
  reason: string;
}
