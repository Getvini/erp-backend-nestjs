import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ProjectTeam } from "@modules/project/project-core/entities/project-team.entity";
import { TeamMember } from "@modules/project/project-core/entities/team-member.entity";
import { TeamMemberRole } from "@modules/project/project-core/entities/team-member-role.entity";
import { Users } from "@modules/identity/user/entities/user.entity";
import { MemberRole } from "@modules/project/project-core/enums/member-role.enum";
import { UserRole } from "@modules/identity/user/enums/user-role.enum";
import {
  CreateProjectTeamDto,
  UpdateProjectTeamDto,
  AddTeamMemberDto,
} from "@modules/project/project-core/dto/project-team.dto";

type ActorInfo = { id?: string; userId?: string; role?: string };

@Injectable()
export class ProjectTeamService {
  constructor(
    @InjectRepository(ProjectTeam)
    private readonly teamRepository: Repository<ProjectTeam>,
    @InjectRepository(TeamMember)
    private readonly memberRepository: Repository<TeamMember>,
    @InjectRepository(TeamMemberRole)
    private readonly memberRoleRepository: Repository<TeamMemberRole>,
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
  ) {}

  private isManagement(role?: string): boolean {
    return [UserRole.BOD, UserRole.ADMIN, UserRole.ADMIN_SALE].includes(
      role as UserRole,
    );
  }

  async getAll() {
    return await this.teamRepository.find({
      relations: [
        "teamLead",
        "teamLead.accounts",
        "members",
        "members.user",
        "members.user.accounts",
        "members.roles",
      ],
      order: { createdAt: "DESC" },
    });
  }

  async getOne(id: string) {
    const team = await this.teamRepository.findOne({
      where: { id },
      relations: [
        "teamLead",
        "teamLead.accounts",
        "members",
        "members.user",
        "members.user.accounts",
        "members.roles",
      ],
    });
    if (!team) throw new NotFoundException("Không tìm thấy team");
    return team;
  }

  async getMembers(id: string, _month?: number, _year?: number) {
    const team = await this.getOne(id);
    return (team.members || []).map((m) => {
      if (m.user) {
        (m.user as any).workload = null;
      }
      return m;
    });
  }

  async create(data: CreateProjectTeamDto, actor?: ActorInfo) {
    if (!this.isManagement(actor?.role)) {
      throw new ForbiddenException("Chỉ ADMIN/BOD mới có quyền tạo team");
    }

    const team = this.teamRepository.create({
      name: data.name,
      teamLeadId: data.teamLeadId,
    });
    return await this.teamRepository.save(team);
  }

  async update(id: string, data: UpdateProjectTeamDto, actor?: ActorInfo) {
    if (!this.isManagement(actor?.role)) {
      throw new ForbiddenException("Chỉ ADMIN/BOD mới có quyền cập nhật team");
    }

    const team = await this.getOne(id);
    if (data.name) team.name = data.name;
    if (data.teamLeadId !== undefined) team.teamLeadId = data.teamLeadId;
    return await this.teamRepository.save(team);
  }

  async delete(id: string, actor?: ActorInfo) {
    if (!this.isManagement(actor?.role)) {
      throw new ForbiddenException("Chỉ ADMIN/BOD mới có quyền xóa team");
    }
    const team = await this.getOne(id);
    await this.teamRepository.remove(team);
    return { message: "Xóa team thành công" };
  }

  async changeLead(id: string, teamLeadId: string, actor?: ActorInfo) {
    if (!this.isManagement(actor?.role)) {
      throw new ForbiddenException("Chỉ ADMIN/BOD mới có quyền đổi lead");
    }

    const team = await this.getOne(id);
    const user = await this.userRepository.findOneBy({ id: teamLeadId });
    if (!user) throw new NotFoundException("Không tìm thấy nhân sự");

    team.teamLead = user;
    team.teamLeadId = user.id;
    return await this.teamRepository.save(team);
  }

  async addMember(teamId: string, data: AddTeamMemberDto, _actor?: ActorInfo) {
    const team = await this.getOne(teamId);
    const user = await this.userRepository.findOneBy({ id: data.userId });
    if (!user) throw new NotFoundException("Không tìm thấy nhân sự");

    let member = await this.memberRepository.findOne({
      where: { team: { id: teamId }, user: { id: data.userId } },
      relations: ["roles"],
    });

    if (!member) {
      member = this.memberRepository.create({ team, user });
      member = await this.memberRepository.save(member);
    }

    const rolesToAdd: MemberRole[] =
      data.roles && data.roles.length > 0
        ? data.roles
        : data.role
          ? [data.role]
          : [MemberRole.CONTENT_CREATOR];

    for (const r of rolesToAdd) {
      const exists = await this.memberRoleRepository.exist({
        where: { member: { id: member.id }, role: r },
      });
      if (!exists) {
        const mr = this.memberRoleRepository.create({ member, role: r });
        await this.memberRoleRepository.save(mr);
      }
    }

    return await this.memberRepository.findOne({
      where: { id: member.id },
      relations: ["user", "roles"],
    });
  }

  async updateMemberRoles(
    teamId: string,
    userId: string,
    roles: MemberRole[],
    _actor?: ActorInfo,
  ) {
    const member = await this.memberRepository.findOne({
      where: { team: { id: teamId }, user: { id: userId } },
      relations: ["roles"],
    });
    if (!member)
      throw new NotFoundException("Không tìm thấy thành viên trong team");

    await this.memberRoleRepository.delete({ member: { id: member.id } });

    for (const r of roles) {
      const mr = this.memberRoleRepository.create({ member, role: r });
      await this.memberRoleRepository.save(mr);
    }

    return await this.memberRoleRepository.find({
      where: { member: { id: member.id } },
    });
  }

  async updateMember(memberId: string, _data: any, _actor?: ActorInfo) {
    const member = await this.memberRepository.findOne({
      where: { id: memberId },
      relations: ["user", "roles"],
    });
    if (!member) throw new NotFoundException("Không tìm thấy thành viên");
    return member;
  }

  async removeMember(memberId: string, _actor?: ActorInfo) {
    const member = await this.memberRepository.findOneBy({ id: memberId });
    if (!member) throw new NotFoundException("Không tìm thấy thành viên");
    await this.memberRepository.remove(member);
    return { message: "Xóa thành viên thành công" };
  }
}
