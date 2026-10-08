import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { ulid } from 'ulid';
import {
  TestDbHelper,
  RealRoleUsers,
} from '../../../../utils/test-db.helper';
import { KlingAdapter } from '../../../../../src/modules/ai-studio/video/adapters/kling.adapter';

describe('AiElementController (e2e/integration) - Full Unit & RBAC Test Suite', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let roles: RealRoleUsers;

  let testProviderId: string;
  let testAssetId: number;
  let adminElementId: number;
  let otherElementId: number;
  const nonexistentElementId = 999999999;

  beforeAll(async () => {
    const context = await TestDbHelper.createTestingApp();
    app = context.app;
    dataSource = context.dataSource;
    roles = await TestDbHelper.getRealRoleUsers(dataSource);

    testProviderId = ulid();

    // 1. Tạo AI Provider mẫu
    await dataSource.query(
      `INSERT INTO ai_providers (id, code, name, is_active, created_at, updated_at)
       VALUES ($1, 'kling_test_prov', 'Kling AI Test Provider', true, NOW(), NOW())`,
      [testProviderId],
    );

    // 2. Tạo Asset ảnh mẫu cho admin
    const assetRes = await dataSource.query(
      `INSERT INTO assets (user_id, asset_type, source_type, stored_url, is_favorite, created_at)
       VALUES ($1, 'image', 'uploaded', 'https://example.com/frontal-hero.jpg', false, NOW())
       RETURNING id`,
      [roles.admin.id],
    );
    testAssetId = Number(assetRes[0].id);

    // 3. Tạo Element của admin
    const el1 = await dataSource.query(
      `INSERT INTO ai_elements (user_id, provider_id, element_name, element_description, reference_type, status, is_favorite, created_at, updated_at)
       VALUES ($1, $2, 'Hero Admin', 'Mô tả hero admin', 'image_refer', 'succeeded', false, NOW(), NOW())
       RETURNING id`,
      [roles.admin.id, testProviderId],
    );
    adminElementId = Number(el1[0].id);

    // 4. Tạo Element của staffContent
    const el2 = await dataSource.query(
      `INSERT INTO ai_elements (user_id, provider_id, element_name, element_description, reference_type, status, is_favorite, created_at, updated_at)
       VALUES ($1, $2, 'Hero Staff', 'Mô tả hero staff', 'image_refer', 'succeeded', false, NOW(), NOW())
       RETURNING id`,
      [roles.staffContent.id, testProviderId],
    );
    otherElementId = Number(el2[0].id);

    // Mock Kling Adapter
    jest.spyOn(KlingAdapter.prototype, 'createElement').mockResolvedValue({
      code: 0,
      message: 'SUCCESS',
      data: { task_id: 'task-kling-mock-001' },
    } as any);

    jest.spyOn(KlingAdapter.prototype, 'getElementTaskStatus').mockResolvedValue({
      code: 0,
      message: 'SUCCESS',
      data: { task_status: 'succeed' },
    } as any);

    jest.spyOn(KlingAdapter.prototype, 'pollElementUntilDone').mockResolvedValue({
      task_result: { elements: [{ element_id: 'kling-el-mock-001' }] },
    } as any);

    jest.spyOn(KlingAdapter.prototype, 'deleteElement').mockResolvedValue({
      code: 0,
    } as any);
  });

  afterAll(async () => {
    try {
      await dataSource.query(
        `DELETE FROM ai_elements WHERE provider_id = $1`,
        [testProviderId],
      );
      if (testAssetId) {
        await dataSource.query(`DELETE FROM assets WHERE id = $1`, [testAssetId]);
      }
      await dataSource.query(
        `DELETE FROM ai_providers WHERE id = $1`,
        [testProviderId],
      );
    } catch {
      // ignore
    }
    await app.close();
  });

  // =========================================================================
  describe('1. POST /elements/create (Tạo mới AI Element)', () => {
    it('TC-ELEM-001 [Happy path G01]: Tạo mới AI Element kiểu image_refer thành công', async () => {
      const res = await request(app.getHttpServer())
        .post('/elements/create')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          providerId: testProviderId,
          referenceType: 'image_refer',
          elementName: 'Test Char',
          elementDescription: 'Nhân vật hoạt hình',
          frontalImageAssetId: testAssetId,
        });

      expect(res.status).toBe(201);
      const data = res.body.data || res.body;
      expect(data).toHaveProperty('elementId');
      expect(data.status).toBe('processing');
    });

    it('TC-ELEM-002 [Validation G02]: 400 khi image_refer nhưng thiếu frontalImageAssetId', async () => {
      const res = await request(app.getHttpServer())
        .post('/elements/create')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          providerId: testProviderId,
          referenceType: 'image_refer',
          elementName: 'Test Missing Img',
          elementDescription: 'Thiếu ảnh chính diện',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Ảnh chính diện là bắt buộc');
    });

    it('TC-ELEM-003 [Error G02]: 404 khi providerId không tồn tại', async () => {
      const res = await request(app.getHttpServer())
        .post('/elements/create')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          providerId: '01JNONEXISTENTPROVIDER0000',
          referenceType: 'image_refer',
          elementName: 'Test No Prov',
          elementDescription: 'Không có provider',
          frontalImageAssetId: testAssetId,
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Provider không tồn tại');
    });
  });

  // =========================================================================
  describe('2. GET /elements/history (Lịch sử elements của user)', () => {
    it('TC-ELEM-004 [Happy path G01]: Lấy danh sách elements của chính user thành công', async () => {
      const res = await request(app.getHttpServer())
        .get('/elements/history')
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      const found = data.some((el: any) => Number(el.id) === adminElementId);
      expect(found).toBe(true);
    });
  });

  // =========================================================================
  describe('3. GET /elements/task/:taskId/status (Trạng thái task Kling)', () => {
    it('TC-ELEM-005 [Happy path G01]: Lấy trạng thái task sinh từ adapter thành công', async () => {
      const res = await request(app.getHttpServer())
        .get('/elements/task/task-kling-mock-001/status')
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data).toHaveProperty('data');
    });
  });

  // =========================================================================
  describe('4. GET /elements/:id/status (Trạng thái chi tiết element)', () => {
    it('TC-ELEM-006 [Happy path G01]: Lấy trạng thái element tồn tại thành công', async () => {
      const res = await request(app.getHttpServer())
        .get(`/elements/${adminElementId}/status`)
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(Number(data.id)).toBe(adminElementId);
    });

    it('TC-ELEM-007 [Error G02]: 404 khi element không tồn tại', async () => {
      const res = await request(app.getHttpServer())
        .get(`/elements/${nonexistentElementId}/status`)
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(404);
    });
  });

  // =========================================================================
  describe('5. PATCH /elements/:id/favorite (Đổi trạng thái yêu thích)', () => {
    it('TC-ELEM-008 [Happy path G01]: Cập nhật trạng thái yêu thích element thành công', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/elements/${adminElementId}/favorite`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ isFavorite: true });

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data.isFavorite).toBe(true);
    });

    it('TC-ELEM-009 [IDOR G04]: 403 khi cập nhật trạng thái element của user khác', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/elements/${otherElementId}/favorite`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ isFavorite: true });

      expect(res.status).toBe(403);
    });

    it('TC-ELEM-010 [Error G02]: 404 khi element không tồn tại', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/elements/${nonexistentElementId}/favorite`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ isFavorite: true });

      expect(res.status).toBe(404);
    });
  });

  // =========================================================================
  describe('6. DELETE /elements/:id (Xóa element)', () => {
    it('TC-ELEM-011 [IDOR G04]: 403 khi xóa element của user khác', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/elements/${otherElementId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(403);
    });

    it('TC-ELEM-012 [Happy path G01]: Xóa element của chính mình thành công', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/elements/${adminElementId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(200);
    });

    it('TC-ELEM-013 [Error G02]: 404 khi xóa element không tồn tại', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/elements/${nonexistentElementId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(404);
    });

    it('TC-ELEM-014 [Auth G03]: 401 khi không truyền Auth token', async () => {
      const res = await request(app.getHttpServer())
        .get('/elements/history');

      expect(res.status).toBe(401);
    });
  });
});
