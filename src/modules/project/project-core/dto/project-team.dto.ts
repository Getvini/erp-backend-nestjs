import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MemberRole } from "../enums/member-role.enum";

export class CreateProjectTeamDto {
  @ApiProperty({ description: "Tên đội ngũ" })
  @IsString()
  @IsNotEmpty({ message: "Tên đội ngũ không được để trống" })
  name: string;

  @ApiPropertyOptional({ description: "ID Team Lead" })
  @IsString()
  @IsOptional()
  teamLeadId?: string;
}

export class UpdateProjectTeamDto {
  @ApiPropertyOptional({ description: "Tên đội ngũ" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: "ID Team Lead" })
  @IsString()
  @IsOptional()
  teamLeadId?: string;
}

export class ChangeLeadDto {
  @ApiProperty({ description: "ID Team Lead mới" })
  @IsString()
  @IsNotEmpty({ message: "ID Team Lead không được để trống" })
  teamLeadId: string;
}

export class AddTeamMemberDto {
  @ApiProperty({ description: "ID nhân sự" })
  @IsString()
  @IsNotEmpty({ message: "ID nhân sự không được để trống" })
  userId: string;

  @ApiPropertyOptional({
    description: "Danh sách vai trò",
    enum: MemberRole,
    isArray: true,
  })
  @IsArray()
  @IsOptional()
  roles?: MemberRole[];

  @ApiPropertyOptional({ description: "Vai trò đơn (tương thích cũ)" })
  @IsEnum(MemberRole)
  @IsOptional()
  role?: MemberRole;
}

export class UpdateMemberRolesDto {
  @ApiProperty({
    description: "Danh sách vai trò mới",
    enum: MemberRole,
    isArray: true,
  })
  @IsArray({ message: "roles phải là mảng" })
  @IsNotEmpty({ message: "roles không được để trống" })
  roles: MemberRole[];
}
