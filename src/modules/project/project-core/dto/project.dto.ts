import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ProjectStatus } from "../enums/project-status.enum";

export class QueryProjectDto {
  @ApiPropertyOptional({ description: "Số trang" })
  @IsOptional()
  page?: number | string;

  @ApiPropertyOptional({ description: "Số phần tử mỗi trang" })
  @IsOptional()
  limit?: number | string;

  @ApiPropertyOptional({ description: "Từ khóa tìm kiếm (tên, mã hợp đồng)" })
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: "Lọc theo trạng thái" })
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: "Trường sắp xếp" })
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ description: "Thứ tự sắp xếp (ASC | DESC)" })
  @IsOptional()
  sortDir?: "ASC" | "DESC";
}

export class CreateProjectDto {
  @ApiProperty({ description: "Tên dự án" })
  @IsString()
  @IsNotEmpty({ message: "Tên dự án không được để trống" })
  name: string;

  @ApiProperty({ description: "ID hợp đồng" })
  @IsString()
  @IsNotEmpty({ message: "ID hợp đồng không được để trống" })
  contractId: string;

  @ApiProperty({ description: "ID đội ngũ" })
  @IsString()
  @IsNotEmpty({ message: "ID team không được để trống" })
  teamId: string;

  @ApiPropertyOptional({ description: "Ngày bắt đầu dự kiến" })
  @IsDateString()
  @IsOptional()
  plannedStartDate?: string;

  @ApiPropertyOptional({ description: "Ngày kết thúc dự kiến" })
  @IsDateString()
  @IsOptional()
  plannedEndDate?: string;
}

export class UpdateProjectDto {
  @ApiPropertyOptional({ description: "Tên dự án" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: "Trạng thái", enum: ProjectStatus })
  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @ApiPropertyOptional({ description: "Ngày bắt đầu dự kiến" })
  @IsDateString()
  @IsOptional()
  plannedStartDate?: string;

  @ApiPropertyOptional({ description: "Ngày kết thúc dự kiến" })
  @IsDateString()
  @IsOptional()
  plannedEndDate?: string;

  @ApiPropertyOptional({ description: "Ngày bắt đầu thực tế" })
  @IsDateString()
  @IsOptional()
  actualStartDate?: string;

  @ApiPropertyOptional({ description: "Ngày kết thúc thực tế" })
  @IsDateString()
  @IsOptional()
  actualEndDate?: string;
}

export class AssignTeamDto {
  @ApiProperty({ description: "ID hợp đồng" })
  @IsString()
  @IsNotEmpty({ message: "ID hợp đồng không được để trống" })
  contractId: string;

  @ApiProperty({ description: "ID PM" })
  @IsString()
  @IsNotEmpty({ message: "ID PM không được để trống" })
  pmId: string;

  @ApiPropertyOptional({ description: "Tên dự án (nếu đổi)" })
  @IsString()
  @IsOptional()
  name?: string;
}

export class PauseProjectDto {
  @ApiProperty({ description: "Lý do tạm dừng" })
  @IsString()
  @IsNotEmpty({ message: "Vui lòng nhập lý do tạm dừng dự án" })
  reason: string;
}

export class RejectPauseDto {
  @ApiProperty({ description: "Lý do từ chối tạm dừng" })
  @IsString()
  @IsNotEmpty({ message: "Vui lòng nhập lý do từ chối" })
  feedback: string;
}

export class ResumeProjectDto {
  @ApiPropertyOptional({ description: "Lý do làm tiếp" })
  @IsString()
  @IsOptional()
  resumeReason?: string;
}

export class CloseProjectDto {
  @ApiPropertyOptional({ description: "Lý do đóng dự án" })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class CloseProjectDirectDto {
  @ApiProperty({ description: "Lý do đóng trực tiếp" })
  @IsString()
  @IsNotEmpty({ message: "Vui lòng nhập lý do đóng dự án" })
  reason: string;
}

export class RejectCloseDto {
  @ApiProperty({ description: "Lý do từ chối đóng" })
  @IsString()
  @IsNotEmpty({ message: "Vui lòng nhập lý do từ chối" })
  feedback: string;
}

export class UpdateProjectStatusDto {
  @ApiProperty({ description: "Trạng thái mới", enum: ProjectStatus })
  @IsEnum(ProjectStatus, { message: "Trạng thái không hợp lệ" })
  @IsNotEmpty({ message: "Trạng thái không được để trống" })
  status: ProjectStatus;
}

export class UpdateWorkingFilesDto {
  @ApiProperty({ description: "Danh sách tài liệu làm việc" })
  @IsArray({ message: "workingFiles phải là một mảng" })
  workingFiles: Array<{
    id: string;
    name: string;
    url: string;
    type: "LINK" | "FILE";
    size?: number;
    createdAt: string;
    createdById?: string;
    createdByName?: string;
  }>;
}
