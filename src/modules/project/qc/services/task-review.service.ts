import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TaskReviews } from "@modules/project/qc/entities/task-review.entity";
import { Tasks } from "@modules/project/task/entities/task.entity";
import { TaskStatus } from "@modules/project/task/enums/task-status.enum";
import { ReviewerType } from "@modules/project/qc/enums/qc.enum";
import { canDecideTaskOutcome } from "@modules/project/qc/helpers/task-outcome-auth.helper";
import { NotificationService } from "@modules/communication/services/notification.service";

type ReviewActor = { id?: string; userId?: string; role?: string };

@Injectable()
export class TaskReviewService {
  constructor(
    @InjectRepository(TaskReviews)
    private readonly reviewRepository: Repository<TaskReviews>,
    @InjectRepository(Tasks)
    private readonly taskRepository: Repository<Tasks>,
    private readonly notificationService: NotificationService,
  ) {}

  private getActorUserId(actor?: ReviewActor) {
    return actor?.userId || actor?.id;
  }

  private assertCanReviewTask(task: Tasks, actor?: ReviewActor) {
    const actorUserId = this.getActorUserId(actor);
    const canReview = canDecideTaskOutcome(task as any, actorUserId);
    if (!canReview) {
      throw new ForbiddenException(
        "Bạn không có quyền duyệt công việc trong dự án này",
      );
    }
  }

  async getTaskReviews(taskId: string) {
    return this.reviewRepository.find({
      where: { taskId },
      relations: ["criteria"],
    });
  }

  async initializeReviews(taskId: string, forcePass: boolean = false) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: [
        "job",
        "job.criteria",
        "project",
        "project.team",
        "project.team.teamLead",
        "assigner",
      ],
    });

    if (!task) throw new NotFoundException("Không tìm thấy công việc");
    if (!task.job || !task.job.criteria) return [];

    await this.reviewRepository.delete({ taskId });

    task.reviewNote = "";
    await this.taskRepository.save(task);

    const lead = task.project?.team?.teamLead;
    const assigner = task.assigner;

    const definitions: { userId: string; type: ReviewerType }[] = [];
    if (lead?.id) {
      definitions.push({ userId: lead.id, type: ReviewerType.TEAM_LEAD });
    } else if (assigner?.id) {
      definitions.push({ userId: assigner.id, type: ReviewerType.ASSIGNER });
    }

    const reviews: TaskReviews[] = [];
    for (const def of definitions) {
      for (const c of task.job.criteria) {
        reviews.push(
          this.reviewRepository.create({
            taskId,
            criteriaId: c.id,
            isPassed: forcePass,
            reviewerId: def.userId,
            reviewerType: def.type,
          }),
        );
      }
    }
    return this.reviewRepository.save(reviews);
  }

  async toggleCriteria(
    reviewId: string,
    isPassed: boolean,
    note?: string,
    currentUser?: ReviewActor,
  ) {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
      relations: ["task", "task.project", "task.project.team"],
    });

    if (!review) throw new NotFoundException("Không tìm thấy mục đánh giá");
    if (review.task) this.assertCanReviewTask(review.task, currentUser);

    if (review.task) {
      const reviewableStatuses = [
        TaskStatus.AWAITING_REVIEW,
        TaskStatus.DOING,
        TaskStatus.AWAITING_ACCEPTANCE,
      ];
      if (!reviewableStatuses.includes(review.task.status)) {
        throw new ConflictException(
          `Công việc đang ở trạng thái ${review.task.status}, không thể cập nhật đánh giá.`,
        );
      }
    }

    review.isPassed = isPassed;
    if (note !== undefined) review.note = note;
    return this.reviewRepository.save(review);
  }

  async reject(taskId: string, note: string, currentUser?: ReviewActor) {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ["project", "project.team", "assignee"],
    });
    if (!task) throw new NotFoundException("Không tìm thấy công việc");
    this.assertCanReviewTask(task, currentUser);

    task.status = TaskStatus.DOING;
    task.reviewNote = note;
    await this.taskRepository.save(task);

    if (task.assignee?.id) {
      await this.notificationService.create({
        userId: task.assignee.id,
        title: "Công việc bị từ chối duyệt",
        content: `Công việc "${task.name}" đã bị từ chối duyệt. Lý do: ${note}`,
        type: "TASK",
        link: `/tasks/${task.id}`,
      });
    }
    return task;
  }
}
