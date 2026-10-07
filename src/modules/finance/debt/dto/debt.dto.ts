import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ActivateDebtDto {
  @ApiProperty({ description: "ID của đợt thanh toán (milestone)" })
  @IsString()
  @IsNotEmpty()
  milestoneId: string;
}

export class UnlockDebtDto {
  @ApiProperty({ description: "Lý do mở khóa công nợ (bắt buộc)" })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class CreateDebtPaymentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  debtId: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty()
  paymentDate: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  attachments?: any[];
}
