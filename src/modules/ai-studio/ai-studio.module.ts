import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Accounts } from "@modules/identity/auth/entities/account.entity";
import { Projects } from "@modules/project/project-core/entities/project.entity";
import { Tasks } from "@modules/project/task/entities/task.entity";
import { Opportunities } from "@modules/crm/opportunity/entities/opportunity.entity";
import { OpportunityServiceJobs } from "@modules/crm/opportunity/entities/opportunity-service-job.entity";

import { AiProvider } from "./entities/ai-provider.entity";
import { AiModel } from "./entities/ai-model.entity";
import { AiAsset } from "./entities/ai-asset.entity";
import { AiElement } from "./entities/ai-element.entity";
import { AiElementImage } from "./entities/ai-element-image.entity";
import { AiElementVideo } from "./entities/ai-element-video.entity";
import { VideoGeneration } from "./entities/video-generation.entity";
import { MotionGeneration } from "./entities/motion-generation.entity";

import { AiDashboardController } from "./dashboard/controllers/ai-dashboard.controller";
import { AiDashboardService } from "./dashboard/services/ai-dashboard.service";

import { AiProviderController } from "./provider/controllers/ai-provider.controller";
import { AiProviderService } from "./provider/services/ai-provider.service";

import { AiModelController } from "./model/controllers/ai-model.controller";
import { AiModelService } from "./model/services/ai-model.service";

import { AssetController } from "./asset/controllers/asset.controller";
import { AssetService } from "./asset/services/asset.service";

import { AiElementController } from "./element/controllers/ai-element.controller";
import { AiElementService } from "./element/services/ai-element.service";

import { KlingAdapter } from "./video/adapters/kling.adapter";
import { ByteplusAdapter } from "./video/adapters/byteplus.adapter";
import { GenerationBudgetService } from "./video/services/generation-budget.service";
import { VideoGenerationService } from "./video/services/video-generation.service";
import { MotionGenerationService } from "./video/services/motion-generation.service";
import { VideoGenerationController } from "./video/controllers/video-generation.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AiProvider,
      AiModel,
      AiAsset,
      AiElement,
      AiElementImage,
      AiElementVideo,
      VideoGeneration,
      MotionGeneration,
      Accounts,
      Projects,
      Tasks,
      Opportunities,
      OpportunityServiceJobs,
    ]),
  ],
  controllers: [
    AiDashboardController,
    AiProviderController,
    AiModelController,
    AssetController,
    AiElementController,
    VideoGenerationController,
  ],
  providers: [
    AiDashboardService,
    AiProviderService,
    AiModelService,
    AssetService,
    AiElementService,
    KlingAdapter,
    ByteplusAdapter,
    GenerationBudgetService,
    VideoGenerationService,
    MotionGenerationService,
  ],
  exports: [
    AiDashboardService,
    AiProviderService,
    AiModelService,
    AssetService,
    AiElementService,
    VideoGenerationService,
    MotionGenerationService,
  ],
})
export class AiStudioModule {}
