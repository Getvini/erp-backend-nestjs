import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { ulid } from 'ulid';
import {
  TestDbHelper,
  RealRoleUsers,
} from '../../../../utils/test-db.helper';

describe('AiProviderController (e2e/integration) - Full Unit & Integration Test Suite', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let roles: RealRoleUsers;

  let testProviderId: string;
  const testCode = `prov_find_${Date.now()}`;
  const nonexistentProviderId = '01JNONEXISTENTPROVIDER0000';

  beforeAll(async () => {
    const context = await TestDbHelper.createTestingApp();
    app = context.app;
    dataSource = context.dataSource;
    roles = await TestDbHelper.getRealRoleUsers(dataSource);

    testProviderId = ulid();

    // 1. Tạo AI Provider mẫu
    await dataSource.query(
      `INSERT INTO ai_providers (id, code, name, description, is_active, created_at, updated_at)
       VALUES ($1, $2, 'Kling Provider Test Name', 'Mo ta provider', true, NOW(), NOW())`,
      [testProviderId, testCode],
    );
  });

  afterAll(async () => {
    try {
      await dataSource.query(`DELETE FROM ai_providers WHERE id = $1`, [testProviderId]);
    } catch {
      // ignore
    }
    await app.close();
  });

  // =========================================================================
  describe('1. GET /ai-providers (Danh sách AI Providers)', () => {
    it('TC-PROV-001 [Happy path G01]: Lấy danh sách providers thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/ai-providers')
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      const found = data.some((p: any) => p.id === testProviderId);
      expect(found).toBe(true);
    });

    it('TC-PROV-002 [Happy path G01]: Lọc providers theo code thành công', async () => {
      const res = await request(app.getHttpServer())
        .get('/ai-providers')
        .query({ code: testCode })
        .set('Authorization', `Bearer ${roles.staffContent.token}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(1);
      expect(data[0].id).toBe(testProviderId);
    });

    it('TC-PROV-003 [Happy path G01]: Lọc providers theo isActive thành công', async () => {
      const res = await request(app.getHttpServer())
        .get('/ai-providers')
        .query({ isActive: true })
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
    });
  });

  // =========================================================================
  describe('2. GET /ai-providers/:id (Chi tiết AI Provider)', () => {
    it('TC-PROV-004 [Happy path G01]: Lấy chi tiết provider tồn tại thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/ai-providers/${testProviderId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data.id).toBe(testProviderId);
      expect(data.code).toBe(testCode);
    });

    it('TC-PROV-005 [Error G02]: 404 khi provider id không tồn tại', async () => {
      const res = await request(app.getHttpServer())
        .get(`/ai-providers/${nonexistentProviderId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Không tìm thấy provider');
    });

    it('TC-PROV-006 [Auth G03]: 401 khi không truyền Auth token', async () => {
      const res = await request(app.getHttpServer())
        .get('/ai-providers');

      expect(res.status).toBe(401);
    });
  });
});
