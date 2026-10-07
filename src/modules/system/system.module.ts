import { Module } from "@nestjs/common";
import { SettingModule } from "./setting/setting.module";

@Module({
  imports: [SettingModule],
  exports: [SettingModule],
})
export class SystemModule {}
