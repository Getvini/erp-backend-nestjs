import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, EntityManager } from "typeorm";
import { ContractServices } from "@modules/project/acceptance/entities/contract-service.entity";
import { Tasks } from "@modules/project/task/entities/task.entity";
import { Project } from "@modules/project/project-core/entities/project.entity";
import { ProjectStatus } from "@modules/project/project-core/enums/project-status.enum";
import {
  Contract,
  ContractStatus,
} from "@modules/finance/entities/contract.entity";
import { VinicoinService } from "@modules/project/reward/services/vinicoin.service";
import { calculatePercentageRewardPlan } from "@modules/project/acceptance/helpers/task-reward.helper";
import { PerformerType } from "@modules/crm/service/enums/job-category.enum";
import { ContractServiceStatus } from "@modules/project/acceptance/enums/acceptance.enum";

@Injectable()
export class AcceptanceRewardService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(Contract)
    private readonly contractRepo: Repository<Contract>,
    private readonly vinicoinService: VinicoinService,
  ) {}

  async triggerRewards(
    service: ContractServices,
    manager: EntityManager,
    allowedTaskIds?: Set<string>,
  ) {
    if (!service.tasks) return;

    service.tasks = await manager.getRepository(Tasks).find({
      where: { contractServiceId: service.id },
      relations: [
        "job",
        "assignee",
        "assignee.accounts",
        "helper",
        "helper.accounts",
        "parentTask",
        "parentTask.job",
      ],
    });

    const percentageRewards = new Map<string, number>();
    const parentRewards = new Map<string, number>();
    const subtasksByParent = new Map<string, Tasks[]>();

    for (const task of service.tasks) {
      if (allowedTaskIds && !allowedTaskIds.has(task.id)) continue;
      if (!task.parentTaskId) continue;
      const group = subtasksByParent.get(task.parentTaskId) || [];
      group.push(task);
      subtasksByParent.set(task.parentTaskId, group);
    }

    for (const [parentTaskId, subtasks] of subtasksByParent.entries()) {
      const parent = service.tasks.find(
        (candidate) => candidate.id === parentTaskId,
      );
      const percentageSubtasks = subtasks.filter(
        (task) => Number(task.allocationPercent || 0) > 0,
      );
      if (!parent) continue;

      const rewardPlan = calculatePercentageRewardPlan(
        Number(parent.job?.vinicoin ?? 0),
        percentageSubtasks.map((task) => ({
          id: task.id,
          allocationPercent: Number(task.allocationPercent || 0),
        })),
      );
      rewardPlan.subtaskRewards.forEach((amount, taskId) =>
        percentageRewards.set(taskId, amount),
      );
      parentRewards.set(parent.id, rewardPlan.parentReward);
    }

    for (const task of service.tasks) {
      if (allowedTaskIds && !allowedTaskIds.has(task.id)) continue;

      const isSubtask = Boolean(task.parentTaskId);
      const childSubtasks = isSubtask
        ? []
        : subtasksByParent.get(task.id) || [];
      const hasSubtasks = childSubtasks.length > 0;
      if (task.isRewardable === false && !hasSubtasks) continue;

      const rewardAmount = isSubtask
        ? (percentageRewards.get(task.id) ?? 0)
        : hasSubtasks
          ? (parentRewards.get(task.id) ?? 0)
          : Number(task.job?.vinicoin || 0);
      if (!rewardAmount || rewardAmount <= 0) continue;

      const rewardedAccountIds = new Set<string>();
      const assigneeAccount = task.assignee?.accounts?.[0];
      const helperAccount = task.helper?.accounts?.[0];

      if (
        assigneeAccount?.id &&
        task.performerType === PerformerType.INTERNAL
      ) {
        rewardedAccountIds.add(assigneeAccount.id);
      }
      if (
        !isSubtask &&
        !hasSubtasks &&
        helperAccount?.id &&
        task.performerType === PerformerType.INTERNAL
      ) {
        rewardedAccountIds.add(helperAccount.id);
      }

      for (const accountId of rewardedAccountIds) {
        await this.vinicoinService.rewardForTask(
          accountId,
          rewardAmount,
          task.id,
          service.id,
          manager,
        );
      }

      if (rewardedAccountIds.size > 0) {
        task.rewardVinicoin = rewardAmount;
        await manager
          .getRepository(Tasks)
          .update({ id: task.id }, { rewardVinicoin: rewardAmount });
      }
    }
  }

  async syncProjectCompletionStatus(
    projectId: string,
    manager?: EntityManager,
  ) {
    const projectRepo = manager
      ? manager.getRepository(Project)
      : this.projectRepo;
    const contractRepo = manager
      ? manager.getRepository(Contract)
      : this.contractRepo;

    const project = await projectRepo.findOne({
      where: { id: projectId },
      relations: ["contract"],
    });

    if (!project || !project.contract) return;

    const services = await (manager || projectRepo.manager)
      .getRepository(ContractServices)
      .find({
        where: { contractId: project.contract.id },
      });

    if (services.length === 0) return;

    const allCompleted = services.every(
      (s) =>
        s.status === ContractServiceStatus.COMPLETED ||
        s.status === ContractServiceStatus.CANCELLED,
    );

    const hasCompletedService = services.some(
      (s) => s.status === ContractServiceStatus.COMPLETED,
    );

    if (allCompleted && hasCompletedService) {
      project.status = ProjectStatus.COMPLETED;
      project.actualEndDate = new Date();
      await projectRepo.save(project);

      await contractRepo.update(
        { id: project.contract.id },
        { status: ContractStatus.COMPLETED },
      );
    }
  }
}
