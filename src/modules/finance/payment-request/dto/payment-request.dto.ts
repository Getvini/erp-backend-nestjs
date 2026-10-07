import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  PaymentRequestType,
  PaymentRequestApprovalStatus,
  PaymentDueStatus,
  PaymentMethod,
} from "../entities/payment-request.entity";

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

export class UpdatePaymentRequestDto {
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
}

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

export class ReviewPaymentRequestDto {
  @ApiProperty({ enum: ["SUBMIT_TO_BOD", "NEED_MORE_DOCS", "REJECT"] })
  @IsString()
  action: "SUBMIT_TO_BOD" | "NEED_MORE_DOCS" | "REJECT";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class BodDecisionDto {
  @ApiProperty({ enum: ["APPROVE", "REJECT"] })
  @IsString()
  action: "APPROVE" | "REJECT";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  confirmedDueDate?: any;
}

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

export class CancelPaymentRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class QueryPaymentRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: PaymentRequestType })
  @IsOptional()
  type?: PaymentRequestType;

  @ApiPropertyOptional({ enum: PaymentRequestApprovalStatus })
  @IsOptional()
  approvalStatus?: PaymentRequestApprovalStatus;

  @ApiPropertyOptional({ enum: PaymentDueStatus })
  @IsOptional()
  paymentStatus?: PaymentDueStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  toDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  minAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  maxAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  sortOrder?: "ASC" | "DESC";
}
