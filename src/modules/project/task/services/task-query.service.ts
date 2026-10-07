import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  Repository,
  In,
  Not,
  ILike,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
} from "typeorm";
import { Tasks } from "@modules/project/task/entities/task.entity";
import { Project } from "@modules/project/project-core/entities/project.entity";
import { UserRole } from "@modules/identity/user/enums/user-role.enum";
import {
  isManagementRole,
  isProjectOperatorFromTeam,
  getTaskFilters,
  TaskActor,
} from "@modules/project/task/helpers/task-security.helper";
import {
  TASK_LIST_RELATIONS,
  TASK_DETAIL_RELATIONS,
} from "@modules/project/task/helpers/task-relations.constant";

@Injectable()
export class TaskQueryService {
  constructor(
    @InjectRepository(Tasks)
    private readonly taskRepository: Repository<Tasks>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  private async canOperateProject(projectId: string, userInfo?: TaskActor) {
    if (!userInfo) return false;
    if (isManagementRole(userInfo.role)) return true;

    const userId = userInfo.userId || userInfo.id;
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: [
        "team",
        "team.teamLead",
        "team.members",
        "team.members.user",
        "team.members.roles",
      ],
    });

    if (!project?.team || !userId) return false;
    return isProjectOperatorFromTeam(project.team, userInfo);
  }

  async getAll(filters: any = {}, userInfo?: TaskActor) {
    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || 10;
    const sortBy = filters.sortBy || "createdAt";
    const sortDir = (filters.sortDir || "DESC").toUpperCase() as "ASC" | "DESC";

    const where: any = [];
    const projectId = filters.projectId as string | undefined;
    const opportunityId = filters.opportunityId as string | undefined;
    const canOperateRequestedProject = projectId
      ? await this.canOperateProject(projectId, userInfo)
      : false;
    const baseWhere: any = canOperateRequestedProject
      ? { project: { id: projectId } }
      : getTaskFilters(userInfo);

    const applyToWhere = (callback: (w: any) => void) => {
      if (Array.isArray(baseWhere)) {
        baseWhere.forEach(callback);
      } else {
        callback(baseWhere);
      }
    };

    if (filters.status && filters.status !== "ALL") {
      const statusList = Array.isArray(filters.status)
        ? filters.status
        : typeof filters.status === "string" && filters.status.includes(",")
          ? filters.status
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean)
          : null;
      const statusCond =
        statusList && statusList.length > 0 ? In(statusList) : filters.status;
      applyToWhere((w) => (w.status = statusCond));
    }

    if (filters.excludeStatus) {
      const excludeList = Array.isArray(filters.excludeStatus)
        ? filters.excludeStatus
        : String(filters.excludeStatus)
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean);
      if (excludeList.length > 0) {
        applyToWhere((w) => (w.status = Not(In(excludeList))));
      }
    }

    if (filters.nameLike) {
      const searchTerm = `%${String(filters.nameLike).trim()}%`;
      applyToWhere((w) => (w.name = ILike(searchTerm)));
    }

    if (filters.assigneeId) {
      applyToWhere((w) => (w.assignee = { id: filters.assigneeId }));
    }

    if (opportunityId) {
      applyToWhere((w) => (w.opportunityId = opportunityId));
    }

    if (projectId && !canOperateRequestedProject) {
      applyToWhere((w) => {
        w.project = { ...(w.project || {}), id: projectId };
      });
    }

    const dateType = filters.dateType || "plannedEndDate";
    const deadlineDate =
      filters.deadline === "today" || filters.date === "today"
        ? new Date().toISOString().split("T")[0]
        : filters.deadline || filters.date;
    const startStr = filters.deadlineFrom || filters.dateFrom || deadlineDate;
    const endStr = filters.deadlineTo || filters.dateTo || deadlineDate;

    if (startStr || endStr) {
      const startDate = startStr ? new Date(`${startStr}T00:00:00.000`) : null;
      const endDate = endStr ? new Date(`${endStr}T23:59:59.999`) : null;
      const isValidStart = startDate && !isNaN(startDate.getTime());
      const isValidEnd = endDate && !isNaN(endDate.getTime());

      applyToWhere((w) => {
        if (dateType === "plannedRange") {
          if (isValidEnd) w.plannedStartDate = LessThanOrEqual(endDate);
          if (isValidStart) w.plannedEndDate = MoreThanOrEqual(startDate);
        } else {
          const field = [
            "plannedEndDate",
            "actualEndDate",
            "actualStartDate",
            "plannedStartDate",
          ].includes(dateType)
            ? dateType
            : "plannedEndDate";
          if (isValidStart && isValidEnd)
            w[field] = Between(startDate, endDate);
          else if (isValidStart) w[field] = MoreThanOrEqual(startDate);
          else if (isValidEnd) w[field] = LessThanOrEqual(endDate);
        }
      });
    }

    if (filters.q || filters.search) {
      const query = filters.q || filters.search;
      const searchTerm = `%${query}%`;
      const baseArr = Array.isArray(baseWhere) ? baseWhere : [baseWhere];
      baseArr.forEach((w) => {
        where.push({ ...w, name: ILike(searchTerm) });
        where.push({ ...w, nickname: ILike(searchTerm) });
        where.push({ ...w, code: ILike(searchTerm) });
      });
    } else {
      if (Array.isArray(baseWhere)) where.push(...baseWhere);
      else where.push(baseWhere);
    }

    const [items, total] = await this.taskRepository.findAndCount({
      where: where.length > 1 ? where : where[0],
      relations: TASK_LIST_RELATIONS,
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

  async getOne(id: string, actor?: TaskActor) {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: TASK_DETAIL_RELATIONS,
    });

    if (!task) throw new NotFoundException("Không tìm thấy công việc");
    const isOpportunityVideoDemo = Boolean(
      task.opportunityId && task.opportunityServiceJob?.isBriefVideo,
    );

    if (
      actor?.role === UserRole.PM &&
      !isOpportunityVideoDemo &&
      !isProjectOperatorFromTeam(task.project?.team, actor)
    ) {
      throw new ForbiddenException(
        "Bạn không có quyền xem công việc ngoài dự án được phân công",
      );
    }
    return task;
  }

  async getByProject(projectId: string, query: any, userInfo?: TaskActor) {
    const filters = { ...query, projectId, limit: query.limit || 500 };
    const result = await this.getAll(filters, userInfo);
    return result.data;
  }
}
