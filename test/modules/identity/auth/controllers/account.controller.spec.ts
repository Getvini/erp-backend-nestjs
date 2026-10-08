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

describe("AccountController (Đầy đủ 10 nhóm kiểm thử trên erp_test)", () => {
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
  // 1. ENDPOINT: GET /accounts (Danh sách tài khoản)
  // =========================================================================
  describe("1. GET /accounts (Danh sách tài khoản)", () => {
    it("TC-ACCT-001 [Happy path]: Admin lấy danh sách tài khoản thành công (200)", async () => {
      const res = await request(app.getHttpServer())
        .get("/accounts")
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
      expect(body[0].username).toBeDefined();
    });

    it("TC-ACCT-002 [Happy path]: BOD lấy danh sách tài khoản thành công (200)", async () => {
      const res = await request(app.getHttpServer())
        .get("/accounts")
        .set("Authorization", `Bearer ${roles.bod.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(Array.isArray(body)).toBe(true);
    });

    it("TC-ACCT-003 [Authorization]: PM truy cập danh sách tài khoản bị từ chối 403", async () => {
      await request(app.getHttpServer())
        .get("/accounts")
        .set("Authorization", `Bearer ${roles.pm.token}`)
        .expect(403);
    });

    it("TC-ACCT-004 [Authorization]: Nhân viên Content D truy cập bị từ chối 403", async () => {
      await request(app.getHttpServer())
        .get("/accounts")
        .set("Authorization", `Bearer ${roles.staffContent.token}`)
        .expect(403);
    });

    it("TC-ACCT-005 [Authentication]: Không gửi token bị từ chối 401", async () => {
      await request(app.getHttpServer()).get("/accounts").expect(401);
    });
  });

  // =========================================================================
  // 2. ENDPOINT: GET /accounts/:id (Chi tiết tài khoản)
  // =========================================================================
  describe("2. GET /accounts/:id (Chi tiết tài khoản)", () => {
    it("TC-ACCT-006 [Happy path]: Admin xem chi tiết tài khoản hợp lệ (200)", async () => {
      const accountId = roles.staffContent.id;
      const res = await request(app.getHttpServer())
        .get(`/accounts/${accountId}`)
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(body.id).toEqual(accountId);
      expect(body.username).toEqual(roles.staffContent.username);
    });

    it("TC-ACCT-007 [Authorization]: Nhân viên thường xem chi tiết bị từ chối 403", async () => {
      const accountId = roles.staffContent.id;
      await request(app.getHttpServer())
        .get(`/accounts/${accountId}`)
        .set("Authorization", `Bearer ${roles.staffContent.token}`)
        .expect(403);
    });

    it("TC-ACCT-008 [Not found]: ID tài khoản không tồn tại trả về 404", async () => {
      await request(app.getHttpServer())
        .get("/accounts/01ZZNONEXISTENTACC00000001")
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .expect(404);
    });
  });

  // =========================================================================
  // 3. ENDPOINT: PUT /accounts/:id (Cập nhật tài khoản)
  // =========================================================================
  describe("3. PUT /accounts/:id (Cập nhật tài khoản)", () => {
    it("TC-ACCT-009 [Happy path]: Admin cập nhật thông tin tài khoản thành công (200)", async () => {
      const accountId = roles.staffDesigner.id;
      const originalEmail = `${roles.staffDesigner.username}@erp-test.vn`;

      const res = await request(app.getHttpServer())
        .put(`/accounts/${accountId}`)
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .send({
          email: "designer.updated@erp-test.vn",
          fullName: "Designer Đã Cập Nhật",
        })
        .expect(200);

      const body = res.body.data || res.body;
      expect(body.message).toContain("thành công");

      // Phục hồi lại email ban đầu
      await request(app.getHttpServer())
        .put(`/accounts/${accountId}`)
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .send({ email: originalEmail });
    });

    it("TC-ACCT-010 [Authorization]: PM cập nhật tài khoản bị từ chối 403", async () => {
      const accountId = roles.staffDesigner.id;
      await request(app.getHttpServer())
        .put(`/accounts/${accountId}`)
        .set("Authorization", `Bearer ${roles.pm.token}`)
        .send({ email: "pm.illegal@erp.vn" })
        .expect(403);
    });

    it("TC-ACCT-011 [Not found]: Cập nhật tài khoản không tồn tại trả về 404", async () => {
      await request(app.getHttpServer())
        .put("/accounts/01ZZNONEXISTENTACC00000001")
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .send({ email: "ghost@erp.vn" })
        .expect(404);
    });
  });

  // =========================================================================
  // 4. ENDPOINT: PUT /accounts/:id/reset-password (Đặt lại mật khẩu)
  // =========================================================================
  describe("4. PUT /accounts/:id/reset-password (Đặt lại mật khẩu)", () => {
    it("TC-ACCT-012 [Happy path & Side effect]: Admin đặt lại mật khẩu thành công & khôi phục", async () => {
      const accountId = roles.staffDesigner.id;

      const res = await request(app.getHttpServer())
        .put(`/accounts/${accountId}/reset-password`)
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .send({ newPassword: "ResetPass123456" })
        .expect(200);

      const body = res.body.data || res.body;
      expect(body.message).toContain("thành công");

      // Xác minh trong DB mật khẩu đã được hash
      const acc = await dataSource.query(`SELECT password FROM accounts WHERE id = $1`, [accountId]);
      const isMatch = await bcrypt.compare("ResetPass123456", acc[0].password);
      expect(isMatch).toBe(true);

      // Khôi phục mật khẩu gốc 123456
      const defaultHash = await bcrypt.hash("123456", 10);
      await dataSource.query(`UPDATE accounts SET password = $1 WHERE id = $2`, [defaultHash, accountId]);
    });

    it("TC-ACCT-013 [Validation]: newPassword dưới 6 ký tự trả về 400", async () => {
      const accountId = roles.staffDesigner.id;
      await request(app.getHttpServer())
        .put(`/accounts/${accountId}/reset-password`)
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .send({ newPassword: "123" })
        .expect(400);
    });

    it("TC-ACCT-014 [Authorization]: PM cố tình reset mật khẩu bị 403 Forbidden", async () => {
      const accountId = roles.staffDesigner.id;
      await request(app.getHttpServer())
        .put(`/accounts/${accountId}/reset-password`)
        .set("Authorization", `Bearer ${roles.pm.token}`)
        .send({ newPassword: "NewSecretPassword@123" })
        .expect(403);
    });

    it("TC-ACCT-015 [Not found]: Reset mật khẩu cho account không tồn tại trả về 404", async () => {
      await request(app.getHttpServer())
        .put("/accounts/01ZZNONEXISTENTACC00000001/reset-password")
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .send({ newPassword: "NewSecretPassword@123" })
        .expect(404);
    });
  });

  // =========================================================================
  // 5. ENDPOINT: DELETE /accounts/:id (Xóa mềm tài khoản)
  // =========================================================================
  describe("5. DELETE /accounts/:id (Xóa mềm tài khoản)", () => {
    it("TC-ACCT-016 [Authorization]: PM xóa tài khoản bị từ chối 403", async () => {
      await request(app.getHttpServer())
        .delete(`/accounts/${roles.staffDesigner.id}`)
        .set("Authorization", `Bearer ${roles.pm.token}`)
        .expect(403);
    });

    it("TC-ACCT-017 [Not found]: Xóa tài khoản không tồn tại trả về 404", async () => {
      await request(app.getHttpServer())
        .delete("/accounts/01ZZNONEXISTENTACC00000001")
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .expect(404);
    });

    it("TC-ACCT-018 [Happy path & Side effect]: Admin vô hiệu hóa tài khoản thành công (200)", async () => {
      // 1. Tạo 1 account tạm để xóa
      const tempId = "01ZZTEMPACC000000000000001";
      const hashedPassword = await bcrypt.hash("123456", 10);
      await dataSource.query(
        `INSERT INTO accounts (id, username, password, email, role, "isActive")
         VALUES ($1, 'temp_acc_to_delete', $2, 'temp_delete@erp.vn', 'CONTENT_D', true)`,
        [tempId, hashedPassword],
      );

      // 2. Admin gọi DELETE
      const res = await request(app.getHttpServer())
        .delete(`/accounts/${tempId}`)
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(body.message).toContain("thành công");

      // 3. Xác minh trong DB isActive đã chuyển thành false (xóa mềm)
      const check = await dataSource.query(`SELECT "isActive" FROM accounts WHERE id = $1`, [tempId]);
      expect(check[0].isActive).toBe(false);

      // Dọn dẹp bản ghi tạm
      await dataSource.query(`DELETE FROM accounts WHERE id = $1`, [tempId]);
    });
  });
});
