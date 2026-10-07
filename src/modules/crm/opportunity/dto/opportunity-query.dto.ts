import {
  IsString,
  IsOptional,
  IsIn,
} from "class-validator";
import { PaginationQueryDto } from "@core/dto/pagination-query.dto";

export const ALLOWED_OPPORTUNITY_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "opportunityCode",
  "name",
  "expectedRevenue",
  "budget",
  "startDate",
  "endDate",
  "priority",
  "successChance",
  "durationMonths",
  "status",
  "customer.name",
  "referralPartner.name",
  "createdBy.fullName",
] as const;

export class OpportunityQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  status?: string;

  @IsOptional()
  customerId?: string;

  @IsOptional()
  @IsIn([...ALLOWED_OPPORTUNITY_SORT_FIELDS], {
    message: "Trường sắp xếp không hợp lệ",
  })
  sortBy?: string;

  @IsOptional()
  @IsIn(["ASC", "DESC", "asc", "desc"], {
    message: "Chiều sắp xếp chỉ chấp nhận ASC hoặc DESC",
  })
  sortDir?: "ASC" | "DESC" | "asc" | "desc";
}
