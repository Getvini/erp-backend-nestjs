import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PaymentRequestType } from "../entities/payment-request.entity";

export class CreatePaymentRequestDto {
  @ApiProperty({ enum: PaymentRequestType })
  @IsEnum(PaymentRequestType)
  type: PaymentRequestType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty()
  dueDate: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vendorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  invoiceImages?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  invoicePdfs?: any[];
}
