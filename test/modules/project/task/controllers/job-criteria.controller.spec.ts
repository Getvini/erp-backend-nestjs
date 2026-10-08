import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { ulid } from 'ulid';
import {
  TestDbHelper,
  RealRoleUsers,
} from '../../../../utils/test-db.helper';

describe('JobCriteriaController (e2e/integration) - Full Unit & RBAC Test Suite', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let roles: RealRoleUsers;

  let testJobId: string;
  let existingCriteriaId: string;
  let criteriaToDeleteId: string;
  const nonexistentId = '01JNONEXISTENTCRIT00000000';

  beforeAll(async () => {
    const context = await TestDbHelper.createTestingApp();
    app = context.app;
    dataSource = context.dataSource;
    roles = await TestDbHelper.getRealRoleUsers(dataSource);

    // 1. Tạo Job test riêng biệt
    testJobId = ulid();
    await dataSource.query(
      `INSERT INTO jobs (id, name, "costPrice", "unitPrice", "createdAt", "updatedAt")
       VALUES ($1, 'Công việc kiểm thử tiêu chí', 200000, 400000, NOW(), NOW())`,
      [testJobId],
    );

    // 2. Tạo sẵn tiêu chí test ban đầu
    existingCriteriaId = ulid();
    criteriaToDeleteId = ulid();

    await dataSource.query(
      `INSERT INTO job_criterias (id, "jobId", name, description, "createdAt", "updatedAt")
       VALUES ($1, $2, 'Tiêu chí chất lượng 1', 'Mô tả tiêu chí 1', NOW(), NOW()),
              ($3, $2, 'Tiêu chí xóa thử', 'Mô tả tiêu chí xóa', NOW(), NOW())`,
      [existingCriteriaId, testJobId, criteriaToDeleteId],
    );
  });

  afterAll(async () => {
    try {
      await dataSource.query('DELETE FROM job_criterias WHERE "jobId" = $1', [testJobId]);
      await dataSource.query('DELETE FROM jobs WHERE id = $1', [testJobId]);
    } catch {
      // Ignored
    }
    await TestDbHelper.closeTestingApp();
  });

  // =========================================================================
  // 1. ENDPOINT: GET /job-criteria/job/:jobId (Lấy danh sách tiêu chí theo Job)
  // =========================================================================
  describe('1. GET /job-criteria/job/:jobId (Lấy tiêu chí theo Job)', () => {
    it('TC-CRIT-001 [Happy path G01]: Lấy danh sách tiêu chí của Job thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/job-criteria/job/${testJobId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(2);
      const found = data.find((c: any) => c.id === existingCriteriaId);
      expect(found).toBeDefined();
      expect(found.name).toBe('Tiêu chí chất lượng 1');
    });

    it('TC-CRIT-002 [Auth G03]: 401 khi không truyền Token xác thực', async () => {
      await request(app.getHttpServer())
        .get(`/job-criteria/job/${testJobId}`)
        .expect(401);
    });
  });

  // =========================================================================
  // 2. ENDPOINT: POST /job-criteria (Tạo mới tiêu chí)
  // =========================================================================
  describe('2. POST /job-criteria (Tạo mới tiêu chí)', () => {
    it('TC-CRIT-003 [Happy path G01]: Tạo mới tiêu chí cho Job thành công (201)', async () => {
      const payload = {
        jobId: testJobId,
        name: 'Tiêu chí mới vừa tạo',
        description: 'Mô tả chi tiết tiêu chí mới',
      };

      const res = await request(app.getHttpServer())
        .post('/job-criteria')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(payload)
        .expect(201);

      const data = res.body.data || res.body;
      expect(data.id).toBeDefined();
      expect(data.name).toBe(payload.name);
      expect(data.jobId).toBe(testJobId);
    });

    it('TC-CRIT-004 [Validation G02]: 400 khi tên tiêu chí để trống', async () => {
      const payload = {
        jobId: testJobId,
        name: '',
      };

      await request(app.getHttpServer())
        .post('/job-criteria')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(payload)
        .expect(400);
    });

    it('TC-CRIT-005 [Error G02]: 404 khi jobId không tồn tại', async () => {
      const payload = {
        jobId: nonexistentId,
        name: 'Tiêu chí cho job ảo',
      };

      await request(app.getHttpServer())
        .post('/job-criteria')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(payload)
        .expect(404);
    });
  });

  // =========================================================================
  // 3. ENDPOINT: PUT /job-criteria/job/:jobId (Đồng bộ danh sách tiêu chí theo Job)
  // =========================================================================
  describe('3. PUT /job-criteria/job/:jobId (Đồng bộ danh sách tiêu chí)', () => {
    it('TC-CRIT-006 [Happy path G01]: Đồng bộ tiêu chí (cập nhật & tạo mới) thành công (200)', async () => {
      const syncPayload = [
        {
          id: existingCriteriaId,
          name: 'Tiêu chí chất lượng 1 (Đã cập nhật qua Sync)',
          description: 'Mô tả sau khi sync',
        },
        {
          name: 'Tiêu chí tạo mới thông qua sync',
          description: 'Mô tả mới',
        },
      ];

      const res = await request(app.getHttpServer())
        .put(`/job-criteria/job/${testJobId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(syncPayload)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
      const updated = data.find((c: any) => c.id === existingCriteriaId);
      expect(updated.name).toBe('Tiêu chí chất lượng 1 (Đã cập nhật qua Sync)');
    });

    it('TC-CRIT-007 [Error G02]: 404 khi đồng bộ cho Job không tồn tại', async () => {
      await request(app.getHttpServer())
        .put(`/job-criteria/job/${nonexistentId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send([{ name: 'Tiêu chí thử' }])
        .expect(404);
    });
  });

  // =========================================================================
  // 4. ENDPOINT: DELETE /job-criteria/:id (Xóa tiêu chí theo ID)
  // =========================================================================
  describe('4. DELETE /job-criteria/:id (Xóa tiêu chí)', () => {
    it('TC-CRIT-008 [Happy path G01]: Xóa tiêu chí thành công (200)', async () => {
      // Tạo tiêu chí riêng ngay trước khi xóa để đảm bảo không bị ảnh hưởng bởi syncCriteria
      const freshCriteriaId = ulid();
      await dataSource.query(
        `INSERT INTO job_criterias (id, "jobId", name, description, "createdAt", "updatedAt")
         VALUES ($1, $2, 'Tiêu chí xóa riêng', 'Mô tả', NOW(), NOW())`,
        [freshCriteriaId, testJobId],
      );

      const res = await request(app.getHttpServer())
        .delete(`/job-criteria/${freshCriteriaId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.id).toBe(freshCriteriaId);
    });

    it('TC-CRIT-009 [Error G02]: 404 khi ID tiêu chí không tồn tại', async () => {
      await request(app.getHttpServer())
        .delete(`/job-criteria/${nonexistentId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(404);
    });
  });
});
