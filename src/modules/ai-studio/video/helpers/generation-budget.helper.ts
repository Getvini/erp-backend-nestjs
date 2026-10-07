import { NotFoundException, BadRequestException } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { Tasks } from "@modules/project/task/entities/task.entity";
import { OpportunityServiceJobs } from "@modules/crm/opportunity/entities/opportunity-service-job.entity";
import { GenerationBudgetSnapshot } from "../services/generation-budget.service";

export type GenerationLimitContext = Pick<
  GenerationBudgetSnapshot,
  "budgetMode" | "limit" | "allocationPercent"
>;

export async function isUnlimitedOpportunityDemo(
  manager: EntityManager,
  task: Tasks,
): Promise<boolean> {
  if (!task.opportunityId || !task.opportunityServiceJobId) return false;

  const oppJob = await manager.getRepository(OpportunityServiceJobs).findOne({
    where: { id: task.opportunityServiceJobId },
  });
  return Boolean(oppJob?.isBriefVideo);
}

export async function getConfiguredCost(
  manager: EntityManager,
  task: Tasks,
): Promise<number> {
  const taskWithPricing = await manager.getRepository(Tasks).findOne({
    where: { id: task.id },
    relations: ["job"],
  });
  if (!taskWithPricing) throw new NotFoundException("Không tìm thấy công việc");

  if (taskWithPricing.opportunityServiceJobId) {
    const oppJob = await manager.getRepository(OpportunityServiceJobs).findOne({
      where: { id: taskWithPricing.opportunityServiceJobId },
    });
    if (!oppJob) {
      throw new NotFoundException(
        "Không tìm thấy hạng mục công việc của cơ hội",
      );
    }
    return Number(oppJob.costAtSale || 0);
  }

  if (taskWithPricing.contractServiceId && taskWithPricing.jobId) {
    const oppJob = await manager.getRepository(OpportunityServiceJobs).findOne({
      where: { jobId: taskWithPricing.jobId },
    });
    if (oppJob) return Number(oppJob.costAtSale || 0);
  }

  return Number(taskWithPricing.cost || 0);
}

export async function getLimitContext(
  manager: EntityManager,
  task: Tasks,
): Promise<GenerationLimitContext> {
  if (await isUnlimitedOpportunityDemo(manager, task)) {
    return {
      budgetMode: "UNLIMITED",
      limit: null,
      allocationPercent: null,
    };
  }

  let budgetSourceTask = task;
  let allocationPercent: number;

  if (task.parentTaskId) {
    const parentTask = await manager.getRepository(Tasks).findOne({
      where: { id: task.parentTaskId },
    });
    if (!parentTask) {
      throw new NotFoundException("Không tìm thấy task cha của công việc");
    }
    budgetSourceTask = parentTask;
    allocationPercent = Number(task.allocationPercent || 0);
    if (
      !Number.isFinite(allocationPercent) ||
      allocationPercent <= 0 ||
      allocationPercent > 100
    ) {
      throw new BadRequestException("% phân bổ của task con không hợp lệ");
    }
  } else {
    const subtasks = await manager.getRepository(Tasks).find({
      where: { parentTaskId: task.id },
    });
    const allocatedPercent = subtasks.reduce(
      (total, st) => total + Number(st.allocationPercent || 0),
      0,
    );
    if (
      !Number.isFinite(allocatedPercent) ||
      allocatedPercent < 0 ||
      allocatedPercent > 100
    ) {
      throw new BadRequestException("Tổng % phân bổ task con không hợp lệ");
    }
    allocationPercent = 100 - allocatedPercent;
    if (allocationPercent <= 0) {
      throw new BadRequestException(
        "Toàn bộ 100% công việc đã được phân bổ cho các task con",
      );
    }
  }

  const configuredCost = await getConfiguredCost(manager, budgetSourceTask);
  const limit = Math.floor((configuredCost * allocationPercent) / 100);
  if (!Number.isSafeInteger(limit) || limit <= 0) {
    throw new BadRequestException(
      "Task chưa có giá vốn hợp lệ để tạo video AI",
    );
  }
  return { budgetMode: "LIMITED", limit, allocationPercent };
}
