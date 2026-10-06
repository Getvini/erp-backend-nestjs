import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
} from "class-validator";

export class CreateServicePackageDto {
  @IsString({ message: "Tên gói không được để trống" })
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsArray()
  items?: { serviceId: string; defaultQuantity?: number }[];
}

export class UpdateServicePackageDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsArray()
  items?: { serviceId: string; defaultQuantity?: number }[];
}
