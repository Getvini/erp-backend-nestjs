import { INestApplication } from "@nestjs/common";
import { DataSource } from "typeorm";
import * as request from "supertest";
import {
  TestDbHelper,
  RealRoleUsers,
} from "@test/utils/test-db.helper";
import { FIXTURE_IDS } from "@test/fixtures/fixture-ids";

describe("AcceptanceController (Dữ liệu thật từ erp_test)", () => {
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

  describe("GET /acceptance (Danh sách yêu cầu nghiệm thu)", () => {
    it("TC-ACC-001 [Happy path]: Lấy danh sách yêu cầu nghiệm thu thành công", async () => {
      const res = await request(app.getHttpServer())
        .get("/acceptance?page=1&limit=10")
        .set("Authorization", `Bearer ${roles.pm.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();
      expect(body.items || Array.isArray(body)).toBeTruthy();
    });

    it("TC-ACC-002 [Auth]: Không có token bị từ chối 401", async () => {
      await request(app.getHttpServer()).get("/acceptance").expect(401);
    });

    it("TC-ACC-003 [Edge case]: Lọc theo projectId hợp lệ", async () => {
      const projectId = FIXTURE_IDS.PROJECTS[0];
      const res = await request(app.getHttpServer())
        .get(`/acceptance?projectId=${projectId}`)
        .set("Authorization", `Bearer ${roles.pm.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();
    });
  });

  describe("GET /acceptance/:id (Chi tiết yêu cầu nghiệm thu)", () => {
    it("TC-ACC-004 [Happy path]: Xem chi tiết yêu cầu nghiệm thu thật", async () => {
      const reqId = FIXTURE_IDS.ACCEPTANCE_REQUESTS[0];
      const res = await request(app.getHttpServer())
        .get(`/acceptance/${reqId}`)
        .set("Authorization", `Bearer ${roles.pm.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(body.id).toEqual(reqId);
      expect(body.name).toBeDefined();
    });

    it("TC-ACC-005 [Not found]: ID không tồn tại trả về null data", async () => {
      const res = await request(app.getHttpServer())
        .get("/acceptance/01ZZNOTFOUND00000000000000")
        .set("Authorization", `Bearer ${roles.pm.token}`)
        .expect(200);

      const body = res.body.data !== undefined ? res.body.data : res.body;
      expect(body).toBeNull();
    });
  });

  describe("POST /acceptance/request (Tạo yêu cầu nghiệm thu)", () => {
    it("TC-ACC-006 [Happy path]: PM tạo yêu cầu nghiệm thu mới thành công", async () => {
      const projectId = FIXTURE_IDS.PROJECTS[0];
      const serviceId = FIXTURE_IDS.CONTRACT_SERVICES[0];

      // Đảm bảo dịch vụ ở trạng thái ACTIVE và chưa nằm trong yêu cầu nghiệm thu nào
      await dataSource.query(
        `UPDATE contract_services SET status = 'ACTIVE' WHERE id = $1`,
        [serviceId],
      );
      await dataSource.query(
        `DELETE FROM acceptance_request_services WHERE "contractServiceId" = $1`,
        [serviceId],
      );

      const payload = {
        projectId,
        serviceIds: [serviceId],
        note: "Nghiệm thu tiến độ Sprint mới nhất",
      };

      const res = await request(app.getHttpServer())
        .post("/acceptance/request")
        .set("Authorization", `Bearer ${roles.pm.token}`)
        .send(payload)
        .expect(201);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();
      expect(body.projectId).toEqual(projectId);
    });

    it("TC-ACC-007 [Validation]: Thiếu projectId trả về lỗi 400", async () => {
      await request(app.getHttpServer())
        .post("/acceptance/request")
        .set("Authorization", `Bearer ${roles.pm.token}`)
        .send({ serviceIds: ["01ZZSERV000000000000000001"] })
        .expect(400);
    });
  });

  describe("POST /acceptance/:id/reject (Từ chối nghiệm thu)", () => {
    it("TC-ACC-008 [Validation]: Từ chối không kèm lý do feedback trả về 400", async () => {
      const reqId = FIXTURE_IDS.ACCEPTANCE_REQUESTS[0];
      await request(app.getHttpServer())
        .post(`/acceptance/${reqId}/reject`)
        .set("Authorization", `Bearer ${roles.bod.token}`)
        .send({})
        .expect(400);
    });

    it("TC-ACC-009 [Happy path]: BOD từ chối yêu cầu nghiệm thu kèm feedback", async () => {
      const reqId = FIXTURE_IDS.ACCEPTANCE_REQUESTS[0];
      // Reset trạng thái PENDING trước khi test từ chối
      await dataSource.query(
        `UPDATE acceptance_requests SET status = 'PENDING' WHERE id = $1`,
        [reqId],
      );

      const res = await request(app.getHttpServer())
        .post(`/acceptance/${reqId}/reject`)
        .set("Authorization", `Bearer ${roles.bod.token}`)
        .send({ feedback: "Chất lượng âm thanh chưa đạt tiêu chuẩn" })
        .expect(201);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();
    });
  });
});
