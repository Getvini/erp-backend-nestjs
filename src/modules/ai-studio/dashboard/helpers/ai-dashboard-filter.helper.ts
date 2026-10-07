import { Repository } from "typeorm";
import { Accounts } from "@modules/identity/auth/entities/account.entity";
import { Projects } from "@modules/project/project-core/entities/project.entity";
import { Opportunities } from "@modules/crm/opportunity/entities/opportunity.entity";
import { Tasks } from "@modules/project/task/entities/task.entity";
import { NotFoundException } from "@nestjs/common";

export interface DashboardActor {
  id: string;
  userId?: string;
  role: string;
}

export async function resolveAccountIds(
  accountRepo: Repository<Accounts>,
  targetUserId: string | undefined,
  actor: DashboardActor,
): Promise<string[] | undefined> {
  if (!targetUserId) return undefined;
  if (targetUserId === actor.userId) return [actor.id];

  const accounts = await accountRepo.find({
    where: { userId: targetUserId, isActive: true },
    select: { id: true },
  });
  if (!accounts.length) {
    throw new NotFoundException("Không tìm thấy tài khoản của thành viên");
  }
  return accounts.map((a) => a.id);
}

export async function getAvailableMembers(accountRepo: Repository<Accounts>) {
  const accounts = await accountRepo.find({
    where: { isActive: true },
    relations: ["user"],
    select: {
      id: true,
      role: true,
      userId: true,
      user: { id: true, fullName: true },
    },
    order: { user: { fullName: "ASC" } },
  });

  const members = new Map<
    string,
    { id: string; fullName: string; role: any }
  >();
  for (const account of accounts) {
    if (account.user?.id && !members.has(account.user.id)) {
      members.set(account.user.id, {
        id: account.user.id,
        fullName: account.user.fullName,
        role: account.role,
      });
    }
  }
  return Array.from(members.values());
}

export async function getAvailableProjects(
  projectRepo: Repository<Projects>,
  targetUserId?: string,
) {
  const qb = projectRepo
    .createQueryBuilder("project")
    .leftJoin("project.team", "team")
    .leftJoin("team.teamLead", "teamLead")
    .leftJoin("team.members", "teamMember")
    .leftJoin("teamMember.user", "teamUser")
    .leftJoin(Tasks, "task", "task.projectId = project.id")
    .select(["project.id", "project.name"])
    .distinct(true)
    .orderBy("project.name", "ASC");

  if (targetUserId) {
    qb.where(
      "teamLead.id = :targetUserId OR teamUser.id = :targetUserId OR task.assigneeId = :targetUserId OR task.helperId = :targetUserId",
      { targetUserId },
    );
  }

  const projects = await qb.getMany();
  return projects.map(({ id, name }) => ({ id, name }));
}

export async function getAvailableOpportunities(
  oppRepo: Repository<Opportunities>,
  targetUserId?: string,
) {
  const qb = oppRepo
    .createQueryBuilder("opportunity")
    .leftJoin("opportunity.createdBy", "createdBy")
    .leftJoin(Tasks, "task", "task.opportunityId = opportunity.id")
    .select([
      "opportunity.id",
      "opportunity.opportunityCode",
      "opportunity.name",
    ])
    .distinct(true)
    .orderBy("opportunity.opportunityCode", "ASC")
    .addOrderBy("opportunity.name", "ASC");

  if (targetUserId) {
    qb.where(
      "createdBy.id = :targetUserId OR task.assigneeId = :targetUserId OR task.helperId = :targetUserId",
      { targetUserId },
    );
  }

  const opportunities = await qb.getMany();
  return opportunities.map(({ id, opportunityCode, name }) => ({
    id,
    opportunityCode,
    name,
  }));
}

export async function getAvailableTasks(
  taskRepo: Repository<Tasks>,
  projectId?: string,
  opportunityId?: string,
) {
  const qb = taskRepo
    .createQueryBuilder("task")
    .select(["task.id", "task.code", "task.name", "task.nickname"])
    .orderBy("task.code", "ASC")
    .addOrderBy("task.name", "ASC");

  if (projectId) {
    qb.innerJoin("task.project", "project").where("project.id = :projectId", {
      projectId,
    });
  } else if (opportunityId) {
    qb.where("task.opportunityId = :opportunityId", { opportunityId });
  } else {
    return [];
  }

  const tasks = await qb.getMany();
  return tasks.map((t) => ({
    id: t.id,
    code: t.code,
    name: t.nickname || t.name,
  }));
}
