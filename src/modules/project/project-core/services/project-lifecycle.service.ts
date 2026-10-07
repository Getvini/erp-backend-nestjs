import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Project } from "@modules/project/project-core/entities/project.entity";
import { ProjectTeam } from "@modules/project/project-core/entities/project-team.entity";
import { TeamMember } from "@modules/project/project-core/entities/team-member.entity";
import { TeamMemberRole } from "@modules/project/project-core/entities/team-member-role.entity";
import { Contract } from "@modules/finance/entities/contract.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import { ProjectStatus } from "@modules/project/project-core/enums/project-status.enum";
import { MemberRole } from "@modules/project/project-core/enums/member-role.enum";
import { UserRole } from "@modules/identity/user/enums/user-role.enum";
import {
  AssignTeamDto,
  UpdateProjectDto,
} from "@modules/project/project-core/dto/project.dto";

type ActorInfo = { id: string; userId?: string; role: string };

@Injectable()
export class ProjectLifecycleService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectTeam)
    private readonly teamRepository: Repository<ProjectTeam>,
    @InjectRepository(TeamMember)
    private readonly memberRepository: Repository<TeamMember>,
    @InjectRepository(TeamMemberRole)
    private readonly memberRoleRepository: Repository<TeamMemberRole>,
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
  ) {}

  private isManagement(role?: string): boolean {
    return [UserRole.BOD, UserRole.ADMIN, UserRole.ADMIN_SALE].includes(
      role as UserRole,
    );
  }

  async assign(data: AssignTeamDto, actor?: ActorInfo) {
    if (!actor || !this.isManagement(actor.role)) {
      throw new ForbiddenException(
        "Chỉ ADMIN/BOD mới được phân công PM cho dự án",
      );
    }

    const contract = await this.contractRepository.findOne({
      where: { id: data.contractId },
      relations: ["opportunity"],
    });
    if (!contract) throw new NotFoundException("Không tìm thấy hợp đồng");

    const pm = await this.userRepository.findOne({
      where: { id: data.pmId },
      relations: ["accounts"],
    });
    if (!pm) throw new NotFoundException("Không tìm thấy PM");

    let project = await this.projectRepository.findOne({
      where: { contract: { id: data.contractId } },
      relations: ["team", "team.members", "team.members.roles"],
    });

    if (!project) {
      project = this.projectRepository.create({
        contract,
        contractId: contract.id,
        name: data.name || contract.name || `Dự án ${contract.contractCode}`,
        status: ProjectStatus.PENDING_CONFIRMATION,
      });
      if (contract.opportunity) {
        project.plannedStartDate = contract.opportunity.startDate
          ? new Date(contract.opportunity.startDate)
          : (null as any);
        project.plannedEndDate = contract.opportunity.endDate
          ? new Date(contract.opportunity.endDate)
          : (null as any);
      }
    } else if (data.name) {
      project.name = data.name;
    }

    if (!project.team) {
      const team = this.teamRepository.create({
        name: `Đội dự án ${contract.name || contract.contractCode}`,
        teamLead: pm,
        teamLeadId: pm.id,
      });
      const savedTeam = await this.teamRepository.save(team);
      project.team = savedTeam;
      project.teamId = savedTeam.id;

      const member = this.memberRepository.create({
        team: savedTeam,
        user: pm,
      });
      const savedMember = await this.memberRepository.save(member);

      const roleObj = this.memberRoleRepository.create({
        member: savedMember,
        role: MemberRole.PROJECT_MANAGER,
      });
      await this.memberRoleRepository.save(roleObj);
    }

    return await this.projectRepository.save(project);
  }

  async confirm(id: string, actor: ActorInfo) {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ["team", "team.teamLead", "team.members", "team.members.user"],
    });
    if (!project) throw new NotFoundException("Không tìm thấy dự án");

    if (project.status !== ProjectStatus.PENDING_CONFIRMATION) {
      throw new BadRequestException("Dự án đã được chấp nhận trước đó");
    }

    const userId = actor.userId || actor.id;
    const isTeamLead = project.team?.teamLead?.id === userId;
    const isPm = project.team?.members?.some((m) => m.user?.id === userId);
    const isMgmt = this.isManagement(actor.role);

    if (!isTeamLead && !isPm && !isMgmt) {
      throw new ForbiddenException("Bạn không có quyền chấp nhận dự án này");
    }

    project.status = ProjectStatus.IN_PROGRESS;
    project.confirmedById = userId;
    project.confirmedAt = new Date();
    project.actualStartDate = new Date();

    return await this.projectRepository.save(project);
  }

  async update(id: string, data: UpdateProjectDto, _actor?: ActorInfo) {
    const project = await this.projectRepository.findOneBy({ id });
    if (!project) throw new NotFoundException("Không tìm thấy dự án");

    if (data.name !== undefined) project.name = data.name;
    if (data.plannedStartDate !== undefined) {
      project.plannedStartDate = data.plannedStartDate
        ? new Date(data.plannedStartDate)
        : (null as any);
    }
    if (data.plannedEndDate !== undefined) {
      project.plannedEndDate = data.plannedEndDate
        ? new Date(data.plannedEndDate)
        : (null as any);
    }
    if (data.actualStartDate !== undefined) {
      project.actualStartDate = data.actualStartDate
        ? new Date(data.actualStartDate)
        : (null as any);
    }
    if (data.actualEndDate !== undefined) {
      project.actualEndDate = data.actualEndDate
        ? new Date(data.actualEndDate)
        : (null as any);
    }
    if (data.status !== undefined) project.status = data.status;

    return await this.projectRepository.save(project);
  }

  async updateStatus(id: string, status: ProjectStatus, _actor?: ActorInfo) {
    const project = await this.projectRepository.findOneBy({ id });
    if (!project) throw new NotFoundException("Không tìm thấy dự án");

    if (
      [
        ProjectStatus.ON_HOLD,
        ProjectStatus.COMPLETED,
        ProjectStatus.CANCELLED,
      ].includes(status)
    ) {
      throw new BadRequestException(
        "Trạng thái này phải qua quy trình tạm dừng hoặc đóng dự án",
      );
    }

    project.status = status;
    return await this.projectRepository.save(project);
  }

  async updateWorkingFiles(
    id: string,
    workingFiles: any[],
    actor?: { id?: string; userId?: string; role?: string },
  ) {
    const project = await this.projectRepository.findOneBy({ id });
    if (!project) throw new NotFoundException("Không tìm thấy dự án");

    if (project.isOnHold) {
      throw new BadRequestException(
        "Dự án đang tạm dừng, không thể chỉnh sửa tài liệu",
      );
    }

    const normalized = Array.isArray(workingFiles)
      ? workingFiles
          .map((file) => ({
            id:
              file.id ||
              `wf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            name: (file.name || "").trim() || "Tài liệu",
            url: (file.url || "").trim(),
            type: (file.type === "FILE" ? "FILE" : "LINK") as "LINK" | "FILE",
            size: typeof file.size === "number" ? file.size : undefined,
            createdAt: file.createdAt || new Date().toISOString(),
            createdById: file.createdById || actor?.userId || actor?.id,
            createdByName: file.createdByName || undefined,
          }))
          .filter((f) => Boolean(f.url))
      : [];

    project.workingFiles = normalized;
    await this.projectRepository.save(project);

    return {
      message: "Cập nhật tài liệu làm việc thành công",
      workingFiles: normalized,
    };
  }

  async requestStaffing(id: string, note?: string, _actor?: ActorInfo) {
    const project = await this.projectRepository.findOneBy({ id });
    if (!project) throw new NotFoundException("Không tìm thấy dự án");
    return {
      message: "Đã gửi yêu cầu nhân sự bổ sung",
      projectId: id,
      note,
    };
  }
}
