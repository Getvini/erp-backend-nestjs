import { MemberRole } from "@modules/project/project-core/enums/member-role.enum";

type UserRef = { id?: string | null } | null | undefined;
type TeamRef =
  | {
      teamLead?: UserRef;
      members?: Array<{
        user?: UserRef;
        roles?: any[];
      }>;
    }
  | null
  | undefined;

type TaskOutcomeAuthorizationInput = {
  assignerId?: string | null;
  assigner?: UserRef;
  assigneeId?: string | null;
  assignee?: UserRef;
  helperId?: string | null;
  helper?: UserRef;
  supervisor?: UserRef;
  project?: { team?: TeamRef } | null;
};

const idsMatch = (left?: string | null, right?: string | null) =>
  Boolean(left && right && String(left) === String(right));

export function canDecideTaskOutcome(
  task: TaskOutcomeAuthorizationInput,
  actorUserId?: string | null,
) {
  if (!actorUserId) return false;

  const assignerId = task.assignerId || task.assigner?.id;
  const performerIds = [
    task.assigneeId || task.assignee?.id,
    task.helperId || task.helper?.id,
  ].filter(Boolean) as string[];

  if (performerIds.some((id) => idsMatch(id, actorUserId))) return false;

  const isSelfAssigned = Boolean(
    assignerId && performerIds.some((id) => idsMatch(id, assignerId)),
  );
  if (!isSelfAssigned) return idsMatch(assignerId, actorUserId);

  const team = task.project?.team;

  return (
    team?.members?.some(
      (member) =>
        idsMatch(member.user?.id, actorUserId) &&
        (member.roles?.includes(MemberRole.ACCOUNT) ||
          member.roles?.includes(MemberRole.PROJECT_MANAGER)),
    ) || false
  );
}
