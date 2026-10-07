import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateMilestoneItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNumber()
  percentage: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  dueDate?: any;
}

export class CreatePaymentMilestonesDto {
  @ApiProperty()
  @IsString()
  contractId: string;

  @ApiProperty({ type: [CreateMilestoneItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMilestoneItemDto)
  milestones: CreateMilestoneItemDto[];
}

export class BulkSaveMilestonesDto {
  @ApiProperty({ type: [CreateMilestoneItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMilestoneItemDto)
  milestones: CreateMilestoneItemDto[];
}

export class UpdateMilestoneDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  percentage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  dueDate?: any;
}
