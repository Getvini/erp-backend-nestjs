import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDate,
  IsBoolean,
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
