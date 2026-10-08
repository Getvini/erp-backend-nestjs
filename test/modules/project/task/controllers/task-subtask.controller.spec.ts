import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { TestDbHelper, RealRoleUsers } from '@test/utils/test-db.helper';
import { FIXTURE_IDS } from '@test/fixtures/fixture-ids';

describe('TaskSubtaskController (Đầy đủ 10 nhóm kiểm thử G01-G10 trên DB erp_test)', () => {
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
  // 1. ENDPOINT: POST /tasks/:id/subtasks (Tạo subtask con)
  // =========================================================================
  describe('1. POST /tasks/:id/subtasks (Tạo subtask)', () => {
    it('TC-TS-001 [Happy path]: Admin tạo subtask con thành công (201)', async () => {
      const parentTaskId = FIXTURE_IDS.TASKS[0];

      // Đảm bảo project không bị ON_HOLD
      await dataSource.query(
        `UPDATE projects SET status = 'IN_PROGRESS', "isOnHold" = false 
         WHERE id = (SELECT "projectId" FROM tasks WHERE id = $1)`,
        [parentTaskId],
      );

      // Đảm bảo parentTask không có subtask cũ để allocationPercent không bị vượt 100%
      await dataSource.query(`DELETE FROM tasks WHERE "parentTaskId" = $1`, [parentTaskId]);

      const payload = {
        name: 'Subtask 01: Thiết kế giao diện Header & Navigation',
        allocationPercent: 40,
        assigneeId: roles.staffDesigner.userId,
        description: 'Chi tiết phần việc cắt ghép asset UI',
      };

      const res = await request(app.getHttpServer())
        .post(`/tasks/${parentTaskId}/subtasks`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(payload)
        .expect(201);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();
      expect(body.id).toBeDefined();
      expect(body.name).toBe(payload.name);

      // G10: Kiểm tra subtask trong DB
      const dbSubtask = await dataSource.query(`SELECT * FROM tasks WHERE id = $1`, [body.id]);
      expect(dbSubtask.length).toBe(1);
      expect(dbSubtask[0].parentTaskId).toBe(parentTaskId);
      expect(Number(dbSubtask[0].allocationPercent)).toBe(40);
    });

    it('TC-TS-002 [Business Invariant G08]: Tổng allocationPercent vượt quá 100% trả về 400', async () => {
      const parentTaskId = FIXTURE_IDS.TASKS[0];

      // Thử tạo thêm 1 subtask với allocationPercent = 80 (đã có 40% ở test trước -> 120%)
      const invalidPayload = {
        name: 'Subtask 02: Vượt hạn mức phần trăm',
        allocationPercent: 80,
      };

      await request(app.getHttpServer())
        .post(`/tasks/${parentTaskId}/subtasks`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(invalidPayload)
        .expect(400);
    });

    it('TC-TS-003 [Not Found G06]: Task cha không tồn tại trả về 404', async () => {
      const fakeId = '01TESTNOTFOUNDPARENT000000';
      await request(app.getHttpServer())
        .post(`/tasks/${fakeId}/subtasks`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          name: 'Subtask Lỗi Parent',
          allocationPercent: 10,
        })
        .expect(404);
    });
  });

  // =========================================================================
  // 2. ENDPOINT: POST /tasks/:id/request-staffing (Yêu cầu nhân sự)
  // =========================================================================
  describe('2. POST /tasks/:id/request-staffing (Yêu cầu nhân sự)', () => {
    it('TC-TS-004 [Happy path]: Gửi yêu cầu bổ sung nhân sự thành công (200/201)', async () => {
      const taskId = FIXTURE_IDS.TASKS[1];

      // Đảm bảo project không bị ON_HOLD
      await dataSource.query(
        `UPDATE projects SET status = 'IN_PROGRESS', "isOnHold" = false 
         WHERE id = (SELECT "projectId" FROM tasks WHERE id = $1)`,
        [taskId],
      );

      const res = await request(app.getHttpServer())
        .post(`/tasks/${taskId}/request-staffing`)
        .set('Authorization', `Bearer ${roles.pm.token}`)
        .send({ note: 'Cần bổ sung thêm 1 bạn designer hỗ trợ gấp' });

      expect([200, 201]).toContain(res.status);

      // G10: Kiểm tra cờ isSupportRequested và supportRequestType
      const dbTask = await dataSource.query(`SELECT "isSupportRequested", "supportRequestType" FROM tasks WHERE id = $1`, [taskId]);
      expect(dbTask[0].isSupportRequested).toBe(true);
      expect(dbTask[0].supportRequestType).toBe('STAFFING');
    });

    it('TC-TS-005 [Authentication G03]: Không gửi token trả về 401', async () => {
      const taskId = FIXTURE_IDS.TASKS[1];
      await request(app.getHttpServer())
        .post(`/tasks/${taskId}/request-staffing`)
        .send({ note: 'No Auth' })
        .expect(401);
    });
  });

  // =========================================================================
  // 3. ENDPOINT: PATCH /tasks/:id/respond-staffing (Phản hồi nhân sự)
  // =========================================================================
  describe('3. PATCH /tasks/:id/respond-staffing (Phản hồi nhân sự)', () => {
    it('TC-TS-006 [Happy path]: Phản hồi yêu cầu nhân sự thành công (200)', async () => {
      const taskId = FIXTURE_IDS.TASKS[1];

      const res = await request(app.getHttpServer())
        .patch(`/tasks/${taskId}/respond-staffing`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ action: 'RESOLVE' })
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();

      // G10: Cờ isSupportRequested chuyển về false
      const dbTask = await dataSource.query(`SELECT "isSupportRequested" FROM tasks WHERE id = $1`, [taskId]);
      expect(dbTask[0].isSupportRequested).toBe(false);
    });
  });
});
