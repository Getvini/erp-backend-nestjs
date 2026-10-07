import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, IsArray } from "class-validator";
import { UserRole } from "@modules/identity/user/enums/user-role.enum";

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole, { message: "Vai trò người dùng không hợp lệ" })
  role?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  isLocked?: boolean;
}

export class UpdateLaborContractsDto {
  @ApiProperty({ description: "Danh sách hợp đồng lao động", type: [Object] })
  @IsArray()
  laborContract: any[];
}
