import { IsString, IsNotEmpty, IsOptional, IsNumber } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AttachmentFileDto {
  @ApiProperty({ description: "URL hoặc đường dẫn file đính kèm" })
  @IsNotEmpty({ message: "URL file không được để trống" })
  @IsString()
  url: string;

  @ApiPropertyOptional({ description: "Tên file" })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ description: "Kích thước file (bytes)" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  fileSize?: number;

  @ApiPropertyOptional({ description: "MIME type" })
  @IsOptional()
  @IsString()
  fileType?: string;
}
