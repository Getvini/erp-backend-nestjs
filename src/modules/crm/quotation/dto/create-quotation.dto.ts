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
