import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Tasks } from "@modules/project/task/entities/task.entity";
import { TaskIterations } from "@modules/project/task/entities/task-iteration.entity";
import { TaskStatus } from "@modules/project/task/enums/task-status.enum";
import { NotificationService } from "@modules/communication/services/notification.service";
import {
  assertTaskProjectNotOnHold,
  TaskActor,
} from "@modules/project/task/helpers/task-security.helper";
import { assertSubtasksCompleted } from "@modules/project/task/helpers/subtask-plan.helper";

@Injectable()
export class TaskResultService {
  constructor(
    @InjectRepository(Tasks)
    private readonly taskRepository: Repository<Tasks>,
    @InjectRepository(TaskIterations)
    private readonly iterationRepository: Repository<TaskIterations>,
    private readonly notificationService: NotificationService,
  ) {}

  async submitResult(id: string, data: any, currentUser?: TaskActor) {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: [
        "project",
        "project.team",
        "project.team.teamLead",
        "iterations",
        "assignee",
        "helper",
      ],
    });

    if (!task) throw new NotFoundException("Không tìm thấy công việc");
    assertTaskProjectNotOnHold(task);
    await assertSubtasksCompleted(this.taskRepository, task, "nộp kết quả");

    const actorUserId = currentUser?.userId || currentUser?.id;
    task.result = data.result;
    task.lastSubmittedById = actorUserId || null;

    if (!data.draft) {
      task.status = TaskStatus.AWAITING_REVIEW;
      const nextVersion = (task.iterations?.length || 0) + 1;

      const iteration = this.iterationRepository.create({
        taskId: task.id,
        version: nextVersion,
        submittedResult: data.result,
        submittedById: actorUserId || undefined,
        confirmedSpellErrors: [],
        confirmedQcMismatches: [],
      });
      await this.iterationRepository.save(iteration);

      if (task.project?.team?.teamLead) {
        await this.notificationService.createNotification({
          title: "Công việc chờ duyệt",
          content: `${task.assignee?.fullName || "Nhân viên"} đã nộp kết quả công việc: ${task.nickname || task.name}`,
          type: "TASK_REVIEW",
          recipient: task.project.team.teamLead,
          relatedEntityId: task.id,
          relatedEntityType: "Task",
          link: `/tasks/${task.id}`,
        });
      }
    }

    delete (task as any).iterations;
    return this.taskRepository.save(task);
  }

  async submitSavedResultForReview(id: string, currentUser?: TaskActor) {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: [
        "project",
        "project.team",
        "project.team.teamLead",
        "iterations",
        "assignee",
      ],
    });

    if (!task) throw new NotFoundException("Không tìm thấy công việc");
    if (!task.result)
      throw new BadRequestException("Chưa có kết quả lưu tạm để gửi duyệt");
    assertTaskProjectNotOnHold(task);

    return this.submitResult(
      id,
      { result: task.result, draft: false },
      currentUser,
    );
  }

  async requestRework(
    id: string,
    data: { feedback?: string; reason?: string },
    _currentUser?: TaskActor,
  ) {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ["project", "assignee"],
    });

    if (!task) throw new NotFoundException("Không tìm thấy công việc");
    assertTaskProjectNotOnHold(task);

    task.status = TaskStatus.REWORKING;
    task.reviewNote = data.feedback || data.reason || "Yêu cầu làm lại";
    const saved = await this.taskRepository.save(task);

    if (task.assignee) {
      await this.notificationService.createNotification({
        title: "Yêu cầu làm lại công việc",
        content: `Công việc ${task.nickname || task.name} cần chỉnh sửa lại. Ghi chú: ${task.reviewNote}`,
        type: "TASK_REWORK",
        recipient: task.assignee,
        relatedEntityId: task.id,
        relatedEntityType: "Task",
        link: `/tasks/${task.id}`,
      });
    }

    return saved;
  }

  async approveByCustomer(id: string, _currentUser?: TaskActor) {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ["project"],
    });
    if (!task) throw new NotFoundException("Không tìm thấy công việc");
    assertTaskProjectNotOnHold(task);

    task.customerDecision = "APPROVED";
    return this.taskRepository.save(task);
  }

  async customerDoesNotPurchase(id: string, _currentUser?: TaskActor) {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ["project"],
    });
    if (!task) throw new NotFoundException("Không tìm thấy công việc");
    assertTaskProjectNotOnHold(task);

    task.customerDecision = "NOT_PURCHASED";
    return this.taskRepository.save(task);
  }
}
