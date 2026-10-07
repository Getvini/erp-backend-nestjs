import { IsString, IsNotEmpty, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SpellingCheckFromUrlDto {
  @ApiProperty({ description: "Đường dẫn URL tải file" })
  @IsString()
  @IsNotEmpty({ message: "URL file không được để trống" })
  fileUrl: string;

  @ApiPropertyOptional({ description: "Tên file" })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ description: "Ngôn ngữ kiểm tra: vi, en, hoặc both" })
  @IsOptional()
  @IsString()
  lang?: string;

  @ApiPropertyOptional({ description: "Danh sách tên sheet" })
  @IsOptional()
  @IsString()
  sheetNames?: string;

  @ApiPropertyOptional({ description: "Từ điển whitelist" })
  @IsOptional()
  @IsString()
  whitelist?: string;

  @ApiPropertyOptional({ description: "Danh sách ID kịch bản" })
  @IsOptional()
  @IsString()
  scenarioIds?: string;

  @ApiPropertyOptional({ description: "Vùng quét dữ liệu" })
  @IsOptional()
  @IsString()
  regions?: string;
}
