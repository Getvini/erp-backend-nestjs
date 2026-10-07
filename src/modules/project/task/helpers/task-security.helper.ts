import { ConflictException } from "@nestjs/common";
import { Not, IsNull } from "typeorm";
import { ProjectStatus } from "@modules/project/project-core/enums/project-status.enum";
import { ProjectTeam } from "@modules/project/project-core/entities/project-team.entity";
import { MemberRole } from "@modules/project/project-core/enums/member-role.enum";
import { UserRole } from "@modules/identity/user/enums/user-role.enum";
import { TaskStatus } from "@modules/project/task/enums/task-status.enum";

export type TaskActor = { id?: string; userId?: string; role?: string };

export const isManagementRole = (role?: string) => {
  return [UserRole.ADMIN, UserRole.BOD].includes(role as UserRole);
};

export const isProjectManagementRole = (role?: string) => {
  return [UserRole.ADMIN, UserRole.BOD, UserRole.PM].includes(role as UserRole);
};

export const memberHasRole = (member: any, role: MemberRole) => {
  if (!member?.roles) return false;
  return member.roles.some((r: any) => r.role === role);
};

export const assertTaskProjectNotOnHold = (
  task:
    | {
        project?: {
          id?: string;
          name?: string;
          status?: ProjectStatus;
          isOnHold?: boolean;
        } | null;
      }
    | null
    | undefined,
) => {
  if (
    task?.project?.status === ProjectStatus.ON_HOLD ||
    task?.project?.isOnHold
  ) {
    throw new ConflictException(
      "Dự án đang tạm dừng (ON_HOLD), không thể thực hiện thao tác",
    );
  }
};

export const assertTaskNotLocked = (
  task:
    | {
        status?: TaskStatus;
        project?: {
          id?: string;
          name?: string;
          status?: ProjectStatus;
          isOnHold?: boolean;
        } | null;
      }
    | null
    | undefined,
) => {
  if (!task) return;
  assertTaskProjectNotOnHold(task);

  const lockedStatuses = [
    TaskStatus.ACCEPTED,
    TaskStatus.COMPLETED,
    TaskStatus.CANCELLED,
    TaskStatus.ON_HOLD,
  ];
  if (task.status && lockedStatuses.includes(task.status)) {
    throw new ConflictException(
      `Công việc đã ở trạng thái "${task.status}", không thể chỉnh sửa`,
    );
  }
  if (
    task.project &&
    [
      ProjectStatus.COMPLETED,
      ProjectStatus.CANCELLED,
      ProjectStatus.ON_HOLD,
    ].includes(task.project.status as ProjectStatus)
  ) {
    throw new ConflictException(
      `Dự án đang ở trạng thái "${task.project.status}", không thể chỉnh sửa công việc`,
    );
  }
};

export const isProjectOperatorFromTeam = (
  team?: ProjectTeam | null,
  actor?: TaskActor,
) => {
  const actorUserId = actor?.userId || actor?.id;
  if (!actorUserId || !team) return false;

  if (actor?.role === UserRole.PM) {
    return (
      team.members?.some(
        (member) =>
          member.user?.id === actorUserId &&
          memberHasRole(member, MemberRole.PROJECT_MANAGER),
      ) ||
      team.members?.some((member) => member.user?.id === actorUserId) ||
      false
    );
  }

  if (team.teamLead?.id === actorUserId) return true;

  return (
    team.members?.some(
      (member) =>
        member.user?.id === actorUserId &&
        [MemberRole.ACCOUNT, MemberRole.PROJECT_MANAGER].some((role) =>
          memberHasRole(member, role),
        ),
    ) || false
  );
};

export const isProjectLeadFromTeam = (
  team?: ProjectTeam | null,
  actor?: TaskActor,
) => {
  const actorUserId = actor?.userId || actor?.id;
  if (!actorUserId || !team) return false;

  if (team.teamLead?.id === actorUserId) return true;

  return (
    team.members?.some(
      (member) =>
        member.user?.id === actorUserId &&
        memberHasRole(member, MemberRole.ACCOUNT),
    ) || false
  );
};

export const getTaskFilters = (userInfo?: TaskActor): any => {
  if (!userInfo) return {};
  const { role } = userInfo;
  const userId = userInfo.userId || userInfo.id;
  const projectOperatorFilters = [
    { project: { team: { teamLead: { id: userId } } } },
    {
      project: {
        team: {
          members: {
            user: { id: userId },
            roles: { role: MemberRole.ACCOUNT },
          },
        },
      },
    },
    {
      project: {
        team: {
          members: {
            user: { id: userId },
            roles: { role: MemberRole.PROJECT_MANAGER },
          },
        },
      },
    },
  ];

  if (isManagementRole(role)) {
    return {};
  }

  if (role === UserRole.PM) {
    return [
      {
        project: {
          team: {
            members: {
              user: { id: userId || "__UNLINKED_PM__" },
              roles: { role: MemberRole.PROJECT_MANAGER },
            },
          },
        },
      },
      {
        opportunityId: Not(IsNull()),
        opportunityServiceJob: { isBriefVideo: true },
      },
    ];
  }

  if (role === UserRole.BD) {
    return [
      { project: { contract: { createdBy: { id: userId } } } },
      { project: { contract: { customer: { createdBy: { id: userId } } } } },
      ...projectOperatorFilters,
    ];
  }

  return [
    { assignee: { id: userId } },
    { supervisor: { id: userId } },
    { helper: { id: userId } },
    ...projectOperatorFilters,
    { supportLeadId: userId },
  ];
};
