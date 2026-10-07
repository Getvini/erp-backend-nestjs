import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, DataSource } from "typeorm";
import { Tasks } from "@modules/project/task/entities/task.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import {
  TaskStatus,
  PerformerType,
} from "@modules/project/task/enums/task-status.enum";
import { NotificationService } from "@modules/communication/services/notification.service";
import {
  assertTaskProjectNotOnHold,
  assertTaskNotLocked,
  isManagementRole,
  isProjectLeadFromTeam,
  TaskActor,
} from "@modules/project/task/helpers/task-security.helper";
import { assertParentDeadlineNotBeforeSubtasks } from "@modules/project/task/helpers/subtask-deadline.helper";
import { TaskAssignmentDto } from "@modules/project/task/dto/task.dto";

@Injectable()
export class TaskAssignmentService {
  constructor(
    @InjectRepository(Tasks)
    private readonly taskRepository: Repository<Tasks>,
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    private readonly notificationService: NotificationService,
    private readonly dataSource: DataSource,
  ) {}

  async bulkAssign(
    taskIds: string[],
    data: TaskAssignmentDto,
    currentUser?: TaskActor,
  ) {
    const actorUserId = currentUser?.userId || currentUser?.id;
    if (!actorUserId)
      throw new UnauthorizedException(
        "Bạn cần đăng nhập để phân công công việc",
      );

    const assignee = await this.userRepository.findOneBy({
      id: data.assigneeId,
    });
    if (!assignee)
      throw new NotFoundException("Không tìm thấy người thực hiện");

    return this.dataSource.transaction(async (manager) => {
      const taskRepo = manager.getRepository(Tasks);
      const tasks = await taskRepo.find({
        where: { id: In(taskIds) },
        relations: [
          "project",
          "project.team",
          "project.team.teamLead",
          "project.team.members",
          "project.team.members.user",
          "project.team.members.roles",
          "subtasks",
        ],
      });

      if (tasks.length === 0)
        throw new NotFoundException("Không tìm thấy công việc để phân công");

      for (const task of tasks) {
        assertTaskProjectNotOnHold(task);
        assertTaskNotLocked(task);

        if (!isManagementRole(currentUser?.role) && task.project) {
          if (!isProjectLeadFromTeam(task.project.team, currentUser)) {
            throw new ForbiddenException(
              "Chỉ Lead dự án hoặc Admin mới được phân công công việc",
            );
          }
        }

        if (data.plannedEndDate && task.subtasks?.length) {
          assertParentDeadlineNotBeforeSubtasks(
            data.plannedEndDate,
            task.subtasks,
            task.name,
          );
        }

        task.assignee = assignee;
        task.assigneeId = assignee.id;
        task.assignerId = actorUserId;
        task.performerType = data.performerType || PerformerType.INTERNAL;
        if (data.plannedStartDate)
          task.plannedStartDate = data.plannedStartDate;
        if (data.plannedEndDate) task.plannedEndDate = data.plannedEndDate;
        if (data.description !== undefined) task.description = data.description;
        if (data.attachments) task.attachments = data.attachments;

        if (
          task.status === TaskStatus.PENDING ||
          task.status === TaskStatus.REJECTED
        ) {
          task.status = TaskStatus.NOT_STARTED;
        }

        await taskRepo.save(task);

        await this.notificationService.createNotification(
          {
            title: "Công việc được phân công",
            content: `Bạn được giao công việc: ${task.nickname || task.name}`,
            type: "TASK_ASSIGNED",
            recipient: assignee,
            relatedEntityId: task.id,
            relatedEntityType: "Task",
            link: `/tasks/${task.id}`,
          },
          manager,
        );
      }

      return {
        message: `Đã phân công ${tasks.length} công việc thành công`,
        tasks,
      };
    });
  }

  async assign(id: string, data: TaskAssignmentDto, currentUser?: TaskActor) {
    const result = await this.bulkAssign([id], data, currentUser);
    return result.tasks[0];
  }

  async bulkUnassign(
    projectId: string,
    taskIds: string[],
    currentUser?: TaskActor,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const taskRepo = manager.getRepository(Tasks);
      const tasks = await taskRepo.find({
        where: { id: In(taskIds), projectId },
        relations: [
          "project",
          "project.team",
          "project.team.teamLead",
          "project.team.members",
        ],
      });

      if (tasks.length === 0)
        throw new NotFoundException(
          "Không tìm thấy công việc để hủy phân công",
        );

      for (const task of tasks) {
        assertTaskProjectNotOnHold(task);
        assertTaskNotLocked(task);

        if (!isManagementRole(currentUser?.role) && task.project) {
          if (!isProjectLeadFromTeam(task.project.team, currentUser)) {
            throw new ForbiddenException(
              "Chỉ Lead dự án hoặc Admin mới được hủy phân công",
            );
          }
        }

        task.assignee = null as any;
        task.assigneeId = null as any;
        task.assignerId = null as any;
        task.status = TaskStatus.PENDING;
        await taskRepo.save(task);
      }

      return {
        message: `Đã hủy phân công ${tasks.length} công việc thành công`,
        unassignedCount: tasks.length,
      };
    });
  }

  async reassign(
    id: string,
    data: { assigneeId: string; performerType?: PerformerType; reason: string },
    currentUser?: TaskActor,
  ) {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: [
        "project",
        "project.team",
        "project.team.teamLead",
        "project.team.members",
      ],
    });

    if (!task) throw new NotFoundException("Không tìm thấy công việc");
    assertTaskProjectNotOnHold(task);
    assertTaskNotLocked(task);

    const newAssignee = await this.userRepository.findOneBy({
      id: data.assigneeId,
    });
    if (!newAssignee)
      throw new NotFoundException("Không tìm thấy người thực hiện mới");

    task.assignee = newAssignee;
    task.assigneeId = newAssignee.id;
    task.performerType = data.performerType || task.performerType || PerformerType.INTERNAL;
    task.reassignNote = data.reason;
    task.status = TaskStatus.NOT_STARTED;
    task.assignerId = currentUser?.userId || currentUser?.id;

    const saved = await this.taskRepository.save(task);

    await this.notificationService.createNotification({
      title: "Chuyển giao công việc",
      content: `Bạn được giao lại công việc: ${task.nickname || task.name}. Lý do: ${data.reason}`,
      type: "TASK_ASSIGNED",
      recipient: newAssignee,
      relatedEntityId: saved.id,
      relatedEntityType: "Task",
      link: `/tasks/${saved.id}`,
    });

    return saved;
  }
}
