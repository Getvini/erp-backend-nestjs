import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from "class-validator";
import { UserRole } from "@modules/identity/user/enums/user-role.enum";

export class CreateUserDto {
  @ApiProperty({ example: "nguyenvana" })
  @IsNotEmpty({ message: "Tên đăng nhập không được để trống" })
  @IsString()
  username: string;

  @ApiProperty({ example: "123456" })
  @IsNotEmpty({ message: "Mật khẩu không được để trống" })
  @MinLength(6, { message: "Mật khẩu phải có ít nhất 6 ký tự" })
  password: string;

  @ApiProperty({ example: "Nguyễn Văn A" })
  @IsNotEmpty({ message: "Họ và tên không được để trống" })
  @IsString()
  fullName: string;

  @ApiPropertyOptional({ example: "0901234567" })
  @IsOptional()
  @Matches(/^(0|\+84)(3|5|7|8|9)[0-9]{8}$/, {
    message: "Số điện thoại không đúng định dạng",
  })
  phoneNumber?: string;

  @ApiProperty({ enum: UserRole, example: UserRole.CONTENT_D })
  @IsNotEmpty({ message: "Vai trò không được để trống" })
  @IsEnum(UserRole, { message: "Vai trò người dùng không hợp lệ" })
  role: UserRole;
}
