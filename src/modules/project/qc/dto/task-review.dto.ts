import { IsBoolean, IsOptional, IsString, IsArray } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ToggleCriteriaDto {
  @ApiProperty({ description: "Đã đạt tiêu chí hay chưa" })
  @IsBoolean()
  isPassed: boolean;

  @ApiPropertyOptional({ description: "Ghi chú đánh giá" })
  @IsOptional()
  @IsString()
  note?: string;
}

export class FinalizeReviewDto {
  @ApiPropertyOptional({ description: "Danh sách ID các tiêu chí đạt" })
  @IsOptional()
  @IsArray()
  passedCriteriaIds?: string[];

  @ApiPropertyOptional({ description: "Ghi chú tổng kết" })
  @IsOptional()
  @IsString()
  reviewNote?: string;
}

export class RejectReviewDto {
  @ApiProperty({ description: "Lý do từ chối kết quả" })
  @IsString()
  note: string;
}
