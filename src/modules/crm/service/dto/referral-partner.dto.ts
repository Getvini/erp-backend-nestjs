import { IsString, IsOptional, IsEnum, Matches } from "class-validator";
import { PartnerType } from "../enums/partner-type.enum";

export class CreateReferralPartnerDto {
  @IsString({ message: "Tên đối tác không được để trống" })
  name: string;

  @IsOptional()
  @Matches(/^[0-9]{10}(-[0-9]{3})?$/, {
    message: "Mã số thuế phải có 10 số hoặc 13 số",
  })
  taxId?: string;

  @IsString({ message: "Số điện thoại không được để trống" })
  phone: string;

  @IsString({ message: "Địa chỉ không được để trống" })
  address: string;

  @IsString({ message: "Email không được để trống" })
  email: string;

  @IsOptional()
  @IsEnum(PartnerType)
  type?: PartnerType;
}

export class UpdateReferralPartnerDto {
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
  @IsEnum(PartnerType)
  type?: PartnerType;
}
