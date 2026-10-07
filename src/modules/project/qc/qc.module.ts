import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TaskReviews } from "./entities/task-review.entity";
import { TaskResultChecks } from "./entities/task-result-check.entity";
import { ProjectSpellCheckWhitelists } from "./entities/project-spell-check-whitelist.entity";
import { ProjectProductDescriptionSubmissions } from "./entities/project-product-description.entity";
import { ProjectProductDescriptionItems } from "./entities/project-product-description-item.entity";
import { Tasks } from "@modules/project/task/entities/task.entity";
import { JobCriterias } from "@modules/project/task/entities/job-criteria.entity";
import { Project } from "@modules/project/project-core/entities/project.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import { CommunicationModule } from "@modules/communication/communication.module";

import { TaskReviewService } from "./services/task-review.service";
import { TaskReviewFinalizeService } from "./services/task-review-finalize.service";
import { TaskResultCheckService } from "./services/task-result-check.service";
import { SpellingWhitelistService } from "./services/spelling-whitelist.service";
import { SpellingCheckService } from "./services/spelling-check.service";
import { ProjectProductDescriptionService } from "./services/project-product-description.service";
import { QcScanService } from "./services/qc-scan.service";

import { TaskReviewController } from "./controllers/task-review.controller";
import { TaskResultCheckController } from "./controllers/task-result-check.controller";
import { SpellingWhitelistController } from "./controllers/spelling-whitelist.controller";
import { SpellingCheckController } from "./controllers/spelling-check.controller";
import { QcController } from "./controllers/qc.controller";
import { ProjectProductDescriptionController } from "./controllers/project-product-description.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaskReviews,
      TaskResultChecks,
      ProjectSpellCheckWhitelists,
      ProjectProductDescriptionSubmissions,
      ProjectProductDescriptionItems,
      Tasks,
      JobCriterias,
      Project,
      Users,
    ]),
    CommunicationModule,
  ],
  controllers: [
    TaskReviewController,
    TaskResultCheckController,
    SpellingWhitelistController,
    SpellingCheckController,
    QcController,
    ProjectProductDescriptionController,
  ],
  providers: [
    TaskReviewService,
    TaskReviewFinalizeService,
    TaskResultCheckService,
    SpellingWhitelistService,
    SpellingCheckService,
    ProjectProductDescriptionService,
    QcScanService,
  ],
  exports: [
    TaskReviewService,
    TaskReviewFinalizeService,
    TaskResultCheckService,
    SpellingWhitelistService,
    SpellingCheckService,
    ProjectProductDescriptionService,
    QcScanService,
  ],
})
export class QcModule {}
