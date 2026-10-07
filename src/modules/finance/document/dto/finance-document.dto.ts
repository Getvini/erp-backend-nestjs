import { IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateFinanceDocumentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  contractId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fileUrl: string;
}
