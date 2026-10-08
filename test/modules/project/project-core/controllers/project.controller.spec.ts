import { INestApplication } from "@nestjs/common";
import { DataSource } from "typeorm";
import * as request from "supertest";
import {
  TestDbHelper,
  RealRoleUsers,
} from "@test/utils/test-db.helper";
import { FIXTURE_IDS } from "@test/fixtures/fixture-ids";
import { ProjectStatus } from "@modules/project/project-core/enums/project-status.enum";

describe("ProjectController (Đầy đủ 10 nhóm kiểm thử trên erp_test)", () => {
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
  // 1. ENDPOINT: GET /projects (Danh sách dự án)
  // =========================================================================
  describe("1. GET /projects (Lấy danh sách dự án)", () => {
    it("TC-PROJ-001 [Happy path]: PM lấy danh sách dự án thành công (200)", async () => {
      const res = await request(app.getHttpServer())
        .get("/projects?page=1&limit=10")
        .set("Authorization", `Bearer ${roles.pm.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();
      expect(body.items || Array.isArray(body)).toBeTruthy();
    });

    it("TC-PROJ-002 [Authentication]: Không gửi token bị từ chối 401", async () => {
      await request(app.getHttpServer()).get("/projects").expect(401);
    });

    it("TC-PROJ-003 [Edge case]: Phân trang page=1 & lọc status hợp lệ (200)", async () => {
      const res = await request(app.getHttpServer())
        .get(`/projects?page=1&limit=5&status=${ProjectStatus.IN_PROGRESS}`)
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();
    });

    it("TC-PROJ-004 [Validation]: sortBy trường không nằm trong whitelist trả về 400", async () => {
      await request(app.getHttpServer())
        .get("/projects?sortBy=malicious_column")
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .expect(400);
    });

    it("TC-PROJ-005 [Validation]: sortDir sai định dạng trả về 400", async () => {
      await request(app.getHttpServer())
        .get("/projects?sortDir=INVALID_DIR")
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .expect(400);
    });
  });

  // =========================================================================
  // 2. ENDPOINT: GET /projects/my-projects (Dự án của tôi)
  // =========================================================================
  describe("2. GET /projects/my-projects (Dự án của tôi)", () => {
    it("TC-PROJ-006 [Happy path]: PM lấy danh sách dự án của mình thành công (200)", async () => {
      const res = await request(app.getHttpServer())
        .get("/projects/my-projects")
        .set("Authorization", `Bearer ${roles.pm.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();
    });

    it("TC-PROJ-007 [Authentication]: Không gửi token bị 401", async () => {
      await request(app.getHttpServer()).get("/projects/my-projects").expect(401);
    });
  });

  // =========================================================================
  // 3. ENDPOINT: GET /projects/:id (Chi tiết dự án)
  // =========================================================================
  describe("3. GET /projects/:id (Chi tiết dự án)", () => {
    it("TC-PROJ-008 [Happy path]: Admin xem chi tiết bất kỳ dự án có thật từ fixture (200)", async () => {
      const projectId = FIXTURE_IDS.PROJECTS[0];
      const res = await request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(body.id).toEqual(projectId);
      expect(body.name).toBeDefined();
    });

    it("TC-PROJ-008B [Authorization / IDOR]: PM không thuộc đội dự án bị từ chối 403", async () => {
      const projectId = FIXTURE_IDS.PROJECTS[0];
      await request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .set("Authorization", `Bearer ${roles.pm.token}`)
        .expect(403);
    });

    it("TC-PROJ-009 [Not found]: ID không tồn tại trả về 404", async () => {
      await request(app.getHttpServer())
        .get("/projects/01ZZNONEXISTENTPROJ00000001")
        .set("Authorization", `Bearer ${roles.pm.token}`)
        .expect(404);
    });
  });

  // =========================================================================
  // 4. ENDPOINT: PUT /projects/:id (Cập nhật thông tin dự án)
  // =========================================================================
  describe("4. PUT /projects/:id (Cập nhật dự án)", () => {
    it("TC-PROJ-010 [Happy path]: Cập nhật tên dự án thành công (200)", async () => {
      const projectId = FIXTURE_IDS.PROJECTS[1];
      const updatedName = "Dự Án Đã Cập Nhật Tiến Độ Sprint Mới";

      const res = await request(app.getHttpServer())
        .put(`/projects/${projectId}`)
        .set("Authorization", `Bearer ${roles.pm.token}`)
        .send({ name: updatedName })
        .expect(200);

      const body = res.body.data || res.body;
      expect(body.name).toEqual(updatedName);
    });

    it("TC-PROJ-011 [Validation]: Ngày dự kiến sai format date trả về 400", async () => {
      const projectId = FIXTURE_IDS.PROJECTS[1];
      await request(app.getHttpServer())
        .put(`/projects/${projectId}`)
        .set("Authorization", `Bearer ${roles.pm.token}`)
        .send({ plannedStartDate: "INVALID_DATE_FORMAT" })
        .expect(400);
    });

    it("TC-PROJ-012 [Not found]: Cập nhật dự án không tồn tại trả về 404", async () => {
      await request(app.getHttpServer())
        .put("/projects/01ZZNONEXISTENTPROJ00000001")
        .set("Authorization", `Bearer ${roles.pm.token}`)
        .send({ name: "Tên Mới" })
        .expect(404);
    });
  });

  // =========================================================================
  // 5. ENDPOINT: PATCH /projects/:id/status (Cập nhật trạng thái dự án)
  // =========================================================================
  describe("5. PATCH /projects/:id/status (Cập nhật trạng thái)", () => {
    it("TC-PROJ-013 [Validation]: Thiếu status hoặc status sai enum trả về 400", async () => {
      const projectId = FIXTURE_IDS.PROJECTS[2];
      await request(app.getHttpServer())
        .patch(`/projects/${projectId}/status`)
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .send({ status: "MALICIOUS_STATUS" })
        .expect(400);
    });

    it("TC-PROJ-014 [Happy path]: Admin cập nhật trạng thái dự án hợp lệ (200)", async () => {
      const projectId = FIXTURE_IDS.PROJECTS[2];
      const res = await request(app.getHttpServer())
        .patch(`/projects/${projectId}/status`)
        .set("Authorization", `Bearer ${roles.admin.token}`)
        .send({ status: ProjectStatus.IN_PROGRESS })
        .expect(200);

      const body = res.body.data || res.body;
      expect(body.status).toEqual(ProjectStatus.IN_PROGRESS);
    });
  });

  // =========================================================================
  // 6. ENDPOINT: POST /projects/:id/pause/direct (Tạm dừng trực tiếp)
  // =========================================================================
  describe("6. POST /projects/:id/pause/direct (Tạm dừng trực tiếp)", () => {
    it("TC-PROJ-015 [Validation]: Thiếu lý do tạm dừng reason trả về 400", async () => {
      const projectId = FIXTURE_IDS.PROJECTS[3];
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/pause/direct`)
        .set("Authorization", `Bearer ${roles.bod.token}`)
        .send({})
        .expect(400);
    });

    it("TC-PROJ-016 [Happy path & Side effect]: BOD tạm dừng dự án trực tiếp", async () => {
      const projectId = FIXTURE_IDS.PROJECTS[3];
      const res = await request(app.getHttpServer())
        .post(`/projects/${projectId}/pause/direct`)
        .set("Authorization", `Bearer ${roles.bod.token}`)
        .send({ reason: "Khách hàng tạm dừng duyệt kịch bản" });

      expect([200, 201]).toContain(res.status);

      // Phục hồi lại trạng thái IN_PROGRESS để không ảnh hưởng dữ liệu chung
      await dataSource.query(
        `UPDATE projects SET status = 'IN_PROGRESS', "isOnHold" = false WHERE id = $1`,
        [projectId],
      );
    });
  });

  // =========================================================================
  // 7. ENDPOINT: PATCH /projects/:id/working-files (Cập nhật file làm việc)
  // =========================================================================
  describe("7. PATCH /projects/:id/working-files (Cập nhật file làm việc)", () => {
    it("TC-PROJ-017 [Validation]: workingFiles không phải mảng trả về 400", async () => {
      const projectId = FIXTURE_IDS.PROJECTS[0];
      await request(app.getHttpServer())
        .patch(`/projects/${projectId}/working-files`)
        .set("Authorization", `Bearer ${roles.pm.token}`)
        .send({ workingFiles: "NOT_AN_ARRAY" })
        .expect(400);
    });

    it("TC-PROJ-018 [Happy path]: Cập nhật workingFiles hợp lệ thành công (200)", async () => {
      const projectId = FIXTURE_IDS.PROJECTS[0];
      const res = await request(app.getHttpServer())
        .patch(`/projects/${projectId}/working-files`)
        .set("Authorization", `Bearer ${roles.pm.token}`)
        .send({
          workingFiles: [
            {
              id: "file-01",
              name: "Brand Guidelines PDF",
              url: "https://storage.vini.vn/docs/guidelines.pdf",
              type: "FILE",
              size: 2048576,
              createdAt: new Date().toISOString(),
            },
          ],
        })
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();
    });
  });

  // =========================================================================
  // 8. ENDPOINT: POST /projects/:id/request-staffing (Yêu cầu nhân sự)
  // =========================================================================
  describe("8. POST /projects/:id/request-staffing (Yêu cầu nhân sự)", () => {
    it("TC-PROJ-019 [Happy path]: PM gửi yêu cầu bổ sung nhân sự thành công", async () => {
      const projectId = FIXTURE_IDS.PROJECTS[0];
      const res = await request(app.getHttpServer())
        .post(`/projects/${projectId}/request-staffing`)
        .set("Authorization", `Bearer ${roles.pm.token}`)
        .send({ note: "Cần thêm 1 bạn Designer chuyên After Effects" });

      expect([200, 201]).toContain(res.status);
    });
  });
});
