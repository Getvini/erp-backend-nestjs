import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  MaxLength,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { ContractStatus } from "@modules/finance/entities/contract.entity";

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
