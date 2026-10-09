import { Injectable } from "@nestjs/common";
import { Between, FindOperator } from "typeorm";
import { TaskStatus } from "@modules/project/task/enums/task-status.enum";
import { UserRole } from "@modules/identity/user/enums/user-role.enum";
import { WorkloadSummaryService } from "@modules/project/task/services/workload-summary.service";
import {
  DashboardActor,
  DashboardScopeType,
} from "@modules/project/dashboard/types/dashboard-scope.types";
import { DashboardScopeService } from "./dashboard-scope.service";
import { DashboardAdminService } from "./dashboard-admin.service";
import { DashboardSaleService } from "./dashboard-sale.service";
import { DashboardMemberService } from "./dashboard-member.service";
import { DashboardProjectService } from "./dashboard-project.service";
import { DashboardMemberPayloadService } from "./dashboard-member-payload.service";

@Injectable()
export class DashboardService {
  constructor(
    private readonly scopeService: DashboardScopeService,
    private readonly adminService: DashboardAdminService,
    private readonly saleService: DashboardSaleService,
    private readonly memberService: DashboardMemberService,
    private readonly projectService: DashboardProjectService,
    private readonly memberPayloadService: DashboardMemberPayloadService,
    private readonly workloadSummaryService: WorkloadSummaryService,
  ) {}

  private getDateRange(
    month?: number,
    year?: number,
    startMonth?: number,
    endMonth?: number,
  ) {
    const effectiveStart = startMonth || month;
    const effectiveEnd = endMonth || month;
    if (!year && !effectiveStart) return null;
    if (year && effectiveStart && effectiveEnd) {
      return {
        start: new Date(year, effectiveStart - 1, 1),
        end: new Date(year, effectiveEnd, 0, 23, 59, 59, 999),
      };
    }
    const currentYear = year || new Date().getFullYear();
    const currentMonth = effectiveStart ? effectiveStart - 1 : 0;
    const currentEndMonth = effectiveEnd ? effectiveEnd : 11;
    return {
      start: new Date(currentYear, currentMonth, 1),
      end: new Date(currentYear, currentEndMonth, effectiveEnd ? 0 : 31, 23, 59, 59, 999),
    };
  }

  private getDateFilter(
    month?: number,
    year?: number,
    startMonth?: number,
    endMonth?: number,
  ): FindOperator<any> | null {
    const range = this.getDateRange(month, year, startMonth, endMonth);
    return range ? Between(range.start, range.end) : null;
  }

  async getDashboardData(
    actor: DashboardActor,
    requestedUserId?: string,
    month?: number,
    year?: number,
    projectId?: string,
    mode?: "personal" | "management",
    startMonth?: number,
    endMonth?: number,
  ) {
    const data: any = {};
    const dateRange = this.getDateRange(month, year, startMonth, endMonth);
    const dateFilter = this.getDateFilter(month, year, startMonth, endMonth);
    const scope = await this.scopeService.resolve(
      actor,
      requestedUserId,
      projectId,
      mode,
    );
    const userId = scope.targetUserId;

    data.scope = {
      type: scope.type,
      targetUserId: scope.targetUserId,
      selectedProjectId: scope.selectedProjectId,
      canSelectMembers: scope.canSelectMembers,
      availableProjects: scope.availableProjects,
      availableMembers: scope.availableMembers,
      isAccountViewer: Boolean(scope.isAccountViewer),
      isAccountViewingMember: Boolean(scope.isAccountViewingMember),
      mode: scope.mode,
    };

    const [staffWorkloads, adminMetrics] = await Promise.all([
      scope.canSelectMembers
        ? this.workloadSummaryService.getAllStaffWorkloads(month, year)
        : Promise.resolve(undefined),
      scope.type === DashboardScopeType.SYSTEM
        ? this.adminService.getAdminMetrics(dateRange, projectId)
        : Promise.resolve(undefined),
    ]);

    if (staffWorkloads) data.staffWorkloads = staffWorkloads;

    if (scope.type === DashboardScopeType.SYSTEM && adminMetrics) {
      data.admin = adminMetrics;
      data.admin.staffWorkloads =
        staffWorkloads ??
        (await this.workloadSummaryService.getAllStaffWorkloads(month, year));
    }

    const teamLeadData = await this.projectService.getTeamLeadData(
      scope,
      projectId,
    );
    if (teamLeadData) data.teamLead = teamLeadData;

    if (actor.role === UserRole.BD) {
      data.sale = await this.saleService.getSaleMetrics(userId, dateFilter);
    }

    await this.populateMemberData(
      data,
      scope,
      dateFilter,
      projectId,
      month,
      year,
      staffWorkloads,
    );

    return data;
  }

