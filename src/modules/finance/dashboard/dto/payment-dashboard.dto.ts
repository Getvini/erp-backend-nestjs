import { IsOptional, IsString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class PaymentDashboardQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  year?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contractStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  quotationStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  confirmationStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  salesOwnerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectManagerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  paymentMonth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  limit?: number;
}
