import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsBoolean } from "class-validator";
import { Transform } from "class-transformer";

export class QueryAiAssetDto {
  @ApiPropertyOptional({ description: "Tab (creative, ...)" })
  @IsOptional()
  @IsString()
  tab?: string;

  @ApiPropertyOptional({ description: "Loại asset (all, image, video, ...)" })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: "Lọc chỉ mục yêu thích (true/false)" })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true" || value === true) return true;
    if (value === "false" || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  favorite?: boolean;
}

export class UpdateAssetFavoriteDto {
  @ApiProperty({ description: "Trạng thái yêu thích" })
  @IsBoolean()
  isFavorite: boolean;
}
