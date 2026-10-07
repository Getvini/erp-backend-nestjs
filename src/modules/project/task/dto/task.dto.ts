import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDate,
  IsBoolean,
  MaxLength,
  IsArray,
  ArrayMinSize,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  TaskStatus,
  PerformerType,
} from "@modules/project/task/enums/task-status.enum";

export class CreateTaskDto {
  @ApiProperty({ description: "Tên task" })
  @IsString()
  @IsNotEmpty({ message: "Tên task không được để trống" })
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  opportunityId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  opportunityServiceJobId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  jobId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  supervisorId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: PerformerType })
  @IsEnum(PerformerType)
  @IsOptional()
  performerType?: PerformerType;

  @ApiPropertyOptional()
  @IsDate({ message: "Ngày bắt đầu không hợp lệ" })
  @IsOptional()
  @Type(() => Date)
  plannedStartDate?: Date;

  @ApiPropertyOptional()
  @IsDate({ message: "Ngày kết thúc không hợp lệ" })
  @IsOptional()
  @Type(() => Date)
  plannedEndDate?: Date;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isOutput?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isExtra?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  attachments?: any[];
}

export class CreateInternalTaskDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  assigneeId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  supervisorId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  plannedStartDate?: Date;

  @ApiPropertyOptional()
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  plannedEndDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  attachments?: any[];
}

export class UpdateTaskStatusDto {
  @ApiProperty({ enum: TaskStatus })
  @IsEnum(TaskStatus)
  @IsNotEmpty({ message: "Trạng thái không được để trống" })
  status: TaskStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  result?: string;
}

export class UpdateTaskNicknameDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(120, { message: "Nickname không được vượt quá 120 ký tự" })
  nickname?: string | null;
}

export class BulkUnassignTasksDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: "ID dự án không được để trống" })
  projectId: string;

  @ApiProperty()
  @IsArray({ message: "Danh sách công việc không hợp lệ" })
  @ArrayMinSize(1, { message: "Vui lòng chọn ít nhất một công việc" })
  @IsString({ each: true, message: "ID công việc không hợp lệ" })
  taskIds: string[];
}

export class BulkStartTasksDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: "ID dự án không được để trống" })
  projectId: string;

  @ApiProperty()
  @IsArray({ message: "Danh sách công việc không hợp lệ" })
  @ArrayMinSize(1, { message: "Vui lòng chọn ít nhất một công việc" })
  @IsString({ each: true, message: "ID công việc không hợp lệ" })
  taskIds: string[];
}

export class TaskAssignmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: "ID người thực hiện không được để trống" })
  assigneeId: string;

  @ApiPropertyOptional({ enum: PerformerType })
  @IsEnum(PerformerType)
  @IsOptional()
  performerType?: PerformerType;

  @ApiPropertyOptional()
  @IsDate({ message: "Ngày bắt đầu không hợp lệ" })
  @IsOptional()
  @Type(() => Date)
  plannedStartDate?: Date;

  @ApiProperty()
  @IsDate({ message: "Ngày kết thúc không hợp lệ" })
  @IsNotEmpty({ message: "Vui lòng nhập deadline" })
  @Type(() => Date)
  plannedEndDate: Date;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  attachments?: any[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  projectId?: string;
}

export class BulkTaskAssignmentDto extends TaskAssignmentDto {
  @ApiProperty()
  @IsArray({ message: "Danh sách công việc không hợp lệ" })
  @ArrayMinSize(1, { message: "Vui lòng chọn ít nhất một công việc" })
  @IsString({ each: true, message: "ID công việc không hợp lệ" })
  taskIds: string[];
}

export * from "./task-subtask.dto";
