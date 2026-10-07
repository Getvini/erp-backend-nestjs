import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MotionGeneration } from "@modules/ai-studio/entities/motion-generation.entity";
import { AiModel } from "@modules/ai-studio/entities/ai-model.entity";
import { Projects } from "@modules/project/project-core/entities/project.entity";
import { Tasks } from "@modules/project/task/entities/task.entity";
import { Opportunities } from "@modules/crm/opportunity/entities/opportunity.entity";
import { AssetService } from "@modules/ai-studio/asset/services/asset.service";
import { KlingAdapter } from "../adapters/kling.adapter";
import { GenerationBudgetService } from "./generation-budget.service";
import { CreateMotionControlVideoDto } from "../dto/video-generation.dto";
import { runBackgroundMotionControl } from "../helpers/motion-generation-polling.helper";

@Injectable()
export class MotionGenerationService {
  constructor(
    @InjectRepository(MotionGeneration)
    private readonly motionGenRepository: Repository<MotionGeneration>,
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
  ) {}

  async createMotionControlVideo(
    userId: string,
    dto: CreateMotionControlVideoDto,
    characterImageUrl?: string,
    referenceVideoUrl?: string,
  ) {
    if (dto.projectId) {
      const project = await this.projectRepository.findOne({
        where: { id: dto.projectId },
      });
      if (!project) throw new NotFoundException("Không tìm thấy project");
    }
    if (dto.opportunityId) {
      const opp = await this.opportunityRepository.findOne({
        where: { id: dto.opportunityId },
      });
      if (!opp) throw new NotFoundException("Không tìm thấy cơ hội");
    }

    const task = await this.taskRepository.findOne({
      where: { id: dto.taskId },
      relations: ["project", "opportunity", "assignee", "assignee.accounts"],
    });
    if (!task) throw new NotFoundException("Không tìm thấy công việc");
    if (dto.projectId && task.project?.id !== dto.projectId) {
      throw new BadRequestException("Công việc không thuộc dự án đã chọn");
    }
    if (dto.opportunityId && task.opportunity?.id !== dto.opportunityId) {
      throw new BadRequestException("Công việc không thuộc cơ hội đã chọn");
    }
    if (!task.assignee?.accounts?.some((account) => account.id === userId)) {
      throw new ForbiddenException(
        "Bạn không phải người được phân công công việc này",
      );
    }

    const model = await this.modelRepository.findOne({
      where: { id: dto.modelId },
    });
    if (!model) throw new NotFoundException("Model không tồn tại");
    if (!model.supportsMotionControl) {
      throw new BadRequestException("Model không hỗ trợ Motion Control");
    }

    const characterAsset = await this.assetService.resolveImageAsset(
      userId,
      dto.characterImageAssetId,
      characterImageUrl,
      "character",
      "image_begin",
    );
    if (!characterAsset) {
      throw new BadRequestException(
        "Cần cung cấp characterImage hoặc characterImageAssetId",
      );
    }
    if (dto.projectId) {
      await this.assetService.attachProjectIfMissing(
        characterAsset.id,
        dto.projectId,
      );
    }

    const refAssetId = dto.referenceVideoAssetId || 0;

    const { reservation: saved, budget } =
      await this.generationBudgetService.reserve(
        dto.taskId,
        dto.cost ?? 0,
        async (manager) =>
          manager.getRepository(MotionGeneration).save(
            manager.getRepository(MotionGeneration).create({
              projectId: dto.projectId,
              opportunityId: dto.opportunityId,
              taskId: dto.taskId,
              modelId: dto.modelId,
              userId,
              characterImageAssetId: characterAsset.id,
              motionReferenceAssetId: refAssetId,
              motionPrompt: dto.prompt || "",
              negativePrompt: dto.negativePrompt,
              status: "queued",
              externalTaskId: "",
              durationSeconds: 5,
              characterOrientation: dto.characterOrientation,
              generationSound: dto.keepOriginalSound === "yes",
              generationMode: dto.mode || "pro",
              cost: dto.cost,
              requestPayload: {
                modelName: model.code,
                prompt: dto.prompt,
                characterOrientation: dto.characterOrientation,
              },
              startedAt: new Date(),
            }),
          ),
      );

    runBackgroundMotionControl(
      saved.id,
      characterAsset.storedUrl,
      referenceVideoUrl || "",
      dto,
      model.code,
      userId,
      this.motionGenRepository,
      this.klingAdapter,
      this.assetService,
    ).catch(() => {});

    return {
      message: "Đang xử lý, vui lòng chờ...",
      motionGenerationId: saved.id,
      projectId: dto.projectId,
      opportunityId: dto.opportunityId,
      taskId: dto.taskId,
      status: "queued",
      characterImageUrl: characterAsset.storedUrl,
      promptSent: dto.prompt || "",
      modelName: model.name,
      cost: dto.cost ?? 0,
      budgetMode: budget.budgetMode,
      budgetLimit: budget.limit,
      budgetUsed: budget.used,
      budgetRemaining: budget.remaining,
    };
  }

  async getStatus(id: number) {
    const motionGen = await this.motionGenRepository.findOne({
      where: { id },
      relations: ["outputAsset"],
    });
    if (!motionGen) {
      throw new NotFoundException("Không tìm thấy motion generation");
    }

    return {
      id: motionGen.id,
      status: motionGen.status,
      taskId: motionGen.externalTaskId,
      promptSent: motionGen.motionPrompt,
      videoUrl: motionGen.outputAsset?.storedUrl ?? null,
      duration: motionGen.durationSeconds,
      errorMessage: motionGen.errorMessage ?? null,
      createdAt: motionGen.createdAt,
      completedAt: motionGen.completedAt ?? null,
    };
  }

  async getHistory(userId: string, projectId?: string) {
    const qb = this.motionGenRepository
      .createQueryBuilder("mg")
      .leftJoinAndSelect("mg.outputAsset", "outputAsset")
      .leftJoinAndSelect("mg.model", "model")
      .leftJoinAndSelect("model.provider", "provider")
      .where("mg.user_id = :userId", { userId });

    if (projectId) {
      qb.andWhere("mg.project_id = :projectId", { projectId });
    }

    const list = await qb.orderBy("mg.created_at", "DESC").limit(50).getMany();

    return list.map((mg) => ({
      id: mg.id,
      status: mg.status,
      promptSent: mg.motionPrompt,
      videoUrl: mg.outputAsset?.storedUrl ?? null,
      modelName: mg.model?.name ?? "Unknown",
      providerName: mg.model?.provider?.name ?? "Unknown",
      characterOrientation: mg.characterOrientation,
      durationSeconds: mg.durationSeconds,
      generationMode: mg.generationMode,
      cost: mg.cost ?? 0,
      createdAt: mg.createdAt,
    }));
  }
}
