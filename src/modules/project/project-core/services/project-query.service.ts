import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, ILike } from "typeorm";
import { Project } from "@modules/project/project-core/entities/project.entity";
import { ProjectStatus } from "@modules/project/project-core/enums/project-status.enum";
import { QueryProjectDto } from "@modules/project/project-core/dto/project.dto";
import { UserRole } from "@modules/identity/user/enums/user-role.enum";

@Injectable()
export class ProjectQueryService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  private isManagement(role?: string): boolean {
    return [UserRole.BOD, UserRole.ADMIN, UserRole.ADMIN_SALE].includes(
      role as UserRole,
    );
  }

  private buildRbacWhere(userInfo?: {
    id: string;
    role: string;
    userId?: string;
  }): any {
    if (!userInfo || this.isManagement(userInfo.role)) {
      return {};
    }

    const uid = userInfo.userId || userInfo.id;

    if (userInfo.role === UserRole.PM) {
      return [{ team: { members: { user: { id: uid } } } }];
    }

    if (userInfo.role === UserRole.BD) {
      return [
        { contract: { createdBy: { id: uid } } },
        { contract: { customer: { createdBy: { id: uid } } } },
        { contract: { opportunity: { createdBy: { id: uid } } } },
      ];
    }

    return [{ team: { members: { user: { id: uid } } } }];
  }

  async getAll(
    filters: QueryProjectDto = {},
    userInfo?: { id: string; role: string; userId?: string },
  ) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.max(1, Number(filters.limit) || 10);
    const ALLOWED_SORT_MAP: Record<string, string> = {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      name: "name",
      status: "status",
      startDate: "startDate",
      endDate: "endDate",
      progress: "progress",
    };

    const rawSortBy = filters.sortBy || "createdAt";
    const sortBy = ALLOWED_SORT_MAP[rawSortBy] || "createdAt";
    const sortDir =
      (filters.sortDir || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";

    const rbacWhere = this.buildRbacWhere(userInfo);
    const baseWhere: any = {};

    if (filters.status && filters.status !== "ALL") {
      const statusList = filters.status.includes(",")
        ? filters.status
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [filters.status];
      baseWhere.status = In(statusList);
    }

    const combineWithSearch = (cond: any) => {
      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        return [
          { ...baseWhere, ...cond, name: ILike(searchTerm) },
          {
            ...baseWhere,
            ...cond,
            contract: {
              ...(cond.contract || {}),
              contractCode: ILike(searchTerm),
            },
          },
          {
            ...baseWhere,
            ...cond,
            contract: { ...(cond.contract || {}), name: ILike(searchTerm) },
          },
        ];
      }
      return { ...baseWhere, ...cond };
    };

    const whereList: any[] = [];
    if (Array.isArray(rbacWhere)) {
      rbacWhere.forEach((c) => {
        const res = combineWithSearch(c);
        if (Array.isArray(res)) whereList.push(...res);
        else whereList.push(res);
      });
    } else {
      const res = combineWithSearch(rbacWhere);
      if (Array.isArray(res)) whereList.push(...res);
      else whereList.push(res);
    }

    const [items, total] = await this.projectRepository.findAndCount({
      where: whereList.length > 1 ? whereList : whereList[0],
      relations: [
        "contract",
        "team",
        "team.teamLead",
        "team.members",
        "team.members.user",
        "team.members.user.accounts",
      ],
      order: { [sortBy]: sortDir },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOne(
    id: string,
    userInfo?: { id: string; role: string; userId?: string },
  ) {
    const rbacWhere = this.buildRbacWhere(userInfo);
    let whereCondition: any;
    if (Array.isArray(rbacWhere)) {
      whereCondition = rbacWhere.map((cond) => ({ id, ...cond }));
    } else {
      whereCondition = { id, ...rbacWhere };
    }

    const project = await this.projectRepository.findOne({
      where: whereCondition,
      relations: [
        "contract",
        "contract.createdBy",
        "contract.opportunity",
        "contract.opportunity.createdBy",
        "contract.customer",
        "contract.customer.createdBy",
        "team",
        "team.teamLead",
        "team.members",
        "team.members.user",
        "team.members.user.accounts",
        "confirmedBy",
        "pausedBy",
      ],
    });

    if (!project) {
      if (userInfo && !this.isManagement(userInfo.role)) {
        const exists = await this.projectRepository.exist({ where: { id } });
        if (exists) throw new ForbiddenException("FORBIDDEN_ACCESS");
      }
      throw new NotFoundException("Không tìm thấy dự án");
    }

    (project as any).tasks = [];
    if (project.contract) {
      (project.contract as any).services = [];
    }

    return project;
  }

  async getByContractId(
    contractId: string,
    userInfo?: { id: string; role: string; userId?: string },
  ) {
    const rbacWhere = this.buildRbacWhere(userInfo);
    let where: any;
    if (Array.isArray(rbacWhere)) {
      where = rbacWhere.map((c) => ({
        ...c,
        contract: { ...(c.contract || {}), id: contractId },
      }));
    } else {
      where = {
        ...rbacWhere,
        contract: { ...(rbacWhere.contract || {}), id: contractId },
      };
    }

    const project = await this.projectRepository.findOne({
      where,
      relations: [
        "contract",
        "team",
        "team.teamLead",
        "team.members",
        "team.members.user",
        "team.members.user.accounts",
      ],
    });

    if (!project) {
      if (userInfo?.role === UserRole.PM) {
        const exists = await this.projectRepository.exist({
          where: { contract: { id: contractId } },
        });
        if (exists) throw new ForbiddenException("FORBIDDEN_ACCESS");
      }
      throw new NotFoundException(
        "Không tìm thấy dự án liên kết với hợp đồng này",
      );
    }

    (project as any).tasks = [];
    return project;
  }

  async getMyProjects(userInfo: { id: string; userId?: string; role: string }) {
    const isUnrestricted = this.isManagement(userInfo.role);

    const qb = this.projectRepository
      .createQueryBuilder("project")
      .select([
        "project.id",
        "project.name",
        "project.status",
        "project.createdAt",
      ])
      .where("project.status = :status", {
        status: ProjectStatus.IN_PROGRESS,
      })
      .orderBy("project.createdAt", "DESC");

    if (!isUnrestricted) {
      if (!userInfo.userId) return [];
      qb.innerJoin("project.team", "team")
        .innerJoin("team.members", "member")
        .innerJoin("member.user", "teamUser")
        .andWhere("teamUser.id = :userId", { userId: userInfo.userId })
        .distinct(true);
    }

    return await qb.getMany();
  }
}
