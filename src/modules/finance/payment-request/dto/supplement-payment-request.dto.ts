import { IsString, IsOptional, IsNumber, IsArray } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class SupplementPaymentRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  dueDate?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  invoiceImages?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  invoicePdfs?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
