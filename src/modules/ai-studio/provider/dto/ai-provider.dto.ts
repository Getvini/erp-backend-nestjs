import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsBoolean } from "class-validator";
import { Transform } from "class-transformer";

export class QueryAiProviderDto {
  @ApiPropertyOptional({ description: "Mã provider (tìm tương đối)" })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: "Tên provider (tìm tương đối)" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: "Trạng thái kích hoạt (true/false)" })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true" || value === true) return true;
    if (value === "false" || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean;
}
