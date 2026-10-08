import { FIXTURE_IDS } from '../fixtures/fixture-ids';

export class FixtureResolver {
  /**
   * Lấy ID tài khoản theo Role enum hoặc role string
   */
  static getAccountIdByRole(role: string): string {
    const roleKey = role.toUpperCase();
    const map: Record<string, string> = {
      ADMIN: FIXTURE_IDS.ACCOUNTS.ADMIN,
      SUPER_ADMIN: FIXTURE_IDS.ACCOUNTS.ADMIN,
      DIRECTOR: FIXTURE_IDS.ACCOUNTS.DIRECTOR,
      BOD: FIXTURE_IDS.ACCOUNTS.DIRECTOR,
      FINANCE_MANAGER: FIXTURE_IDS.ACCOUNTS.FINANCE_MANAGER,
      FINANCE_SPECIALIST: FIXTURE_IDS.ACCOUNTS.ACCOUNTANT,
      ACCOUNTANT: FIXTURE_IDS.ACCOUNTS.ACCOUNTANT,
      CHIEF_ACCOUNTANT: FIXTURE_IDS.ACCOUNTS.FINANCE_MANAGER,
      HR_MANAGER: FIXTURE_IDS.ACCOUNTS.HR_MANAGER,
      HR_SPECIALIST: FIXTURE_IDS.ACCOUNTS.HR_SPECIALIST,
      HR: FIXTURE_IDS.ACCOUNTS.HR_SPECIALIST,
      SALES_MANAGER: FIXTURE_IDS.ACCOUNTS.SALES_MANAGER,
      SALES_SPECIALIST: FIXTURE_IDS.ACCOUNTS.SALES_1,
      SALES: FIXTURE_IDS.ACCOUNTS.SALES_1,
      TEAM_LEAD: FIXTURE_IDS.ACCOUNTS.TEAM_LEAD_1,
      LEAD: FIXTURE_IDS.ACCOUNTS.TEAM_LEAD_1,
      MEMBER: FIXTURE_IDS.ACCOUNTS.MEMBER_1,
      EMPLOYEE: FIXTURE_IDS.ACCOUNTS.MEMBER_1,
      DEV: FIXTURE_IDS.ACCOUNTS.MEMBER_1,
      QC: FIXTURE_IDS.ACCOUNTS.QC_LEAD,
      QC_LEAD: FIXTURE_IDS.ACCOUNTS.QC_LEAD,
      CUSTOMER: FIXTURE_IDS.ACCOUNTS.CUSTOMER_1,
      GUEST: '01TESTGUESTACCOUNT00000000',
    };

    return map[roleKey] || FIXTURE_IDS.ACCOUNTS.ADMIN;
  }

  /**
   * Lấy User ID tương ứng
   */
  static getUserIdByRole(role: string): string {
    const roleKey = role.toUpperCase();
    const map: Record<string, string> = {
      ADMIN: FIXTURE_IDS.USERS.ADMIN,
      DIRECTOR: FIXTURE_IDS.USERS.DIRECTOR,
      BOD: FIXTURE_IDS.USERS.DIRECTOR,
      FINANCE_MANAGER: FIXTURE_IDS.USERS.FINANCE_MANAGER,
      ACCOUNTANT: FIXTURE_IDS.USERS.ACCOUNTANT,
      HR_MANAGER: FIXTURE_IDS.USERS.HR_MANAGER,
      HR_SPECIALIST: FIXTURE_IDS.USERS.HR_SPECIALIST,
      SALES_MANAGER: FIXTURE_IDS.USERS.SALES_MANAGER,
      SALES: FIXTURE_IDS.USERS.SALES_1,
      TEAM_LEAD: FIXTURE_IDS.USERS.TEAM_LEAD_1,
      MEMBER: FIXTURE_IDS.USERS.MEMBER_1,
      QC: FIXTURE_IDS.USERS.QC_LEAD,
    };

    return map[roleKey] || FIXTURE_IDS.USERS.ADMIN;
  }

  /**
   * Lấy payload user giả lập cho AuthGuard / Request context
   */
  static getAuthUser(role: string): any {
    const accountId = this.getAccountIdByRole(role);
    const userId = this.getUserIdByRole(role);
    return {
      sub: accountId,
      id: accountId,
      userId: userId,
      email: `${role.toLowerCase()}@erp.test`,
      roles: [role],
      role: role,
    };
  }
}
