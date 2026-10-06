export enum UserRole {
  BOD = "BOD",
  ADMIN = "ADMIN",
  ADMIN_SALE = "ADMIN_SALE",
  BD = "BD",
  PM = "PM",
  CONTENT_A = "CONTENT_A",
  CONTENT_B = "CONTENT_B",
  CONTENT_C = "CONTENT_C",
  CONTENT_D = "CONTENT_D",
  EDITOR_A = "EDITOR_A",
  EDITOR_B = "EDITOR_B",
  EDITOR_C = "EDITOR_C",
  EDITOR_D = "EDITOR_D",
  DESIGNER_A = "DESIGNER_A",
  DESIGNER_B = "DESIGNER_B",
  DESIGNER_C = "DESIGNER_C",
  DESIGNER_D = "DESIGNER_D",
}

export const STAFF_ROLES = [
  UserRole.CONTENT_A,
  UserRole.CONTENT_B,
  UserRole.CONTENT_C,
  UserRole.CONTENT_D,
  UserRole.EDITOR_A,
  UserRole.EDITOR_B,
  UserRole.EDITOR_C,
  UserRole.EDITOR_D,
  UserRole.DESIGNER_A,
  UserRole.DESIGNER_B,
  UserRole.DESIGNER_C,
  UserRole.DESIGNER_D,
];

export const MANAGEMENT_ROLES = [UserRole.BOD, UserRole.ADMIN];
export const SALES_ROLES = [UserRole.BD, UserRole.ADMIN_SALE];
export const PROJECT_MANAGEMENT_ROLES = [
  UserRole.BOD,
  UserRole.ADMIN,
  UserRole.PM,
];

export const isStaffRole = (role?: string): role is UserRole =>
  STAFF_ROLES.includes(role as UserRole);
export const isManagementRole = (role?: string): role is UserRole =>
  MANAGEMENT_ROLES.includes(role as UserRole);
export const isProjectManagementRole = (role?: string): role is UserRole =>
  PROJECT_MANAGEMENT_ROLES.includes(role as UserRole);
