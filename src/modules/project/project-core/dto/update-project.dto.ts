import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
  IsNotEmpty,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ProjectStatus } from "@modules/project/project-core/enums/project-status.enum";

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
