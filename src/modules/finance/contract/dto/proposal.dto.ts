import {
  IsString,
  IsOptional,
  IsNotEmpty,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UploadProposalDto {
  @ApiPropertyOptional() @IsOptional() file?: any;
  @ApiPropertyOptional() @IsOptional() @IsString() contractLink?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() quotationLink?: string;
}

export class RejectProposalDto {
  @ApiProperty() @IsNotEmpty() @IsString() reason: string;
}

export class UploadSignedContractDto {
  @ApiProperty({ description: "File metadata chứa URL file đã ký" })
  @IsNotEmpty({ message: "File metadata không được để trống" })
  file: {
    url: string;
    [key: string]: any;
  };
}
