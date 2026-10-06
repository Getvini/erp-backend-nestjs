import { IsString, IsOptional, IsNumber, IsArray } from "class-validator";

export class CreateOppServiceDto {
  @IsString()
  opportunityId: string;

  @IsString()
  serviceId: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  costAtSale?: number;
}

export class UpdateOppServiceJobItemDto {
  @IsString()
  id: string;

  @IsOptional()
  @IsNumber()
  costAtSale?: number;

  @IsOptional()
  @IsString()
  briefVideo?: string;
}

export class UpdateOppServiceDto {
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  costAtSale?: number;

  @IsOptional()
  @IsArray()
  jobs?: UpdateOppServiceJobItemDto[];
}
