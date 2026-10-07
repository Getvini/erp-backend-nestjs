import { Repository } from "typeorm";
import { MotionGeneration } from "@modules/ai-studio/entities/motion-generation.entity";
import { AssetService } from "@modules/ai-studio/asset/services/asset.service";
import { KlingAdapter } from "../adapters/kling.adapter";
import { CreateMotionControlVideoDto } from "../dto/video-generation.dto";

export async function runBackgroundMotionControl(
  motionGenId: number,
  imageUrl: string,
  videoUrl: string,
  dto: CreateMotionControlVideoDto,
  modelCode: string,
  userId: string,
  motionRepo: Repository<MotionGeneration>,
  klingAdapter: KlingAdapter,
  assetService: AssetService,
) {
  try {
    const res = await klingAdapter.createMotionControl({
      model_name: modelCode,
      image_url: imageUrl,
      video_url: videoUrl,
      prompt: dto.prompt || "",
      keep_original_sound: dto.keepOriginalSound ?? "yes",
      character_orientation: dto.characterOrientation,
      mode: dto.mode || "pro",
    });

    if (res.code !== 0) throw new Error(`Kling error: ${res.message}`);
    const taskId = res.data.task_id;

    await motionRepo.update(motionGenId, {
      externalTaskId: taskId,
      status: "processing",
    });

    const taskResult = await klingAdapter.pollUntilDone(taskId, true, 5000, 60);
    const videoData = taskResult.task_result?.videos?.[0];
    if (!videoData) {
      throw new Error("Kling trả về succeed nhưng không có video URL");
    }

    const motionGen = await motionRepo.findOne({
      where: { id: motionGenId },
    });
    const videoAsset = await assetService.createAsset({
      userId,
      projectId: motionGen?.projectId || undefined,
      assetType: "video",
      assetRole: "scene_video",
      sourceType: "generated",
      originalUrl: videoData.url,
      storedUrl: videoData.url,
      storageProvider: "kling",
      durationSeconds: videoData.duration
        ? Math.round(parseFloat(videoData.duration))
        : undefined,
      metadata: {
        kling_video_id: videoData.id,
        duration: videoData.duration,
      },
    });

    await motionRepo.update(motionGenId, {
      status: "succeeded",
      outputAssetId: videoAsset.id,
      completedAt: new Date(),
      responsePayload: taskResult,
    });
  } catch (err: any) {
    await motionRepo.update(motionGenId, {
      status: "failed",
      errorMessage: err.message,
      completedAt: new Date(),
    });
  }
}