  private async populateMemberData(
    data: any,
    scope: any,
    dateFilter: FindOperator<any> | null,
    projectId?: string,
    month?: number,
    year?: number,
    staffWorkloads?: any[],
  ) {
    const userId = scope.targetUserId;
    const { activeTasks, activeRoleTasks, workTasks } =
      await this.memberService.getMemberTasks(scope, dateFilter, projectId);

    const roleCounts = activeRoleTasks.reduce((acc: any, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {});

    const roleStats = {
      doingCount: roleCounts[TaskStatus.DOING] || 0,
      completedCount: roleCounts[TaskStatus.COMPLETED] || 0,
      overdueCount: activeRoleTasks.filter(
        (t) => t.status === TaskStatus.OVERDUE,
      ).length,
      reworkCount: activeRoleTasks.filter((t) =>
        [TaskStatus.REWORKING, TaskStatus.REJECTED].includes(t.status as any),
      ).length,
      pendingCount:
        (roleCounts[TaskStatus.AWAITING_REVIEW] || 0) +
        (roleCounts.WAITING_APPROVAL || 0),
      totalTasks: activeRoleTasks.length,
    };

    const userAccount = await this.memberService.getUserAccountAndViolations(
      userId,
      dateFilter,
    );
    const teamProjects = await this.projectService.resolveTeamProjects(scope);

    const contractIds = new Set<string>();
    teamProjects.forEach((p) => {
      if (p.contract?.id) contractIds.add(p.contract.id);
    });
    activeTasks.forEach((t) => {
      if (t.project?.contract?.id) contractIds.add(t.project.contract.id);
    });
    const serviceStats = await this.projectService.getServiceStatsMap(
      Array.from(contractIds),
    );

    const participatingProjects =
      this.projectService.buildParticipatingProjects(
        teamProjects,
        activeTasks,
        serviceStats,
        userId,
      );

    if (data.admin) {
      data.admin.currentProjects = teamProjects.map((p) => {
        const stats = p.contract?.id
          ? serviceStats.get(p.contract.id)
          : undefined;
        const total = stats?.totalServices || 0;
        const completed = stats?.completedServices || 0;
        return {
          id: p.id,
          name: p.name,
          status: p.status,
          customerName: p.contract?.customer?.name,
          teamName: p.team?.name,
          teamLeadName: p.team?.teamLead?.fullName,
          plannedStartDate: p.plannedStartDate,
          plannedEndDate: p.plannedEndDate,
          serviceCount: total,
          completedServiceCount: completed,
          progress: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      });
    }

    const completionStats = await this.memberService.getCompletionStats(
      scope,
      year,
      projectId,
    );
    const memberWorkload =
      staffWorkloads?.find((w) => w.userId === userId) ??
      (await this.workloadSummaryService.getWorkloadForUser(
        userId,
        month,
        year,
      ));

    data.member = this.memberPayloadService.buildMemberData({
      userId,
      scope,
      activeTasks,
      workTasks,
      userAccount,
      participatingProjects,
      roleStats,
      completionStats,
      memberWorkload,
    });
  }
}
