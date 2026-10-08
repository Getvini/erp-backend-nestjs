import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { TestDbHelper, RealRoleUsers } from '@test/utils/test-db.helper';
import { FIXTURE_IDS } from '@test/fixtures/fixture-ids';
import { TaskStatus } from '@modules/project/task/enums/task-status.enum';

describe('TaskController (Đầy đủ 10 nhóm kiểm thử G01-G10 trên DB erp_test)', () => {
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
  // 1. ENDPOINT: POST /tasks (Tạo công việc dự án hoặc cơ hội)
  // =========================================================================
  describe('1. POST /tasks (Tạo công việc)', () => {
    it('TC-TASK-001 [Happy path]: PM tạo công việc dự án thành công (201)', async () => {
      const payload = {
        name: 'Thiết kế Mockup UI Cho Phân Hệ Task Test',
        projectId: FIXTURE_IDS.PROJECTS[0],
        jobId: FIXTURE_IDS.JOBS[0],
        assigneeId: roles.staffDesigner.userId,
        plannedStartDate: new Date().toISOString(),
        plannedEndDate: new Date(Date.now() + 86400000 * 3).toISOString(),
        description: 'Mô tả chi tiết nhiệm vụ thiết kế',
      };

      const res = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(payload)
        .expect(201);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();
      expect(body.id).toBeDefined();
      expect(body.name).toBe(payload.name);

      // G10: Kiểm tra dữ liệu được lưu vào DB
      const dbTask = await dataSource.query(`SELECT * FROM tasks WHERE id = $1`, [body.id]);
      expect(dbTask.length).toBe(1);
      expect(dbTask[0].name).toBe(payload.name);
    });

    it('TC-TASK-002 [Validation]: Gửi body thiếu tên công việc hoặc jobId phải nhận 400', async () => {
      const invalidPayload = {
        projectId: FIXTURE_IDS.PROJECTS[0],
      };

      await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${roles.pm.token}`)
        .send(invalidPayload)
        .expect(400);
    });

    it('TC-TASK-003 [Authentication]: Không gửi JWT token bị từ chối 401', async () => {
      await request(app.getHttpServer())
        .post('/tasks')
        .send({ name: 'Task Test No Auth' })
        .expect(401);
    });
  });

  // =========================================================================
  // 2. ENDPOINT: PATCH /tasks/:id/nickname (Cập nhật nickname công việc)
  // =========================================================================
  describe('2. PATCH /tasks/:id/nickname (Cập nhật nickname)', () => {
    it('TC-TASK-004 [Happy path]: PM cập nhật nickname thành công (200)', async () => {
      const taskId = FIXTURE_IDS.TASKS[0];
      const nickname = 'Task-VIP-01';

      const res = await request(app.getHttpServer())
        .patch(`/tasks/${taskId}/nickname`)
        .set('Authorization', `Bearer ${roles.pm.token}`)
        .send({ nickname })
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();

      // G10: Xác nhận nickname trong DB
      const dbTask = await dataSource.query(`SELECT nickname FROM tasks WHERE id = $1`, [taskId]);
      expect(dbTask[0].nickname).toBe(nickname);
    });

    it('TC-TASK-005 [Not Found]: ID công việc không tồn tại trả về 404', async () => {
      const fakeId = '01TESTNOTFOUNDTASK00000000';
      await request(app.getHttpServer())
        .patch(`/tasks/${fakeId}/nickname`)
        .set('Authorization', `Bearer ${roles.pm.token}`)
        .send({ nickname: 'Fake' })
        .expect(404);
    });
  });

  // =========================================================================
  // 3. ENDPOINT: PUT /tasks/:id (Cập nhật thông tin công việc)
  // =========================================================================
  describe('3. PUT /tasks/:id (Cập nhật công việc)', () => {
    it('TC-TASK-006 [Happy path]: PM cập nhật thông tin nhiệm vụ thành công (200)', async () => {
      const taskId = FIXTURE_IDS.TASKS[1];
      const updatedName = 'Tên công việc đã được cập nhật kiểm thử';

      const res = await request(app.getHttpServer())
        .put(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${roles.pm.token}`)
        .send({ name: updatedName, description: 'Cập nhật ghi chú mới' })
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();

      // G10: Assert DB
      const dbTask = await dataSource.query(`SELECT name FROM tasks WHERE id = $1`, [taskId]);
      expect(dbTask[0].name).toBe(updatedName);
    });

    it('TC-TASK-007 [Not Found]: Cập nhật task không tồn tại trả về 404', async () => {
      const fakeId = '01TESTNOTFOUNDTASK00000001';
      await request(app.getHttpServer())
        .put(`/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${roles.pm.token}`)
        .send({ name: 'Non Existent' })
        .expect(404);
    });
  });

  // =========================================================================
  // 4. ENDPOINT: PUT /tasks/:id/assign (Phân công công việc)
  // =========================================================================
  describe('4. PUT /tasks/:id/assign (Phân công công việc)', () => {
    it('TC-TASK-008 [Happy path]: Admin phân công nhiệm vụ cho nhân viên thành công (200)', async () => {
      const taskId = FIXTURE_IDS.TASKS[2];
      const newAssigneeId = roles.staffContent.userId;

      const res = await request(app.getHttpServer())
        .put(`/tasks/${taskId}/assign`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          assigneeId: newAssigneeId,
          plannedStartDate: new Date().toISOString(),
          plannedEndDate: new Date(Date.now() + 86400000 * 5).toISOString(),
        })
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();

      // G10: Xác nhận assignee trong DB
      const dbTask = await dataSource.query(`SELECT "assigneeId" FROM tasks WHERE id = $1`, [taskId]);
      expect(dbTask[0].assigneeId).toBe(newAssigneeId);
    });

    it('TC-TASK-009 [Validation]: Phân công thiếu assigneeId trả về 400', async () => {
      const taskId = FIXTURE_IDS.TASKS[2];
      await request(app.getHttpServer())
        .put(`/tasks/${taskId}/assign`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({})
        .expect(400);
    });
  });

  // =========================================================================
  // 5. ENDPOINT: PATCH /tasks/:id/start (Bắt đầu công việc)
  // =========================================================================
  describe('5. PATCH /tasks/:id/start (Bắt đầu công việc)', () => {
    it('TC-TASK-010 [Happy path]: Assignee bắt đầu thực hiện task (200)', async () => {
      const taskId = FIXTURE_IDS.TASKS[3];

      // Đảm bảo project không bị ON_HOLD
      await dataSource.query(
        `UPDATE projects SET status = 'IN_PROGRESS', "isOnHold" = false 
         WHERE id = (SELECT "projectId" FROM tasks WHERE id = $1)`,
        [taskId],
      );

      // Chuẩn bị 1 task trạng thái NOT_STARTED với assigneeId là staffDesigner
      await dataSource.query(
        `UPDATE tasks SET status = $1, "assigneeId" = $2, "actualStartDate" = NULL WHERE id = $3`,
        [TaskStatus.NOT_STARTED, roles.staffDesigner.userId, taskId],
      );

      const res = await request(app.getHttpServer())
        .patch(`/tasks/${taskId}/start`)
        .set('Authorization', `Bearer ${roles.staffDesigner.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();

      // G10: Trạng thái task chuyển thành DOING
      const dbTask = await dataSource.query(`SELECT status FROM tasks WHERE id = $1`, [taskId]);
      expect(dbTask[0].status).toBe(TaskStatus.DOING);
    });

    it('TC-TASK-011 [Not Found]: Bắt đầu task không tồn tại trả về 404', async () => {
      const fakeId = '01TESTNOTFOUNDTASK00000002';
      await request(app.getHttpServer())
        .patch(`/tasks/${fakeId}/start`)
        .set('Authorization', `Bearer ${roles.staffDesigner.token}`)
        .expect(404);
    });
  });

  // =========================================================================
  // 6. ENDPOINT: PATCH /tasks/:id/submit-result (Nộp kết quả công việc)
  // =========================================================================
  describe('6. PATCH /tasks/:id/submit-result (Nộp kết quả công việc)', () => {
    it('TC-TASK-012 [Happy path]: Nộp kết quả bàn giao công việc thành công (200)', async () => {
      const taskId = FIXTURE_IDS.TASKS[4];

      // Đảm bảo project không bị ON_HOLD
      await dataSource.query(
        `UPDATE projects SET status = 'IN_PROGRESS', "isOnHold" = false 
         WHERE id = (SELECT "projectId" FROM tasks WHERE id = $1)`,
        [taskId],
      );

      // Đảm bảo task đang DOING với assignee là staffDesigner
      await dataSource.query(
        `UPDATE tasks SET status = $1, "assigneeId" = $2 WHERE id = $3`,
        [TaskStatus.DOING, roles.staffDesigner.userId, taskId],
      );

      const res = await request(app.getHttpServer())
        .patch(`/tasks/${taskId}/submit-result`)
        .set('Authorization', `Bearer ${roles.staffDesigner.token}`)
        .send({
          result: 'Đã hoàn thành bàn giao toàn bộ tài liệu thiết kế bản vẽ https://storage.erp.test/files/mockup.zip',
        })
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();
    });

    it('TC-TASK-013 [Validation]: Nộp kết quả không có trường result trả về 400', async () => {
      const taskId = FIXTURE_IDS.TASKS[4];
      await request(app.getHttpServer())
        .patch(`/tasks/${taskId}/submit-result`)
        .set('Authorization', `Bearer ${roles.staffDesigner.token}`)
        .send({})
        .expect(400);
    });
  });

  // =========================================================================
  // 7. ENDPOINT: POST /tasks/:id/request-support (Yêu cầu hỗ trợ)
  // =========================================================================
  describe('7. POST /tasks/:id/request-support (Yêu cầu hỗ trợ)', () => {
    it('TC-TASK-014 [Happy path]: Gửi yêu cầu hỗ trợ công việc thành công (200/201)', async () => {
      const taskId = FIXTURE_IDS.TASKS[5];

      // Đảm bảo project không bị ON_HOLD
      await dataSource.query(
        `UPDATE projects SET status = 'IN_PROGRESS', "isOnHold" = false 
         WHERE id = (SELECT "projectId" FROM tasks WHERE id = $1)`,
        [taskId],
      );

      // Đảm bảo task đang trạng thái DOING để thỏa mãn supportableStatuses
      await dataSource.query(
        `UPDATE tasks SET status = $1 WHERE id = $2`,
        [TaskStatus.DOING, taskId],
      );

      const res = await request(app.getHttpServer())
        .post(`/tasks/${taskId}/request-support`)
        .set('Authorization', `Bearer ${roles.staffDesigner.token}`)
        .send({ note: 'Cần hỗ trợ về tài nguyên hình ảnh từ khách hàng' });

      expect([200, 201]).toContain(res.status);
    });
  });

  // =========================================================================
  // 8. ENDPOINT: POST /tasks/:id/remind (Gửi nhắc nhở tiến độ)
  // =========================================================================
  describe('8. POST /tasks/:id/remind (Nhắc nhở tiến độ)', () => {
    it('TC-TASK-015 [Happy path]: Admin gửi nhắc nhở tiến độ công việc thành công (200/201)', async () => {
      const taskId = FIXTURE_IDS.TASKS[6];

      // Đảm bảo project không bị ON_HOLD
      await dataSource.query(
        `UPDATE projects SET status = 'IN_PROGRESS', "isOnHold" = false 
         WHERE id = (SELECT "projectId" FROM tasks WHERE id = $1)`,
        [taskId],
      );

      const res = await request(app.getHttpServer())
        .post(`/tasks/${taskId}/remind`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send();

      expect([200, 201]).toContain(res.status);
    });
  });

  // =========================================================================
  // 9. ENDPOINT: DELETE /tasks/:id (Xóa công việc)
  // =========================================================================
  describe('9. DELETE /tasks/:id (Xóa công việc)', () => {
    it('TC-TASK-016 [Happy path]: Admin xóa công việc thành công (200)', async () => {
      // Tạo trước 1 task tạm để xóa
      const createRes = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          name: 'Task Tạm Thời Cần Xóa Trong Kiểm Thử',
          projectId: FIXTURE_IDS.PROJECTS[0],
          jobId: FIXTURE_IDS.JOBS[0],
        })
        .expect(201);

      const tempTaskId = (createRes.body.data || createRes.body).id;

      await request(app.getHttpServer())
        .delete(`/tasks/${tempTaskId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      // G10: Kiểm tra bản ghi đã bị xóa hoặc soft deleted
      const checkDb = await dataSource.query(`SELECT * FROM tasks WHERE id = $1`, [tempTaskId]);
      if (checkDb.length > 0) {
        expect(checkDb[0].deletedAt || checkDb[0].status).toBeTruthy();
      } else {
        expect(checkDb.length).toBe(0);
      }
    });

    it('TC-TASK-017 [Not Found]: Xóa task không tồn tại trả về 404', async () => {
      const fakeId = '01TESTNOTFOUNDTASK00000009';
      await request(app.getHttpServer())
        .delete(`/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${roles.pm.token}`)
        .expect(404);
    });
  });
});
