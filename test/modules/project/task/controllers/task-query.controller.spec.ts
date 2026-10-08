import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { TestDbHelper, RealRoleUsers } from '@test/utils/test-db.helper';
import { FIXTURE_IDS } from '@test/fixtures/fixture-ids';

describe('TaskQueryController (Đầy đủ 10 nhóm kiểm thử G01-G10 trên DB erp_test)', () => {
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
  // 1. ENDPOINT: GET /tasks (Lấy danh sách công việc có phân trang & lọc)
  // =========================================================================
  describe('1. GET /tasks (Danh sách công việc)', () => {
    it('TC-TQ-001 [Happy path & Pagination]: PM lấy danh sách công việc thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/tasks?page=1&limit=10')
        .set('Authorization', `Bearer ${roles.pm.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();
      expect(body.items || Array.isArray(body)).toBeTruthy();
    });

    it('TC-TQ-002 [Filter]: Lọc theo projectId hợp lệ', async () => {
      const projectId = FIXTURE_IDS.PROJECTS[0];
      const res = await request(app.getHttpServer())
        .get(`/tasks?projectId=${projectId}`)
        .set('Authorization', `Bearer ${roles.pm.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();
    });

    it('TC-TQ-003 [Authentication]: Không gửi token trả về 401', async () => {
      await request(app.getHttpServer())
        .get('/tasks')
        .expect(401);
    });
  });

  // =========================================================================
  // 2. ENDPOINT: GET /tasks/project/:projectId (Lấy công việc theo dự án)
  // =========================================================================
  describe('2. GET /tasks/project/:projectId (Công việc theo dự án)', () => {
    it('TC-TQ-004 [Happy path]: Lấy danh sách nhiệm vụ của dự án thành công (200)', async () => {
      const projectId = FIXTURE_IDS.PROJECTS[0];
      const res = await request(app.getHttpServer())
        .get(`/tasks/project/${projectId}`)
        .set('Authorization', `Bearer ${roles.pm.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();
    });
  });

  // =========================================================================
  // 3. ENDPOINT: GET /tasks/:id (Xem chi tiết một công việc)
  // =========================================================================
  describe('3. GET /tasks/:id (Chi tiết công việc)', () => {
    it('TC-TQ-005 [Happy path]: Admin xem chi tiết task thành công (200)', async () => {
      const taskId = FIXTURE_IDS.TASKS[0];
      const res = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();
      expect(body.id).toBe(taskId);
    });

    it('TC-TQ-005B [IDOR / AuthZ G05]: PM ngoài dự án xem task bị từ chối 403', async () => {
      const taskId = FIXTURE_IDS.TASKS[0];
      await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${roles.pm.token}`)
        .expect(403);
    });

    it('TC-TQ-006 [Not Found]: ID công việc không tồn tại trả về 404', async () => {
      const fakeId = '01TESTNOTFOUNDTASK00000000';
      await request(app.getHttpServer())
        .get(`/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${roles.pm.token}`)
        .expect(404);
    });
  });

  // =========================================================================
  // 4. ENDPOINT: GET /tasks/assignee/:userId/daily-workload (Tải công việc)
  // =========================================================================
  describe('4. GET /tasks/assignee/:userId/daily-workload', () => {
    it('TC-TQ-007 [Happy path]: Xem tải công việc hàng ngày của nhân viên thành công (200)', async () => {
      const userId = roles.staffContent.userId;
      const startDate = new Date(Date.now() - 86400000 * 7).toISOString().slice(0, 10);
      const endDate = new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10);

      const res = await request(app.getHttpServer())
        .get(`/tasks/assignee/${userId}/daily-workload?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${roles.pm.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();
    });
  });
});
