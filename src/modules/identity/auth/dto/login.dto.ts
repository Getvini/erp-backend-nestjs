import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class LoginDto {
  @ApiProperty({
    example: "admin@getvini.com",
    description: "Tên đăng nhập hoặc Email",
  })
  @IsNotEmpty({ message: "Tên đăng nhập không được để trống" })
  @IsString()
  username: string;

  @ApiProperty({ example: "123456", description: "Mật khẩu" })
  @IsNotEmpty({ message: "Mật khẩu không được để trống" })
  @MinLength(6, { message: "Mật khẩu phải có ít nhất 6 ký tự" })
  password: string;

  @ApiPropertyOptional({
    example: true,
    description: "Ghi nhớ phiên đăng nhập",
  })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
