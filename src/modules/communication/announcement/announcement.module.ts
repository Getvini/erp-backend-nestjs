import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Announcement } from "./entities/announcement.entity";
import { AnnouncementComment } from "./entities/announcement-comment.entity";
import { AnnouncementRecipient } from "./entities/announcement-recipient.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import { TeamMember } from "@modules/project/project-core/entities/team-member.entity";
import { AnnouncementService } from "./services/announcement.service";
import { AnnouncementController } from "./controllers/announcement.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Announcement,
      AnnouncementComment,
      AnnouncementRecipient,
      Users,
      TeamMember,
    ]),
  ],
  controllers: [AnnouncementController],
  providers: [AnnouncementService],
  exports: [AnnouncementService],
})
export class AnnouncementModule {}
