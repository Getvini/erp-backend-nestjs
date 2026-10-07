import { Repository } from "typeorm";
import { VideoGeneration } from "@modules/ai-studio/entities/video-generation.entity";
import { AssetService } from "@modules/ai-studio/asset/services/asset.service";
import { KlingAdapter } from "../adapters/kling.adapter";
import { ByteplusAdapter } from "../adapters/byteplus.adapter";
import { CreateVideoDto } from "../dto/video-generation.dto";

export async function dispatchVideoTask(
  isByteplus: boolean,
  dto: CreateVideoDto,
  modelCode: string,
  beginUrl: string,
  endUrl: string | undefined,
  klingAdapter: KlingAdapter,
  byteplusAdapter: ByteplusAdapter,
): Promise<string> {
  if (isByteplus) {
    const res = await byteplusAdapter.createVideo({
      modelCode,
      prompt: dto.prompt,
      imageUrl: beginUrl,
      imageTailUrl: endUrl,
      resolution: dto.resolution,
      ratio: dto.ratio,
      duration: Number(dto.duration || 5),
    });
    return res.id;
  }

  const res = await klingAdapter.createImageToVideo({
    model_name: modelCode,
    image: beginUrl,
    image_tail: endUrl,
    prompt: dto.prompt,
    sound: dto.sound || "off",
    negative_prompt: dto.negativePrompt || "",
    duration: dto.duration || "5",
    mode: dto.mode || "pro",
  });
  if (res.code !== 0) throw new Error(`Kling error: ${res.message}`);
  return res.data.task_id;
}

export async function pollAndSaveKlingResult(
  videoGenId: number,
  taskId: string,
  userId: string,
  videoRepo: Repository<VideoGeneration>,
  klingAdapter: KlingAdapter,
  assetService: AssetService,
) {
  try {
    await videoRepo.update(videoGenId, { status: "processing" });
    const taskResult = await klingAdapter.pollUntilDone(
      taskId,
      false,
      5000,
      60,
    );
    const videoData = taskResult.task_result?.videos?.[0];
    if (!videoData) {
      throw new Error("Kling trả về succeed nhưng không có video URL");
    }

    const videoGen = await videoRepo.findOne({ where: { id: videoGenId } });
    const videoAsset = await assetService.createAsset({
      userId,
      projectId: videoGen?.projectId || undefined,
      assetType: "video",
      assetRole: "scene_video",
      sourceType: "generated",
      originalUrl: videoData.url,
      storedUrl: videoData.url,
      storageProvider: "kling",
      durationSeconds: videoData.duration
        ? Math.round(parseFloat(videoData.duration))
        : undefined,
      metadata: { kling_video_id: videoData.id, duration: videoData.duration },
    });

    await videoRepo.update(videoGenId, {
      status: "succeeded",
      outputAssetId: videoAsset.id,
      completedAt: new Date(),
      responsePayload: taskResult,
    });
  } catch (err: any) {
    await videoRepo.update(videoGenId, {
      status: "failed",
      errorMessage: err.message,
      completedAt: new Date(),
    });
  }
}

export async function pollAndSaveByteplusResult(
  videoGenId: number,
  taskId: string,
  userId: string,
  videoRepo: Repository<VideoGeneration>,
  byteplusAdapter: ByteplusAdapter,
  assetService: AssetService,
) {
  try {
    await videoRepo.update(videoGenId, { status: "processing" });
    const taskResult = await byteplusAdapter.pollUntilDone(taskId, 5000, 60);
    const videoUrl = taskResult.content?.video_url;
    if (!videoUrl) {
      throw new Error("BytePlus trả về succeeded nhưng không có video URL");
    }

    const videoGen = await videoRepo.findOne({ where: { id: videoGenId } });
    const videoAsset = await assetService.createAsset({
      userId,
      projectId: videoGen?.projectId || undefined,
      assetType: "video",
      assetRole: "scene_video",
      sourceType: "generated",
      originalUrl: videoUrl,
      storedUrl: videoUrl,
      storageProvider: "byteplus",
      durationSeconds: taskResult.duration
        ? Math.round(Number(taskResult.duration))
        : undefined,
      metadata: {
        byteplus_task_id: taskResult.id,
        duration: taskResult.duration,
      },
    });

    await videoRepo.update(videoGenId, {
      status: "succeeded",
      outputAssetId: videoAsset.id,
      completedAt: new Date(),
      responsePayload: taskResult,
    });
  } catch (err: any) {
    await videoRepo.update(videoGenId, {
      status: "failed",
      errorMessage: err.message,
      completedAt: new Date(),
    });
  }
}
