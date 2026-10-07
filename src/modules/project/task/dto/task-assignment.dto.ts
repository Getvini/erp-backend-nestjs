import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDate,
  IsArray,
  ArrayMinSize,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PerformerType } from "@modules/project/task/enums/task-status.enum";

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

export class ReassignTaskDto {
  @ApiProperty({ description: "ID người thực hiện mới" })
  @IsString()
  @IsNotEmpty({ message: "Vui lòng chọn người thực hiện mới" })
  assigneeId: string;

  @ApiPropertyOptional({
    enum: PerformerType,
    description: "Vai trò người thực hiện",
  })
  @IsEnum(PerformerType)
  @IsOptional()
  performerType?: PerformerType;

  @ApiProperty({ description: "Lý do chuyển giao" })
  @IsString()
  @IsNotEmpty({ message: "Lý do chuyển giao không được để trống" })
  reason: string;
}
