import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsNotEmpty,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ContractStatus } from "@modules/finance/entities/contract.entity";

export class CreateContractDto {
  @ApiPropertyOptional() @IsOptional() @IsString() contractCode?: string;
  @ApiProperty() @IsNotEmpty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() opportunityId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() quotationId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() sellingPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() cost?: number;
  @ApiPropertyOptional({ enum: ContractStatus })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() referralPartnerId?: string;
  @ApiPropertyOptional() @IsOptional() customerData?: any;
  @ApiPropertyOptional() @IsOptional() @IsArray() services?: any[];
  @ApiPropertyOptional() @IsOptional() @IsArray() packages?: any[];
  @ApiPropertyOptional() @IsOptional() @IsArray() quotationDetails?: any[];
}
