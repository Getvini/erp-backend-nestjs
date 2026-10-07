import { IsOptional, IsEnum, IsArray } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PaymentMethod } from "../entities/payment-request.entity";

export class PayPaymentRequestDto {
  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  paidAt?: any;

  @ApiPropertyOptional()
  @IsOptional()
  cashVoucherInfo?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  paymentProofs?: any[];
}
