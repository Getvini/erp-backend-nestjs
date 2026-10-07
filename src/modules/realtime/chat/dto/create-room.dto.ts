import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateRoomDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isGroup?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  participantIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recipientId?: string;
}

export class AddParticipantsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  participantIds: string[];
}
