import { UserRole } from "../../../identity/user/enums/user-role.enum";

export const ACCEPTANCE_APPROVER_ROLES: (UserRole | string)[] = [
  UserRole.BOD,
  UserRole.ADMIN,
  UserRole.ADMIN_SALE,
  "BOD",
  "ADMIN",
  "ADMIN_SALE",
];

export const isAcceptanceApprover = (role?: string): boolean => {
  if (!role) return false;
  return ACCEPTANCE_APPROVER_ROLES.includes(role);
};
