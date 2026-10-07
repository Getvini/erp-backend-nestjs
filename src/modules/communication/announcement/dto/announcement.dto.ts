import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementScopeType,
  AnnouncementStatus,
} from "../entities/announcement.entity";

export class CreateAnnouncementDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ enum: AnnouncementCategory })
  @IsOptional()
  @IsEnum(AnnouncementCategory)
  category?: AnnouncementCategory;

  @ApiPropertyOptional({ enum: AnnouncementPriority })
  @IsOptional()
  @IsEnum(AnnouncementPriority)
  priority?: AnnouncementPriority;

  @ApiProperty({ enum: AnnouncementScopeType })
  @IsEnum(AnnouncementScopeType)
  scopeType: AnnouncementScopeType;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  targetRoles?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  targetTeamIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  targetUserIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  eventStartAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  eventEndAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  link?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  attachmentUrl?: string;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  mediaUrls?: { url: string; type: "image" | "video"; name?: string }[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  ccUserIds?: string[];

  @ApiPropertyOptional({ enum: AnnouncementStatus })
  @IsOptional()
  @IsEnum(AnnouncementStatus)
  status?: AnnouncementStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class UpdateAnnouncementDto extends CreateAnnouncementDto {}

export class CreateAnnouncementCommentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;
}
