import { Module } from "@nestjs/common";
import { AnnouncementModule } from "./announcement/announcement.module";
import { RealtimeModule } from "@modules/realtime/realtime.module";

@Module({
  imports: [AnnouncementModule, RealtimeModule],
  exports: [AnnouncementModule, RealtimeModule],
})
export class CommunicationModule {}
