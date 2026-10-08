import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsNumber,
  IsObject,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateContractAddendumDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  contractId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class AddAddendumItemsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  services?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  milestones?: any[];
}

export class UploadSignedAddendumDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsObject()
  file: {
    url: string;
    [key: string]: any;
  };
}

export class ScaleDownAddendumDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  cancelServiceIds: string[];

  @ApiProperty()
  @IsNumber()
  refundAmount: number;
}

export class AddendumReviewDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  selectedItems?: any[];
}

export class ResubmitAddendumDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  selectedItems?: any[];
}
