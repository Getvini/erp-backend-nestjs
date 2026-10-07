import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Project } from "@modules/project/project-core/entities/project.entity";
import { ProjectPauseRequest } from "@modules/project/project-core/entities/project-pause-request.entity";
import { ProjectStatus } from "@modules/project/project-core/enums/project-status.enum";
import { PauseRequestStatus, PauseMode } from "@modules/project/project-core/enums/pause-request.enum";
import { UserRole } from "@modules/identity/user/enums/user-role.enum";

type ActorInfo = { id?: string; userId?: string; role?: string };

@Injectable()
export class ProjectPauseService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectPauseRequest)
    private readonly pauseRequestRepository: Repository<ProjectPauseRequest>,
  ) {}

  private isManagement(role?: string): boolean {
    return [UserRole.BOD, UserRole.ADMIN, UserRole.ADMIN_SALE].includes(
      role as UserRole,
    );
  }

  async requestPause(id: string, reason: string, actor?: ActorInfo) {
    if (!reason?.trim()) {
      throw new BadRequestException("Vui lòng nhập lý do tạm dừng dự án");
    }

    const project = await this.projectRepository.findOneBy({ id });
    if (!project) throw new NotFoundException("Không tìm thấy dự án");

    if (project.isOnHold) {
      throw new BadRequestException("Dự án hiện đã ở trạng thái tạm dừng");
    }

    const userId = actor?.userId || actor?.id;
    const reqObj = this.pauseRequestRepository.create({
      project,
      projectId: project.id,
      requesterId: userId,
      requesterRole: actor?.role || "USER",
      pauseMode: PauseMode.REQUEST,
      reason: reason.trim(),
      status: PauseRequestStatus.PENDING,
      requestedAt: new Date(),
    });

    const savedReq = await this.pauseRequestRepository.save(reqObj);

    project.status = ProjectStatus.PENDING_PAUSE_APPROVAL;
    project.currentPauseRequestId = savedReq.id;
    await this.projectRepository.save(project);

    return savedReq;
  }

  async pauseDirect(id: string, reason: string, actor?: ActorInfo) {
    if (!this.isManagement(actor?.role)) {
      throw new ForbiddenException(
        "Chỉ BOD/ADMIN mới có quyền tạm dừng trực tiếp",
      );
    }

    const project = await this.projectRepository.findOneBy({ id });
    if (!project) throw new NotFoundException("Không tìm thấy dự án");

    const now = new Date();
    const autoAccept = new Date(now.getTime() + 37 * 24 * 60 * 60 * 1000);
    const userId = actor?.userId || actor?.id;

    const reqObj = this.pauseRequestRepository.create({
      project,
      projectId: project.id,
      requesterId: userId,
      requesterRole: actor?.role || "ADMIN",
      approverId: userId,
      pauseMode: PauseMode.DIRECT,
      reason: reason.trim(),
      status: PauseRequestStatus.APPROVED,
      requestedAt: now,
      approvedAt: now,
      autoAcceptAt: autoAccept,
    });

    const savedReq = await this.pauseRequestRepository.save(reqObj);

    project.status = ProjectStatus.ON_HOLD;
    project.isOnHold = true;
    project.pausedAt = now;
    project.pausedById = userId;
    project.autoAcceptAt = autoAccept;
    project.currentPauseRequestId = savedReq.id;
    await this.projectRepository.save(project);

    return savedReq;
  }

  async approvePause(requestId: string, actor?: ActorInfo) {
    if (!this.isManagement(actor?.role)) {
      throw new ForbiddenException(
        "Chỉ BOD/ADMIN mới có quyền duyệt đơn tạm dừng",
      );
    }

    const request = await this.pauseRequestRepository.findOne({
      where: { id: requestId },
      relations: ["project"],
    });
    if (!request)
      throw new NotFoundException("Không tìm thấy yêu cầu tạm dừng");

    const now = new Date();
    const autoAccept = new Date(now.getTime() + 37 * 24 * 60 * 60 * 1000);
    const userId = actor?.userId || actor?.id;

    request.status = PauseRequestStatus.APPROVED;
    request.approverId = userId;
    request.approvedAt = now;
    request.autoAcceptAt = autoAccept;
    await this.pauseRequestRepository.save(request);

    if (request.project) {
      request.project.status = ProjectStatus.ON_HOLD;
      request.project.isOnHold = true;
      request.project.pausedAt = now;
      request.project.pausedById = userId;
      request.project.autoAcceptAt = autoAccept;
      await this.projectRepository.save(request.project);
    }

    return request;
  }

  async rejectPause(requestId: string, feedback: string, actor?: ActorInfo) {
    if (!this.isManagement(actor?.role)) {
      throw new ForbiddenException("Chỉ BOD/ADMIN mới có quyền từ chối");
    }

    const request = await this.pauseRequestRepository.findOne({
      where: { id: requestId },
      relations: ["project"],
    });
    if (!request) throw new NotFoundException("Không tìm thấy yêu cầu");

    request.status = PauseRequestStatus.REJECTED;
    request.approverId = actor?.userId || actor?.id;
    request.feedback = feedback?.trim();
    await this.pauseRequestRepository.save(request);

    if (request.project) {
      request.project.status = ProjectStatus.IN_PROGRESS;
      request.project.currentPauseRequestId = null as any;
      await this.projectRepository.save(request.project);
    }

    return request;
  }

  async resume(id: string, resumeReason?: string, _actor?: ActorInfo) {
    const project = await this.projectRepository.findOneBy({ id });
    if (!project) throw new NotFoundException("Không tìm thấy dự án");

    if (project.currentPauseRequestId) {
      const req = await this.pauseRequestRepository.findOneBy({
        id: project.currentPauseRequestId,
      });
      if (req) {
        req.status = PauseRequestStatus.RESUMED;
        req.resumedAt = new Date();
        req.resumeReason = resumeReason?.trim() || "";
        await this.pauseRequestRepository.save(req);
      }
    }

    project.status = ProjectStatus.IN_PROGRESS;
    project.isOnHold = false;
    project.pausedAt = null as any;
    project.autoAcceptAt = null as any;
    project.currentPauseRequestId = null as any;

    return await this.projectRepository.save(project);
  }

  async getPauseHistory(projectId: string) {
    return await this.pauseRequestRepository.find({
      where: { projectId },
      relations: ["requester", "approver", "closedBy"],
      order: { createdAt: "DESC" },
    });
  }
}
