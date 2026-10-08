import { INestApplication } from "@nestjs/common";
import { DataSource } from "typeorm";
import * as request from "supertest";
import {
  TestDbHelper,
  RealRoleUsers,
} from "@test/utils/test-db.helper";
import { UserRole } from "@modules/identity/user/enums/user-role.enum";

describe("UserController (Đầy Đủ 10 Nhóm Kiểm Thử Trên erp_test)", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let roles: RealRoleUsers;

  beforeAll(async () => {
    const context = await TestDbHelper.createTestingApp();
    app = context.app;
    dataSource = context.dataSource;
    roles = await TestDbHelper.getRealRoleUsers(dataSource);
    // Đảm bảo user test luôn ở trạng thái mở khóa
    await dataSource.query(
      `UPDATE users SET "isLocked" = false WHERE id = $1`,
      [roles.staffContent.userId],
    );
  });

  afterAll(async () => {
    await TestDbHelper.closeTestingApp();
  });

  // =========================================================================
  // 1. ENDPOINT: GET /users (Danh sách nhân sự)
  // =========================================================================
  describe("1. GET /users (Danh sách nhân sự)", () => {
    it("TC-USER-001 [Happy path]: Admin lấy danh sách người dùng thành công (200)", async () => {
      const res = await request(app.getHttpServer())
        .get("/users?page=1&limit=10")
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();
      expect(Array.isArray(body.items || body)).toBeTruthy();
      expect(body.total || body.length).toBeGreaterThan(0);
    });

    it("TC-USER-002 [Happy path]: BOD truy cập danh sách nhân sự thành công (200)", async () => {
      const res = await request(app.getHttpServer())
        .get("/users?page=1&limit=10")
        .set("Authorization", `Bearer ${roles.bod.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();
    });

    it("TC-USER-003 [Authentication]: Không gửi token bị từ chối 401", async () => {
      await request(app.getHttpServer()).get("/users").expect(401);
    });

    it("TC-USER-004 [Authentication]: Token không đúng định dạng / hết hạn bị từ chối 401", async () => {
      await request(app.getHttpServer())
        .get("/users")
        .set("Authorization", "Bearer token_khong_hop_le_123456")
        .expect(401);
    });

    it("TC-USER-005 [Edge case]: Tìm kiếm nhân sự có dấu tiếng Việt và ký tự đặc biệt", async () => {
      const res = await request(app.getHttpServer())
        .get(`/users?search=${encodeURIComponent("Nguyễn Anh Vinh")}`)
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();
    });

    it("TC-USER-006 [Edge case]: Tìm kiếm từ khóa không tồn tại trả về danh sách rỗng", async () => {
      const res = await request(app.getHttpServer())
        .get("/users?search=tu_khoa_chac_chan_khong_co_trong_he_thong_9999")
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      const items = body.items || body;
      expect(Array.isArray(items)).toBeTruthy();
      expect(items.length).toBe(0);
    });

    it("TC-USER-007 [Bảo mật]: Chuỗi tìm kiếm chứa SQL Injection payload được xử lý an toàn", async () => {
      const res = await request(app.getHttpServer())
        .get(`/users?search=${encodeURIComponent("' OR '1'='1; -- <script>alert(1)</script>")}`)
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();
    });
  });

  // =========================================================================
  // 2. ENDPOINT: GET /users/:id (Chi tiết nhân sự)
  // =========================================================================
  describe("2. GET /users/:id (Xem chi tiết nhân sự)", () => {
    it("TC-USER-008 [Happy path]: Admin xem chi tiết nhân viên tồn tại (200)", async () => {
      const targetUserId = roles.staffContent.userId;
      const res = await request(app.getHttpServer())
        .get(`/users/${targetUserId}`)
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(body.id).toEqual(targetUserId);
      expect(body.fullName).toEqual(roles.staffContent.fullName);
    });

    it("TC-USER-009 [Authentication]: Không gửi token khi xem chi tiết bị từ chối 401", async () => {
      await request(app.getHttpServer())
        .get(`/users/${roles.staffContent.userId}`)
        .expect(401);
    });

    it("TC-USER-010 [Not found]: ID không tồn tại trong hệ thống trả về lỗi 404", async () => {
      await request(app.getHttpServer())
        .get("/users/01ZZNONEXISTENTUSER00000001")
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .expect(404);
    });
  });

  // =========================================================================
  // 3. ENDPOINT: POST /users (Tạo nhân sự mới)
  // =========================================================================
  describe("3. POST /users (Tạo nhân sự mới)", () => {
    it("TC-USER-011 [Happy path]: Admin tạo nhân sự mới thành công (201)", async () => {
      const uniqueUsername = `nv_moi_${Date.now()}`;
      const payload = {
        username: uniqueUsername,
        password: "Password@123",
        fullName: "Nhân Sự Mới Admin Tạo",
        phoneNumber: "0901234567",
        role: UserRole.CONTENT_D,
      };

      const res = await request(app.getHttpServer())
        .post("/users")
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .send(payload)
        .expect(201);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();
      expect(body.fullName).toEqual(payload.fullName);
      // Bảo mật: Không để lộ password hash
      expect(body.password).toBeUndefined();
    });

    it("TC-USER-012 [Happy path]: BOD tạo nhân sự mới thành công (201)", async () => {
      const uniqueUsername = `nv_bod_${Date.now()}`;
      const payload = {
        username: uniqueUsername,
        password: "Password@123",
        fullName: "Nhân Sự Mới BOD Tạo",
        phoneNumber: "0987654321",
        role: UserRole.EDITOR_D,
      };

      const res = await request(app.getHttpServer())
        .post("/users")
        .set("Authorization", `Bearer ${roles.bod.token}`)
        .send(payload)
        .expect(201);

      const body = res.body.data || res.body;
      expect(body.fullName).toEqual(payload.fullName);
    });

    it("TC-USER-013 [Authentication]: Không gửi token khi tạo user bị 401", async () => {
      await request(app.getHttpServer())
        .post("/users")
        .send({ username: "test_unauth", fullName: "Test" })
        .expect(401);
    });

    it("TC-USER-014 [Authorization]: PM không có quyền tạo nhân sự mới (403)", async () => {
      const payload = {
        username: `nv_pm_${Date.now()}`,
        password: "Password@123",
        fullName: "Nhân Viên PM Tạo Trái Phép",
        role: UserRole.CONTENT_D,
      };

      await request(app.getHttpServer())
        .post("/users")
        .set("Authorization", `Bearer ${roles.pm.token}`)
        .send(payload)
        .expect(403);
    });

    it("TC-USER-015 [Authorization]: Nhân viên Content D không có quyền tạo nhân sự mới (403)", async () => {
      const payload = {
        username: `nv_staff_${Date.now()}`,
        password: "Password@123",
        fullName: "Nhân Viên Staff Tạo Trái Phép",
        role: UserRole.CONTENT_D,
      };

      await request(app.getHttpServer())
        .post("/users")
        .set("Authorization", `Bearer ${roles.staffContent.token}`)
        .send(payload)
        .expect(403);
    });

    it("TC-USER-016 [Authorization]: Designer D không có quyền tạo nhân sự mới (403)", async () => {
      const payload = {
        username: `nv_designer_${Date.now()}`,
        password: "Password@123",
        fullName: "Nhân Viên Designer Tạo Trái Phép",
        role: UserRole.CONTENT_D,
      };

      await request(app.getHttpServer())
        .post("/users")
        .set("Authorization", `Bearer ${roles.staffDesigner.token}`)
        .send(payload)
        .expect(403);
    });

    it("TC-USER-017 [Validation]: Thiếu username và fullName trả về 400 Bad Request", async () => {
      await request(app.getHttpServer())
        .post("/users")
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .send({ role: UserRole.CONTENT_D, password: "Password@123" })
        .expect(400);
    });

    it("TC-USER-018 [Validation]: Mật khẩu quá ngắn (< 6 ký tự) trả về 400", async () => {
      await request(app.getHttpServer())
        .post("/users")
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .send({
          username: `user_short_pwd_${Date.now()}`,
          password: "123",
          fullName: "Mật Khẩu Ngắn",
          role: UserRole.CONTENT_D,
        })
        .expect(400);
    });

    it("TC-USER-019 [Validation]: Số điện thoại sai định dạng regex Việt Nam trả về 400", async () => {
      await request(app.getHttpServer())
        .post("/users")
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .send({
          username: `user_bad_phone_${Date.now()}`,
          password: "Password@123",
          fullName: "Số ĐT Sai",
          phoneNumber: "012345",
          role: UserRole.CONTENT_D,
        })
        .expect(400);
    });

    it("TC-USER-020 [Validation]: Vai trò không hợp lệ (ngoài enum UserRole) trả về 400", async () => {
      await request(app.getHttpServer())
        .post("/users")
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .send({
          username: `user_bad_role_${Date.now()}`,
          password: "Password@123",
          fullName: "Vai Trò Sai",
          role: "HACKER_SUPER_ROLE",
        })
        .expect(400);
    });

    it("TC-USER-021 [Conflict]: Trùng username đã có trong hệ thống trả về lỗi 409 hoặc 400", async () => {
      const duplicateUsername = "admin_master_1"; // Đã có trong seed
      const res = await request(app.getHttpServer())
        .post("/users")
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .send({
          username: duplicateUsername,
          password: "Password@123",
          fullName: "Tài Khoản Trùng",
          role: UserRole.CONTENT_D,
        });

      // Hệ thống báo lỗi trùng lặp (400 hoặc 409 Conflict)
      expect([400, 409]).toContain(res.status);
    });

    it("TC-USER-022 [Bảo mật]: Mass Assignment - Gửi kèm field lạ (isAdmin) bị ValidationPipe lọc sạch", async () => {
      const uniqueUsername = `mass_assign_${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post("/users")
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .send({
          username: uniqueUsername,
          password: "Password@123",
          fullName: "Test Mass Assignment",
          role: UserRole.CONTENT_D,
          isAdmin: true,
          isSuperUser: true,
        })
        .expect(201);

      const body = res.body.data || res.body;
      expect((body as any).isAdmin).toBeUndefined();
    });
  });

  // =========================================================================
  // 4. ENDPOINT: PATCH /users/:id & PUT /users/:id (Cập nhật thông tin)
  // =========================================================================
  describe("4. PATCH & PUT /users/:id (Cập nhật thông tin)", () => {
    it("TC-USER-023 [Happy path]: Admin cập nhật họ tên qua PATCH thành công (200)", async () => {
      const targetUserId = roles.staffContent.userId;
      const res = await request(app.getHttpServer())
        .patch(`/users/${targetUserId}`)
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .send({ fullName: "Phan Quý Lâm (Đã Cập Nhật)" })
        .expect(200);

      const body = res.body.data || res.body;
      expect(body.fullName).toEqual("Phan Quý Lâm (Đã Cập Nhật)");
    });

    it("TC-USER-024 [Happy path]: BOD cập nhật thông tin qua PUT method cho FE (200)", async () => {
      const targetUserId = roles.staffContent.userId;
      const res = await request(app.getHttpServer())
        .put(`/users/${targetUserId}`)
        .set("Authorization", `Bearer ${roles.bod.token}`)
        .send({ phoneNumber: "0909888999" })
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();
    });

    it("TC-USER-025 [Authorization]: Nhân viên thường sửa thông tin bị 403 Forbidden", async () => {
      const targetUserId = roles.admin.userId;
      await request(app.getHttpServer())
        .patch(`/users/${targetUserId}`)
        .set("Authorization", `Bearer ${roles.staffContent.token}`)
        .send({ fullName: "Cố tình sửa Admin" })
        .expect(403);
    });

    it("TC-USER-026 [Authorization]: PM sửa thông tin nhân sự bị 403 Forbidden", async () => {
      const targetUserId = roles.staffContent.userId;
      await request(app.getHttpServer())
        .patch(`/users/${targetUserId}`)
        .set("Authorization", `Bearer ${roles.pm.token}`)
        .send({ fullName: "PM Cố tình sửa" })
        .expect(403);
    });

    it("TC-USER-027 [Not found]: Cập nhật user ID không tồn tại trả về 404", async () => {
      await request(app.getHttpServer())
        .patch("/users/01ZZNONEXISTENTUSER00000001")
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .send({ fullName: "Tên Mới" })
        .expect(404);
    });

    it("TC-USER-028 [Validation]: Cập nhật số điện thoại sai định dạng trả về 400", async () => {
      const targetUserId = roles.staffContent.userId;
      await request(app.getHttpServer())
        .patch(`/users/${targetUserId}`)
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .send({ phoneNumber: "12345" })
        .expect(400);
    });

    it("TC-USER-029 [Side effect]: Admin khóa tài khoản (isLocked: true)", async () => {
      const targetUserId = roles.staffContent.userId;
      const res = await request(app.getHttpServer())
        .patch(`/users/${targetUserId}`)
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .send({ isLocked: true })
        .expect(200);

      const body = res.body.data || res.body;
      expect(body.isLocked).toBe(true);

      // Phục hồi lại trạng thái mở khóa để không gây side effect cho các test khác
      await request(app.getHttpServer())
        .patch(`/users/${targetUserId}`)
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .send({ isLocked: false })
        .expect(200);
    });
  });

  // =========================================================================
  // 5. ENDPOINT: PATCH /users/:id/role (Cập nhật vai trò)
  // =========================================================================
  describe("5. PATCH /users/:id/role (Cập nhật vai trò)", () => {
    it("TC-USER-030 [Happy path]: Admin cập nhật role nhân sự thành công (200)", async () => {
      const targetUserId = roles.staffContent.userId;
      const res = await request(app.getHttpServer())
        .patch(`/users/${targetUserId}/role`)
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .send({ role: UserRole.CONTENT_A })
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();
    });

    it("TC-USER-031 [Happy path]: BOD cập nhật role nhân sự thành công (200)", async () => {
      const targetUserId = roles.staffContent.userId;
      const res = await request(app.getHttpServer())
        .patch(`/users/${targetUserId}/role`)
        .set("Authorization", `Bearer ${roles.bod.token}`)
        .send({ role: UserRole.CONTENT_D })
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();
    });

    it("TC-USER-032 [Authorization]: PM cố tình cập nhật role bị từ chối 403", async () => {
      const targetUserId = roles.staffContent.userId;
      await request(app.getHttpServer())
        .patch(`/users/${targetUserId}/role`)
        .set("Authorization", `Bearer ${roles.pm.token}`)
        .send({ role: UserRole.ADMIN })
        .expect(403);
    });

    it("TC-USER-033 [Authorization]: Admin Sale cố tình cập nhật role bị từ chối 403", async () => {
      const targetUserId = roles.staffContent.userId;
      await request(app.getHttpServer())
        .patch(`/users/${targetUserId}/role`)
        .set("Authorization", `Bearer ${roles.adminSale.token}`)
        .send({ role: UserRole.ADMIN })
        .expect(403);
    });

    it("TC-USER-034 [Authorization]: Nhân viên thường cố tình cập nhật role bị từ chối 403", async () => {
      const targetUserId = roles.staffContent.userId;
      await request(app.getHttpServer())
        .patch(`/users/${targetUserId}/role`)
        .set("Authorization", `Bearer ${roles.staffContent.token}`)
        .send({ role: UserRole.BOD })
        .expect(403);
    });

    it("TC-USER-035 [Not found]: Cập nhật role cho user không tồn tại trả về 404", async () => {
      await request(app.getHttpServer())
        .patch("/users/01ZZNONEXISTENTUSER00000001/role")
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .send({ role: UserRole.PM })
        .expect(404);
    });
  });

  // =========================================================================
  // 6. ENDPOINT: PATCH /users/:id/labor-contracts (Cập nhật hợp đồng lao động)
  // =========================================================================
  describe("6. PATCH /users/:id/labor-contracts (Cập nhật hợp đồng lao động)", () => {
    it("TC-USER-036 [Happy path]: Admin Sale cập nhật hợp đồng lao động thành công (200)", async () => {
      const targetUserId = roles.staffContent.userId;
      const res = await request(app.getHttpServer())
        .patch(`/users/${targetUserId}/labor-contracts`)
        .set("Authorization", `Bearer ${roles.adminSale.token}`)
        .send({
          laborContract: [
            {
              contractNumber: "HĐLĐ-2026-001",
              signDate: "2026-01-01",
              contractType: "CHINH_THUC",
            },
          ],
        })
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();
    });

    it("TC-USER-037 [Happy path]: Admin cập nhật hợp đồng lao động thành công (200)", async () => {
      const targetUserId = roles.staffContent.userId;
      const res = await request(app.getHttpServer())
        .patch(`/users/${targetUserId}/labor-contracts`)
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .send({
          laborContract: [
            {
              contractNumber: "HĐLĐ-2026-002",
              signDate: "2026-06-01",
              contractType: "THU_VIEC",
            },
          ],
        })
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();
    });

    it("TC-USER-038 [Authorization]: Nhân viên thường cập nhật hợp đồng lao động bị 403", async () => {
      const targetUserId = roles.staffContent.userId;
      await request(app.getHttpServer())
        .patch(`/users/${targetUserId}/labor-contracts`)
        .set("Authorization", `Bearer ${roles.staffContent.token}`)
        .send({ laborContract: [] })
        .expect(403);
    });

    it("TC-USER-039 [Authorization]: PM cập nhật hợp đồng lao động bị 403", async () => {
      const targetUserId = roles.staffContent.userId;
      await request(app.getHttpServer())
        .patch(`/users/${targetUserId}/labor-contracts`)
        .set("Authorization", `Bearer ${roles.pm.token}`)
        .send({ laborContract: [] })
        .expect(403);
    });

    it("TC-USER-040 [Not found]: Cập nhật hợp đồng lao động cho ID không tồn tại trả về 404", async () => {
      await request(app.getHttpServer())
        .patch("/users/01ZZNONEXISTENTUSER00000001/labor-contracts")
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .send({ laborContract: [] })
        .expect(404);
    });
  });

  // =========================================================================
  // 7. ENDPOINT: DELETE /users/:id (Xóa nhân sự)
  // =========================================================================
  describe("7. DELETE /users/:id (Xóa nhân sự)", () => {
    it("TC-USER-041 [Authorization]: Nhân viên Content D xóa nhân sự bị từ chối 403", async () => {
      const targetUserId = roles.staffContent.userId;
      await request(app.getHttpServer())
        .delete(`/users/${targetUserId}`)
        .set("Authorization", `Bearer ${roles.staffContent.token}`)
        .expect(403);
    });

    it("TC-USER-042 [Authorization]: Nhân viên Designer D xóa nhân sự bị từ chối 403", async () => {
      const targetUserId = roles.staffContent.userId;
      await request(app.getHttpServer())
        .delete(`/users/${targetUserId}`)
        .set("Authorization", `Bearer ${roles.staffDesigner.token}`)
        .expect(403);
    });

    it("TC-USER-043 [Authorization]: PM xóa nhân sự bị từ chối 403", async () => {
      const targetUserId = roles.staffContent.userId;
      await request(app.getHttpServer())
        .delete(`/users/${targetUserId}`)
        .set("Authorization", `Bearer ${roles.pm.token}`)
        .expect(403);
    });

    it("TC-USER-044 [Not found]: Xóa user ID không tồn tại trả về 404", async () => {
      await request(app.getHttpServer())
        .delete("/users/01ZZNONEXISTENTUSER00000001")
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .expect(404);
    });

    it("TC-USER-045 [Happy path]: Admin xóa nhân viên thành công (200)", async () => {
      // 1. Tạo 1 user tạm bằng Admin
      const tempUsername = `user_temp_delete_${Date.now()}`;
      const createRes = await request(app.getHttpServer())
        .post("/users")
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .send({
          username: tempUsername,
          password: "Password@123",
          fullName: "Nhân Sự Tạm Để Xóa",
          phoneNumber: "0901999888",
          role: UserRole.CONTENT_D,
        })
        .expect(201);

      const createdUser = createRes.body.data || createRes.body;

      // 2. Xóa user vừa tạo
      await request(app.getHttpServer())
        .delete(`/users/${createdUser.id}`)
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .expect(200);

      // 3. Kiểm tra lại user không còn tồn tại
      await request(app.getHttpServer())
        .get(`/users/${createdUser.id}`)
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .expect(404);
    });
  });
});
