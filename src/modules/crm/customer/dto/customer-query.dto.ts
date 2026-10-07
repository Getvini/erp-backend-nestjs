import { IsString, IsOptional } from "class-validator";
import { PaginationQueryDto } from "@core/dto/pagination-query.dto";

export class CustomerQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  source?: string;
}
