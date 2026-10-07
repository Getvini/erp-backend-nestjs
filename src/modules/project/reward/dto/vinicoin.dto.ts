import { IsOptional, IsString, IsNumber, IsEnum } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import { VinicoinTransactionType } from "@modules/project/reward/entities/vinicoin-transaction.entity";

export class VinicoinQueryDto {
  @ApiPropertyOptional({ description: "Trang" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: "Số lượng mỗi trang" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({
    enum: VinicoinTransactionType,
    description: "Loại giao dịch",
  })
  @IsOptional()
  @IsEnum(VinicoinTransactionType)
  type?: VinicoinTransactionType;
}

export class ManualVinicoinAdjustmentDto {
  @ApiProperty({ description: "ID tài khoản" })
  @IsString()
  accountId: string;

  @ApiProperty({
    description: "Số điểm Vinicoin điều chỉnh (dương để cộng, âm để trừ)",
  })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: "Lý do điều chỉnh" })
  @IsString()
  description: string;
}
