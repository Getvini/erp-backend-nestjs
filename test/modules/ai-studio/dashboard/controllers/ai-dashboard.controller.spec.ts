import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
  TestDbHelper,
  RealRoleUsers,
} from '../../../../utils/test-db.helper';

describe('AiDashboardController (e2e/integration) - Full Unit & RBAC Test Suite', () => {
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
  describe('1. GET /ai-dashboard (Thống kê tổng quan AI Dashboard)', () => {
    it('TC-AIDASH-001 [Happy path G01]: Admin lấy thống kê AI Dashboard thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/ai-dashboard')
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data).toHaveProperty('stats');
      expect(data).toHaveProperty('generations');
      expect(data).toHaveProperty('spending');
      expect(data).toHaveProperty('filters');
      expect(data.filters.canViewMembers).toBe(true);
    });

    it('TC-AIDASH-002 [Happy path G01]: Staff lấy thống kê AI của chính mình thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/ai-dashboard')
        .set('Authorization', `Bearer ${roles.staffContent.token}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data.filters.canViewMembers).toBe(false);
    });

    it('TC-AIDASH-003 [RBAC/IDOR G04]: 403 khi staff cố xem thống kê của thành viên khác', async () => {
      const res = await request(app.getHttpServer())
        .get('/ai-dashboard')
        .query({ userId: roles.admin.userId })
        .set('Authorization', `Bearer ${roles.staffContent.token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Bạn không có quyền xem thống kê AI của thành viên khác');
    });

    it('TC-AIDASH-004 [Validation G02]: 400 khi truyền cả projectId và opportunityId', async () => {
      const res = await request(app.getHttpServer())
        .get('/ai-dashboard')
        .query({
          projectId: '01JPROJECT00000000000000001',
          opportunityId: '01JOPP0000000000000000000001',
        })
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Chỉ được chọn dự án hoặc cơ hội tại một thời điểm');
    });

    it('TC-AIDASH-005 [Validation G02]: 400 khi tháng không hợp lệ (month > 12 hoặc < 1)', async () => {
      const res = await request(app.getHttpServer())
        .get('/ai-dashboard')
        .query({ month: 13 })
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Tháng thống kê không hợp lệ');
    });

    it('TC-AIDASH-006 [Validation G02]: 400 khi năm không hợp lệ (year < 2020)', async () => {
      const res = await request(app.getHttpServer())
        .get('/ai-dashboard')
        .query({ year: 2019 })
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Năm thống kê không hợp lệ');
    });

    it('TC-AIDASH-007 [Auth G03]: 401 khi không truyền Auth token', async () => {
      const res = await request(app.getHttpServer())
        .get('/ai-dashboard');

      expect(res.status).toBe(401);
    });
  });
});
