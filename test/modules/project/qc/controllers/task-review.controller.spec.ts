import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { TestDbHelper, RealRoleUsers } from '@test/utils/test-db.helper';
import { FIXTURE_IDS } from '@test/fixtures/fixture-ids';
import { TaskStatus } from '@modules/project/task/enums/task-status.enum';

describe('TaskReviewController (Đầy đủ 10 nhóm kiểm thử G01-G10 trên DB erp_test)', () => {
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
  // 1. ENDPOINT: GET /task-reviews/task/:taskId
  // =========================================================================
  describe('1. GET /task-reviews/task/:taskId (Lấy danh sách đánh giá tiêu chí)', () => {
    it('TC-TR-001 [Happy path]: Lấy danh sách đánh giá của task thành công (200)', async () => {
      const taskId = FIXTURE_IDS.TASKS[0];

      const res = await request(app.getHttpServer())
        .get(`/task-reviews/task/${taskId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();
      expect(Array.isArray(body)).toBe(true);
    });

    it('TC-TR-002 [Authentication]: Không gửi token trả về 401', async () => {
      const taskId = FIXTURE_IDS.TASKS[0];
      await request(app.getHttpServer())
        .get(`/task-reviews/task/${taskId}`)
        .expect(401);
    });
  });

  // =========================================================================
  // 2. ENDPOINT: PUT /task-reviews/:id/toggle (Đánh giá đạt / không đạt)
  // =========================================================================
  describe('2. PUT /task-reviews/:id/toggle (Đánh giá tiêu chí)', () => {
    it('TC-TR-003 [Happy path]: Assigner (PM) đánh giá đạt tiêu chí thành công (200)', async () => {
      const reviewId = FIXTURE_IDS.TASK_REVIEWS[0];

      // Đảm bảo task của review đang ở trạng thái reviewable (DOING) và assignerId là PM
      await dataSource.query(
        `UPDATE tasks SET status = $1, "assignerId" = $2 WHERE id = (SELECT "taskId" FROM task_reviews WHERE id = $3)`,
        [TaskStatus.DOING, roles.pm.userId, reviewId]
      );

      const res = await request(app.getHttpServer())
        .put(`/task-reviews/${reviewId}/toggle`)
        .set('Authorization', `Bearer ${roles.pm.token}`)
        .send({
          isPassed: true,
          note: 'Tiêu chí đã được kiểm định đạt chuẩn xuất sắc',
        })
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();

      // G10: Kiểm tra DB
      const dbReview = await dataSource.query(`SELECT "isPassed", note FROM task_reviews WHERE id = $1`, [reviewId]);
      expect(dbReview[0].isPassed).toBe(true);
      expect(dbReview[0].note).toBe('Tiêu chí đã được kiểm định đạt chuẩn xuất sắc');
    });

    it('TC-TR-003B [AuthZ / RBAC G04]: User không phải assigner bị từ chối đánh giá 403', async () => {
      const reviewId = FIXTURE_IDS.TASK_REVIEWS[0];
      await request(app.getHttpServer())
        .put(`/task-reviews/${reviewId}/toggle`)
        .set('Authorization', `Bearer ${roles.staffDesigner.token}`)
        .send({ isPassed: true })
        .expect(403);
    });

    it('TC-TR-004 [Not Found]: Review ID không tồn tại trả về 404', async () => {
      const fakeId = '01TESTNOTFOUNDREVIEW000000';
      await request(app.getHttpServer())
        .put(`/task-reviews/${fakeId}/toggle`)
        .set('Authorization', `Bearer ${roles.pm.token}`)
        .send({ isPassed: false })
        .expect(404);
    });
  });

  // =========================================================================
  // 3. ENDPOINT: POST /task-reviews/task/:taskId/reject (Từ chối kết quả)
  // =========================================================================
  describe('3. POST /task-reviews/task/:taskId/reject (Từ chối kết quả)', () => {
    it('TC-TR-005 [Happy path]: Assigner (PM) từ chối kết quả công việc chuyển sang REWORKING (200/201)', async () => {
      const taskId = FIXTURE_IDS.TASKS[1];

      // Đảm bảo task đang ở trạng thái AWAITING_REVIEW và assignerId là PM
      await dataSource.query(
        `UPDATE tasks SET status = $1, "assignerId" = $2 WHERE id = $3`,
        [TaskStatus.AWAITING_REVIEW, roles.pm.userId, taskId]
      );

      const res = await request(app.getHttpServer())
        .post(`/task-reviews/task/${taskId}/reject`)
        .set('Authorization', `Bearer ${roles.pm.token}`)
        .send({ note: 'Phát hiện màu sắc chưa chuẩn thương hiệu, yêu cầu làm lại' });

      expect([200, 201]).toContain(res.status);

      // G10: Kiểm tra task status trong DB chuyển về DOING để nhân viên làm lại
      const dbTask = await dataSource.query(`SELECT status FROM tasks WHERE id = $1`, [taskId]);
      expect(dbTask[0].status).toBe(TaskStatus.DOING);
    });
  });
});
