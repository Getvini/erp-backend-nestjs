import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  Matches,
} from "class-validator";
import { CustomerSource } from "@modules/crm/customer/enums/customer-source.enum";

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsEmail({}, { message: "Email không đúng định dạng" })
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @Matches(/^[0-9]{10}(-[0-9]{3})?$/, {
    message:
      "Mã số thuế phải có 10 số hoặc 13 số (VD: 0101234567 hoặc 0101234567-001)",
  })
  taxId?: string;

  @IsOptional()
  @IsEnum(CustomerSource)
  source?: CustomerSource;

  @IsOptional()
  @IsString()
  referralPartnerId?: string;
}
