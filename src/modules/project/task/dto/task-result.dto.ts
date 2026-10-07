import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SubmitTaskResultDto {
  @ApiProperty({ description: "Nội dung hoặc URL kết quả bàn giao" })
  @IsString()
  @IsNotEmpty({ message: "Kết quả công việc không được để trống" })
  result: string;

  @ApiPropertyOptional({ description: "Lưu tạm bản nháp hay gửi duyệt ngay" })
  @IsBoolean()
  @IsOptional()
  draft?: boolean;
}

export class AssessExtraTaskDto {
  @ApiProperty({ description: "Có tính phí khách hàng hay không" })
  @IsBoolean()
  isBillable: boolean;

  @ApiPropertyOptional({ description: "Từ chối phát sinh" })
  @IsBoolean()
  @IsOptional()
  isRejected?: boolean;

  @ApiPropertyOptional({ description: "Giá bán phát sinh" })
  @IsOptional()
  @Type(() => Number)
  sellingPrice?: number;

  @ApiPropertyOptional({ description: "Dịch vụ liên kết" })
  @IsString()
  @IsOptional()
  serviceId?: string;
}

export class RequestReworkDto {
  @ApiPropertyOptional({ description: "Nhận xét / phản hồi" })
  @IsString()
  @IsOptional()
  feedback?: string;

  @ApiPropertyOptional({ description: "Lý do yêu cầu làm lại" })
  @IsString()
  @IsOptional()
  reason?: string;
}
