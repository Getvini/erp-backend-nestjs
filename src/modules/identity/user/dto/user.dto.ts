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

export class QueryUserDto {
  @ApiPropertyOptional({ description: "Tìm kiếm theo tên, username, sđt" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: UserRole, description: "Lọc theo vai trò" })
  @IsOptional()
  @IsEnum(UserRole, { message: "Vai trò tìm kiếm không hợp lệ" })
  role?: UserRole;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  limit?: number = 10;
}

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

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole, { message: "Vai trò người dùng không hợp lệ" })
  role?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  isLocked?: boolean;
}
