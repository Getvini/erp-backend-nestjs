import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
  TestDbHelper,
  RealRoleUsers,
} from '../../../../utils/test-db.helper';
import { UserRole } from '../../../../../src/modules/identity/user/enums/user-role.enum';

describe('SettingController (e2e/integration) - Full Unit & RBAC Test Suite', () => {
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
    await app.close();
  });

  // =========================================================================
  describe('1. GET /settings/qc (Lấy cấu hình kiểm định QC)', () => {
    it('TC-SET-001 [Happy path G01]: Admin lấy cấu hình QC thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/settings/qc')
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data).toHaveProperty('config');
      expect(data).toHaveProperty('options');
      expect(data.options).toHaveProperty('providers');
    });

    it('TC-SET-002 [RBAC G04]: 403 khi staffContent cố xem cấu hình QC', async () => {
      const res = await request(app.getHttpServer())
        .get('/settings/qc')
        .set('Authorization', `Bearer ${roles.staffContent.token}`);

      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  describe('2. PUT /settings/qc (Cập nhật cấu hình kiểm định QC)', () => {
    it('TC-SET-003 [Happy path G01]: Admin cập nhật cấu hình QC thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .put('/settings/qc')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          provider: 'groq',
          verifyModel: 'openai/gpt-oss-120b',
          reasoningEffort: 'low',
          maxBatch: 5,
          maxContext: 8000,
        });

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data.config.provider).toBe('groq');
      expect(data.config.verifyModel).toBe('openai/gpt-oss-120b');
    });

    it('TC-SET-004 [RBAC G04]: 403 khi staffContent cố cập nhật cấu hình QC', async () => {
      const res = await request(app.getHttpServer())
        .put('/settings/qc')
        .set('Authorization', `Bearer ${roles.staffContent.token}`)
        .send({
          provider: 'groq',
        });

      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  describe('3. GET /settings/workload-norms (Lấy định mức công việc)', () => {
    it('TC-SET-005 [Happy path G01]: Admin lấy danh sách định mức công việc thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/settings/workload-norms')
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data).toHaveProperty('norms');
      expect(Array.isArray(data.norms)).toBe(true);
    });

    it('TC-SET-006 [RBAC G04]: 403 khi staffContent cố xem định mức công việc', async () => {
      const res = await request(app.getHttpServer())
        .get('/settings/workload-norms')
        .set('Authorization', `Bearer ${roles.staffContent.token}`);

      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  describe('4. PUT /settings/workload-norms (Cập nhật định mức công việc)', () => {
    it('TC-SET-007 [Happy path G01]: Admin cập nhật định mức công việc thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .put('/settings/workload-norms')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          norms: [
            {
              role: UserRole.CONTENT_A,
              monthlyNorm: 120,
            },
          ],
        });

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data).toHaveProperty('norms');
    });

    it('TC-SET-008 [RBAC G04]: 403 khi staffContent cố cập nhật định mức công việc', async () => {
      const res = await request(app.getHttpServer())
        .put('/settings/workload-norms')
        .set('Authorization', `Bearer ${roles.staffContent.token}`)
        .send({
          norms: [],
        });

      expect(res.status).toBe(403);
    });

    it('TC-SET-009 [Auth G03]: 401 khi không truyền Auth token', async () => {
      const res = await request(app.getHttpServer())
        .get('/settings/qc');

      expect(res.status).toBe(401);
    });
  });
});
