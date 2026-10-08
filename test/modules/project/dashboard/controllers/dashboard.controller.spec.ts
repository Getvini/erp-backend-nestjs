import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
  TestDbHelper,
  RealRoleUsers,
} from '../../../../utils/test-db.helper';

describe('DashboardController (e2e/integration) - Full Unit & RBAC Test Suite', () => {
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
  describe('1. GET /dashboard (Dữ liệu tổng quan Dashboard)', () => {
    it('TC-DASH-001 [Happy path G01]: Admin lấy dữ liệu dashboard hệ thống thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/dashboard')
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data).toHaveProperty('scope');
      expect(data.scope.canSelectMembers).toBe(true);
    });

    it('TC-DASH-002 [Happy path G01]: BOD lấy dữ liệu dashboard thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/dashboard')
        .set('Authorization', `Bearer ${roles.bod.token}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data).toHaveProperty('scope');
      expect(data.scope.canSelectMembers).toBe(true);
    });

    it('TC-DASH-003 [Happy path G01]: StaffContent lấy dashboard cá nhân thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/dashboard')
        .set('Authorization', `Bearer ${roles.staffContent.token}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data).toHaveProperty('scope');
      expect(data.scope.canSelectMembers).toBe(false);
    });

    it('TC-DASH-004 [Happy path G01]: Lọc dashboard theo tháng và năm thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/dashboard')
        .query({ month: 10, year: 2026 })
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data).toHaveProperty('scope');
    });

    it('TC-DASH-005 [Auth G03]: 401 khi không truyền Auth token', async () => {
      const res = await request(app.getHttpServer())
        .get('/dashboard');

      expect(res.status).toBe(401);
    });
  });
});
