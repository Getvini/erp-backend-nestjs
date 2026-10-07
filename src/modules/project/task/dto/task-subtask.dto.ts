import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsIn,
  IsNumber,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RequestTaskStaffingDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(1000, { message: "Ghi chú không được vượt quá 1.000 ký tự" })
  note?: string;
}

export class RespondTaskStaffingDto {
  @ApiProperty({ enum: ["RESOLVE", "REJECT"] })
  @IsIn(["RESOLVE", "REJECT"])
  action: "RESOLVE" | "REJECT";
}

export class CreateSubtaskDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: "Tên subtask không được để trống" })
  @MaxLength(255, { message: "Tên subtask không được vượt quá 255 ký tự" })
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  assigneeId?: string;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: "% phân bổ không hợp lệ" })
  @Min(0.01, { message: "% phân bổ phải lớn hơn 0" })
  @Max(100, { message: "% phân bổ không được vượt quá 100" })
  allocationPercent: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

export class RespondSubtaskPlanDto {
  @ApiProperty({ enum: ["APPROVE", "REJECT"] })
  @IsIn(["APPROVE", "REJECT"])
  action: "APPROVE" | "REJECT";

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(1000, { message: "Ghi chú không được vượt quá 1.000 ký tự" })
  note?: string;
}
