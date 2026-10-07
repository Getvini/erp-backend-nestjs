import {
  IsString,
  IsOptional,
  IsIn,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export const ALLOWED_TASK_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "code",
  "name",
  "status",
  "priority",
  "plannedStartDate",
  "plannedEndDate",
  "actualStartDate",
  "actualEndDate",
  "progress",
  "spentAmount",
] as const;

export class TaskQueryDto {
  @ApiPropertyOptional({ description: "Số trang" })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: "Số phần tử mỗi trang" })
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: "Từ khóa tìm kiếm (tên, mã task)" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Từ khóa tìm kiếm rút gọn" })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: "Loại ngày (plannedEndDate | ...)" })
  @IsOptional()
  @IsString()
  dateType?: string;

  @ApiPropertyOptional({ description: "Hạn chót (today | ...)" })
  @IsOptional()
  @IsString()
  deadline?: string;

  @ApiPropertyOptional({ description: "Ngày lọc (today | ...)" })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ description: "Hạn chót từ ngày" })
  @IsOptional()
  @IsString()
  deadlineFrom?: string;

  @ApiPropertyOptional({ description: "Hạn chót đến ngày" })
  @IsOptional()
  @IsString()
  deadlineTo?: string;

  @ApiPropertyOptional({ description: "Từ ngày" })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: "Đến ngày" })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional({ description: "Lọc theo tên task (tương đối)" })
  @IsOptional()
  @IsString()
  nameLike?: string;

  @ApiPropertyOptional({ description: "Lọc theo ID dự án" })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: "Lọc theo ID cơ hội" })
  @IsOptional()
  @IsString()
  opportunityId?: string;

  @ApiPropertyOptional({ description: "Lọc theo người thực hiện" })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional({ description: "Lọc theo trạng thái" })
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: "Loại trừ trạng thái" })
  @IsOptional()
  excludeStatus?: string;

  @ApiPropertyOptional({
    description: "Trường sắp xếp",
    enum: ALLOWED_TASK_SORT_FIELDS,
  })
  @IsOptional()
  @IsIn([...ALLOWED_TASK_SORT_FIELDS], {
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

export class DailyWorkloadQueryDto {
  @ApiPropertyOptional({ description: "Ngày bắt đầu (YYYY-MM-DD)" })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: "Ngày kết thúc (YYYY-MM-DD)" })
  @IsOptional()
  @IsString()
  endDate?: string;
}
