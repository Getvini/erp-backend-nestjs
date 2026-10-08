import { DataSource } from "typeorm";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import { UserRole } from "@modules/identity/user/enums/user-role.enum";
import { FIXTURE_IDS } from "./fixture-ids";

export interface FixtureAuthTokenContext {
  id: string; // Account ID
  userId: string; // User ID
  username: string;
  role: UserRole;
  fullName: string;
  token: string;
}

export class IdentityFixture {
  static cachedTokens: Record<string, FixtureAuthTokenContext> = {};

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

  static async seed(dataSource: DataSource): Promise<void> {
    const hashedPassword = await bcrypt.hash("123456", 10);

    const accountsData = [
      // 1. Management
      {
        userId: FIXTURE_IDS.USERS.BOD_1,
        accountId: FIXTURE_IDS.ACCOUNTS.BOD_1,
        username: "bod_director_1",
        fullName: "Nguyễn Anh Vinh (BOD 1)",
        role: UserRole.BOD,
        phone: "0901000001",
        vinicoin: 5000,
      },
      {
        userId: FIXTURE_IDS.USERS.BOD_2,
        accountId: FIXTURE_IDS.ACCOUNTS.BOD_2,
        username: "bod_director_2",
        fullName: "Trần Văn Bình (BOD 2)",
        role: UserRole.BOD,
        phone: "0901000002",
        vinicoin: 3000,
      },
      {
        userId: FIXTURE_IDS.USERS.ADMIN_1,
        accountId: FIXTURE_IDS.ACCOUNTS.ADMIN_1,
        username: "admin_master_1",
        fullName: "Hoàng Khánh Quang (Admin 1)",
        role: UserRole.ADMIN,
        phone: "0901000003",
        vinicoin: 1000,
      },
      {
        userId: FIXTURE_IDS.USERS.ADMIN_2,
        accountId: FIXTURE_IDS.ACCOUNTS.ADMIN_2,
        username: "admin_master_2",
        fullName: "Phạm Hải Đăng (Admin 2)",
        role: UserRole.ADMIN,
        phone: "0901000004",
        vinicoin: 1000,
      },
      {
        userId: FIXTURE_IDS.USERS.PM_1,
        accountId: FIXTURE_IDS.ACCOUNTS.PM_1,
        username: "pm_lead_1",
        fullName: "Ngô Quốc Bi (PM 1)",
        role: UserRole.PM,
        phone: "0901000005",
        vinicoin: 2000,
      },
      {
        userId: FIXTURE_IDS.USERS.PM_2,
        accountId: FIXTURE_IDS.ACCOUNTS.PM_2,
        username: "pm_lead_2",
        fullName: "Lê Kim Khánh (PM 2)",
        role: UserRole.PM,
        phone: "0901000006",
        vinicoin: 1500,
      },

      // 2. Sales
      {
        userId: FIXTURE_IDS.USERS.ADMIN_SALE_1,
        accountId: FIXTURE_IDS.ACCOUNTS.ADMIN_SALE_1,
        username: "adminsale_lead_1",
        fullName: "Lê Mỹ Thạnh (Admin Sale 1)",
        role: UserRole.ADMIN_SALE,
        phone: "0901000007",
        vinicoin: 500,
      },
      {
        userId: FIXTURE_IDS.USERS.ADMIN_SALE_2,
        accountId: FIXTURE_IDS.ACCOUNTS.ADMIN_SALE_2,
        username: "adminsale_lead_2",
        fullName: "Vũ Thùy Linh (Admin Sale 2)",
        role: UserRole.ADMIN_SALE,
        phone: "0901000008",
        vinicoin: 500,
      },
      {
        userId: FIXTURE_IDS.USERS.BD_1,
        accountId: FIXTURE_IDS.ACCOUNTS.BD_1,
        username: "bd_executive_1",
        fullName: "Đinh Hoàng Hải (BD 1)",
        role: UserRole.BD,
        phone: "0901000009",
        vinicoin: 400,
      },
      {
        userId: FIXTURE_IDS.USERS.BD_2,
        accountId: FIXTURE_IDS.ACCOUNTS.BD_2,
        username: "bd_executive_2",
        fullName: "Ngô Thị Mai (BD 2)",
        role: UserRole.BD,
        phone: "0901000010",
        vinicoin: 400,
      },

      // 3. Content
      {
        userId: FIXTURE_IDS.USERS.CONTENT_A_1,
        accountId: FIXTURE_IDS.ACCOUNTS.CONTENT_A_1,
        username: "content_senior_a",
        fullName: "Đỗ Hải Yến (Content A)",
        role: UserRole.CONTENT_A,
        phone: "0901000011",
        vinicoin: 800,
      },
      {
        userId: FIXTURE_IDS.USERS.CONTENT_B_1,
        accountId: FIXTURE_IDS.ACCOUNTS.CONTENT_B_1,
        username: "content_mid_b",
        fullName: "Trần Bảo Nam (Content B)",
        role: UserRole.CONTENT_B,
        phone: "0901000012",
        vinicoin: 600,
      },
      {
        userId: FIXTURE_IDS.USERS.CONTENT_C_1,
        accountId: FIXTURE_IDS.ACCOUNTS.CONTENT_C_1,
        username: "content_junior_c",
        fullName: "Lý Gia Hân (Content C)",
        role: UserRole.CONTENT_C,
        phone: "0901000013",
        vinicoin: 400,
      },
      {
        userId: FIXTURE_IDS.USERS.CONTENT_D_1,
        accountId: FIXTURE_IDS.ACCOUNTS.CONTENT_D_1,
        username: "content_staff_d1",
        fullName: "Phan Quý Lâm (Content D1)",
        role: UserRole.CONTENT_D,
        phone: "0901000014",
        vinicoin: 200,
      },
      {
        userId: FIXTURE_IDS.USERS.CONTENT_D_2,
        accountId: FIXTURE_IDS.ACCOUNTS.CONTENT_D_2,
        username: "content_staff_d2",
        fullName: "Phan Thị Đoan Trang (Content D2)",
        role: UserRole.CONTENT_D,
        phone: "0901000015",
        vinicoin: 200,
      },

      // 4. Editor
      {
        userId: FIXTURE_IDS.USERS.EDITOR_A_1,
        accountId: FIXTURE_IDS.ACCOUNTS.EDITOR_A_1,
        username: "editor_senior_a",
        fullName: "Bùi Tiến Đạt (Editor A)",
        role: UserRole.EDITOR_A,
        phone: "0901000016",
        vinicoin: 900,
      },
      {
        userId: FIXTURE_IDS.USERS.EDITOR_B_1,
        accountId: FIXTURE_IDS.ACCOUNTS.EDITOR_B_1,
        username: "editor_mid_b",
        fullName: "Dương Minh Trí (Editor B)",
        role: UserRole.EDITOR_B,
        phone: "0901000017",
        vinicoin: 600,
      },
      {
        userId: FIXTURE_IDS.USERS.EDITOR_C_1,
        accountId: FIXTURE_IDS.ACCOUNTS.EDITOR_C_1,
        username: "editor_junior_c",
        fullName: "Nguyễn Thu Thảo (Editor C)",
        role: UserRole.EDITOR_C,
        phone: "0901000018",
        vinicoin: 400,
      },
      {
        userId: FIXTURE_IDS.USERS.EDITOR_D_1,
        accountId: FIXTURE_IDS.ACCOUNTS.EDITOR_D_1,
        username: "editor_staff_d1",
        fullName: "Đỗ Quốc Hùng (Editor D1)",
        role: UserRole.EDITOR_D,
        phone: "0901000019",
        vinicoin: 200,
      },
      {
        userId: FIXTURE_IDS.USERS.EDITOR_D_2,
        accountId: FIXTURE_IDS.ACCOUNTS.EDITOR_D_2,
        username: "editor_staff_d2",
        fullName: "Nguyễn Thị Trâm (Editor D2)",
        role: UserRole.EDITOR_D,
        phone: "0901000020",
        vinicoin: 200,
      },

      // 5. Designer
      {
        userId: FIXTURE_IDS.USERS.DESIGNER_A_1,
        accountId: FIXTURE_IDS.ACCOUNTS.DESIGNER_A_1,
        username: "designer_senior_a",
        fullName: "Phạm Hồng Quân (Designer A)",
        role: UserRole.DESIGNER_A,
        phone: "0901000021",
        vinicoin: 900,
      },
      {
        userId: FIXTURE_IDS.USERS.DESIGNER_B_1,
        accountId: FIXTURE_IDS.ACCOUNTS.DESIGNER_B_1,
        username: "designer_mid_b",
        fullName: "Vũ Ngọc Ánh (Designer B)",
        role: UserRole.DESIGNER_B,
        phone: "0901000022",
        vinicoin: 600,
      },
      {
        userId: FIXTURE_IDS.USERS.DESIGNER_C_1,
        accountId: FIXTURE_IDS.ACCOUNTS.DESIGNER_C_1,
        username: "designer_junior_c",
        fullName: "Lê Hoàng Long (Designer C)",
        role: UserRole.DESIGNER_C,
        phone: "0901000023",
        vinicoin: 400,
      },
      {
        userId: FIXTURE_IDS.USERS.DESIGNER_D_1,
        accountId: FIXTURE_IDS.ACCOUNTS.DESIGNER_D_1,
        username: "designer_staff_d1",
        fullName: "Nguyễn Thị Minh Phương (Designer D1)",
        role: UserRole.DESIGNER_D,
        phone: "0901000024",
        vinicoin: 200,
      },
      {
        userId: FIXTURE_IDS.USERS.DESIGNER_D_2,
        accountId: FIXTURE_IDS.ACCOUNTS.DESIGNER_D_2,
        username: "designer_staff_d2",
        fullName: "Võ Phương Tâm (Designer D2)",
        role: UserRole.DESIGNER_D,
        phone: "0901000025",
        vinicoin: 200,
      },
    ];

    // Chèn Users và Accounts
    for (const item of accountsData) {
      await dataSource.query(
        `INSERT INTO users (id, "fullName", "phoneNumber", "isLocked") VALUES ($1, $2, $3, false)`,
        [item.userId, item.fullName, item.phone],
      );

      await dataSource.query(
        `INSERT INTO accounts (id, username, password, email, role, "isActive", vinicoin, "userId") 
         VALUES ($1, $2, $3, $4, $5, true, $6, $7)`,
        [
          item.accountId,
          item.username,
          hashedPassword,
          `${item.username}@erp-test.vn`,
          item.role,
          item.vinicoin,
          item.userId,
        ],
      );

      // Cache token
      this.cachedTokens[item.role] = {
        id: item.accountId,
        userId: item.userId,
        username: item.username,
        role: item.role,
        fullName: item.fullName,
        token: this.generateToken({
          id: item.accountId,
          userId: item.userId,
          username: item.username,
          role: item.role,
          email: `${item.username}@erp-test.vn`,
        }),
      };
    }

    // Edge Cases:
    // 1. User bị khóa
    await dataSource.query(
      `INSERT INTO users (id, "fullName", "phoneNumber", "isLocked") VALUES ($1, 'Tài Khoản Bị Khóa', '0901000099', true)`,
      [FIXTURE_IDS.USERS.LOCKED_USER],
    );
    await dataSource.query(
      `INSERT INTO accounts (id, username, password, email, role, "isActive", "userId") VALUES ($1, 'locked_user', $2, 'locked@erp.vn', 'CONTENT_D', true, $3)`,
      [FIXTURE_IDS.ACCOUNTS.LOCKED_ACCOUNT, hashedPassword, FIXTURE_IDS.USERS.LOCKED_USER],
    );

    // 2. Account không active
    await dataSource.query(
      `INSERT INTO accounts (id, username, password, email, role, "isActive", "userId") VALUES ($1, 'inactive_user', $2, 'inactive@erp.vn', 'CONTENT_D', false, $3)`,
      [FIXTURE_IDS.ACCOUNTS.INACTIVE_ACCOUNT, hashedPassword, FIXTURE_IDS.USERS.CONTENT_D_2],
    );

    // 3. Account không có user profile
    await dataSource.query(
      `INSERT INTO accounts (id, username, password, email, role, "isActive", "userId") VALUES ($1, 'orphan_account', $2, 'orphan@erp.vn', 'ADMIN', true, null)`,
      [FIXTURE_IDS.ACCOUNTS.UNATTACHED_ACCOUNT, hashedPassword],
    );

    console.log(`-> Đã seed thành công ${accountsData.length + 3} tài khoản và nhân sự vào identity!`);
  }

  static getTokens() {
    return this.cachedTokens;
  }
}
