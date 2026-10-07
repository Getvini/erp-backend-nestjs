import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, IsNumber } from "class-validator";
import { Type } from "class-transformer";
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
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;
}
