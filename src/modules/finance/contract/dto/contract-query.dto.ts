import {
  IsString,
  IsOptional,
  IsIn,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { PaginationQueryDto } from "@core/dto/pagination-query.dto";

export const ALLOWED_CONTRACT_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "contractCode",
  "name",
  "status",
  "sellingPrice",
  "cost",
  "signedAt",
  "effectiveDate",
  "expirationDate",
  "durationMonths",
] as const;

export class ContractQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional({ enum: ALLOWED_CONTRACT_SORT_FIELDS })
  @IsOptional()
  @IsIn([...ALLOWED_CONTRACT_SORT_FIELDS], {
    message: "Trường sắp xếp không hợp lệ",
  })
  sortBy?: string;
  @ApiPropertyOptional({ enum: ["ASC", "DESC", "asc", "desc"] })
  @IsOptional()
  @IsIn(["ASC", "DESC", "asc", "desc"], {
    message: "Chiều sắp xếp chỉ chấp nhận ASC hoặc DESC",
  })
  sortDir?: "ASC" | "DESC" | "asc" | "desc";
}

export { ContractQueryDto as QueryContractDto };
