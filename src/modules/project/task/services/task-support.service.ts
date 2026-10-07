import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Tasks } from "@modules/project/task/entities/task.entity";
import { TaskStatus } from "@modules/project/task/enums/task-status.enum";
import { NotificationService } from "@modules/communication/services/notification.service";
import {
  assertTaskProjectNotOnHold,
  isManagementRole,
  isProjectOperatorFromTeam,
  TaskActor,
} from "@modules/project/task/helpers/task-security.helper";

@Injectable()
export class TaskSupportService {
  constructor(
    @InjectRepository(Tasks)
    private readonly taskRepository: Repository<Tasks>,
    private readonly notificationService: NotificationService,
  ) {}

  async requestSupport(id: string, note: string) {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ["project", "project.team", "project.team.teamLead"],
    });

    if (!task) throw new NotFoundException("Không tìm thấy công việc");
    assertTaskProjectNotOnHold(task);

    const supportableStatuses = [
      TaskStatus.DOING,
      TaskStatus.REWORKING,
      TaskStatus.OVERDUE,
    ];
    if (!supportableStatuses.includes(task.status)) {
      throw new ConflictException(
        "Công việc phải được bắt đầu trước khi yêu cầu hỗ trợ",
      );
    }

    task.isSupportRequested = true;
    task.supportRequestNote = note;
    task.supportRequestType = "EXECUTION";
    task.status = TaskStatus.AWAITING_SUPPORT;

    const saved = await this.taskRepository.save(task);

    if (task.project?.team?.teamLead) {
      await this.notificationService.createNotification({
        title: "Yêu cầu hỗ trợ công việc",
        content: `Nhân viên yêu cầu hỗ trợ cho: ${task.nickname || task.name}. Lý do: ${note}`,
        type: "TASK_REVIEW",
        recipient: task.project.team.teamLead,
        relatedEntityId: task.id,
        relatedEntityType: "Task",
        link: `/tasks/${task.id}`,
      });
    }

    return saved;
  }

  async sendReminder(id: string, currentUser?: TaskActor) {
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
      ],
    });

    if (!task) throw new NotFoundException("Không tìm thấy công việc");
    assertTaskProjectNotOnHold(task);

    const canSendReminder =
      isManagementRole(currentUser?.role) ||
      isProjectOperatorFromTeam(task.project?.team, currentUser);
    if (!canSendReminder) {
      throw new ForbiddenException(
        "Bạn không có quyền nhắc việc trong dự án này",
      );
    }

    const performer = task.helper || task.assignee;
    if (!performer) {
      throw new BadRequestException(
        "Công việc chưa có người thực hiện để nhắc nhở",
      );
    }

    await this.notificationService.createNotification({
      title: "Nhắc nhở tiến độ công việc",
      content: `Lời nhắc kiểm tra tiến độ cho công việc: ${task.nickname || task.name}`,
      type: "TASK_ASSIGNED",
      recipient: performer,
      relatedEntityId: task.id,
      relatedEntityType: "Task",
      link: `/tasks/${task.id}`,
    });

    return { message: "Đã gửi thông báo nhắc nhở thành công" };
  }
}
