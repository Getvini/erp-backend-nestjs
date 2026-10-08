import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Reflector, APP_GUARD } from "@nestjs/core";
import { DataSource } from "typeorm";
import * as jwt from "jsonwebtoken";
import { AppModule } from "@src/app.module";
import { JwtAuthGuard } from "@core/guards/jwt-auth.guard";
import { RolesGuard } from "@core/guards/roles.guard";
import { AllExceptionsFilter } from "@core/filters/all-exceptions.filter";
import { TransformInterceptor } from "@core/interceptors/transform.interceptor";
import { UserRole } from "@modules/identity/user/enums/user-role.enum";
import { Users } from "@modules/identity/user/entities/user.entity";
import { Accounts } from "@modules/identity/auth/entities/account.entity";

import { ThrottlerGuard } from "@nestjs/throttler";

export interface TestUserContext {
  id: string; // Account ID
  userId: string; // User ID
  username: string;
  role: UserRole;
  fullName: string;
  token: string;
}

export interface RealRoleUsers {
  admin: TestUserContext;
  bod: TestUserContext;
  pm: TestUserContext;
  adminSale: TestUserContext;
  bd: TestUserContext;
  staffContent: TestUserContext;
  staffDesigner: TestUserContext;
}

export class TestDbHelper {
  private static appInstance: INestApplication | null = null;
  private static dataSourceInstance: DataSource | null = null;
  private static cachedRoleUsers: RealRoleUsers | null = null;

  /**
   * Khởi tạo NestJS Application dùng cho Tests với erp_test DB
   */
  static async createTestingApp(): Promise<{
    app: INestApplication;
    dataSource: DataSource;
  }> {
    if (this.appInstance && this.dataSourceInstance) {
      return {
        app: this.appInstance,
        dataSource: this.dataSourceInstance,
      };
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideProvider(APP_GUARD)
      .useValue({ canActivate: () => true })
      .compile();

    const app = moduleFixture.createNestApplication();

    // 1. Đồng bộ cấu hình Global ValidationPipe như main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    // 2. Đồng bộ Filters & Interceptors
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());

    // 3. Đồng bộ Global Guards RBAC
    const reflector = app.get(Reflector);
    app.useGlobalGuards(new JwtAuthGuard(reflector), new RolesGuard(reflector));

    await app.init();

    const dataSource = app.get(DataSource);

    this.appInstance = app;
    this.dataSourceInstance = dataSource;

    return { app, dataSource };
  }

  /**
   * Đóng ứng dụng và giải phóng kết nối database
   */
  static async closeTestingApp(): Promise<void> {
    if (this.appInstance) {
      await this.appInstance.close();
      this.appInstance = null;
      this.dataSourceInstance = null;
      this.cachedRoleUsers = null;
    }
  }

  /**
   * Tạo JWT Token chuẩn để test theo role
   */
  static generateToken(payload: {
    id: string;
    userId: string;
    username: string;
    role: UserRole;
    email?: string;
  }): string {
    const secret =
      process.env.JWT_SECRET || "PHONGVANTMALABIET_TEST_SECRET";
    return jwt.sign(payload, secret, { expiresIn: "1d" });
  }

  /**
   * Lấy danh sách các tài khoản thật từ database erp_test (đã clone từ erp_local)
   * và sinh sẵn JWT Token cho từng role
   */
  static async getRealRoleUsers(dataSource: DataSource): Promise<RealRoleUsers> {
    if (this.cachedRoleUsers) {
      return this.cachedRoleUsers;
    }

    const query = `
      SELECT a.id, a.username, a.role, a."userId", u."fullName", a.email
      FROM accounts a
      LEFT JOIN users u ON a."userId" = u.id
      WHERE a."userId" IS NOT NULL
    `;
    const accounts = await dataSource.query(query);

    const findByRole = (role: UserRole, username?: string): TestUserContext => {
      const match = accounts.find((acc: any) =>
        acc.role === role && (!username || acc.username === username),
      ) || accounts.find((acc: any) => acc.role === role);

      if (!match) {
        throw new Error(`Không tìm thấy tài khoản thật với role ${role} trong erp_test`);
      }

      const token = this.generateToken({
        id: match.id,
        userId: match.userId,
        username: match.username,
        role: match.role as UserRole,
        email: match.email || `${match.username}@vini.vn`,
      });

      return {
        id: match.id,
        userId: match.userId,
        username: match.username,
        role: match.role as UserRole,
        fullName: match.fullName || match.username,
        token,
      };
    };

    this.cachedRoleUsers = {
      admin: findByRole(UserRole.ADMIN, "admin_master_1"),
      bod: findByRole(UserRole.BOD, "bod_director_1"),
      pm: findByRole(UserRole.PM, "pm_lead_1"),
      adminSale: findByRole(UserRole.ADMIN_SALE, "adminsale_lead_1"),
      bd: findByRole(UserRole.BD, "bd_executive_1"),
      staffContent: findByRole(UserRole.CONTENT_D, "content_staff_d1"),
      staffDesigner: findByRole(UserRole.DESIGNER_D, "designer_staff_d1"),
    };

    return this.cachedRoleUsers;
  }
}
