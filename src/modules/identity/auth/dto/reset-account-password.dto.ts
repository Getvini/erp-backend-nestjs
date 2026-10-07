import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class ResetAccountPasswordDto {
  @ApiProperty({ description: "Mật khẩu mới", minLength: 6 })
  @IsNotEmpty({ message: "Mật khẩu mới không được để trống" })
  @IsString()
  @MinLength(6, { message: "Mật khẩu phải có ít nhất 6 ký tự" })
  newPassword: string;
}
