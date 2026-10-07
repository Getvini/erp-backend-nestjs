import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateAccountDto {
  @ApiPropertyOptional({ description: "Tên đăng nhập" })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ description: "Email" })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: "Vai trò" })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: "Họ và tên" })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ description: "Số điện thoại" })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: "Ngày sinh" })
  @IsOptional()
  @IsString()
  birthday?: string;

  @ApiPropertyOptional({ description: "Trạng thái kích hoạt" })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
