import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
} from "class-validator";
import {
  OpportunityStatus,
  CustomerType,
} from "@modules/crm/opportunity/enums/opportunity-status.enum";

export class CreateOpportunityDto {
  @IsString({ message: "Tên cơ hội không được để trống" })
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  field?: string;

  @IsOptional()
  @IsNumber()
  expectedRevenue?: number;

  @IsOptional()
  @IsNumber()
  budget?: number;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsNumber()
  successChance?: number;

  @IsOptional()
  @IsArray()
  region?: string[];

  @IsOptional()
  @IsNumber()
  durationMonths?: number;

  @IsOptional()
  @IsEnum(CustomerType)
  customerType?: CustomerType;

  @IsOptional()
  @IsString()
  leadName?: string;

  @IsOptional()
  @IsString()
  leadPhone?: string;

  @IsOptional()
  @IsString()
  leadEmail?: string;

  @IsOptional()
  @IsString()
  leadAddress?: string;

  @IsOptional()
  @IsString()
  leadTaxId?: string;

  @IsOptional()
  @IsNumber()
  partnerCommissionRate?: number;

  @IsOptional()
  @IsNumber()
  expectedPartnerCommission?: number;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  referralPartnerId?: string;

  @IsOptional()
  @IsArray()
  services?: any[];

  @IsOptional()
  @IsArray()
  packages?: any[];

  @IsOptional()
  @IsArray()
  attachments?: any[];
}

export class UpdateOpportunityDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  field?: string;

  @IsOptional()
  @IsNumber()
  expectedRevenue?: number;

  @IsOptional()
  @IsNumber()
  budget?: number;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsNumber()
  successChance?: number;

  @IsOptional()
  @IsArray()
  region?: string[];

  @IsOptional()
  @IsNumber()
  durationMonths?: number;

  @IsOptional()
  @IsEnum(OpportunityStatus)
  status?: OpportunityStatus;

  @IsOptional()
  @IsEnum(CustomerType)
  customerType?: CustomerType;

  @IsOptional()
  @IsString()
  leadName?: string;

  @IsOptional()
  @IsString()
  leadPhone?: string;

  @IsOptional()
  @IsString()
  leadEmail?: string;

  @IsOptional()
  @IsString()
  leadAddress?: string;

  @IsOptional()
  @IsString()
  leadTaxId?: string;

  @IsOptional()
  @IsNumber()
  partnerCommissionRate?: number;

  @IsOptional()
  @IsNumber()
  expectedPartnerCommission?: number;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  referralPartnerId?: string;

  @IsOptional()
  @IsArray()
  services?: any[];

  @IsOptional()
  @IsArray()
  packages?: any[];

  @IsOptional()
  @IsArray()
  attachments?: any[];
}

export class AddCustomerDto {
  @IsString({ message: "Mã khách hàng không được để trống" })
  customerId: string;
}

export class RejectOpportunityDto {
  @IsString({ message: "Lý do từ chối không được để trống" })
  reason: string;
}

export class OpportunityQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  status?: string;

  @IsOptional()
  customerId?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;

  @IsOptional()
  sortBy?: string;

  @IsOptional()
  sortDir?: "ASC" | "DESC";
}
