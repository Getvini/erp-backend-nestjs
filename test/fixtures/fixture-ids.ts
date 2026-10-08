/**
 * Helper sinh ULID chuẩn định dạng 26 ký tự hợp lệ với PostgreSQL varchar(26)
 */
export function makeUlid(tag: string, num: number = 1): string {
  const clean = tag.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
  const numStr = num.toString().padStart(26 - 4 - clean.length, "0");
  return `01ZZ${clean}${numStr}`;
}

export const FIXTURE_IDS = {
  // 1. Identity & RBAC (17 roles x 2 = 34 accounts + edge cases)
  USERS: {
    // Management
    BOD_1: makeUlid("USERBOD", 1),
    BOD_2: makeUlid("USERBOD", 2),
    ADMIN_1: makeUlid("USERADMIN", 1),
    ADMIN_2: makeUlid("USERADMIN", 2),
    PM_1: makeUlid("USERPM", 1),
    PM_2: makeUlid("USERPM", 2),

    // Sales
    ADMIN_SALE_1: makeUlid("USERADMSALE", 1),
    ADMIN_SALE_2: makeUlid("USERADMSALE", 2),
    BD_1: makeUlid("USERBD", 1),
    BD_2: makeUlid("USERBD", 2),

    // Content
    CONTENT_A_1: makeUlid("USERCONTA", 1),
    CONTENT_B_1: makeUlid("USERCONTB", 1),
    CONTENT_C_1: makeUlid("USERCONTC", 1),
    CONTENT_D_1: makeUlid("USERCONTD", 1),
    CONTENT_D_2: makeUlid("USERCONTD", 2),

    // Editor
    EDITOR_A_1: makeUlid("USEREDITA", 1),
    EDITOR_B_1: makeUlid("USEREDITB", 1),
    EDITOR_C_1: makeUlid("USEREDITC", 1),
    EDITOR_D_1: makeUlid("USEREDITD", 1),
    EDITOR_D_2: makeUlid("USEREDITD", 2),

    // Designer
    DESIGNER_A_1: makeUlid("USERDESA", 1),
    DESIGNER_B_1: makeUlid("USERDESB", 1),
    DESIGNER_C_1: makeUlid("USERDESC", 1),
    DESIGNER_D_1: makeUlid("USERDESD", 1),
    DESIGNER_D_2: makeUlid("USERDESD", 2),

    // Edge Cases
    LOCKED_USER: makeUlid("USERLOCKED", 1),
  },

  ACCOUNTS: {
    BOD_1: makeUlid("ACCBOD", 1),
    BOD_2: makeUlid("ACCBOD", 2),
    ADMIN_1: makeUlid("ACCADMIN", 1),
    ADMIN_2: makeUlid("ACCADMIN", 2),
    PM_1: makeUlid("ACCPM", 1),
    PM_2: makeUlid("ACCPM", 2),

    ADMIN_SALE_1: makeUlid("ACCADMSALE", 1),
    ADMIN_SALE_2: makeUlid("ACCADMSALE", 2),
    BD_1: makeUlid("ACCBD", 1),
    BD_2: makeUlid("ACCBD", 2),

    CONTENT_A_1: makeUlid("ACCCONTA", 1),
    CONTENT_B_1: makeUlid("ACCCONTB", 1),
    CONTENT_C_1: makeUlid("ACCCONTC", 1),
    CONTENT_D_1: makeUlid("ACCCONTD", 1),
    CONTENT_D_2: makeUlid("ACCCONTD", 2),

    EDITOR_A_1: makeUlid("ACCEDITA", 1),
    EDITOR_B_1: makeUlid("ACCEDITB", 1),
    EDITOR_C_1: makeUlid("ACCEDITC", 1),
    EDITOR_D_1: makeUlid("ACCEDITD", 1),
    EDITOR_D_2: makeUlid("ACCEDITD", 2),

    DESIGNER_A_1: makeUlid("ACCDESA", 1),
    DESIGNER_B_1: makeUlid("ACCDESB", 1),
    DESIGNER_C_1: makeUlid("ACCDESC", 1),
    DESIGNER_D_1: makeUlid("ACCDESD", 1),
    DESIGNER_D_2: makeUlid("ACCDESD", 2),

    // Edge accounts
    LOCKED_ACCOUNT: makeUlid("ACCLOCKED", 1),
    INACTIVE_ACCOUNT: makeUlid("ACCINACT", 1),
    UNATTACHED_ACCOUNT: makeUlid("ACCUNATTACH", 1),
    RICH_VINICOIN_ACCOUNT: makeUlid("ACCRICHCOIN", 1),
  },

  // 2. CRM Domain (20 Customers, 10 Vendors, 20 Services & Packages)
  CUSTOMERS: Array.from({ length: 20 }, (_, i) => makeUlid("CUST", i + 1)),
  VENDORS: Array.from({ length: 10 }, (_, i) => makeUlid("VEND", i + 1)),
  SERVICES: Array.from({ length: 15 }, (_, i) => makeUlid("SERV", i + 1)),
  SERVICE_PACKAGES: Array.from({ length: 5 }, (_, i) => makeUlid("SRVPKG", i + 1)),
  JOBS: Array.from({ length: 10 }, (_, i) => makeUlid("JOB", i + 1)),
  OPPORTUNITIES: Array.from({ length: 24 }, (_, i) => makeUlid("OPP", i + 1)),
  QUOTATIONS: Array.from({ length: 24 }, (_, i) => makeUlid("QUOT", i + 1)),

  // 3. Finance Domain (30 Contracts, 40 Milestones, 20 Payment Requests, 20 Debts)
  CONTRACTS: Array.from({ length: 30 }, (_, i) => makeUlid("CNTR", i + 1)),
  CONTRACT_SERVICES: Array.from({ length: 60 }, (_, i) => makeUlid("CNSRV", i + 1)),
  MILESTONES: Array.from({ length: 40 }, (_, i) => makeUlid("MILE", i + 1)),
  PAYMENT_REQUESTS: Array.from({ length: 20 }, (_, i) => makeUlid("PAYREQ", i + 1)),
  DEBTS: Array.from({ length: 20 }, (_, i) => makeUlid("DEBT", i + 1)),

  // 4. Project Domain (20 Projects, 10 Teams, 80+ Tasks, 20 Acceptance Requests)
  PROJECTS: Array.from({ length: 20 }, (_, i) => makeUlid("PROJ", i + 1)),
  PROJECT_TEAMS: Array.from({ length: 10 }, (_, i) => makeUlid("TEAM", i + 1)),
  TASKS: Array.from({ length: 80 }, (_, i) => makeUlid("TASK", i + 1)),
  ACCEPTANCE_REQUESTS: Array.from({ length: 20 }, (_, i) => makeUlid("ACCREQ", i + 1)),
  TASK_REVIEWS: Array.from({ length: 20 }, (_, i) => makeUlid("REVIEW", i + 1)),
};
