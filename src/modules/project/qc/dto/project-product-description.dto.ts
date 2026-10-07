import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class ProductDescriptionItemDto {
  @ApiPropertyOptional({ description: "ID mục mô tả sản phẩm (nếu cập nhật)" })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: "Tên sản phẩm" })
  @IsNotEmpty({ message: "Tên sản phẩm không được để trống" })
  @IsString()
  productName: string;

  @ApiPropertyOptional({ description: "Đường dẫn file tài liệu" })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional({ description: "Tên file tài liệu" })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ description: "Nội dung văn bản trích xuất" })
  @IsOptional()
  @IsString()
  extractedText?: string;

  @ApiPropertyOptional({ description: "Ghi chú" })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: "Danh sách tài liệu bổ sung" })
  @IsOptional()
  @IsArray()
  documents?: any[];
}

export class CreateProductDescriptionDto {
  @ApiProperty({
    description: "Danh sách các mục mô tả sản phẩm",
    type: [ProductDescriptionItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductDescriptionItemDto)
  items: ProductDescriptionItemDto[];
}

export class UpdateProductDescriptionDto {
  @ApiPropertyOptional({
    description: "Danh sách các mục mô tả sản phẩm cập nhật",
    type: [ProductDescriptionItemDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductDescriptionItemDto)
  items?: ProductDescriptionItemDto[];
}
