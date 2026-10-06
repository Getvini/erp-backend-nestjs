import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: "Nguyễn Văn B" })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: "0912345678" })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: "1995-10-20" })
  @IsOptional()
  @IsString()
  birthday?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: "123456" })
  @IsNotEmpty({ message: "Mật khẩu cũ không được để trống" })
  @IsString()
  oldPassword: string;

  @ApiProperty({ example: "newpassword123" })
  @IsNotEmpty({ message: "Mật khẩu mới không được để trống" })
  @MinLength(6, { message: "Mật khẩu mới phải có ít nhất 6 ký tự" })
  newPassword: string;
}
