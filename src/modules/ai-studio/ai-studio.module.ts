import { Module } from "@nestjs/common";
import { AiAssetController } from "./controllers/ai-asset.controller";
import { AiAssetService } from "./services/ai-asset.service";

@Module({
  controllers: [AiAssetController],
  providers: [AiAssetService],
  exports: [AiAssetService],
})
export class AiStudioModule {}
