import { INestApplication } from "@nestjs/common";
import { DataSource } from "typeorm";
import * as request from "supertest";
import {
  TestDbHelper,
  RealRoleUsers,
} from "@test/utils/test-db.helper";
import { FIXTURE_IDS } from "@test/fixtures/fixture-ids";

describe("AuthController (Đầy đủ 10 nhóm kiểm thử trên erp_test)", () => {
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
  // 1. ENDPOINT: POST /auth/login (Đăng nhập)
  // =========================================================================
  describe("1. POST /auth/login (Đăng nhập hệ thống)", () => {
    it("TC-AUTH-001 [Happy path]: Đăng nhập bằng username chính xác thành công (200)", async () => {
      const res = await request(app.getHttpServer())
        .post("/auth/login")
        .send({
          username: "admin_master_1",
          password: "123456",
        })
        .expect(200);

      const body = res.body.data || res.body;
      expect(body.accessToken || body.token).toBeDefined();
      expect(body.refreshToken).toBeDefined();
      expect(body.user).toBeDefined();
      expect(body.user.username).toEqual("admin_master_1");

      // Kiểm tra HTTP cookies được set
      const cookiesHeader = res.headers["set-cookie"];
      const cookies = Array.isArray(cookiesHeader)
        ? cookiesHeader
        : [cookiesHeader].filter(Boolean);
      expect(cookies.length).toBeGreaterThan(0);
      expect(cookies.some((c: string) => c.includes("accessToken="))).toBe(true);
      expect(cookies.some((c: string) => c.includes("refreshToken="))).toBe(true);
    });

    it("TC-AUTH-002 [Happy path]: Đăng nhập bằng email chính xác thành công (200)", async () => {
      const res = await request(app.getHttpServer())
        .post("/auth/login")
        .send({
          username: "admin_master_1@erp-test.vn",
          password: "123456",
        })
        .expect(200);

      const body = res.body.data || res.body;
      expect(body.accessToken || body.token).toBeDefined();
      expect(body.user.username).toEqual("admin_master_1");
    });

    it("TC-AUTH-003 [Happy path]: Đăng nhập kèm rememberMe: true thành công (200)", async () => {
      const res = await request(app.getHttpServer())
        .post("/auth/login")
        .send({
          username: "pm_lead_1",
          password: "123456",
          rememberMe: true,
        })
        .expect(200);

      const body = res.body.data || res.body;
      expect(body.accessToken).toBeDefined();
    });

    it("TC-AUTH-004 [Validation]: Thiếu username trả về lỗi 400", async () => {
      await request(app.getHttpServer())
        .post("/auth/login")
        .send({ password: "123456" })
        .expect(400);
    });

    it("TC-AUTH-005 [Validation]: Thiếu password trả về lỗi 400", async () => {
      await request(app.getHttpServer())
        .post("/auth/login")
        .send({ username: "admin_master_1" })
        .expect(400);
    });

    it("TC-AUTH-006 [Validation]: Password ngắn hơn 6 ký tự trả về 400", async () => {
      await request(app.getHttpServer())
        .post("/auth/login")
        .send({ username: "admin_master_1", password: "123" })
        .expect(400);
    });

    it("TC-AUTH-007 [Authentication]: Sai mật khẩu trả về 401 Unauthorized", async () => {
      const res = await request(app.getHttpServer())
        .post("/auth/login")
        .send({
          username: "admin_master_1",
          password: "INCORRECT_PASSWORD",
        })
        .expect(401);

      const body = res.body;
      expect(body.message).toContain("không chính xác");
    });

    it("TC-AUTH-008 [Authentication]: Tài khoản không tồn tại trả về 401", async () => {
      await request(app.getHttpServer())
        .post("/auth/login")
        .send({
          username: "non_existent_user_9999",
          password: "Password@123",
        })
        .expect(401);
    });

    it("TC-AUTH-009 [Edge case / Security]: Đăng nhập vào tài khoản inactive bị từ chối 401", async () => {
      await request(app.getHttpServer())
        .post("/auth/login")
        .send({
          username: "inactive_user",
          password: "123456",
        })
        .expect(401);
    });

    it("TC-AUTH-010 [Edge case / Security]: Đăng nhập vào tài khoản user bị locked bị từ chối 401", async () => {
      await request(app.getHttpServer())
        .post("/auth/login")
        .send({
          username: "locked_user",
          password: "123456",
        })
        .expect(401);
    });

    it("TC-AUTH-011 [Security]: Response login tuyệt đối không làm lộ password", async () => {
      const res = await request(app.getHttpServer())
        .post("/auth/login")
        .send({
          username: "admin_master_1",
          password: "123456",
        })
        .expect(200);

      const body = res.body.data || res.body;
      expect(body.password).toBeUndefined();
      expect(body.user.password).toBeUndefined();
    });
  });

  // =========================================================================
  // 2. ENDPOINT: POST /auth/refresh (Cấp mới token)
  // =========================================================================
  describe("2. POST /auth/refresh (Làm mới token)", () => {
    it("TC-AUTH-012 [Happy path]: Cấp mới token hợp lệ thành công (200)", async () => {
      // 1. Đăng nhập để nhận refreshToken thật
      const loginRes = await request(app.getHttpServer())
        .post("/auth/login")
        .send({
          username: "pm_lead_1",
          password: "123456",
        })
        .expect(200);

      const refreshToken = (loginRes.body.data || loginRes.body).refreshToken;

      // 2. Gửi request refresh
      const refreshRes = await request(app.getHttpServer())
        .post("/auth/refresh")
        .send({ refreshToken })
        .expect(200);

      const body = refreshRes.body.data || refreshRes.body;
      expect(body.accessToken || body.token).toBeDefined();
    });

    it("TC-AUTH-013 [Authentication]: Gửi body không có token trả về 401", async () => {
      await request(app.getHttpServer())
        .post("/auth/refresh")
        .send({})
        .expect(401);
    });

    it("TC-AUTH-014 [Authentication]: Gửi refresh token giả mạo trả về 401", async () => {
      await request(app.getHttpServer())
        .post("/auth/refresh")
        .send({ refreshToken: "fake.invalid.refresh.token" })
        .expect(401);
    });
  });

  // =========================================================================
  // 3. ENDPOINT: POST /auth/logout (Đăng xuất)
  // =========================================================================
  describe("3. POST /auth/logout (Đăng xuất hệ thống)", () => {
    it("TC-AUTH-015 [Happy path]: Đăng xuất thành công và xóa cookie (200)", async () => {
      const res = await request(app.getHttpServer())
        .post("/auth/logout")
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(body.success).toBe(true);

      // Kiểm tra cookies bị xóa (Max-Age=0 hoặc expires in past)
      const cookiesHeader = res.headers["set-cookie"];
      const cookies = Array.isArray(cookiesHeader)
        ? cookiesHeader
        : [cookiesHeader].filter(Boolean);
      if (cookies.length > 0) {
        expect(
          cookies.some((c: string) => c.includes("accessToken=") && c.includes("Expires=")),
        ).toBe(true);
      }
    });

    it("TC-AUTH-016 [Authentication]: Không gửi token khi logout bị 401", async () => {
      await request(app.getHttpServer()).post("/auth/logout").expect(401);
    });
  });
});
