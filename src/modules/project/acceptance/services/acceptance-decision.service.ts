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
import {
  AcceptanceActor,
  assertAcceptanceActor,
  assertSubtaskPlansApproved,
  getLockedRequest,
} from "../helpers/acceptance-validation.helper";

@Injectable()
export class AcceptanceDecisionService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly rewardService: AcceptanceRewardService,
    private readonly notificationService: NotificationService,
  ) {}

  async approveRequest(
    requestId: string,
    actor: AcceptanceActor,
    feedback?: string,
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
            `Dự án "${request.project.name}" đã hoàn tất hoặc đã đóng, không thể duyệt nghiệm thu`,
          );
        }
        if (
          request.project.status === ProjectStatus.ON_HOLD ||
          Boolean(request.project.isOnHold)
        ) {
          throw new ConflictException(
            `Dự án "${request.project.name}" đang tạm dừng, không thể duyệt nghiệm thu`,
          );
        }
      }

      request.status = AcceptanceStatus.APPROVED;
      request.approver = approver;
      request.approverId = approver.id;
      request.feedback = feedback || "";
      await manager.save(request);

      for (const service of request.services) {
        const tasks = await manager.getRepository(Tasks).find({
          where: { contractServiceId: service.id },
        });
        assertSubtaskPlansApproved(tasks);

        if (service.results) {
          service.results = service.results.map((result) => {
            const belongsToCurrent =
              result.acceptanceRequestId === request.id ||
              !result.acceptanceRequestId;
            if (!belongsToCurrent) return result;
            return {
              ...result,
              status: "APPROVED",
              acceptanceRequestId: request.id,
            };
          });
        }
        service.status = ContractServiceStatus.COMPLETED;
        await manager.save(service);

        await manager.update(
          Tasks,
          { contractServiceId: service.id },
          { status: TaskStatus.ACCEPTED, actualEndDate: new Date() },
        );

        service.tasks = tasks;
        await this.rewardService.triggerRewards(service, manager);
      }

      if (request.projectId) {
        await this.rewardService.syncProjectCompletionStatus(
          request.projectId,
          manager,
        );
      }

      await this.notificationService.createNotification(
        {
          title: "Yêu cầu nghiệm thu được DUYỆT",
          content: `Đợt nghiệm thu "${request.name}" đã được duyệt.`,
          type: "ACCEPTANCE_APPROVED",
          recipient: request.requester,
          relatedEntityId: request.id,
          relatedEntityType: "AcceptanceRequest",
        },
        manager,
      );

      return request;
    });
  }

  async rejectRequest(
    requestId: string,
    actor: AcceptanceActor,
    feedback: string,
  ) {
    const approverId = assertAcceptanceActor(actor);
    if (!feedback) throw new BadRequestException("Vui lòng nhập lý do từ chối");

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
            `Dự án "${request.project.name}" đã hoàn tất hoặc đã đóng, không thể từ chối nghiệm thu`,
          );
        }
        if (
          request.project.status === ProjectStatus.ON_HOLD ||
          Boolean(request.project.isOnHold)
        ) {
          throw new ConflictException(
            `Dự án "${request.project.name}" đang tạm dừng, không thể từ chối nghiệm thu`,
          );
        }
      }

      request.status = AcceptanceStatus.REJECTED;
      request.approver = approver;
      request.approverId = approver.id;
      request.feedback = feedback;
      await manager.save(request);

      for (const service of request.services) {
        if (service.results) {
          service.results = service.results.map((result) => {
            const belongsToCurrent =
              result.acceptanceRequestId === request.id ||
              !result.acceptanceRequestId;
            if (!belongsToCurrent) return result;
            return {
              ...result,
              status: "REJECTED",
              feedback,
              acceptanceRequestId: request.id,
            };
          });
        }
        service.status = ContractServiceStatus.ACCEPTANCE_REJECTED;
        service.feedback = feedback;
        await manager.save(service);

        await manager.update(
          Tasks,
          { contractServiceId: service.id },
          { status: TaskStatus.DOING },
        );
      }

      await this.notificationService.createNotification(
        {
          title: "Yêu cầu nghiệm thu bị từ chối",
          content: `Đợt nghiệm thu "${request.name}" của dự án ${request.project?.name} bị từ chối. Lý do: ${feedback}`,
          type: "ACCEPTANCE_REJECTED",
          recipient: request.requester,
          relatedEntityId: request.id,
          relatedEntityType: "AcceptanceRequest",
          link: `/acceptance`,
        },
        manager,
      );

      return request;
    });
  }
}
