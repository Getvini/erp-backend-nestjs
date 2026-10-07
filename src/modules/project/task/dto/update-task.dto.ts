import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDate,
  IsBoolean,
  MaxLength,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  TaskStatus,
  PerformerType,
} from "@modules/project/task/enums/task-status.enum";

export class UpdateTaskDto {
  @ApiPropertyOptional({ description: "Tên task" })
  @IsString()
  @IsOptional()
  name?: string;

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
