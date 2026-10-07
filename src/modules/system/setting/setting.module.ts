import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SystemSettings } from "./entities/system-setting.entity";
import { TaskModule } from "../../project/task/task.module";
import { SettingService } from "./services/setting.service";
import { SettingController } from "./controllers/setting.controller";

@Module({
  imports: [TypeOrmModule.forFeature([SystemSettings]), TaskModule],
  controllers: [SettingController],
  providers: [SettingService],
  exports: [SettingService],
})
export class SettingModule {}
