import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsNumber } from "class-validator";
import { Type } from "class-transformer";

export class DashboardQueryDto {
  @ApiPropertyOptional({ description: "ID nhân sự cần xem dashboard" })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: "Tháng lọc dữ liệu (1-12)" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  month?: number;

  @ApiPropertyOptional({ description: "Năm lọc dữ liệu" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  year?: number;

  @ApiPropertyOptional({ description: "ID dự án cần xem dashboard" })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({
    description: "Chế độ xem dashboard (personal | management)",
    enum: ["personal", "management"],
  })
  @IsOptional()
  @IsString()
  mode?: "personal" | "management";
}
