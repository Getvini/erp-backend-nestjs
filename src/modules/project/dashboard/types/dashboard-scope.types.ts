import { HttpException, HttpStatus } from "@nestjs/common";
import { UserRole } from "../../../identity/user/enums/user-role.enum";
import { ProjectStatus } from "../../project-core/enums/project-status.enum";

export enum DashboardScopeType {
  PERSONAL = "PERSONAL",
  MANAGEMENT = "MANAGEMENT",
  SYSTEM = "SYSTEM",
}

export class DashboardScopeError extends HttpException {
  constructor(
    message: string,
    public readonly statusCode = HttpStatus.FORBIDDEN,
  ) {
    super({ message }, statusCode);
    this.name = "DashboardScopeError";
  }
}

export interface DashboardScopeInput {
  viewerUserId: string;
  viewerRole: UserRole;
  isAccountViewer?: boolean;
  requestedUserId?: string;
  requestedProjectId?: string;
  managedProjectIds: string[];
  managedMemberIds: string[];
  personalProjectIds: string[];
  targetPersonalProjectIds: string[];
  systemProjectIds: string[];
  systemMemberIds: string[];
  mode?: "personal" | "management";
}

export interface ResolvedDashboardScope {
  type: DashboardScopeType;
  targetUserId: string;
  projectIds: string[];
  memberIds: string[];
  selectedProjectId?: string;
  canSelectMembers: boolean;
  isAccountViewer?: boolean;
  isAccountViewingMember?: boolean;
  mode?: "personal" | "management";
}

export type DashboardActor = {
  id: string;
  userId?: string;
  role: UserRole;
};

export type DashboardProjectOption = {
  id: string;
  name: string;
  status: ProjectStatus;
  clientName?: string;
};

export type DashboardMemberOption = {
  id: string;
  role: string;
  user: {
    id: string;
    fullName: string;
    role?: string;
  };
};

export type DashboardScopeContext = ResolvedDashboardScope & {
  viewerUserId: string;
  viewerRole: UserRole;
  availableProjects: DashboardProjectOption[];
  availableMembers: DashboardMemberOption[];
  activeProjects?: any[];
};

export function selectDashboardWorkItems<T>(
  scopeType: DashboardScopeType,
  personalItems: T[],
  scopedItems: T[],
): T[] {
  return scopeType === DashboardScopeType.PERSONAL
    ? personalItems
    : scopedItems;
}

const unique = (ids: string[]) => Array.from(new Set(ids.filter(Boolean)));

const intersection = (left: string[], right: string[]) => {
  const allowed = new Set(right);
  return unique(left).filter((id) => allowed.has(id));
};

export function resolveDashboardScope(
  input: DashboardScopeInput,
): ResolvedDashboardScope {
  const isSystemViewer = [UserRole.ADMIN, UserRole.BOD].includes(
    input.viewerRole,
  );
  const isPMViewer = input.viewerRole === UserRole.PM;
  const isExcludedSaleRole = [UserRole.BD, UserRole.ADMIN_SALE].includes(
    input.viewerRole,
  );
  const isAccountViewer = !isExcludedSaleRole && Boolean(input.isAccountViewer);
  const hasManagementScope =
    !isExcludedSaleRole && (isPMViewer || input.managedProjectIds.length > 0);
  const canSelectMembers =
    !isExcludedSaleRole && (isSystemViewer || hasManagementScope);
  const requestedAnotherUser = Boolean(
    input.requestedUserId && input.requestedUserId !== input.viewerUserId,
  );

  let type: DashboardScopeType;
  let targetUserId = input.viewerUserId;
  let projectIds: string[];
  let memberIds: string[];

  if (isSystemViewer) {
    type = DashboardScopeType.SYSTEM;
    projectIds = unique(input.systemProjectIds);
    memberIds = unique(input.systemMemberIds);
  } else if (isPMViewer && input.mode !== "personal") {
    type = DashboardScopeType.MANAGEMENT;
    projectIds = unique(input.managedProjectIds);
    memberIds = unique([input.viewerUserId, ...input.managedMemberIds]);
  } else {
    type = DashboardScopeType.PERSONAL;
    projectIds = unique(input.personalProjectIds);
    memberIds = canSelectMembers
      ? unique([input.viewerUserId, ...input.managedMemberIds])
      : [input.viewerUserId];
  }

  let isAccountViewingMember = false;

  if (requestedAnotherUser) {
    if (!canSelectMembers || !memberIds.includes(input.requestedUserId!)) {
      throw new DashboardScopeError(
        "Bạn không có quyền xem dashboard của nhân sự này",
      );
    }

    targetUserId = input.requestedUserId!;
    type = DashboardScopeType.PERSONAL;
    projectIds = isSystemViewer
      ? unique(input.targetPersonalProjectIds)
      : intersection(input.targetPersonalProjectIds, input.managedProjectIds);

    if (isAccountViewer && !isSystemViewer && !isPMViewer) {
      isAccountViewingMember = true;
    }
  }

  if (
    input.requestedProjectId &&
    !projectIds.includes(input.requestedProjectId)
  ) {
    throw new DashboardScopeError(
      "Dự án không thuộc phạm vi dashboard được phép xem",
    );
  }

  return {
    type,
    targetUserId,
    projectIds,
    memberIds,
    selectedProjectId: input.requestedProjectId,
    canSelectMembers,
    isAccountViewer,
    isAccountViewingMember,
    mode:
      input.mode ||
      (type === DashboardScopeType.MANAGEMENT ? "management" : "personal"),
  };
}
