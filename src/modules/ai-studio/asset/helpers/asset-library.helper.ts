import { Repository } from "typeorm";
import { VideoGeneration } from "@modules/ai-studio/entities/video-generation.entity";
import { MotionGeneration } from "@modules/ai-studio/entities/motion-generation.entity";
import { AiAsset } from "@modules/ai-studio/entities/ai-asset.entity";

export async function enrichCreativeAssets(
  items: AiAsset[],
  videoRepo: Repository<VideoGeneration>,
  motionRepo: Repository<MotionGeneration>,
) {
  const videoAssetIds = items
    .filter((i) => i.assetType === "video")
    .map((i) => i.id);

  if (videoAssetIds.length === 0) return items;

  const [generations, motionGenerations] = await Promise.all([
    videoRepo
      .createQueryBuilder("vg")
      .leftJoinAndSelect("vg.model", "model")
      .leftJoinAndSelect("vg.outputAsset", "outputAsset")
      .where("vg.output_asset_id IN (:...ids)", { ids: videoAssetIds })
      .getMany(),
    motionRepo
      .createQueryBuilder("mg")
      .leftJoinAndSelect("mg.model", "model")
      .leftJoinAndSelect("mg.outputAsset", "outputAsset")
      .where("mg.output_asset_id IN (:...ids)", { ids: videoAssetIds })
      .getMany(),
  ]);

  const byOutputAssetId = new Map(generations.map((g) => [g.outputAssetId, g]));
  const motionByOutputAssetId = new Map(
    motionGenerations.map((g) => [g.outputAssetId, g]),
  );

  for (const item of items as any[]) {
    const gen = byOutputAssetId.get(item.id);
    if (gen) {
      item.prompt = gen.motionPrompt;
      item.model = gen.model?.name ?? null;
      item.mode = gen.generationMode;
      item.thumbnailUrl = item.thumbnailUrl || null;
      continue;
    }

    const motionGen = motionByOutputAssetId.get(item.id);
    if (motionGen) {
      item.prompt = motionGen.motionPrompt;
      item.model = motionGen.model?.name ?? null;
      item.mode = motionGen.generationMode;
      item.thumbnailUrl = item.thumbnailUrl || null;
    }
  }

  return items;
}
