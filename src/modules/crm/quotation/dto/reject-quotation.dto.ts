import { IsString } from "class-validator";

export class RejectQuotationDto {
  @IsString({ message: "Lý do từ chối không được để trống" })
  reason: string;
}
