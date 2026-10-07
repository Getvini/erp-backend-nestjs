import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Project } from "@modules/project/project-core/entities/project.entity";
import { ProjectPauseRequest } from "@modules/project/project-core/entities/project-pause-request.entity";
import { ProjectStatus } from "@modules/project/project-core/enums/project-status.enum";
import {
  PauseRequestStatus,
  CloseMode,
  ClosedByType,
} from "@modules/project/project-core/enums/pause-request.enum";
import { UserRole } from "@modules/identity/user/enums/user-role.enum";

type ActorInfo = { id?: string; userId?: string; role?: string };

@Injectable()
export class ProjectCloseService {
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

  async getHoldSummary(projectId: string) {
    const project = await this.projectRepository.findOneBy({ id: projectId });
    if (!project) throw new NotFoundException("Không tìm thấy dự án");

    const daysRemaining = project.autoAcceptAt
      ? Math.max(
          0,
          Math.ceil(
            (new Date(project.autoAcceptAt).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : 0;

    return {
      isOnHold: project.isOnHold,
      pausedAt: project.pausedAt,
      autoAcceptAt: project.autoAcceptAt,
      daysRemaining,
    };
  }

  async requestClose(id: string, reason?: string, actor?: ActorInfo) {
    const project = await this.projectRepository.findOneBy({ id });
    if (!project) throw new NotFoundException("Không tìm thấy dự án");

    const userId = actor?.userId || actor?.id;
    const reqObj = this.pauseRequestRepository.create({
      project,
      projectId: id,
      requesterId: userId,
      requesterRole: actor?.role || "PM",
      closeMode: CloseMode.REQUEST,
      closeReason: reason?.trim() || "Đề nghị đóng dự án",
      status: PauseRequestStatus.PENDING,
      requestedAt: new Date(),
    });

    return await this.pauseRequestRepository.save(reqObj);
  }

  async closeDirect(id: string, reason: string, actor?: ActorInfo) {
    if (!this.isManagement(actor?.role) && actor?.role !== UserRole.BD) {
      throw new ForbiddenException("Không có quyền đóng dự án trực tiếp");
    }

    const project = await this.projectRepository.findOneBy({ id });
    if (!project) throw new NotFoundException("Không tìm thấy dự án");

    const now = new Date();
    const userId = actor?.userId || actor?.id;

    const reqObj = this.pauseRequestRepository.create({
      project,
      projectId: id,
      closedById: userId,
      closedByType: ClosedByType.USER,
      closeMode: CloseMode.DIRECT,
      closeReason: reason?.trim(),
      status: PauseRequestStatus.CLOSED,
      closedAt: now,
    });
    const saved = await this.pauseRequestRepository.save(reqObj);

    project.status = ProjectStatus.COMPLETED;
    project.isOnHold = false;
    await this.projectRepository.save(project);

    return saved;
  }

  async approveClose(requestId: string, actor?: ActorInfo) {
    if (!this.isManagement(actor?.role)) {
      throw new ForbiddenException("Chỉ BOD/ADMIN mới có quyền duyệt đóng");
    }

    const req = await this.pauseRequestRepository.findOne({
      where: { id: requestId },
      relations: ["project"],
    });
    if (!req) throw new NotFoundException("Không tìm thấy yêu cầu");

    const now = new Date();
    req.status = PauseRequestStatus.CLOSED;
    req.closedById = actor?.userId || actor?.id;
    req.closedByType = ClosedByType.USER;
    req.closedAt = now;
    await this.pauseRequestRepository.save(req);

    if (req.project) {
      req.project.status = ProjectStatus.COMPLETED;
      req.project.isOnHold = false;
      await this.projectRepository.save(req.project);
    }

    return req;
  }

  async rejectClose(requestId: string, feedback: string, actor?: ActorInfo) {
    if (!this.isManagement(actor?.role)) {
      throw new ForbiddenException("Chỉ BOD/ADMIN mới có quyền từ chối");
    }

    const req = await this.pauseRequestRepository.findOneBy({ id: requestId });
    if (!req) throw new NotFoundException("Không tìm thấy yêu cầu");

    req.status = PauseRequestStatus.REJECTED;
    req.feedback = feedback?.trim();
    return await this.pauseRequestRepository.save(req);
  }
}
