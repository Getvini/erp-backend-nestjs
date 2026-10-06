import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class QueryContractDto {
  @ApiPropertyOptional({ description: "Tìm theo mã hoặc tên hợp đồng" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  limit?: number = 10;
}
