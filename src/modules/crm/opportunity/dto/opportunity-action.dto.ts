import { IsString } from "class-validator";

export class AddCustomerDto {
  @IsString({ message: "Mã khách hàng không được để trống" })
  customerId: string;
}

export class RejectOpportunityDto {
  @IsString({ message: "Lý do từ chối không được để trống" })
  reason: string;
}
