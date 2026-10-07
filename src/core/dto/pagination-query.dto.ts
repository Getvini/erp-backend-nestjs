import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class PaginationQueryDto {
  @ApiPropertyOptional({
    default: 1,
    minimum: 1,
    description: "Số thứ tự trang",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Trang phải là số nguyên" })
  @Min(1, { message: "Trang phải lớn hơn hoặc bằng 1" })
  page?: number = 1;

  @ApiPropertyOptional({
    default: 10,
    minimum: 1,
    maximum: 100,
    description: "Số lượng bản ghi mỗi trang (tối đa 100)",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Số lượng bản ghi phải là số nguyên" })
  @Min(1, { message: "Số lượng bản ghi tối thiểu là 1" })
  @Max(100, { message: "Số lượng bản ghi tối đa mỗi trang là 100" })
  limit?: number = 10;
}
