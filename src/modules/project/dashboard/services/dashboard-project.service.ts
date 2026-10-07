import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { Project } from "@modules/project/project-core/entities/project.entity";
import { ContractServices } from "@modules/project/acceptance/entities/contract-service.entity";
import { ProjectStatus } from "@modules/project/project-core/enums/project-status.enum";
import { ContractServiceStatus } from "@modules/project/acceptance/enums/acceptance.enum";
import { getMemberRoles } from "@modules/project/project-core/entities/team-member.entity";
import { DashboardScopeType } from "@modules/project/dashboard/types/dashboard-scope.types";

@Injectable()
export class DashboardProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ContractServices)
    private readonly contractServiceRepo: Repository<ContractServices>,
  ) {}

  async getServiceStatsMap(contractIds: string[]) {
    const serviceStatsMap = new Map<
      string,
      { totalServices: number; completedServices: number }
    >();
    if (contractIds.length === 0) return serviceStatsMap;

    const rawStats = await this.contractServiceRepo
      .createQueryBuilder("cs")
      .innerJoin("cs.contract", "contract")
      .select("contract.id", "contractId")
      .addSelect("COUNT(cs.id)", "totalServices")
      .addSelect(
        "COUNT(CASE WHEN cs.status = :compStatus THEN 1 END)",
        "completedServices",
      )
      .where("contract.id IN (:...contractIds)", {
        contractIds: Array.from(new Set(contractIds)),
      })
      .setParameter("compStatus", ContractServiceStatus.COMPLETED)
      .groupBy("contract.id")
      .getRawMany();

    for (const s of rawStats) {
      serviceStatsMap.set(s.contractId, {
        totalServices: parseInt(s.totalServices, 10) || 0,
        completedServices: parseInt(s.completedServices, 10) || 0,
      });
    }
    return serviceStatsMap;
  }

  async getTeamLeadData(scope: any, projectId?: string) {
    const ledProjectIds =
      scope.type === DashboardScopeType.MANAGEMENT
        ? projectId
          ? [projectId]
          : scope.projectIds
        : [];
    const ledProjects =
      ledProjectIds.length > 0
        ? await this.projectRepo.find({
            where: { id: In(ledProjectIds) },
            relations: ["contract"],
          })
        : [];

    if (ledProjects.length === 0) return undefined;

    const ledContractIds = ledProjects
      .map((p) => p.contract?.id)
      .filter(Boolean) as string[];
    const ledStatsMap = await this.getServiceStatsMap(ledContractIds);

    return ledProjects.map((p) => {
      const stats = p.contract?.id ? ledStatsMap.get(p.contract.id) : undefined;
      const totalServices = stats?.totalServices || 0;
      const completedServices = stats?.completedServices || 0;
      return {
        id: p.id,
        name: p.name,
        status: p.status,
        serviceCount: totalServices,
        completedServiceCount: completedServices,
        progress:
          totalServices > 0
            ? Math.round((completedServices / totalServices) * 100)
            : 0,
        role: "ACCOUNT",
      };
    });
  }

  async resolveTeamProjects(scope: any) {
    if (
      scope.activeProjects &&
      (scope.type === DashboardScopeType.SYSTEM ||
        scope.type === DashboardScopeType.MANAGEMENT)
    ) {
      return scope.activeProjects;
    }
    return scope.projectIds.length > 0
      ? this.projectRepo.find({
          where: {
            id: In(scope.projectIds),
            status: In([
              ProjectStatus.PENDING_CONFIRMATION,
              ProjectStatus.CONFIRMED,
              ProjectStatus.IN_PROGRESS,
            ]),
          },
          relations: [
            "contract",
            "contract.customer",
            "team",
            "team.teamLead",
            "team.members",
            "team.members.user",
          ],
        })
      : [];
  }

  buildParticipatingProjects(
    teamProjects: any[],
    activeTasks: any[],
    serviceStatsMap: Map<string, any>,
    userId: string,
  ) {
    const projectMap = new Map();
    const addProject = (project: any) => {
      if (!project || projectMap.has(project.id)) return;
      const stats = project.contract?.id
        ? serviceStatsMap.get(project.contract.id)
        : undefined;
      const totalServices = stats?.totalServices || 0;
      const completedServices = stats?.completedServices || 0;
      let userRole: string | null = null;
      if (project.team) {
        if (project.team.teamLead?.id === userId) {
          userRole = "ACCOUNT";
        } else if (project.team.members?.length) {
          const m = project.team.members.find(
            (mem: any) => mem.user?.id === userId,
          );
          if (m) userRole = getMemberRoles(m)[0];
        }
      }
      projectMap.set(project.id, {
        id: project.id,
        name: project.name,
        status: project.status,
        clientName: project.contract?.customer?.name,
        serviceCount: totalServices,
        completedServiceCount: completedServices,
        progress:
          totalServices > 0
            ? Math.round((completedServices / totalServices) * 100)
            : 0,
        role: userRole,
      });
    };

    teamProjects.forEach((p) => addProject(p));
    activeTasks.forEach((t) => addProject(t.project));

    return Array.from(projectMap.values()).filter((p) =>
      [
        ProjectStatus.PENDING_CONFIRMATION,
        ProjectStatus.CONFIRMED,
        ProjectStatus.IN_PROGRESS,
      ].includes(p.status),
    );
  }
}
