import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AiAsset } from "@modules/ai-studio/entities/ai-asset.entity";
import { VideoGeneration } from "@modules/ai-studio/entities/video-generation.entity";
import { MotionGeneration } from "@modules/ai-studio/entities/motion-generation.entity";
import { enrichCreativeAssets } from "../helpers/asset-library.helper";

const TAB_TO_SOURCE_TYPE: Record<string, string> = {
  creative: "generated",
  upload: "uploaded",
};

const LIBRARY_ASSET_TYPES = ["image", "video", "audio"];

@Injectable()
export class AssetService {
  constructor(
    @InjectRepository(AiAsset)
    private readonly assetRepository: Repository<AiAsset>,
    @InjectRepository(VideoGeneration)
    private readonly videoGenRepository: Repository<VideoGeneration>,
    @InjectRepository(MotionGeneration)
    private readonly motionGenRepository: Repository<MotionGeneration>,
  ) {}

  async getOne(id: number, userId: string) {
    const asset = await this.assetRepository.findOne({ where: { id } });
    if (!asset) throw new NotFoundException("Không tìm thấy asset");
    if (String(asset.userId) !== String(userId)) {
      throw new ForbiddenException("Không có quyền truy cập asset này");
    }
    return asset;
  }

  async findLibrary(
    userId: string,
    opts: { tab: string; type: string; favoritesOnly: boolean },
  ) {
    const sourceType = TAB_TO_SOURCE_TYPE[opts.tab] ?? "generated";

    const qb = this.assetRepository
      .createQueryBuilder("asset")
      .where("asset.user_id = :userId", { userId })
      .andWhere("asset.source_type = :sourceType", { sourceType })
      .andWhere("asset.asset_type IN (:...allowedTypes)", {
        allowedTypes: LIBRARY_ASSET_TYPES,
      });

    if (opts.type !== "all") {
      qb.andWhere("asset.asset_type = :assetType", { assetType: opts.type });
    }
    if (opts.favoritesOnly) {
      qb.andWhere("asset.is_favorite = true");
    }

    qb.orderBy("asset.created_at", "DESC");

    const items = await qb.getMany();

    if (opts.tab === "creative") {
      await enrichCreativeAssets(
        items,
        this.videoGenRepository,
        this.motionGenRepository,
      );
    }

    return { items, total: items.length };
  }

  async setFavorite(userId: string, assetId: number, isFavorite: boolean) {
    const asset = await this.assetRepository.findOne({
      where: { id: assetId },
    });
    if (!asset) throw new NotFoundException("Không tìm thấy asset");
    if (String(asset.userId) !== String(userId)) {
      throw new ForbiddenException("Không có quyền với asset này");
    }
    asset.isFavorite = isFavorite;
    return this.assetRepository.save(asset);
  }

  async createAsset(data: Partial<AiAsset>) {
    const asset = this.assetRepository.create(data);
    return this.assetRepository.save(asset);
  }

  async resolveImageAsset(
    userId: string,
    assetId: number | undefined,
    url: string | undefined,
    role: string,
    assetRole: string,
  ): Promise<AiAsset | null> {
    if (assetId) {
      const asset = await this.assetRepository.findOne({
        where: { id: assetId },
      });
      if (!asset) {
        throw new BadRequestException(
          `Không tìm thấy ảnh ${role} đã chọn (id=${assetId})`,
        );
      }
      if (String(asset.userId) !== String(userId)) {
        throw new ForbiddenException(`Không có quyền dùng ảnh ${role} này`);
      }
      return asset;
    }

    if (!url) return null;

    const asset = this.assetRepository.create({
      userId,
      assetType: "image",
      assetRole,
      sourceType: "uploaded",
      originalUrl: url,
      storedUrl: url,
      storageProvider: "cloudinary",
      mimeType: "image/jpeg",
      metadata: {},
    });

    return this.assetRepository.save(asset);
  }

  async attachProjectIfMissing(assetId: number, projectId: string) {
    const asset = await this.assetRepository.findOne({
      where: { id: assetId },
    });
    if (asset && !asset.projectId) {
      asset.projectId = projectId;
      await this.assetRepository.save(asset);
    }
  }

  async updateAsset(id: number, data: Partial<AiAsset>) {
    await this.assetRepository.update(id, data as any);
  }
}
