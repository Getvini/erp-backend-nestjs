import { IsString, IsOptional, IsNumber, IsEnum, IsIn } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  PaymentRequestType,
  PaymentRequestApprovalStatus,
  PaymentDueStatus,
} from "../entities/payment-request.entity";

export const ALLOWED_PAYMENT_REQUEST_SORT_FIELDS = [
  "createdAt",
  "dueDate",
  "amount",
] as const;

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
  @Type(() => Number)
  @IsNumber()
  minAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxAmount?: number;

  @ApiPropertyOptional({ enum: ALLOWED_PAYMENT_REQUEST_SORT_FIELDS })
  @IsOptional()
  @IsIn([...ALLOWED_PAYMENT_REQUEST_SORT_FIELDS], {
    message: "Trường sắp xếp không hợp lệ",
  })
  sortBy?: string;

  @ApiPropertyOptional({ enum: ["ASC", "DESC", "asc", "desc"] })
  @IsOptional()
  @IsIn(["ASC", "DESC", "asc", "desc"], {
    message: "Chiều sắp xếp chỉ chấp nhận ASC hoặc DESC",
  })
  sortOrder?: "ASC" | "DESC" | "asc" | "desc";
}
