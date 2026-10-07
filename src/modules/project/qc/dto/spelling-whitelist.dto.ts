import { IsString, IsNotEmpty, IsArray, ArrayMinSize } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class AddWhitelistWordDto {
  @ApiProperty({ description: "Từ cần thêm vào whitelist" })
  @IsString()
  @IsNotEmpty({ message: "Từ whitelist không được để trống" })
  word: string;
}

export class AddWhitelistWordsDto {
  @ApiProperty({ description: "Danh sách các từ cần thêm vào whitelist" })
  @IsArray()
  @ArrayMinSize(1)
  words: string[];
}

export class RemoveWhitelistWordsDto {
  @ApiProperty({ description: "Danh sách các từ cần xóa khỏi whitelist" })
  @IsArray()
  @ArrayMinSize(1)
  words: string[];
}
