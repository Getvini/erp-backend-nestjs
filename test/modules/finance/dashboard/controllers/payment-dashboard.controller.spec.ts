import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
  TestDbHelper,
  RealRoleUsers,
} from '../../../../utils/test-db.helper';

describe('PaymentDashboardController (e2e/integration) - Full Unit & RBAC Test Suite', () => {
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
  // 1. ENDPOINT: GET /payment-dashboard (Báo cáo tổng quan tài chính & tiến độ)
  // =========================================================================
  describe('1. GET /payment-dashboard (Báo cáo tổng quan tài chính)', () => {
    it('TC-DASH-001 [Happy path G01]: Admin lấy dữ liệu dashboard thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/payment-dashboard')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.summary).toBeDefined();
      expect(data.rows).toBeDefined();
      expect(Array.isArray(data.rows)).toBe(true);
      expect(data.meta).toBeDefined();
      expect(data.meta.page).toBe(1);
    });

    it('TC-DASH-002 [Happy path G01]: BOD lấy dữ liệu dashboard thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/payment-dashboard')
        .set('Authorization', `Bearer ${roles.bod.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.summary).toBeDefined();
      expect(Array.isArray(data.rows)).toBe(true);
    });

    it('TC-DASH-003 [Happy path G01]: Admin Sale lấy dữ liệu dashboard thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/payment-dashboard')
        .set('Authorization', `Bearer ${roles.adminSale.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.summary).toBeDefined();
      expect(Array.isArray(data.rows)).toBe(true);
    });

    it('TC-DASH-004 [RBAC G04]: BD lấy dữ liệu dashboard thành công theo phạm vi cá nhân (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/payment-dashboard')
        .set('Authorization', `Bearer ${roles.bd.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.summary).toBeDefined();
      expect(Array.isArray(data.rows)).toBe(true);
    });

    it('TC-DASH-005 [RBAC G04]: PM bị chặn quyền truy cập dashboard tài chính (403)', async () => {
      const res = await request(app.getHttpServer())
        .get('/payment-dashboard')
        .set('Authorization', `Bearer ${roles.pm.token}`)
        .expect(403);

      const err = res.body;
      expect(err.message).toContain('Không có quyền truy cập dữ liệu tài chính');
    });

    it('TC-DASH-006 [RBAC G04]: Nhân viên Content bị chặn quyền truy cập (403)', async () => {
      const res = await request(app.getHttpServer())
        .get('/payment-dashboard')
        .set('Authorization', `Bearer ${roles.staffContent.token}`)
        .expect(403);

      const err = res.body;
      expect(err.message).toContain('Không có quyền truy cập dữ liệu tài chính');
    });

    it('TC-DASH-007 [Filter]: Lọc theo năm cụ thể year=2026 (200)', async () => {
      const currentYear = new Date().getFullYear();
      const res = await request(app.getHttpServer())
        .get(`/payment-dashboard?year=${currentYear}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.summary).toBeDefined();
      expect(Array.isArray(data.rows)).toBe(true);
    });

    it('TC-DASH-008 [Filter]: Lọc theo tìm kiếm từ khóa và trạng thái (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/payment-dashboard')
        .query({ search: 'HD', page: 1, limit: 10 })
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data.rows)).toBe(true);
      expect(data.meta.limit).toBe(10);
    });

    it('TC-DASH-009 [Pagination]: Phân trang page=1&limit=5 thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/payment-dashboard?page=1&limit=5')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.meta.page).toBe(1);
      expect(data.meta.limit).toBe(5);
    });

    it('TC-DASH-010 [Auth G03]: 401 khi không truyền Token xác thực', async () => {
      await request(app.getHttpServer())
        .get('/payment-dashboard')
        .expect(401);
    });
  });
});
