import { IsString, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class BodDecisionDto {
  @ApiProperty({ enum: ["APPROVE", "REJECT"] })
  @IsString()
  action: "APPROVE" | "REJECT";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  confirmedDueDate?: any;
}
