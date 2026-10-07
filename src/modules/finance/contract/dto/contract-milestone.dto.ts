import {
  IsString,
  IsOptional,
  IsNumber,
  IsNotEmpty,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AddMilestoneDto {
  @ApiProperty()
  @IsNotEmpty({ message: "Tên đợt thanh toán không được để trống" })
  @IsString()
  name: string;
  @ApiProperty()
  @IsNumber({}, { message: "Phần trăm thanh toán phải là số" })
  @Min(0.01, { message: "Phần trăm thanh toán tối thiểu là 0.01%" })
  @Max(100, { message: "Phần trăm thanh toán tối đa là 100%" })
  percentage: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({}, { message: "Số tiền thanh toán phải là số" })
  @Min(0, { message: "Số tiền thanh toán không được âm" })
  amount?: number;

  @ApiPropertyOptional() @IsOptional() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

export class UpdateMilestoneDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({}, { message: "Phần trăm thanh toán phải là số" })
  @Min(0.01, { message: "Phần trăm thanh toán tối thiểu là 0.01%" })
  @Max(100, { message: "Phần trăm thanh toán tối đa là 100%" })
  percentage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({}, { message: "Số tiền thanh toán phải là số" })
  @Min(0, { message: "Số tiền thanh toán không được âm" })
  amount?: number;

  @ApiPropertyOptional() @IsOptional() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}
