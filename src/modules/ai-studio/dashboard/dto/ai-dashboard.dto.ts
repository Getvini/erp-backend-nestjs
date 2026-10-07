import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsNumber } from "class-validator";
import { Type } from "class-transformer";

export class QueryAiDashboardDto {
  @ApiPropertyOptional({ description: "Lọc theo ID người dùng" })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: "Lọc theo ID dự án" })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: "Lọc theo ID cơ hội" })
  @IsOptional()
  @IsString()
  opportunityId?: string;

  @ApiPropertyOptional({ description: "Lọc theo ID công việc" })
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiPropertyOptional({ description: "Tháng thống kê (1-12)" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  month?: number;

  @ApiPropertyOptional({ description: "Năm thống kê" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  year?: number;
}
