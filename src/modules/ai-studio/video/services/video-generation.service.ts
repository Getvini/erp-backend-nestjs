import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { VideoGeneration } from "@modules/ai-studio/entities/video-generation.entity";
import { AiModel } from "@modules/ai-studio/entities/ai-model.entity";
import { Projects } from "@modules/project/project-core/entities/project.entity";
import { Tasks } from "@modules/project/task/entities/task.entity";
import { Opportunities } from "@modules/crm/opportunity/entities/opportunity.entity";
import { AssetService } from "@modules/ai-studio/asset/services/asset.service";
import { KlingAdapter } from "../adapters/kling.adapter";
import { ByteplusAdapter } from "../adapters/byteplus.adapter";
import { GenerationBudgetService } from "./generation-budget.service";
import { CreateVideoDto } from "../dto/video-generation.dto";
import {
  validateVideoGenerationDto,
  validateTaskAndProject,
  buildStoredPrompt,
  resolveVideoAssets,
} from "../helpers/video-generation-validator.helper";
import {
  dispatchVideoTask,
  pollAndSaveKlingResult,
  pollAndSaveByteplusResult,
} from "../helpers/video-generation-polling.helper";

@Injectable()
export class VideoGenerationService {
  constructor(
    @InjectRepository(VideoGeneration)
    private readonly videoGenRepository: Repository<VideoGeneration>,
    @InjectRepository(AiModel)
    private readonly modelRepository: Repository<AiModel>,
    @InjectRepository(Projects)
    private readonly projectRepository: Repository<Projects>,
    @InjectRepository(Tasks)
    private readonly taskRepository: Repository<Tasks>,
    @InjectRepository(Opportunities)
    private readonly opportunityRepository: Repository<Opportunities>,
    private readonly assetService: AssetService,
    private readonly generationBudgetService: GenerationBudgetService,
    private readonly klingAdapter: KlingAdapter,
    private readonly byteplusAdapter: ByteplusAdapter,
  ) {}

  async createVideo(
    userId: string,
    dto: CreateVideoDto,
    startImageUrl?: string,
    endImageUrl?: string,
  ) {
    await validateTaskAndProject(
      dto,
      userId,
      this.projectRepository,
      this.opportunityRepository,
      this.taskRepository,
    );

    const model = await this.modelRepository.findOne({
      where: { id: dto.modelId },
      relations: ["provider"],
    });
    if (!model) throw new NotFoundException("Model không tồn tại");
    if (model.modelType !== "video_generation") {
      throw new BadRequestException("Model không phải video generation");
    }

    const isByteplus = model.provider?.code === "byteplus";
    validateVideoGenerationDto(dto, isByteplus);

    const { beginAsset, endAsset } = await resolveVideoAssets(
      this.assetService,
      userId,
      dto,
      startImageUrl,
      endImageUrl,
    );

    const storedPrompt = buildStoredPrompt(dto, isByteplus);
    const { reservation: saved, budget } =
      await this.generationBudgetService.reserve(
        dto.taskId,
        dto.cost ?? 0,
        async (manager) =>
          manager.getRepository(VideoGeneration).save(
            manager.getRepository(VideoGeneration).create({
              projectId: dto.projectId,
              opportunityId: dto.opportunityId,
              taskId: dto.taskId,
              modelId: dto.modelId,
              userId,
              imageBeginAssetId: beginAsset.id,
              imageEndAssetId: endAsset?.id,
              motionPrompt: storedPrompt,
              negativePrompt: dto.negativePrompt,
              status: "pending",
              durationSeconds: Number(dto.duration || 5),
              generationMode: isByteplus
                ? dto.resolution || "720p"
                : dto.mode || "std",
              generationRatio: isByteplus ? dto.ratio : undefined,
              cost: dto.cost,
              requestPayload: { modelName: model.code, prompt: dto.prompt },
              startedAt: new Date(),
            }),
          ),
      );

    let externalTaskId = "";
    try {
      externalTaskId = await dispatchVideoTask(
        isByteplus,
        dto,
        model.code,
        beginAsset.storedUrl,
        endAsset?.storedUrl,
        this.klingAdapter,
        this.byteplusAdapter,
      );

      await this.videoGenRepository.update(saved.id, {
        status: "queued",
        externalTaskId,
      });
    } catch (error: any) {
      await this.videoGenRepository.update(saved.id, {
        status: "failed",
        errorMessage: error.message,
        completedAt: new Date(),
      });
      throw error;
    }

    if (isByteplus) {
      pollAndSaveByteplusResult(
        saved.id,
        externalTaskId,
        userId,
        this.videoGenRepository,
        this.byteplusAdapter,
        this.assetService,
      ).catch(() => {});
    } else {
      pollAndSaveKlingResult(
        saved.id,
        externalTaskId,
        userId,
        this.videoGenRepository,
        this.klingAdapter,
        this.assetService,
      ).catch(() => {});
    }

    return {
      message: "Đang tạo video, vui lòng chờ...",
      videoGenerationId: saved.id,
      projectId: dto.projectId,
      opportunityId: dto.opportunityId,
      taskId: dto.taskId,
      externalTaskId,
      status: "queued",
      beginImageUrl: beginAsset.storedUrl,
      endImageUrl: endAsset?.storedUrl ?? null,
      promptSent: storedPrompt,
      modelName: model.name,
      cost: dto.cost ?? 0,
      budgetMode: budget.budgetMode,
      budgetLimit: budget.limit,
      budgetUsed: budget.used,
      budgetRemaining: budget.remaining,
    };
  }

  async getStatus(id: number) {
    const videoGen = await this.videoGenRepository.findOne({
      where: { id },
      relations: ["outputAsset"],
    });
    if (!videoGen) {
      throw new NotFoundException("Không tìm thấy video generation");
    }

    return {
      id: videoGen.id,
      status: videoGen.status,
      taskId: videoGen.externalTaskId,
      promptSent: videoGen.motionPrompt,
      videoUrl: videoGen.outputAsset?.storedUrl ?? null,
      duration: videoGen.durationSeconds,
      errorMessage: videoGen.errorMessage ?? null,
      createdAt: videoGen.createdAt,
      completedAt: videoGen.completedAt ?? null,
    };
  }

  async getHistory(userId: string, projectId?: string) {
    const qb = this.videoGenRepository
      .createQueryBuilder("vg")
      .leftJoinAndSelect("vg.outputAsset", "outputAsset")
      .leftJoinAndSelect("vg.model", "model")
      .leftJoinAndSelect("model.provider", "provider")
      .where("vg.user_id = :userId", { userId });

    if (projectId) {
      qb.andWhere("vg.project_id = :projectId", { projectId });
    }

    const list = await qb.orderBy("vg.created_at", "DESC").limit(50).getMany();

    return list.map((vg) => ({
      id: vg.id,
      status: vg.status,
      promptSent: vg.motionPrompt,
      videoUrl: vg.outputAsset?.storedUrl ?? null,
      modelName: vg.model?.name ?? "Unknown",
      providerName: vg.model?.provider?.name ?? "Unknown",
      durationSeconds: vg.durationSeconds,
      generationMode: vg.generationMode,
      cost: vg.cost ?? 0,
      createdAt: vg.createdAt,
    }));
  }
}
