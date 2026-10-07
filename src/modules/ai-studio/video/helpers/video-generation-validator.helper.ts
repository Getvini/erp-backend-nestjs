import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { Repository } from "typeorm";
import { Projects } from "@modules/project/project-core/entities/project.entity";
import { Tasks } from "@modules/project/task/entities/task.entity";
import { Opportunities } from "@modules/crm/opportunity/entities/opportunity.entity";
import { CreateVideoDto } from "../dto/video-generation.dto";

export function validateVideoGenerationDto(
  dto: CreateVideoDto,
  isByteplus: boolean,
) {
  if (!dto.projectId && !dto.opportunityId) {
    throw new BadRequestException("Vui lòng chọn dự án hoặc cơ hội");
  }
  if (dto.projectId && dto.opportunityId) {
    throw new BadRequestException("Chỉ được chọn một dự án hoặc một cơ hội");
  }
  if (!dto.taskId) {
    throw new BadRequestException("Vui lòng chọn công việc (task) của dự án");
  }

  if (!isByteplus && dto.multiShot) {
    if (!dto.shotType) {
      throw new BadRequestException("shotType là bắt buộc khi multiShot=true");
    }
    if (dto.shotType === "customize") {
      if (!dto.multiPrompt || dto.multiPrompt.length === 0) {
        throw new BadRequestException(
          "multiPrompt là bắt buộc khi shotType=customize",
        );
      }
      const totalShotDuration = dto.multiPrompt.reduce(
        (sum, s) => sum + Number(s.duration),
        0,
      );
      const videoDuration = Number(dto.duration || 5);
      if (totalShotDuration !== videoDuration) {
        throw new BadRequestException(
          `Tổng duration của shots (${totalShotDuration}s) phải bằng duration video (${videoDuration}s)`,
        );
      }
    } else if (dto.shotType === "intelligence") {
      if (!dto.prompt?.trim()) {
        throw new BadRequestException(
          "prompt là bắt buộc khi shotType=intelligence",
        );
      }
    }
  } else {
    if (!dto.prompt?.trim()) {
      throw new BadRequestException("prompt là bắt buộc");
    }
  }
}

export async function validateTaskAndProject(
  dto: CreateVideoDto,
  userId: string,
  projectRepo: Repository<Projects>,
  opportunityRepo: Repository<Opportunities>,
  taskRepo: Repository<Tasks>,
) {
  if (dto.projectId) {
    const project = await projectRepo.findOne({
      where: { id: dto.projectId },
    });
    if (!project) throw new NotFoundException("Không tìm thấy project");
  }
  if (dto.opportunityId) {
    const opp = await opportunityRepo.findOne({
      where: { id: dto.opportunityId },
    });
    if (!opp) throw new NotFoundException("Không tìm thấy cơ hội");
  }

  const task = await taskRepo.findOne({
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
  return task;
}

export function buildStoredPrompt(
  dto: CreateVideoDto,
  isByteplus = false,
): string {
  if (
    !isByteplus &&
    dto.multiShot &&
    dto.shotType === "customize" &&
    dto.multiPrompt?.length
  ) {
    return dto.multiPrompt
      .map((s) => `[Shot ${s.index}] ${s.prompt} (${s.duration}s)`)
      .join(" | ");
  }
  return dto.prompt || "";
}

export async function resolveVideoAssets(
  assetService: any,
  userId: string,
  dto: CreateVideoDto,
  startImageUrl?: string,
  endImageUrl?: string,
) {
  const beginAsset = await assetService.resolveImageAsset(
    userId,
    dto.startImageAssetId,
    startImageUrl,
    "begin",
    "image_begin",
  );
  if (!beginAsset) {
    throw new BadRequestException(
      "Cần cung cấp startImage hoặc startImageAssetId",
    );
  }
  if (dto.projectId) {
    await assetService.attachProjectIfMissing(beginAsset.id, dto.projectId);
  }

  let endAsset = null;
  if (dto.endImageAssetId || endImageUrl) {
    endAsset = await assetService.resolveImageAsset(
      userId,
      dto.endImageAssetId,
      endImageUrl,
      "end",
      "image_end",
    );
    if (endAsset && dto.projectId) {
      await assetService.attachProjectIfMissing(endAsset.id, dto.projectId);
    }
  }

  return { beginAsset, endAsset };
}
