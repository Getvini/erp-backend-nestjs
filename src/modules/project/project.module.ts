import { Module } from "@nestjs/common";
import { ProjectCoreModule } from "./project-core/project-core.module";
import { TaskModule } from "./task/task.module";
import { QcModule } from "./qc/qc.module";
import { AcceptanceModule } from "./acceptance/acceptance.module";
import { RewardModule } from "./reward/reward.module";
import { DashboardModule } from "./dashboard/dashboard.module";

@Module({
  imports: [
    ProjectCoreModule,
    TaskModule,
    QcModule,
    AcceptanceModule,
    RewardModule,
    DashboardModule,
  ],
  exports: [
    ProjectCoreModule,
    TaskModule,
    QcModule,
    AcceptanceModule,
    RewardModule,
    DashboardModule,
  ],
})
export class ProjectModule {}
