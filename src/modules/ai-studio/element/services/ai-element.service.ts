import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AiElement } from "@modules/ai-studio/entities/ai-element.entity";
import { AiElementImage } from "@modules/ai-studio/entities/ai-element-image.entity";
import { AiElementVideo } from "@modules/ai-studio/entities/ai-element-video.entity";
import { AiProvider } from "@modules/ai-studio/entities/ai-provider.entity";
import { KlingAdapter } from "@modules/ai-studio/video/adapters/kling.adapter";
import { CreateElementDto } from "../dto/ai-element.dto";

@Injectable()
export class AiElementService {
  constructor(
    @InjectRepository(AiElement)
    private readonly elementRepository: Repository<AiElement>,
    @InjectRepository(AiElementImage)
    private readonly elementImageRepository: Repository<AiElementImage>,
    @InjectRepository(AiElementVideo)
    private readonly elementVideoRepository: Repository<AiElementVideo>,
    @InjectRepository(AiProvider)
    private readonly providerRepository: Repository<AiProvider>,
    private readonly klingAdapter: KlingAdapter,
  ) {}

  async create(userId: string, dto: CreateElementDto) {
    const provider = await this.providerRepository.findOne({
      where: { id: dto.providerId },
    });
    if (!provider) throw new NotFoundException("Provider không tồn tại");

    if (dto.referenceType === "image_refer") {
      if (!dto.frontalImageAssetId) {
        throw new BadRequestException("Ảnh chính diện là bắt buộc");
      }
    } else {
      if (!dto.videoAssetId) {
        throw new BadRequestException("Video tham chiếu là bắt buộc");
      }
      if (dto.elementVoiceId) {
        throw new BadRequestException(
          "Element Voice ID chỉ áp dụng khi loại tham chiếu là ảnh",
        );
      }
    }

    const element = await this.elementRepository.save(
      this.elementRepository.create({
        userId,
        providerId: dto.providerId,
        projectId: null,
        elementName: dto.elementName,
        elementDescription: dto.elementDescription,
        referenceType: dto.referenceType,
        elementVoiceId:
          dto.referenceType === "image_refer"
            ? dto.elementVoiceId || null
            : null,
        status: "pending",
      }),
    );

    if (dto.referenceType === "image_refer" && dto.frontalImageAssetId) {
      await this.elementImageRepository.save(
        this.elementImageRepository.create({
          elementId: element.id,
          assetId: dto.frontalImageAssetId,
          imageRole: "frontal",
          sortOrder: 0,
        }),
      );
    } else if (dto.videoAssetId) {
      await this.elementVideoRepository.save(
        this.elementVideoRepository.create({
          elementId: element.id,
          assetId: dto.videoAssetId,
        }),
      );
    }

    const klingPayload = {
      elementName: dto.elementName,
      elementDescription: dto.elementDescription,
      referenceType: dto.referenceType,
      elementVoiceId:
        dto.referenceType === "image_refer" ? dto.elementVoiceId : undefined,
    };

    let taskId = "";
    try {
      const res = await this.klingAdapter.createElement(klingPayload);
      if (res.code !== 0) throw new Error(res.message);
      taskId = res.data.task_id;

      await this.elementRepository.update(element.id, {
        status: "processing",
        externalElementId: taskId,
        requestPayload: klingPayload as any,
        responsePayload: res as any,
      });

      this.pollElementInBackground(element.id, taskId).catch(() => {});
    } catch (err: any) {
      await this.elementRepository.update(element.id, {
        status: "failed",
        errorMessage: err.message,
      });
      throw new BadRequestException(`Kling error: ${err.message}`);
    }

    return {
      message: "Đang tạo element, vui lòng chờ...",
      elementId: element.id,
      taskId,
      status: "processing",
    };
  }

  private async pollElementInBackground(elementId: number, taskId: string) {
    try {
      const taskResult = await this.klingAdapter.pollElementUntilDone(
        taskId,
        5000,
        30,
      );
      const resElement = taskResult?.task_result?.elements?.[0];
      if (!resElement) {
        throw new Error("Kling trả về succeed nhưng không có element data");
      }

      await this.elementRepository.update(elementId, {
        status: "succeeded",
        externalElementId: String(resElement.element_id),
        responsePayload: taskResult as any,
      });
    } catch (err: any) {
      await this.elementRepository.update(elementId, {
        status: "failed",
        errorMessage: err.message,
      });
    }
  }

  async getHistory(userId: string) {
    const elements = await this.elementRepository.find({
      where: { userId },
      relations: ["provider"],
      order: { createdAt: "DESC" },
      take: 50,
    });

    return elements.map((el) => ({
      id: el.id,
      status: el.status,
      elementName: el.elementName,
      elementDescription: el.elementDescription,
      referenceType: el.referenceType,
      elementVoiceId: el.elementVoiceId,
      externalElementId:
        el.status === "succeeded" ? el.externalElementId : null,
      providerName: el.provider?.name ?? "Unknown",
      errorMessage: el.errorMessage ?? null,
      isFavorite: el.isFavorite,
      createdAt: el.createdAt,
    }));
  }

  async getStatus(id: number) {
    const element = await this.elementRepository.findOne({
      where: { id },
    });
    if (!element) throw new NotFoundException("Không tìm thấy element");

    return {
      id: element.id,
      status: element.status,
      elementName: element.elementName,
      referenceType: element.referenceType,
      externalElementId:
        element.status === "succeeded" ? element.externalElementId : null,
      errorMessage: element.errorMessage ?? null,
    };
  }

  async getKlingTaskStatus(taskId: string) {
    return this.klingAdapter.getElementTaskStatus(taskId);
  }

  async remove(userId: string, id: number) {
    const element = await this.elementRepository.findOne({ where: { id } });
    if (!element) throw new NotFoundException("Không tìm thấy element");
    if (String(element.userId) !== String(userId)) {
      throw new ForbiddenException("Không có quyền xóa element này");
    }

    if (element.status === "succeeded" && element.externalElementId) {
      try {
        await this.klingAdapter.deleteElement(element.externalElementId);
      } catch {}
    }

    await this.elementRepository.delete(id);
    return { message: "Đã xóa element" };
  }

  async setFavorite(userId: string, id: number, isFavorite: boolean) {
    const element = await this.elementRepository.findOne({ where: { id } });
    if (!element) throw new NotFoundException("Không tìm thấy element");
    if (String(element.userId) !== String(userId)) {
      throw new ForbiddenException("Không có quyền với element này");
    }
    element.isFavorite = isFavorite;
    return this.elementRepository.save(element);
  }
}
