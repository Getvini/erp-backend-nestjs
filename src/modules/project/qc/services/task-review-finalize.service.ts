import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { DataSource } from "typeorm";
import { TaskReviews } from "../entities/task-review.entity";
import { Tasks } from "../../task/entities/task.entity";
import { TaskStatus } from "../../task/enums/task-status.enum";
import { canDecideTaskOutcome } from "../helpers/task-outcome-auth.helper";
import { assertSubtasksCompleted } from "../helpers/subtask-completion.helper";
import { NotificationService } from "../../../communication/services/notification.service";

type ReviewActor = { id?: string; userId?: string; role?: string };

@Injectable()
export class TaskReviewFinalizeService {
  constructor(
    private readonly dataSource: DataSource,
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

  async checkAndFinalize(
    taskId: string,
    passedCriteriaIds?: string[],
    reviewNote?: string,
    currentUser?: ReviewActor,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const task = await manager.getRepository(Tasks).findOne({
        where: { id: taskId },
        relations: [
          "assignee",
          "helper",
          "assigner",
          "project",
          "project.team",
          "project.team.teamLead",
          "project.team.members",
          "opportunityServiceJob",
        ],
      });
      if (!task) throw new NotFoundException("Không tìm thấy công việc");
      this.assertCanReviewTask(task, currentUser);

      if (task.status !== TaskStatus.AWAITING_REVIEW) {
        throw new ConflictException(
          `Công việc đang ở trạng thái ${task.status}, không thể thực hiện phê duyệt.`,
        );
      }

      const reviewRepo = manager.getRepository(TaskReviews);
      const reviews = await reviewRepo.find({
        where: { taskId },
      });

      if (passedCriteriaIds) {
        for (const review of reviews) {
          review.isPassed = passedCriteriaIds.includes(review.id);
        }
        await reviewRepo.save(reviews);
      }

      const allPassed =
        reviews.length === 0 || reviews.every((r) => r.isPassed);

      if (!allPassed) {
        if (reviewNote) {
          task.reviewNote = reviewNote;
          await manager.save(task);
        }
        return {
          finalized: false,
          message:
            "Đã cập nhật tiêu chí đánh giá nhưng chưa đủ điều kiện hoàn tất",
        };
      }

      await assertSubtasksCompleted(
        manager.getRepository(Tasks),
        task,
        "duyệt hoàn thành",
      );

      task.status = TaskStatus.INTERNAL_COMPLETED;
      task.actualEndDate = new Date();
      if (reviewNote) task.reviewNote = reviewNote;
      await manager.save(task);

      if (task.assignee?.id) {
        await this.notificationService.create({
          userId: task.assignee.id,
          title: "Công việc đã được duyệt",
          content: `Công việc "${task.nickname || task.name || task.code}" của dự án ${task.project?.name || ""} đã được duyệt nội bộ.`,
          type: "TASK_COMPLETED",
          link: `/tasks/${task.id}`,
        });
      }

      return {
        finalized: true,
        message: "Đã hoàn tất duyệt nội bộ công việc",
      };
    });
  }
}
