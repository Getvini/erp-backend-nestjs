import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { EntityManager, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Tasks } from "@modules/project/task/entities/task.entity";
import { VideoGeneration } from "@modules/ai-studio/entities/video-generation.entity";
import { MotionGeneration } from "@modules/ai-studio/entities/motion-generation.entity";
import { getLimitContext } from "../helpers/generation-budget.helper";

const RELEASED_STATUSES = ["failed", "cancelled"];

export interface GenerationBudgetSnapshot {
  budgetMode: "LIMITED" | "UNLIMITED";
  limit: number | null;
  used: number;
  requested: number;
  remaining: number | null;
  allocationPercent: number | null;
}

@Injectable()
export class GenerationBudgetService {
  constructor(
    @InjectRepository(Tasks)
    private readonly taskRepo: Repository<Tasks>,
    @InjectRepository(VideoGeneration)
    private readonly videoRepo: Repository<VideoGeneration>,
    @InjectRepository(MotionGeneration)
    private readonly motionRepo: Repository<MotionGeneration>,
  ) {}

  async getSnapshot(
    taskId: string,
    userId: string,
  ): Promise<GenerationBudgetSnapshot> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: ["assignee", "assignee.accounts"],
    });
    if (!task) throw new NotFoundException("Không tìm thấy công việc");
    if (!task.assignee?.accounts?.some((account) => account.id === userId)) {
      throw new ForbiddenException(
        "Bạn không phải người được phân công công việc này",
      );
    }

    const { budgetMode, limit, allocationPercent } = await getLimitContext(
      this.taskRepo.manager,
      task,
    );

    const [videoResult, motionResult] = await Promise.all([
      this.videoRepo
        .createQueryBuilder("generation")
        .select("COALESCE(SUM(generation.cost), 0)", "total")
        .where("generation.task_id = :taskId", { taskId })
        .andWhere("generation.status NOT IN (:...releasedStatuses)", {
          releasedStatuses: RELEASED_STATUSES,
        })
        .getRawOne(),
      this.motionRepo
        .createQueryBuilder("generation")
        .select("COALESCE(SUM(generation.cost), 0)", "total")
        .where("generation.task_id = :taskId", { taskId })
        .andWhere("generation.status NOT IN (:...releasedStatuses)", {
          releasedStatuses: RELEASED_STATUSES,
        })
        .getRawOne(),
    ]);

    const used =
      Number(videoResult?.total || 0) + Number(motionResult?.total || 0);
    return {
      budgetMode,
      limit,
      used,
      requested: 0,
      remaining:
        budgetMode === "UNLIMITED" ? null : Math.max(0, (limit || 0) - used),
      allocationPercent,
    };
  }

  async reserve<T>(
    taskId: string,
    requestedCost: number,
    saveReservation: (
      manager: EntityManager,
      budget: GenerationBudgetSnapshot,
    ) => Promise<T>,
  ): Promise<{ reservation: T; budget: GenerationBudgetSnapshot }> {
    const normalizedCost = Number(requestedCost);
    if (!Number.isSafeInteger(normalizedCost) || normalizedCost < 0) {
      throw new BadRequestException(
        "Chi phí tạo video phải là số nguyên không âm",
      );
    }

    return this.taskRepo.manager.transaction(async (manager) => {
      const task = await manager
        .getRepository(Tasks)
        .createQueryBuilder("task")
        .setLock("pessimistic_write")
        .where("task.id = :taskId", { taskId })
        .getOne();

      if (!task) throw new NotFoundException("Không tìm thấy công việc");

      const { budgetMode, limit, allocationPercent } = await getLimitContext(
        manager,
        task,
      );

      const [videoResult, motionResult] = await Promise.all([
        manager
          .getRepository(VideoGeneration)
          .createQueryBuilder("generation")
          .select("COALESCE(SUM(generation.cost), 0)", "total")
          .where("generation.task_id = :taskId", { taskId })
          .andWhere("generation.status NOT IN (:...releasedStatuses)", {
            releasedStatuses: RELEASED_STATUSES,
          })
          .getRawOne(),
        manager
          .getRepository(MotionGeneration)
          .createQueryBuilder("generation")
          .select("COALESCE(SUM(generation.cost), 0)", "total")
          .where("generation.task_id = :taskId", { taskId })
          .andWhere("generation.status NOT IN (:...releasedStatuses)", {
            releasedStatuses: RELEASED_STATUSES,
          })
          .getRawOne(),
      ]);

      const used =
        Number(videoResult?.total || 0) + Number(motionResult?.total || 0);
      const available =
        budgetMode === "UNLIMITED" ? null : Math.max(0, (limit || 0) - used);

      if (available !== null && normalizedCost > available) {
        throw new BadRequestException(
          `Vượt hạn mức tạo video. Hạn mức: ${limit!.toLocaleString("vi-VN")} VNĐ, ` +
            `đã dùng/đang giữ: ${used.toLocaleString("vi-VN")} VNĐ, ` +
            `còn lại: ${available.toLocaleString("vi-VN")} VNĐ`,
        );
      }

      const budget: GenerationBudgetSnapshot = {
        budgetMode,
        limit,
        used: used + normalizedCost,
        requested: normalizedCost,
        remaining:
          budgetMode === "UNLIMITED"
            ? null
            : (limit || 0) - used - normalizedCost,
        allocationPercent,
      };

      const reservation = await saveReservation(manager, budget);
      return { reservation, budget };
    });
  }
}
