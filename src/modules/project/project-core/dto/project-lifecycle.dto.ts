import { IsString, IsNotEmpty, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

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
