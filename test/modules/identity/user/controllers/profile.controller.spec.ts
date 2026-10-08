import { INestApplication } from "@nestjs/common";
import { DataSource } from "typeorm";
import * as request from "supertest";
import * as bcrypt from "bcrypt";
import {
  TestDbHelper,
  RealRoleUsers,
} from "@test/utils/test-db.helper";
import { FIXTURE_IDS } from "@test/fixtures/fixture-ids";
import { UserRole } from "@modules/identity/user/enums/user-role.enum";

describe("ProfileController (Đầy đủ 10 nhóm kiểm thử trên erp_test)", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let roles: RealRoleUsers;

  beforeAll(async () => {
    const context = await TestDbHelper.createTestingApp();
    app = context.app;
    dataSource = context.dataSource;
    roles = await TestDbHelper.getRealRoleUsers(dataSource);
  });

  afterAll(async () => {
    await TestDbHelper.closeTestingApp();
  });

  // =========================================================================
  // 1. ENDPOINT: GET /me (Lấy thông tin cá nhân)
  // =========================================================================
  describe("1. GET /me (Xem thông tin cá nhân)", () => {
    it("TC-PROF-001 [Happy path]: Nhân viên Content D lấy profile thành công (200)", async () => {
      const res = await request(app.getHttpServer())
        .get("/me")
        .set("Authorization", `Bearer ${roles.staffContent.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();
      expect(body.accountId).toEqual(roles.staffContent.id);
      expect(body.username).toEqual(roles.staffContent.username);
      expect(body.role).toEqual(UserRole.CONTENT_D);
      expect(body.vinicoin).toBeDefined();
    });

    it("TC-PROF-002 [Happy path]: Admin lấy profile cá nhân thành công (200)", async () => {
      const res = await request(app.getHttpServer())
        .get("/me")
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(body.accountId).toEqual(roles.admin.id);
      expect(body.role).toEqual(UserRole.ADMIN);
    });

    it("TC-PROF-003 [Authentication]: Không gửi token bị từ chối 401", async () => {
      await request(app.getHttpServer()).get("/me").expect(401);
    });

    it("TC-PROF-004 [Authentication]: Gửi token giả mạo bị từ chối 401", async () => {
      await request(app.getHttpServer())
        .get("/me")
        .set("Authorization", "Bearer invalid.fake.token")
        .expect(401);
    });

    it("TC-PROF-005 [Security]: Payload trả về tuyệt đối KHÔNG chứa hash password", async () => {
      const res = await request(app.getHttpServer())
        .get("/me")
        .set("Authorization", `Bearer ${roles.pm.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(body.password).toBeUndefined();
      if (body.account) {
        expect(body.account.password).toBeUndefined();
      }
    });

    it("TC-PROF-006 [Not found]: Token của account không tồn tại trong DB bị từ chối 404", async () => {
      const ghostToken = TestDbHelper.generateToken({
        id: "01ZZNONEXISTENTACC00000001",
        userId: "01ZZNONEXISTENTUSER00000001",
        username: "ghost_user",
        role: UserRole.CONTENT_D,
      });

      await request(app.getHttpServer())
        .get("/me")
        .set("Authorization", `Bearer ${ghostToken}`)
        .expect(404);
    });

    it("TC-PROF-007 [Edge case]: Tài khoản orphan (không có user entity) xem profile an toàn không crash", async () => {
      const orphanToken = TestDbHelper.generateToken({
        id: FIXTURE_IDS.ACCOUNTS.UNATTACHED_ACCOUNT,
        userId: "",
        username: "orphan_account",
        role: UserRole.ADMIN,
      });

      const res = await request(app.getHttpServer())
        .get("/me")
        .set("Authorization", `Bearer ${orphanToken}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(body.accountId).toEqual(FIXTURE_IDS.ACCOUNTS.UNATTACHED_ACCOUNT);
      expect(body.username).toEqual("orphan_account");
      expect(body.userId).toBeUndefined();
    });
  });

  // =========================================================================
  // 2. ENDPOINT: PATCH /me (Cập nhật hồ sơ cá nhân)
  // =========================================================================
  describe("2. PATCH /me (Cập nhật hồ sơ cá nhân)", () => {
    it("TC-PROF-008 [Happy path]: Cập nhật họ tên tiếng Việt có dấu & ngày sinh thành công (200)", async () => {
      const newName = "Phan Quý Lâm Cập Nhật Mới";
      const newBirthday = "1998-05-15";

      const res = await request(app.getHttpServer())
        .patch("/me")
        .set("Authorization", `Bearer ${roles.staffContent.token}`)
        .send({
          fullName: newName,
          birthday: newBirthday,
        })
        .expect(200);

      const body = res.body.data || res.body;
      expect(body.fullName).toEqual(newName);
      expect(body.birthday).toEqual(newBirthday);

      // Phục hồi lại họ tên gốc
      await request(app.getHttpServer())
        .patch("/me")
        .set("Authorization", `Bearer ${roles.staffContent.token}`)
        .send({ fullName: roles.staffContent.fullName });
    });

    it("TC-PROF-009 [Authentication]: Không gửi token khi cập nhật profile bị 401", async () => {
      await request(app.getHttpServer())
        .patch("/me")
        .send({ fullName: "Cố Tình Đổi Khi Chưa Đăng Nhập" })
        .expect(401);
    });

    it("TC-PROF-010 [Not found]: Tài khoản orphan không có profile nhân sự cố gắng cập nhật trả về 404", async () => {
      const orphanToken = TestDbHelper.generateToken({
        id: FIXTURE_IDS.ACCOUNTS.UNATTACHED_ACCOUNT,
        userId: "",
        username: "orphan_account",
        role: UserRole.ADMIN,
      });

      await request(app.getHttpServer())
        .patch("/me")
        .set("Authorization", `Bearer ${orphanToken}`)
        .send({ fullName: "Orphan Cập Nhật" })
        .expect(404);
    });

    it("TC-PROF-011 [Security / Mass Assignment]: Cố tình gửi 'role' và 'vinicoin' không được ghi đè", async () => {
      const originalRole = roles.staffContent.role;
      await request(app.getHttpServer())
        .patch("/me")
        .set("Authorization", `Bearer ${roles.staffContent.token}`)
        .send({
          role: UserRole.ADMIN,
          vinicoin: 999999,
          fullName: roles.staffContent.fullName,
        })
        .expect(200);

      // Kiểm tra lại qua GET /me: role và vinicoin không bị thay đổi
      const checkRes = await request(app.getHttpServer())
        .get("/me")
        .set("Authorization", `Bearer ${roles.staffContent.token}`)
        .expect(200);

      const profile = checkRes.body.data || checkRes.body;
      expect(profile.role).toEqual(originalRole);
      expect(profile.vinicoin).not.toEqual(999999);
    });

    it("TC-PROF-012 [Edge case]: Gửi body rỗng {} không làm mất dữ liệu hiện tại", async () => {
      const res = await request(app.getHttpServer())
        .patch("/me")
        .set("Authorization", `Bearer ${roles.staffContent.token}`)
        .send({})
        .expect(200);

      const body = res.body.data || res.body;
      expect(body.fullName).toBeDefined();
    });
  });

  // =========================================================================
  // 3. ENDPOINT: POST /me/change-password (Đổi mật khẩu)
  // =========================================================================
  describe("3. POST /me/change-password (Đổi mật khẩu)", () => {
    it("TC-PROF-013 [Validation]: Thiếu oldPassword trả về lỗi 400", async () => {
      await request(app.getHttpServer())
        .post("/me/change-password")
        .set("Authorization", `Bearer ${roles.staffDesigner.token}`)
        .send({ newPassword: "NewSecretPassword123" })
        .expect(400);
    });

    it("TC-PROF-014 [Validation]: Thiếu newPassword trả về lỗi 400", async () => {
      await request(app.getHttpServer())
        .post("/me/change-password")
        .set("Authorization", `Bearer ${roles.staffDesigner.token}`)
        .send({ oldPassword: "123456" })
        .expect(400);
    });

    it("TC-PROF-015 [Validation]: newPassword dưới 6 ký tự trả về lỗi 400", async () => {
      await request(app.getHttpServer())
        .post("/me/change-password")
        .set("Authorization", `Bearer ${roles.staffDesigner.token}`)
        .send({ oldPassword: "123456", newPassword: "123" })
        .expect(400);
    });

    it("TC-PROF-016 [Authentication]: Không gửi token khi đổi mật khẩu bị 401", async () => {
      await request(app.getHttpServer())
        .post("/me/change-password")
        .send({ oldPassword: "123456", newPassword: "NewPassword123" })
        .expect(401);
    });

    it("TC-PROF-017 [Happy path & Side effect]: Đổi mật khẩu đúng & phục hồi lại nguyên trạng", async () => {
      const accountId = roles.staffDesigner.id;

      // Đảm bảo mật khẩu hiện tại trong DB là hash của 123456
      const defaultHash = await bcrypt.hash("123456", 10);
      await dataSource.query(
        `UPDATE accounts SET password = $1 WHERE id = $2`,
        [defaultHash, accountId],
      );

      // 1. Nhập sai oldPassword bị từ chối 401 Unauthorized
      await request(app.getHttpServer())
        .post("/me/change-password")
        .set("Authorization", `Bearer ${roles.staffDesigner.token}`)
        .send({
          oldPassword: "WRONG_OLD_PASSWORD",
          newPassword: "BrandNewPassword@2026",
        })
        .expect(401);

      // 2. Nhập đúng oldPassword -> đổi thành công (201 / 200)
      const res = await request(app.getHttpServer())
        .post("/me/change-password")
        .set("Authorization", `Bearer ${roles.staffDesigner.token}`)
        .send({
          oldPassword: "123456",
          newPassword: "BrandNewPassword@2026",
        });

      expect([200, 201]).toContain(res.status);
      const body = res.body.data || res.body;
      expect(body.message).toContain("thành công");

      // 3. Xác minh trong database: mật khẩu mới đã được băm bcrypt
      const accountInDb = await dataSource.query(
        `SELECT password FROM accounts WHERE id = $1`,
        [accountId],
      );
      const isNewMatch = await bcrypt.compare(
        "BrandNewPassword@2026",
        accountInDb[0].password,
      );
      expect(isNewMatch).toBe(true);

      // 4. Phục hồi lại mật khẩu 123456 để không ảnh hưởng dữ liệu test chung
      await dataSource.query(
        `UPDATE accounts SET password = $1 WHERE id = $2`,
        [defaultHash, accountId],
      );
    });
  });
});
