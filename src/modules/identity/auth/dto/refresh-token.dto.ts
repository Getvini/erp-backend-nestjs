import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class RefreshTokenDto {
  @ApiPropertyOptional({
    description: "Refresh token (tùy chọn nếu đã lưu trong HTTP Cookie)",
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
