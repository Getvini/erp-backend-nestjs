import { INestApplication } from "@nestjs/common";
import { DataSource } from "typeorm";
import * as request from "supertest";
import {
  TestDbHelper,
  RealRoleUsers,
} from "@test/utils/test-db.helper";
import { FIXTURE_IDS } from "@test/fixtures/fixture-ids";
import { MemberRole } from "@modules/project/project-core/enums/member-role.enum";

describe("ProjectTeamController (Đầy đủ 10 nhóm kiểm thử trên erp_test)", () => {
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
  // 1. ENDPOINT: GET /teams (Danh sách đội dự án)
  // =========================================================================
  describe("1. GET /teams (Danh sách đội ngũ)", () => {
    it("TC-TEAM-001 [Happy path]: PM lấy danh sách đội ngũ thành công (200)", async () => {
      const res = await request(app.getHttpServer())
        .get("/teams")
        .set("Authorization", `Bearer ${roles.pm.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
      expect(body[0].name).toBeDefined();
    });

    it("TC-TEAM-002 [Authentication]: Không gửi token bị từ chối 401", async () => {
      await request(app.getHttpServer()).get("/teams").expect(401);
    });
  });

  // =========================================================================
  // 2. ENDPOINT: POST /teams (Tạo đội dự án)
  // =========================================================================
  describe("2. POST /teams (Tạo đội ngũ mới)", () => {
    it("TC-TEAM-003 [Validation]: Thiếu tên đội ngũ name trả về 400", async () => {
      await request(app.getHttpServer())
        .post("/teams")
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .send({ teamLeadId: roles.pm.userId })
        .expect(400);
    });

    it("TC-TEAM-004 [Happy path]: Admin tạo đội ngũ mới thành công", async () => {
      const res = await request(app.getHttpServer())
        .post("/teams")
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .send({
          name: `Squad Test Automation ${Date.now()}`,
          teamLeadId: roles.pm.userId,
        });

      expect([200, 201]).toContain(res.status);
      const body = res.body.data || res.body;
      expect(body.name).toBeDefined();
    });
  });

  // =========================================================================
  // 3. ENDPOINT: GET /teams/:id (Chi tiết đội ngũ)
  // =========================================================================
  describe("3. GET /teams/:id (Chi tiết đội ngũ)", () => {
    it("TC-TEAM-005 [Happy path]: Xem chi tiết đội ngũ thật từ fixture (200)", async () => {
      const teamId = FIXTURE_IDS.PROJECT_TEAMS[0];
      const res = await request(app.getHttpServer())
        .get(`/teams/${teamId}`)
        .set("Authorization", `Bearer ${roles.pm.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(body.id).toEqual(teamId);
      expect(body.name).toBeDefined();
    });

    it("TC-TEAM-006 [Not found]: ID không tồn tại trả về 404", async () => {
      await request(app.getHttpServer())
        .get("/teams/01ZZNONEXISTENTTEAM00000001")
        .set("Authorization", `Bearer ${roles.pm.token}`)
        .expect(404);
    });
  });

  // =========================================================================
  // 4. ENDPOINT: PUT /teams/:id (Cập nhật đội ngũ)
  // =========================================================================
  describe("4. PUT /teams/:id (Cập nhật đội ngũ)", () => {
    it("TC-TEAM-007 [Happy path]: Cập nhật tên đội ngũ thành công (200)", async () => {
      const teamId = FIXTURE_IDS.PROJECT_TEAMS[1];
      const updatedName = "Squad Alpha Đã Đổi Tên";

      const res = await request(app.getHttpServer())
        .put(`/teams/${teamId}`)
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .send({ name: updatedName })
        .expect(200);

      const body = res.body.data || res.body;
      expect(body.name).toEqual(updatedName);
    });

    it("TC-TEAM-008 [Not found]: Cập nhật ID không tồn tại trả về 404", async () => {
      await request(app.getHttpServer())
        .put("/teams/01ZZNONEXISTENTTEAM00000001")
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .send({ name: "Tên Mới" })
        .expect(404);
    });
  });

  // =========================================================================
  // 5. ENDPOINT: GET /teams/:id/members (Danh sách thành viên)
  // =========================================================================
  describe("5. GET /teams/:id/members (Danh sách thành viên)", () => {
    it("TC-TEAM-009 [Happy path]: Lấy danh sách thành viên thành công (200)", async () => {
      const teamId = FIXTURE_IDS.PROJECT_TEAMS[0];
      const res = await request(app.getHttpServer())
        .get(`/teams/${teamId}/members`)
        .set("Authorization", `Bearer ${roles.pm.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(Array.isArray(body)).toBe(true);
    });

    it("TC-TEAM-010 [Edge case]: Query kèm month & year hợp lệ (200)", async () => {
      const teamId = FIXTURE_IDS.PROJECT_TEAMS[0];
      const res = await request(app.getHttpServer())
        .get(`/teams/${teamId}/members?month=10&year=2026`)
        .set("Authorization", `Bearer ${roles.pm.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(Array.isArray(body)).toBe(true);
    });
  });

  // =========================================================================
  // 6. ENDPOINT: POST /teams/:id/members (Thêm thành viên vào đội)
  // =========================================================================
  describe("6. POST /teams/:id/members (Thêm thành viên vào đội)", () => {
    it("TC-TEAM-011 [Validation]: Thiếu userId trả về lỗi 400", async () => {
      const teamId = FIXTURE_IDS.PROJECT_TEAMS[0];
      await request(app.getHttpServer())
        .post(`/teams/${teamId}/members`)
        .set("Authorization", `Bearer ${roles.pm.token}`)
        .send({})
        .expect(400);
    });

    it("TC-TEAM-012 [Happy path]: PM thêm thành viên mới vào đội ngũ", async () => {
      const teamId = FIXTURE_IDS.PROJECT_TEAMS[2];
      const userId = roles.staffDesigner.userId;

      // Xóa nếu đã là thành viên trước đó để test idempotent
      await dataSource.query(
        `DELETE FROM team_members WHERE "teamId" = $1 AND "userId" = $2`,
        [teamId, userId],
      );

      const res = await request(app.getHttpServer())
        .post(`/teams/${teamId}/members`)
        .set("Authorization", `Bearer ${roles.pm.token}`)
        .send({
          userId,
          roles: [MemberRole.DESIGNER],
        });

      expect([200, 201]).toContain(res.status);
    });
  });

  // =========================================================================
  // 7. ENDPOINT: PUT /teams/:id/lead (Thay đổi Team Lead)
  // =========================================================================
  describe("7. PUT /teams/:id/lead (Thay đổi Team Lead)", () => {
    it("TC-TEAM-013 [Validation]: Thiếu teamLeadId trả về lỗi 400", async () => {
      const teamId = FIXTURE_IDS.PROJECT_TEAMS[0];
      await request(app.getHttpServer())
        .put(`/teams/${teamId}/lead`)
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .send({})
        .expect(400);
    });

    it("TC-TEAM-014 [Happy path]: Thay đổi Team Lead thành công (200)", async () => {
      const teamId = FIXTURE_IDS.PROJECT_TEAMS[3];
      const res = await request(app.getHttpServer())
        .put(`/teams/${teamId}/lead`)
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .send({ teamLeadId: roles.pm.userId })
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();
    });
  });

  // =========================================================================
  // 8. ENDPOINT: DELETE /teams/:id (Xóa đội dự án)
  // =========================================================================
  describe("8. DELETE /teams/:id (Xóa đội dự án)", () => {
    it("TC-TEAM-015 [Not found]: Xóa ID không tồn tại trả về 404", async () => {
      await request(app.getHttpServer())
        .delete("/teams/01ZZNONEXISTENTTEAM00000001")
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .expect(404);
    });

    it("TC-TEAM-016 [Happy path & Side effect]: Xóa đội ngũ tạm thành công", async () => {
      const tempTeamId = "01ZZTEMPTEAM00000000000001";
      await dataSource.query(
        `INSERT INTO project_teams (id, name, "createdAt")
         VALUES ($1, 'Đội Tạm Xóa Test', NOW())`,
        [tempTeamId],
      );

      const res = await request(app.getHttpServer())
        .delete(`/teams/${tempTeamId}`)
        .set("Authorization", `Bearer ${roles.admin.token}`);

      expect([200, 204]).toContain(res.status);

      // Xác minh trong DB đã không còn
      const check = await dataSource.query(`SELECT id FROM project_teams WHERE id = $1`, [tempTeamId]);
      expect(check.length).toBe(0);
    });
  });
});
