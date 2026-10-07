import { IsString, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ReviewPaymentRequestDto {
  @ApiProperty({ enum: ["SUBMIT_TO_BOD", "NEED_MORE_DOCS", "REJECT"] })
  @IsString()
  action: "SUBMIT_TO_BOD" | "NEED_MORE_DOCS" | "REJECT";

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
