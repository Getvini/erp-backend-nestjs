import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
} from "class-validator";
import {
  JobCategory,
  PerformerType,
  JobLevel,
  JobResponsibleRole,
} from "@modules/crm/service/enums/job-category.enum";

export class CreateJobDto {
  @IsString({ message: "Tên công việc không được để trống" })
  name: string;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsNumber()
  costPrice?: number;

  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @IsOptional()
  @IsBoolean()
  isBriefVideo?: boolean;

  @IsOptional()
  @IsBoolean()
  isQuotationItem?: boolean;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsEnum(PerformerType)
  defaultPerformerType?: PerformerType;

  @IsOptional()
  @IsArray()
  categories?: JobCategory[];

  @IsOptional()
  @IsEnum(JobLevel)
  level?: JobLevel;

  @IsOptional()
  @IsEnum(JobResponsibleRole)
  responsibleRole?: JobResponsibleRole | null;

  @IsOptional()
  @IsNumber()
  vinicoin?: number;

  @IsOptional()
  @IsNumber()
  timeToComplete?: number;
}

export class UpdateJobDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsNumber()
  costPrice?: number;

  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @IsOptional()
  @IsBoolean()
  isBriefVideo?: boolean;

  @IsOptional()
  @IsBoolean()
  isQuotationItem?: boolean;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsEnum(PerformerType)
  defaultPerformerType?: PerformerType;

  @IsOptional()
  @IsArray()
  categories?: JobCategory[];

  @IsOptional()
  @IsEnum(JobLevel)
  level?: JobLevel;

  @IsOptional()
  @IsEnum(JobResponsibleRole)
  responsibleRole?: JobResponsibleRole | null;

  @IsOptional()
  @IsNumber()
  vinicoin?: number;

  @IsOptional()
  @IsNumber()
  timeToComplete?: number;
}
