import {
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { EntityManager } from "typeorm";
import { AcceptanceRequests } from "../entities/acceptance-request.entity";
import { AcceptanceStatus } from "../enums/acceptance.enum";
import { Tasks } from "../../task/entities/task.entity";
import { SubtaskPlanStatus } from "../../task/enums/task-status.enum";
import { isAcceptanceApprover } from "./acceptance-permission.helper";

export type AcceptanceActor = {
  id?: string;
  userId?: string;
  role?: string;
  username?: string;
};

export function assertAcceptanceActor(actor?: AcceptanceActor): string {
  const userId = actor?.userId || actor?.id;
  if (!userId) {
    throw new UnauthorizedException(
      "Bạn cần đăng nhập bằng tài khoản nhân sự để nghiệm thu",
    );
  }
  if (!isAcceptanceApprover(actor?.role)) {
    throw new ForbiddenException(
      "Bạn chỉ có quyền xem, không có quyền duyệt nghiệm thu",
    );
  }
  return userId;
}

export function assertSubtaskPlansApproved(tasks: Tasks[] = []) {
  const parentTaskIds = new Set(
    tasks.map((task) => task.parentTaskId).filter(Boolean) as string[],
  );
  const blockedParent = tasks.find(
    (task) =>
      parentTaskIds.has(task.id) &&
      task.subtaskPlanStatus &&
      task.subtaskPlanStatus !== SubtaskPlanStatus.APPROVED,
  );
  if (blockedParent) {
    throw new ConflictException(
      `Phương án chia subtask của công việc ${blockedParent.nickname || blockedParent.name} chưa được PM duyệt`,
    );
  }
}

export async function getLockedRequest(
  manager: EntityManager,
  requestId: string,
  relations: string[],
): Promise<AcceptanceRequests> {
  const locked = await manager
    .createQueryBuilder(AcceptanceRequests, "request")
    .select("request.id")
    .where("request.id = :requestId", { requestId })
    .setLock("pessimistic_write")
    .getOne();

  if (!locked) {
    throw new NotFoundException("Không tìm thấy yêu cầu nghiệm thu");
  }

  const request = await manager.getRepository(AcceptanceRequests).findOne({
    where: { id: requestId },
    relations,
  });

  if (!request) {
    throw new NotFoundException("Không tìm thấy yêu cầu nghiệm thu");
  }
  if (request.status !== AcceptanceStatus.PENDING) {
    throw new ConflictException("Yêu cầu này đã được xử lý");
  }
  return request;
}
