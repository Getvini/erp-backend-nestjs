import {
  IsOptional,
  IsIn,
  IsNumber,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export const ALLOWED_PROJECT_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "name",
  "status",
  "startDate",
  "endDate",
  "progress",
] as const;

export class QueryProjectDto {
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

  @ApiPropertyOptional({ description: "Từ khóa tìm kiếm (tên, mã hợp đồng)" })
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: "Lọc theo trạng thái" })
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: "Trường sắp xếp",
    enum: ALLOWED_PROJECT_SORT_FIELDS,
  })
  @IsOptional()
  @IsIn([...ALLOWED_PROJECT_SORT_FIELDS], {
    message: "Trường sắp xếp không hợp lệ",
  })
  sortBy?: string;

  @ApiPropertyOptional({
    description: "Thứ tự sắp xếp (ASC | DESC)",
    enum: ["ASC", "DESC", "asc", "desc"],
  })
  @IsOptional()
  @IsIn(["ASC", "DESC", "asc", "desc"], {
    message: "Chiều sắp xếp chỉ chấp nhận ASC hoặc DESC",
  })
  sortDir?: "ASC" | "DESC" | "asc" | "desc";
}
