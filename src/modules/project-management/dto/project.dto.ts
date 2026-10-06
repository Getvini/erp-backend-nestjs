import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class QueryProjectDto {
  @ApiPropertyOptional({ description: "Tìm kiếm dự án theo tên hoặc mã" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Lọc theo trạng thái dự án" })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  limit?: number = 10;
}
