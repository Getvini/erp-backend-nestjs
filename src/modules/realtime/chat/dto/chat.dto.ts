import {
  IsString,
  IsNotEmpty,
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

export class SendChatMessageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  attachments?: {
    type: string;
    name: string;
    url: string;
    size?: number;
    publicId?: string;
  }[];
}

export class ChatBotMessageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sessionId?: string;
}
