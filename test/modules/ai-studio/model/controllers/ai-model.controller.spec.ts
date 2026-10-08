import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { ulid } from 'ulid';
import {
  TestDbHelper,
  RealRoleUsers,
} from '../../../../utils/test-db.helper';

describe('AiModelController (e2e/integration) - Full Unit & RBAC Test Suite', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let roles: RealRoleUsers;

  let testProviderId: string;
  let testModelId: string;
  const testProviderCode = `prov_test_${Date.now()}`;
  const nonexistentModelId = '01JNONEXISTENTMODEL00000000';

  beforeAll(async () => {
    const context = await TestDbHelper.createTestingApp();
    app = context.app;
    dataSource = context.dataSource;
    roles = await TestDbHelper.getRealRoleUsers(dataSource);

    testProviderId = ulid();
    testModelId = ulid();

    // 1. Tạo AI Provider mẫu
    await dataSource.query(
      `INSERT INTO ai_providers (id, code, name, is_active, created_at, updated_at)
       VALUES ($1, $2, 'Test Provider For Models', true, NOW(), NOW())`,
      [testProviderId, testProviderCode],
    );

    // 2. Tạo AI Model mẫu
    await dataSource.query(
      `INSERT INTO ai_models (id, provider_id, code, name, model_type, is_active, supports_motion_control, supports_elements, created_at, updated_at)
       VALUES ($1, $2, 'kling_v1_test', 'Kling v1 Test', 'video', true, true, false, NOW(), NOW())`,
      [testModelId, testProviderId],
    );
  });

  afterAll(async () => {
    try {
      await dataSource.query(`DELETE FROM ai_models WHERE provider_id = $1`, [testProviderId]);
      await dataSource.query(`DELETE FROM ai_providers WHERE id = $1`, [testProviderId]);
    } catch {
      // ignore
    }
    await app.close();
  });

  // =========================================================================
  describe('1. GET /ai-models (Danh sách AI Models)', () => {
    it('TC-MODEL-001 [Happy path G01]: Lấy danh sách AI models thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/ai-models')
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      const found = data.some((m: any) => m.id === testModelId);
      expect(found).toBe(true);
    });

    it('TC-MODEL-002 [Happy path G01]: Lọc AI models theo providerCode thành công', async () => {
      const res = await request(app.getHttpServer())
        .get('/ai-models')
        .query({ providerCode: testProviderCode })
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(1);
      expect(data[0].provider.code).toBe(testProviderCode);
    });
  });

  // =========================================================================
  describe('2. GET /ai-models/provider/:providerCode (Models theo provider)', () => {
    it('TC-MODEL-003 [Happy path G01]: Lấy danh sách models theo providerCode thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/ai-models/provider/${testProviderCode}`)
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.some((m: any) => m.id === testModelId)).toBe(true);
    });
  });

  // =========================================================================
  describe('3. GET /ai-models/:id (Chi tiết AI Model)', () => {
    it('TC-MODEL-004 [Happy path G01]: Lấy chi tiết model tồn tại thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/ai-models/${testModelId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data.id).toBe(testModelId);
    });

    it('TC-MODEL-005 [Error G02]: 404 khi model id không tồn tại', async () => {
      const res = await request(app.getHttpServer())
        .get(`/ai-models/${nonexistentModelId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Không tìm thấy model');
    });
  });

  // =========================================================================
  describe('4. POST /ai-models (Tạo mới AI Model - Admin only)', () => {
    it('TC-MODEL-006 [RBAC G04]: 403 khi staffContent cố tạo AI model', async () => {
      const res = await request(app.getHttpServer())
        .post('/ai-models')
        .set('Authorization', `Bearer ${roles.staffContent.token}`)
        .send({
          providerId: testProviderId,
          code: 'kling_v2_new',
          name: 'Kling v2 New',
          modelType: 'video',
        });

      expect(res.status).toBe(403);
    });

    it('TC-MODEL-007 [Happy path G01]: Admin tạo AI model mới thành công (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/ai-models')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          providerId: testProviderId,
          code: 'kling_v2_admin',
          name: 'Kling v2 Admin Created',
          modelType: 'video',
          isActive: true,
        });

      expect(res.status).toBe(201);
      const data = res.body.data || res.body;
      expect(data).toHaveProperty('id');
      expect(data.code).toBe('kling_v2_admin');

      // Cleanup
      await dataSource.query(`DELETE FROM ai_models WHERE id = $1`, [data.id]);
    });

    it('TC-MODEL-008 [Validation G02]: 400 khi thiếu thông tin bắt buộc (code, name)', async () => {
      const res = await request(app.getHttpServer())
        .post('/ai-models')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          providerId: testProviderId,
        });

      expect(res.status).toBe(400);
    });

    it('TC-MODEL-009 [Error G02]: 400 khi providerId không tồn tại', async () => {
      const res = await request(app.getHttpServer())
        .post('/ai-models')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          providerId: '01JNONEXISTENTPROVIDER0000',
          code: 'model_invalid_prov',
          name: 'Invalid Prov Model',
          modelType: 'video',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Không tìm thấy provider');
    });
  });

  // =========================================================================
  describe('5. PATCH /ai-models/:id (Cập nhật AI Model - Admin only)', () => {
    it('TC-MODEL-010 [RBAC G04]: 403 khi staffContent cố cập nhật AI model', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/ai-models/${testModelId}`)
        .set('Authorization', `Bearer ${roles.staffContent.token}`)
        .send({ name: 'Hacked Model Name' });

      expect(res.status).toBe(403);
    });

    it('TC-MODEL-011 [Happy path G01]: Admin cập nhật AI model thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/ai-models/${testModelId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ name: 'Kling v1 Test Updated' });

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data.name).toBe('Kling v1 Test Updated');
    });

    it('TC-MODEL-012 [Error G02]: 404 khi cập nhật model không tồn tại', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/ai-models/${nonexistentModelId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ name: 'Nonexistent' });

      expect(res.status).toBe(404);
    });
  });

  // =========================================================================
  describe('6. DELETE /ai-models/:id (Xóa AI Model - Admin only)', () => {
    let toDeleteModelId: string;

    beforeAll(async () => {
      toDeleteModelId = ulid();
      await dataSource.query(
        `INSERT INTO ai_models (id, provider_id, code, name, model_type, is_active, created_at, updated_at)
         VALUES ($1, $2, 'to_delete_code', 'To Delete Model', 'video', true, NOW(), NOW())`,
        [toDeleteModelId, testProviderId],
      );
    });

    it('TC-MODEL-013 [RBAC G04]: 403 khi staffContent cố xóa AI model', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/ai-models/${toDeleteModelId}`)
        .set('Authorization', `Bearer ${roles.staffContent.token}`);

      expect(res.status).toBe(403);
    });

    it('TC-MODEL-014 [Happy path G01]: Admin xóa AI model thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/ai-models/${toDeleteModelId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data?.message || res.body?.message).toContain('Xóa model thành công');
    });

    it('TC-MODEL-015 [Error G02]: 404 khi xóa model không tồn tại', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/ai-models/${nonexistentModelId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(404);
    });

    it('TC-MODEL-016 [Auth G03]: 401 khi không truyền Auth token', async () => {
      const res = await request(app.getHttpServer())
        .get('/ai-models');

      expect(res.status).toBe(401);
    });
  });
});
