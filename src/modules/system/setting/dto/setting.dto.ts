import { IsString, IsOptional, IsNumber, IsArray } from "class-validator";
import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import { UserRole } from "@modules/identity/user/enums/user-role.enum";

export class UpdateQcConfigDto {
  @ApiPropertyOptional({
    description: "Nhà cung cấp AI (groq, openai, openrouter)",
  })
  @IsString()
  @IsOptional()
  provider?: string;

  @ApiPropertyOptional({ description: "Model AI kiểm định" })
  @IsString()
  @IsOptional()
  verifyModel?: string;

  @ApiPropertyOptional({ description: "Mức độ suy luận (low, medium, high)" })
  @IsString()
  @IsOptional()
  reasoningEffort?: string;

  @ApiPropertyOptional({ description: "Số lượng batch tối đa" })
  @IsNumber()
  @IsOptional()
  maxBatch?: number;

  @ApiPropertyOptional({ description: "Ngữ cảnh tối đa" })
  @IsNumber()
  @IsOptional()
  maxContext?: number;
}

export class UpdateWorkloadNormItemDto {
  @ApiProperty({ enum: UserRole, description: "Vai trò nhân sự" })
  role: UserRole;

  @ApiProperty({ description: "Định mức công việc theo tháng" })
  @IsNumber()
  monthlyNorm: number;
}

export class UpdateWorkloadNormsDto {
  @ApiProperty({
    type: [UpdateWorkloadNormItemDto],
    description: "Danh sách định mức các vai trò",
  })
  @IsArray()
  norms: UpdateWorkloadNormItemDto[];
}
