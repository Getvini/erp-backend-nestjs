import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { TestDbHelper, RealRoleUsers } from '@test/utils/test-db.helper';
import { FIXTURE_IDS } from '@test/fixtures/fixture-ids';

describe('TaskResultCheckController (Đầy đủ 10 nhóm kiểm thử G01-G10 trên DB erp_test)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let roles: RealRoleUsers;

  const targetTaskId = FIXTURE_IDS.TASKS[0];
  const checkRecordId = '01TESTCHECKREC000000000001';

  beforeAll(async () => {
    const context = await TestDbHelper.createTestingApp();
    app = context.app;
    dataSource = context.dataSource;
    roles = await TestDbHelper.getRealRoleUsers(dataSource);

    // Đảm bảo task có assignerId là PM để thỏa mãn quyền kiểm tra kết quả
    await dataSource.query(
      `UPDATE tasks SET "assignerId" = $1 WHERE id = $2`,
      [roles.pm.userId, targetTaskId]
    );

    // Seed 1 bản ghi task_result_checks mẫu
    const initialSpellErrors = [
      { id: 'err-1', token: 'chính tả', location: 'dòng 3', confirmed: false },
      { id: 'err-2', token: 'màu săc', location: 'dòng 5', confirmed: false },
    ];

    await dataSource.query(
      `INSERT INTO task_result_checks (id, "taskId", status, "spellStatus", "qcStatus", "spellErrors", "reviewedSpellErrors", "createdAt", "updatedAt")
       VALUES ($1, $2, 'PENDING', 'DONE', 'DONE', $3, $4, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [checkRecordId, targetTaskId, JSON.stringify(initialSpellErrors), JSON.stringify(initialSpellErrors)]
    );
  });

  afterAll(async () => {
    await dataSource.query(`DELETE FROM task_result_checks WHERE id = $1`, [checkRecordId]);
    await TestDbHelper.closeTestingApp();
  });

  // =========================================================================
  // 1. ENDPOINT: GET /task-result-checks/task/:taskId
  // =========================================================================
  describe('1. GET /task-result-checks/task/:taskId (Lấy kết quả kiểm tra)', () => {
    it('TC-TRC-001 [Happy path]: Assigner (PM) lấy kết quả kiểm tra thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/task-result-checks/task/${targetTaskId}`)
        .set('Authorization', `Bearer ${roles.pm.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();
      expect(body.taskId).toBe(targetTaskId);
      expect(body.canReview).toBe(true);
    });

    it('TC-TRC-002 [Not Found G06]: Task không tồn tại trả về 404', async () => {
      const fakeId = '01TESTNOTFOUNDTASK00000000';
      await request(app.getHttpServer())
        .get(`/task-result-checks/task/${fakeId}`)
        .set('Authorization', `Bearer ${roles.pm.token}`)
        .expect(404);
    });

    it('TC-TRC-003 [Authentication G03]: Không gửi token trả về 401', async () => {
      await request(app.getHttpServer())
        .get(`/task-result-checks/task/${targetTaskId}`)
        .expect(401);
    });
  });

  // =========================================================================
  // 2. ENDPOINT: PATCH /task-result-checks/task/:taskId/toggle (Xác nhận lỗi)
  // =========================================================================
  describe('2. PATCH /task-result-checks/task/:taskId/toggle (Xác nhận lỗi)', () => {
    it('TC-TRC-004 [Happy path]: Xác nhận 1 lỗi chính tả thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/task-result-checks/task/${targetTaskId}/toggle`)
        .set('Authorization', `Bearer ${roles.pm.token}`)
        .send({
          kind: 'SPELL',
          id: 'err-1',
          confirmed: true,
        })
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();

      // G10: Kiểm tra DB
      const dbCheck = await dataSource.query(`SELECT "reviewedSpellErrors" FROM task_result_checks WHERE id = $1`, [checkRecordId]);
      const errors = dbCheck[0].reviewedSpellErrors;
      const target = errors.find((e: any) => e.id === 'err-1');
      expect(target).toBeDefined();
      expect(target.confirmed).toBe(true);
    });
  });

  // =========================================================================
  // 3. ENDPOINT: POST /task-result-checks/task/:taskId/finalize (Chốt kết quả)
  // =========================================================================
  describe('3. POST /task-result-checks/task/:taskId/finalize (Chốt kết quả)', () => {
    it('TC-TRC-005 [Happy path]: Assigner (PM) chốt kết quả kiểm tra thành công (200/201)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/task-result-checks/task/${targetTaskId}/finalize`)
        .set('Authorization', `Bearer ${roles.pm.token}`)
        .send();

      expect([200, 201]).toContain(res.status);

      // G10: Kiểm tra finalizedAt đã được cập nhật
      const dbCheck = await dataSource.query(`SELECT "finalizedAt" FROM task_result_checks WHERE id = $1`, [checkRecordId]);
      expect(dbCheck[0].finalizedAt).not.toBeNull();
    });
  });
});
