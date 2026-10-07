import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  MaxLength,
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

export class UpdateContractDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() sellingPrice?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() cost?: number;
  @ApiPropertyOptional({ enum: ContractStatus })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() attachments?: any[];
}

export class UpdateContractServiceNicknameDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120, { message: "Nickname không được vượt quá 120 ký tự" })
  nickname?: string | null;
}

export class UploadProposalDto {
  @ApiPropertyOptional() @IsOptional() file?: any;
  @ApiPropertyOptional() @IsOptional() @IsString() contractLink?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() quotationLink?: string;
}

export class RejectProposalDto {
  @ApiProperty() @IsNotEmpty() @IsString() reason: string;
}

export class ContractQueryDto {
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() limit?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sortBy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sortDir?: string;
}

export class AddMilestoneDto {
  @ApiProperty() @IsNotEmpty() @IsString() name: string;
  @ApiProperty() @IsNumber() percentage: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() amount?: number;
  @ApiPropertyOptional() @IsOptional() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

export class UpdateMilestoneDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() percentage?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() amount?: number;
  @ApiPropertyOptional() @IsOptional() dueDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

export { ContractQueryDto as QueryContractDto };
