import { Injectable } from "@nestjs/common";
import { TaskStatus } from "../../task/enums/task-status.enum";
import { DashboardScopeType } from "../types/dashboard-scope.types";

@Injectable()
export class DashboardMemberPayloadService {
  buildMemberData(params: {
    userId: string;
    scope: any;
    activeTasks: any[];
    workTasks: any[];
    userAccount: any;
    participatingProjects: any[];
    roleStats: any;
    completionStats: any[];
    memberWorkload: any;
  }) {
    const {
      userId,
      scope,
      activeTasks,
      workTasks,
      userAccount,
      participatingProjects,
      roleStats,
      completionStats,
      memberWorkload,
    } = params;

    const statusCounts = workTasks.reduce((acc: any, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {});

    const overdueTasks = workTasks
      .filter(
        (t) =>
          t.status === TaskStatus.OVERDUE &&
          (scope.type !== DashboardScopeType.PERSONAL ||
            t.assignee?.id === userId),
      )
      .map((t) => ({
        id: t.id,
        name: t.name,
        nickname: t.nickname,
        deadline: t.plannedEndDate,
        status: t.status,
        projectName: t.project?.name,
        clientName: t.project?.contract?.customer?.name,
        code: t.code,
        projectId: t.project?.id,
        assignee: t.assignee
          ? { id: t.assignee.id, fullName: t.assignee.fullName }
          : undefined,
      }));

    const reworkTasks = workTasks
      .filter((t) =>
        [
          TaskStatus.REWORKING,
          TaskStatus.REJECTED,
          TaskStatus.REJECTED_BILLABLE,
          TaskStatus.REJECTED_SUPPORT,
        ].includes(t.status as any),
      )
      .map((t) => ({
        id: t.id,
        name: t.name,
        nickname: t.nickname,
        projectName: t.project?.name,
        clientName: t.project?.contract?.customer?.name,
        code: t.code,
        deadline: t.plannedEndDate,
        status: t.status,
        projectId: t.project?.id,
        assignee: t.assignee
          ? { id: t.assignee.id, fullName: t.assignee.fullName }
          : undefined,
      }));

    const memberData: any = {
      vinicoin: userAccount.vinicoin,
      vinicoinTotal: userAccount.vinicoinTotal,
      vinicoinWithdrawn: userAccount.vinicoinWithdrawn,
      workload: memberWorkload,
      totalTasks: workTasks.length,
      statusCounts,
      doingCount:
        (statusCounts[TaskStatus.DOING] || 0) +
        (statusCounts[TaskStatus.REWORKING] || 0) +
        (statusCounts[TaskStatus.REJECTED] || 0),
      reworkCount: reworkTasks.length,
      reworkTasks,
      overdueCount: overdueTasks.length,
      overdueTasks,
      completedCount:
        (statusCounts[TaskStatus.COMPLETED] || 0) +
        (statusCounts[TaskStatus.ACCEPTED] || 0) +
        (statusCounts[TaskStatus.INTERNAL_COMPLETED] || 0),
      participatingProjects,
      roleStats,
      upcomingDeadlines: activeTasks
        .filter(
          (t) =>
            t.status !== TaskStatus.COMPLETED &&
            t.status !== TaskStatus.INTERNAL_COMPLETED &&
            t.status !== TaskStatus.ACCEPTED &&
            t.plannedEndDate,
        )
        .sort(
          (a, b) =>
            new Date(a.plannedEndDate).getTime() -
            new Date(b.plannedEndDate).getTime(),
        )
        .slice(0, 10)
        .map((t) => ({
          id: t.id,
          name: t.name,
          nickname: t.nickname,
          deadline: t.plannedEndDate,
          status: t.status,
          projectName: t.project?.name,
          code: t.code,
          projectId: t.project?.id,
        })),
      calendarTasks: workTasks
        .filter((t) => t.plannedStartDate || t.plannedEndDate)
        .map((t) => ({
          id: t.id,
          name: t.name,
          nickname: t.nickname,
          start: t.plannedStartDate,
          end: t.plannedEndDate,
          status: t.status,
          code: t.code,
          project: t.project,
          projectId: t.project?.id,
        })),
      completionStats,
      violationCount: userAccount.violationCount,
      violationStats: userAccount.violationStats,
    };

    if (scope.isAccountViewingMember) {
      memberData.vinicoin = 0;
      memberData.vinicoinTotal = 0;
      memberData.vinicoinWithdrawn = 0;
      memberData.reworkTasks = [];
      memberData.reworkCount = 0;
      memberData.violationCount = 0;
      memberData.violationStats = {};
    }

    return memberData;
  }
}
