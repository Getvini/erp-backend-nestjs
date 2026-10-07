import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, Between, FindOperator } from "typeorm";
import { Tasks } from "../../task/entities/task.entity";
import { Users } from "../../../identity/user/entities/user.entity";
import { Violations } from "../../task/entities/violation.entity";
import { ProjectStatus } from "../../project-core/enums/project-status.enum";
import { TaskStatus } from "../../task/enums/task-status.enum";
import {
  DashboardScopeType,
  selectDashboardWorkItems,
  DashboardScopeContext,
} from "../types/dashboard-scope.types";

const TASK_SELECT_FIELDS = {
  id: true,
  name: true,
  nickname: true,
  status: true,
  code: true,
  plannedStartDate: true,
  plannedEndDate: true,
  assignee: { id: true, fullName: true },
  helper: { id: true },
  project: {
    id: true,
    name: true,
    status: true,
    contract: { id: true, customer: { id: true, name: true } },
  },
} as const;

@Injectable()
export class DashboardMemberService {
  constructor(
    @InjectRepository(Tasks)
    private readonly taskRepo: Repository<Tasks>,
    @InjectRepository(Users)
    private readonly userRepo: Repository<Users>,
    @InjectRepository(Violations)
    private readonly violationRepo: Repository<Violations>,
  ) {}

  withTaskPeriod(condition: any, dateFilter: FindOperator<any> | null) {
    if (!dateFilter) return [condition];
    return [
      { ...condition, plannedEndDate: dateFilter },
      { ...condition, actualEndDate: dateFilter },
    ];
  }

  async getMemberTasks(
    scope: DashboardScopeContext,
    dateFilter: FindOperator<any> | null,
    projectId?: string,
  ) {
    const userId = scope.targetUserId;
    const projectFilter = projectId
      ? { id: projectId }
      : scope.projectIds?.length > 0
        ? In(scope.projectIds)
        : undefined;

    const personalWhere = [
      {
        assignee: { id: userId },
        ...(projectFilter && { project: projectFilter }),
      },
      {
        helper: { id: userId },
        ...(projectFilter && { project: projectFilter }),
      },
    ].flatMap((c) => this.withTaskPeriod(c, dateFilter));

    const rawPersonalTasks = await this.taskRepo.find({
      where: personalWhere,
      relations: [
        "project",
        "project.contract",
        "project.contract.customer",
        "assignee",
        "helper",
      ],
      select: TASK_SELECT_FIELDS,
      order: { plannedEndDate: "DESC" },
    });

    const activeTasks = rawPersonalTasks.filter(
      (t) =>
        !t.project ||
        (t.project.status !== ProjectStatus.COMPLETED &&
          t.project.status !== ProjectStatus.CANCELLED),
    );

    let activeRoleTasks: Tasks[];
    if (scope.type === DashboardScopeType.PERSONAL) {
      activeRoleTasks = activeTasks;
    } else {
      const baseConditions: any[] = [];
      if (scope.type === DashboardScopeType.SYSTEM) {
        baseConditions.push({
          ...(projectId && { project: { id: projectId } }),
        });
      } else if (scope.type === DashboardScopeType.MANAGEMENT) {
        if (projectFilter) baseConditions.push({ project: projectFilter });
      }

      const roleWhere = baseConditions.flatMap((c) =>
        this.withTaskPeriod(c, dateFilter),
      );
      const rawRoleTasks =
        roleWhere.length > 0
          ? await this.taskRepo.find({
              where: roleWhere,
              relations: [
                "project",
                "project.contract",
                "project.contract.customer",
                "assignee",
                "helper",
              ],
              select: TASK_SELECT_FIELDS,
              order: { plannedEndDate: "DESC" },
            })
          : [];

      activeRoleTasks = rawRoleTasks.filter(
        (t) =>
          !t.project ||
          (t.project.status !== ProjectStatus.COMPLETED &&
            t.project.status !== ProjectStatus.CANCELLED),
      );
    }

    const workTasks = selectDashboardWorkItems(
      scope.type,
      activeTasks,
      activeRoleTasks,
    );
    return { activeTasks, activeRoleTasks, workTasks };
  }

  async getCompletionStats(
    scope: DashboardScopeContext,
    year?: number,
    projectId?: string,
  ) {
    const chartYear = year || new Date().getFullYear();
    const completionStats = Array(12).fill(0);
    const chartDateFilter = Between(
      new Date(chartYear, 0, 1),
      new Date(chartYear, 11, 31, 23, 59, 59, 999),
    );

    const chartWhere =
      scope.type === DashboardScopeType.SYSTEM
        ? [
            {
              actualEndDate: chartDateFilter,
              ...(projectId && { project: { id: projectId } }),
            },
          ]
        : scope.type === DashboardScopeType.MANAGEMENT
          ? [
              {
                actualEndDate: chartDateFilter,
                project: { id: projectId || In(scope.projectIds) },
              },
            ]
          : [
              {
                assignee: { id: scope.targetUserId },
                actualEndDate: chartDateFilter,
                ...(projectId && { project: { id: projectId } }),
              },
              {
                helper: { id: scope.targetUserId },
                actualEndDate: chartDateFilter,
                ...(projectId && { project: { id: projectId } }),
              },
            ];

    const allTasks = await this.taskRepo.find({
      where: chartWhere,
      select: { status: true, actualEndDate: true },
    });

    allTasks.forEach((t) => {
      if (t.status === TaskStatus.ACCEPTED && t.actualEndDate) {
        const date = new Date(t.actualEndDate);
        if (date.getFullYear() === chartYear)
          completionStats[date.getMonth()]++;
      }
    });

    return completionStats.map((count, index) => ({ month: index + 1, count }));
  }

  async getUserAccountAndViolations(
    userId: string,
    dateFilter: FindOperator<any> | null,
  ) {
    const [userWithAccount, violations] = await Promise.all([
      this.userRepo.findOne({ where: { id: userId }, relations: ["accounts"] }),
      this.violationRepo.find({
        where: { userId, ...(dateFilter && { createdAt: dateFilter }) },
        select: { id: true, type: true, createdAt: true },
      }),
    ]);

    const account = userWithAccount?.accounts?.[0];
    const violationStats = violations.reduce((acc: any, v) => {
      acc[v.type] = (acc[v.type] || 0) + 1;
      return acc;
    }, {});

    return {
      vinicoin: account?.vinicoin || 0,
      vinicoinTotal: account?.vinicoinTotal || 0,
      vinicoinWithdrawn: account?.vinicoinWithdrawn || 0,
      violations,
      violationCount: violations.length,
      violationStats,
    };
  }
}
