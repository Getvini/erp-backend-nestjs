import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, DataSource } from "typeorm";
import { Tasks } from "@modules/project/task/entities/task.entity";
import { TaskStatus } from "@modules/project/task/enums/task-status.enum";
import { NotificationService } from "@modules/communication/services/notification.service";
import {
  assertTaskProjectNotOnHold,
  assertTaskNotLocked,
  TaskActor,
} from "@modules/project/task/helpers/task-security.helper";
import { assertSubtaskPlanApproved } from "@modules/project/task/helpers/subtask-plan.helper";
import { assertParentDeadlineNotBeforeSubtasks } from "@modules/project/task/helpers/subtask-deadline.helper";

@Injectable()
export class TaskStartService {
  constructor(
    @InjectRepository(Tasks)
    private readonly taskRepository: Repository<Tasks>,
    private readonly notificationService: NotificationService,
    private readonly dataSource: DataSource,
  ) {}

  async start(id: string, currentUser?: TaskActor) {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: [
        "project",
        "project.team",
        "project.team.teamLead",
        "project.team.members",
        "project.team.members.user",
        "assignee",
        "helper",
        "assigner",
        "supervisor",
      ],
    });

    if (!task) throw new NotFoundException("Không tìm thấy công việc");
    assertTaskProjectNotOnHold(task);
    await assertSubtaskPlanApproved(
      this.taskRepository,
      task,
      "bắt đầu công việc",
    );
    if (task.status !== TaskStatus.NOT_STARTED) {
      throw new ConflictException(
        "Chỉ có thể bắt đầu công việc đang ở trạng thái Chưa thực hiện",
      );
    }

    const actorUserId = currentUser?.userId || currentUser?.id;
    const isPerformer =
      Boolean(actorUserId) &&
      [task.assigneeId, task.helperId].includes(actorUserId as string);
    if (!isPerformer) {
      throw new ForbiddenException(
        "Chỉ người được giao công việc mới có thể bắt đầu",
      );
    }

    task.status = TaskStatus.DOING;
    task.actualStartDate = new Date();
    const saved = await this.taskRepository.save(task);

    await this.notificationService.createNotification({
      title: "Công việc đã bắt đầu",
      content: `${task.assignee?.fullName || "Người thực hiện"} đã bắt đầu công việc: ${task.nickname || task.name}`,
      type: "TASK_STARTED",
      recipient: task.assigner || task.supervisor,
      relatedEntityId: saved.id,
      relatedEntityType: "Task",
      link: `/tasks/${saved.id}`,
    });

    return saved;
  }

  async bulkStart(
    projectId: string,
    taskIds: string[],
    currentUser?: TaskActor,
  ) {
    const actorUserId = currentUser?.userId || currentUser?.id;
    if (!actorUserId)
      throw new UnauthorizedException("Bạn cần đăng nhập để bắt đầu công việc");

    return this.dataSource.transaction(async (manager) => {
      const taskRepo = manager.getRepository(Tasks);
      const tasks = await taskRepo.find({
        where: { id: In(taskIds), projectId },
        relations: ["project", "assignee", "helper"],
      });

      if (tasks.length === 0) {
        throw new NotFoundException(
          "Không tìm thấy công việc hợp lệ để bắt đầu",
        );
      }

      for (const task of tasks) {
        assertTaskProjectNotOnHold(task);
        if (task.status === TaskStatus.NOT_STARTED) {
          const isPerformer = [task.assigneeId, task.helperId].includes(
            actorUserId,
          );
          if (isPerformer) {
            task.status = TaskStatus.DOING;
            task.actualStartDate = new Date();
            await taskRepo.save(task);
          }
        }
      }

      return {
        message: `Đã bắt đầu ${tasks.length} công việc thành công`,
        startedCount: tasks.length,
      };
    });
  }

  async updateNickname(
    id: string,
    nickname: string | null | undefined,
    _currentUser?: TaskActor,
  ) {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ["project"],
    });
    if (!task) throw new NotFoundException("Không tìm thấy công việc");
    assertTaskProjectNotOnHold(task);

    task.nickname = nickname?.trim() || null;
    return this.taskRepository.save(task);
  }

  async update(
    id: string,
    data: Partial<Tasks> & { assigneeId?: string },
    _currentUser?: TaskActor,
  ) {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ["project", "subtasks"],
    });
    if (!task) throw new NotFoundException("Không tìm thấy công việc");
    assertTaskNotLocked(task);

    if (data.plannedEndDate && task.subtasks?.length) {
      assertParentDeadlineNotBeforeSubtasks(
        data.plannedEndDate,
        task.subtasks,
        task.name,
      );
    }

    Object.assign(task, data);
    return this.taskRepository.save(task);
  }
}
