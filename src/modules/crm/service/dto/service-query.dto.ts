import { IsString, IsOptional, IsNumber } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class ServiceQueryDto {
  @ApiPropertyOptional({ description: "Số trang" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: "Số phần tử mỗi trang" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ description: "Từ khóa tìm kiếm (tên, mã, mô tả)" })
  @IsOptional()
  @IsString()
  search?: string;
}
