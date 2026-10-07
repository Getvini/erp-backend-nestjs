import { IsString, IsNotEmpty, IsOptional, IsArray } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateJobCriteriaDto {
  @ApiProperty({ description: "ID công việc (Job)" })
  @IsString()
  @IsNotEmpty()
  jobId: string;

  @ApiProperty({ description: "Tên tiêu chí" })
  @IsString()
  @IsNotEmpty({ message: "Tên tiêu chí không được để trống" })
  name: string;

  @ApiPropertyOptional({ description: "Mô tả tiêu chí" })
  @IsString()
  @IsOptional()
  description?: string;
}

export class SyncJobCriteriaItemDto {
  @ApiPropertyOptional({ description: "ID tiêu chí (nếu cập nhật)" })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({ description: "Tên tiêu chí" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: "Mô tả tiêu chí" })
  @IsString()
  @IsOptional()
  description?: string;
}

export class SyncJobCriteriaDto {
  @ApiProperty({ type: [SyncJobCriteriaItemDto] })
  @IsArray()
  criteria: SyncJobCriteriaItemDto[];
}
