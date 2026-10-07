import {
  IsBoolean,
  IsOptional,
  IsString,
  IsArray,
  IsIn,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ToggleCheckItemDto {
  @ApiProperty({ description: "Loại lỗi: SPELL hoặc QC" })
  @IsIn(["SPELL", "QC"])
  kind: "SPELL" | "QC";

  @ApiProperty({ description: "ID của lỗi cần toggle" })
  @IsString()
  id: string;

  @ApiProperty({ description: "Trạng thái xác nhận" })
  @IsBoolean()
  confirmed: boolean;
}

export class ToggleBulkCheckDto {
  @ApiProperty({ description: "Danh sách các mục cần toggle" })
  @IsArray()
  items: ToggleCheckItemDto[];
}

export class RerunCheckDto {
  @ApiPropertyOptional({ description: "Loại quét lại: SPELL, QC hoặc BOTH" })
  @IsOptional()
  @IsIn(["SPELL", "QC", "BOTH"])
  kind?: "SPELL" | "QC" | "BOTH";

  @ApiPropertyOptional({ description: "Danh sách tên sheet" })
  @IsOptional()
  @IsArray()
  sheetNames?: string[];

  @ApiPropertyOptional({ description: "Danh sách ID kịch bản" })
  @IsOptional()
  @IsArray()
  scenarioIds?: string[];
}
