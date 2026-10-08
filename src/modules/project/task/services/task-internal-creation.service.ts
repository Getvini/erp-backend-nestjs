import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between, IsNull } from "typeorm";
import { Tasks } from "@modules/project/task/entities/task.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import { TaskStatus } from "@modules/project/task/enums/task-status.enum";
import { TaskActor } from "@modules/project/task/helpers/task-security.helper";
import { NotificationService } from "@modules/communication/services/notification.service";
import { CreateInternalTaskDto } from "@modules/project/task/dto/task.dto";

import { StringHelper } from "@core/helpers/string.helper";

@Injectable()
export class TaskInternalCreationService {
  constructor(
    @InjectRepository(Tasks)
    private readonly taskRepository: Repository<Tasks>,
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    private readonly notificationService: NotificationService,
  ) {}

  async createInternalTask(
    data: CreateInternalTaskDto,
    currentUser?: TaskActor,
  ) {
    const assignee = await this.userRepository.findOneBy({
      id: data.assigneeId,
    });
    if (!assignee)
      throw new NotFoundException("Không tìm thấy người thực hiện");

    const supervisor = await this.userRepository.findOneBy({
      id: data.supervisorId,
    });
    if (!supervisor)
      throw new NotFoundException("Không tìm thấy người giám sát");

    const initials = StringHelper.getInitials(assignee.fullName);
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, "0");

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    const internalTaskCount = await this.taskRepository.count({
      where: {
        projectId: IsNull(),
        createdAt: Between(startOfMonth, endOfMonth),
      },
    });

    const sequence = (internalTaskCount + 1).toString().padStart(2, "0");
    const taskCode = `CVK-${initials}-${year}-${month}-${sequence}`;
    const assignerId = currentUser?.userId || currentUser?.id;

    const task = this.taskRepository.create({
      code: taskCode,
      name: data.name,
      assignee,
      supervisor,
      status: TaskStatus.NOT_STARTED,
      plannedStartDate: data.plannedStartDate,
      plannedEndDate: data.plannedEndDate,
      description: data.description,
      attachments: data.attachments,
      assignerId,
    });

    const savedTask = await this.taskRepository.save(task);

    await this.notificationService.createNotification({
      title: "Công việc nội bộ mới",
      content: `Bạn được giao công việc nội bộ: ${task.nickname || task.name} (Mã: ${task.code})`,
      type: "TASK_ASSIGNED",
      recipient: assignee,
      relatedEntityId: savedTask.id,
      relatedEntityType: "Task",
      link: `/tasks/${savedTask.id}`,
    });

    return savedTask;
  }
}
