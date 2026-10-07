import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { DataSource } from "typeorm";
import { Users } from "../../../identity/user/entities/user.entity";
import { ProjectStatus } from "../../project-core/enums/project-status.enum";
import { Tasks } from "../../task/entities/task.entity";
import { TaskStatus } from "../../task/enums/task-status.enum";
import {
  AcceptanceStatus,
  ContractServiceStatus,
} from "../enums/acceptance.enum";
import { NotificationService } from "../../../communication/services/notification.service";
import { AcceptanceRewardService } from "./acceptance-reward.service";
import { ProcessAcceptanceDecisionDto } from "../dto/acceptance.dto";
import {
  AcceptanceActor,
  assertAcceptanceActor,
  assertSubtaskPlansApproved,
  getLockedRequest,
} from "../helpers/acceptance-validation.helper";

@Injectable()
export class AcceptanceProcessService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly rewardService: AcceptanceRewardService,
    private readonly notificationService: NotificationService,
  ) {}

  async processRequest(
    requestId: string,
    actor: AcceptanceActor,
    decisions: ProcessAcceptanceDecisionDto[],
  ) {
    const approverId = assertAcceptanceActor(actor);

    return this.dataSource.transaction(async (manager) => {
      const request = await getLockedRequest(manager, requestId, [
        "services",
        "requester",
        "project",
      ]);

      const approver = await manager
        .getRepository(Users)
        .findOneBy({ id: approverId });
      if (!approver) throw new NotFoundException("Người duyệt không tồn tại");

      if (request.project) {
        if (
          [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED].includes(
            request.project.status,
          )
        ) {
          throw new BadRequestException(
            `Dự án "${request.project.name}" đã hoàn tất hoặc đã đóng, không thể xử lý nghiệm thu`,
          );
        }
        if (
          request.project.status === ProjectStatus.ON_HOLD ||
          Boolean(request.project.isOnHold)
        ) {
          throw new ConflictException(
            `Dự án "${request.project.name}" đang tạm dừng, không thể xử lý nghiệm thu`,
          );
        }
      }

      let anyRejectedGlobal = false;

      for (const decision of decisions) {
        const service = request.services.find(
          (s) => s.id === decision.serviceId,
        );
        if (!service) continue;

        const resultDecisions = decision.resultDecisions || [];

        if (resultDecisions.length > 0) {
          if (service.results) {
            for (const rd of resultDecisions) {
              const resultsArray = [...service.results].reverse();
              const result = resultsArray.find((r) => r.taskId === rd.taskId);

              if (result) {
                result.status = rd.status;
                result.feedback = rd.feedback;
                result.acceptanceRequestId = request.id;

                if (rd.status === "REJECTED") {
                  const task = await manager
                    .getRepository(Tasks)
                    .findOneBy({ id: rd.taskId });
                  if (task) {
                    task.status = TaskStatus.REWORKING;
                    task.reviewNote =
                      rd.feedback ||
                      "Khách hàng yêu cầu sửa lại (Nghiệm thu bị từ chối)";
                    task.actualEndDate = null;
                    await manager.save(task);

                    if (task.assigneeId) {
                      const assignee = await manager
                        .getRepository(Users)
                        .findOneBy({ id: task.assigneeId });
                      if (assignee) {
                        await this.notificationService.createNotification(
                          {
                            title: "Yêu cầu sửa lại (Rework)",
                            content: `Công việc "${task.nickname || task.name}" của dự án ${request.project?.name} bị từ chối nghiệm thu. Lý do: ${task.reviewNote}`,
                            type: "TASK_REJECTED",
                            recipient: assignee,
                            relatedEntityId: task.id.toString(),
                            relatedEntityType: "Task",
                            link: `/tasks/${task.id}`,
                          },
                          manager,
                        );
                      }
                    }
                  }
                } else if (rd.status === "APPROVED") {
                  await manager.update(
                    Tasks,
                    { id: rd.taskId },
                    { status: TaskStatus.ACCEPTED, actualEndDate: new Date() },
                  );
                }
              }
            }
          }
        } else {
          if (service.results) {
            service.results = service.results.map((r) => {
              const belongsToCurrent =
                r.acceptanceRequestId === request.id || !r.acceptanceRequestId;
              if (!belongsToCurrent) return r;
              return {
                ...r,
                status: decision.status,
                feedback: decision.feedback,
                acceptanceRequestId: request.id,
              };
            });
          }
        }

        const latestResultsMap = new Map();
        if (service.results) {
          for (const r of service.results) {
            latestResultsMap.set(r.taskId, r);
          }
        }
        const latestResults = Array.from(latestResultsMap.values()) as any[];

        const allApproved =
          latestResults.length > 0 &&
          latestResults.every((r) => r.status === "APPROVED");
        const anyRejected = latestResults.some((r) => r.status === "REJECTED");

        if (allApproved) {
          const tasks = await manager.getRepository(Tasks).find({
            where: { contractServiceId: service.id },
          });
          assertSubtaskPlansApproved(tasks);

          service.status = ContractServiceStatus.COMPLETED;
          service.feedback = null as any;

          await manager.update(
            Tasks,
            { contractServiceId: service.id },
            { status: TaskStatus.ACCEPTED, actualEndDate: new Date() },
          );

          service.tasks = tasks;
          await this.rewardService.triggerRewards(service, manager);
        } else if (anyRejected) {
          service.status = ContractServiceStatus.ACCEPTANCE_REJECTED;
          service.feedback = decision.feedback || "Một số kết quả bị từ chối";
          anyRejectedGlobal = true;
        } else {
          service.status = ContractServiceStatus.AWAITING_ACCEPTANCE;
        }

        await manager.save(service);
      }

      if (request.projectId) {
        await this.rewardService.syncProjectCompletionStatus(
          request.projectId,
          manager,
        );
      }

      request.status = AcceptanceStatus.PROCESSED;
      request.approver = approver;
      request.approverId = approver.id;
      await manager.save(request);

      await this.notificationService.createNotification(
        {
          title: "Kết quả nghiệm thu",
          content: `Yêu cầu nghiệm thu "${request.name}" của dự án ${request.project?.name} đã được xử lý.`,
          type: anyRejectedGlobal
            ? "ACCEPTANCE_REJECTED"
            : "ACCEPTANCE_APPROVED",
          recipient: request.requester,
          relatedEntityId: request.id,
          relatedEntityType: "AcceptanceRequest",
          link: `/acceptance/${request.id}`,
        },
        manager,
      );

      return request;
    });
  }
}
