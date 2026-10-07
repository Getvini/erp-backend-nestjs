import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Notification } from "./entities/notification.entity";
import { NotificationService } from "./services/notification.service";
import { NotificationEmitterService } from "./services/notification-emitter.service";
import { NotificationController } from "./controllers/notification.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationEmitterService],
  exports: [NotificationService, NotificationEmitterService],
})
export class NotificationModule {}
