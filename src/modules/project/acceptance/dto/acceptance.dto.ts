import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AcceptanceStatus } from "../enums/acceptance.enum";

export class CreateAcceptanceDto {
  @ApiProperty({ description: "ID dự án" })
  @IsString()
  @IsNotEmpty({ message: "ID dự án không được để trống" })
  projectId: string;

  @ApiProperty({ description: "Danh sách ID dịch vụ hợp đồng", type: [String] })
  @IsArray()
  @IsNotEmpty({ message: "Danh sách dịch vụ không được để trống" })
  serviceIds: string[];

  @ApiPropertyOptional({ description: "Ghi chú yêu cầu" })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional({ description: "Tài liệu đính kèm", type: [Object] })
  @IsArray()
  @IsOptional()
  attachments?: any[];
}

export class ApproveAcceptanceDto {
  @ApiPropertyOptional({ description: "Phản hồi/Nhận xét khi duyệt" })
  @IsString()
  @IsOptional()
  feedback?: string;
}

export class RejectAcceptanceDto {
  @ApiProperty({ description: "Lý do từ chối nghiệm thu" })
  @IsString()
  @IsNotEmpty({ message: "Lý do từ chối không được để trống" })
  feedback: string;
}

export class ProcessAcceptanceDecisionDto {
  @ApiProperty({ description: "ID dịch vụ" })
  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @ApiProperty({
    enum: ["APPROVED", "REJECTED"],
    description: "Trạng thái quyết định",
  })
  @IsEnum(["APPROVED", "REJECTED"])
  status: "APPROVED" | "REJECTED";

  @ApiPropertyOptional({ description: "Phản hồi cho dịch vụ" })
  @IsString()
  @IsOptional()
  feedback?: string;

  @ApiPropertyOptional({ description: "Quyết định chi tiết từng kết quả" })
  @IsArray()
  @IsOptional()
  resultDecisions?: {
    taskId: string;
    status: "APPROVED" | "REJECTED";
    feedback?: string;
  }[];
}

export class ProcessAcceptanceDto {
  @ApiProperty({
    description: "Danh sách quyết định duyệt/từ chối từng dịch vụ",
    type: [ProcessAcceptanceDecisionDto],
  })
  @IsArray()
  decisions: ProcessAcceptanceDecisionDto[];
}

export class AcceptanceQueryDto {
  @ApiPropertyOptional({ description: "Lọc theo dự án" })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: "Tìm kiếm từ khóa" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: AcceptanceStatus,
    description: "Lọc theo trạng thái",
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "Trang" })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: "Số lượng mỗi trang" })
  @IsOptional()
  limit?: number;
}
