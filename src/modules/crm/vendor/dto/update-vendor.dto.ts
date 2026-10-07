import { IsString, IsOptional, IsEnum, Matches } from "class-validator";
import { VendorType } from "@modules/crm/vendor/enums/vendor-type.enum";

export class UpdateVendorDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Matches(/^[0-9]{10}(-[0-9]{3})?$/, {
    message: "Mã số thuế phải có 10 số hoặc 13 số",
  })
  taxId?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsEnum(VendorType)
  type?: VendorType;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankAccount?: string;

  @IsOptional()
  @IsString()
  idCardFront?: string;

  @IsOptional()
  @IsString()
  idCardBack?: string;
}
