import { ConflictException } from "@nestjs/common";
import { Repository } from "typeorm";
import { SubtaskPlanStatus, TaskStatus } from "@modules/project/task/enums/task-status.enum";
import { Tasks } from "@modules/project/task/entities/task.entity";

export const SUBTASK_PM_APPROVAL_ENABLED = false;

export const completedSubtaskStatuses = [
  TaskStatus.INTERNAL_COMPLETED,
  TaskStatus.COMPLETED,
  TaskStatus.ACCEPTED,
];

export const assertSubtaskPlanApproved = async (
  taskRepository: Repository<Tasks>,
  task: Pick<Tasks, "parentTaskId">,
  action: string,
) => {
  if (!SUBTASK_PM_APPROVAL_ENABLED) return;
  if (!task.parentTaskId) return;

  const parent = await taskRepository.findOne({
    where: { id: task.parentTaskId },
    select: { id: true, subtaskPlanStatus: true },
  });
  if (!parent?.subtaskPlanStatus) return;
  if (parent.subtaskPlanStatus !== SubtaskPlanStatus.APPROVED) {
    throw new ConflictException(
      `Không thể ${action} trước khi PM duyệt phương án chia subtask`,
    );
  }
};

export const assertSubtasksCompleted = async (
  taskRepository: Repository<Tasks>,
  task: Pick<Tasks, "id" | "parentTaskId">,
  action: string,
) => {
  if (task.parentTaskId) return;

  const subtasks = await taskRepository.find({
    where: { parentTaskId: task.id },
    select: ["id", "name", "status"],
  });
  const incompleteSubtasks = subtasks.filter(
    (subtask) => !completedSubtaskStatuses.includes(subtask.status),
  );

  if (incompleteSubtasks.length === 0) return;

  const displayedNames = incompleteSubtasks
    .slice(0, 3)
    .map((subtask) => subtask.name)
    .join(", ");
  const remainingCount = incompleteSubtasks.length - 3;
  const suffix = remainingCount > 0 ? ` và ${remainingCount} subtask khác` : "";

  throw new ConflictException(
    `Không thể ${action} task chính khi còn ${incompleteSubtasks.length} subtask chưa hoàn tất: ${displayedNames}${suffix}`,
  );
};
