import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateProjectDto {
  @ApiProperty({ description: "Tên dự án" })
  @IsString()
  @IsNotEmpty({ message: "Tên dự án không được để trống" })
  name: string;

  @ApiProperty({ description: "ID hợp đồng" })
  @IsString()
  @IsNotEmpty({ message: "ID hợp đồng không được để trống" })
  contractId: string;

  @ApiProperty({ description: "ID đội ngũ" })
  @IsString()
  @IsNotEmpty({ message: "ID team không được để trống" })
  teamId: string;

  @ApiPropertyOptional({ description: "Ngày bắt đầu dự kiến" })
  @IsDateString()
  @IsOptional()
  plannedStartDate?: string;

  @ApiPropertyOptional({ description: "Ngày kết thúc dự kiến" })
  @IsDateString()
  @IsOptional()
  plannedEndDate?: string;
}
