import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
} from "class-validator";
import { CustomerType } from "@modules/crm/opportunity/enums/opportunity-status.enum";

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
