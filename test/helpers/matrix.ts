import { FixtureResolver } from './fixture-resolver';

export interface RoleMatrixOptions {
  allowedRoles: string[];
  deniedRoles: string[];
  action: (role: string, authUser: any) => Promise<any>;
  expectForbidden?: (role: string, err: any) => void;
  expectSuccess?: (role: string, result: any) => void;
}

/**
 * Helper thực thi ma trận RBAC G04 kiểm thử quyền truy cập theo vai trò
 */
export async function runRoleMatrix(options: RoleMatrixOptions): Promise<void> {
  const { allowedRoles, deniedRoles, action, expectForbidden, expectSuccess } = options;

  for (const role of allowedRoles) {
    const authUser = FixtureResolver.getAuthUser(role);
    try {
      const res = await action(role, authUser);
      if (expectSuccess) {
        expectSuccess(role, res);
      }
    } catch (err: any) {
      throw new Error(`Role ${role} is ALLOWED but execution failed: ${err?.message || err}`);
    }
  }

  for (const role of deniedRoles) {
    const authUser = FixtureResolver.getAuthUser(role);
    try {
      await action(role, authUser);
      throw new Error(`Role ${role} is DENIED but action succeeded without throwing ForbiddenException!`);
    } catch (err: any) {
      if (expectForbidden) {
        expectForbidden(role, err);
      } else {
        const status = err?.status || err?.statusCode;
        const msg = err?.message || '';
        const isForbidden = status === 403 || msg.includes('Forbidden') || msg.includes('FORBIDDEN');
        if (!isForbidden) {
          throw new Error(`Role ${role} threw unexpected non-forbidden error: ${err?.message}`);
        }
      }
    }
  }
}
