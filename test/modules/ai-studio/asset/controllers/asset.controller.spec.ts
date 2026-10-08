import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
  TestDbHelper,
  RealRoleUsers,
} from '../../../../utils/test-db.helper';

describe('AssetController (e2e/integration) - Full Unit & RBAC Test Suite', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let roles: RealRoleUsers;

  let adminAssetId: number;
  let adminUploadAssetId: number;
  let otherAssetId: number;
  const nonexistentAssetId = 999999999;

  beforeAll(async () => {
    const context = await TestDbHelper.createTestingApp();
    app = context.app;
    dataSource = context.dataSource;
    roles = await TestDbHelper.getRealRoleUsers(dataSource);

    // 1. Tạo asset 1 của admin (creative/generated, favorite = true)
    const res1 = await dataSource.query(
      `INSERT INTO assets (user_id, asset_type, source_type, stored_url, is_favorite, created_at)
       VALUES ($1, 'image', 'generated', 'https://example.com/admin-gen.jpg', true, NOW())
       RETURNING id`,
      [roles.admin.id],
    );
    adminAssetId = Number(res1[0].id);

    // 2. Tạo asset 2 của admin (uploaded, favorite = false)
    const res2 = await dataSource.query(
      `INSERT INTO assets (user_id, asset_type, source_type, stored_url, is_favorite, created_at)
       VALUES ($1, 'video', 'uploaded', 'https://example.com/admin-upload.mp4', false, NOW())
       RETURNING id`,
      [roles.admin.id],
    );
    adminUploadAssetId = Number(res2[0].id);

    // 3. Tạo asset 3 của staffContent (creative/generated)
    const res3 = await dataSource.query(
      `INSERT INTO assets (user_id, asset_type, source_type, stored_url, is_favorite, created_at)
       VALUES ($1, 'image', 'generated', 'https://example.com/staff-gen.jpg', false, NOW())
       RETURNING id`,
      [roles.staffContent.id],
    );
    otherAssetId = Number(res3[0].id);
  });

  afterAll(async () => {
    try {
      if (adminAssetId || adminUploadAssetId || otherAssetId) {
        await dataSource.query(
          `DELETE FROM assets WHERE id IN ($1, $2, $3)`,
          [adminAssetId || 0, adminUploadAssetId || 0, otherAssetId || 0],
        );
      }
    } catch {
      // ignore
    }
    await app.close();
  });

  // =========================================================================
  describe('1. GET /assets (Thư viện media/assets của user)', () => {
    it('TC-ASSET-001 [Happy path G01]: Lấy danh sách creative assets thành công', async () => {
      const res = await request(app.getHttpServer())
        .get('/assets')
        .query({ tab: 'creative' })
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data).toHaveProperty('items');
      expect(Array.isArray(data.items)).toBe(true);
      const found = data.items.some((item: any) => Number(item.id) === adminAssetId);
      expect(found).toBe(true);
    });

    it('TC-ASSET-002 [Happy path G01]: Lấy danh sách uploaded assets thành công', async () => {
      const res = await request(app.getHttpServer())
        .get('/assets')
        .query({ tab: 'upload' })
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      const found = data.items.some((item: any) => Number(item.id) === adminUploadAssetId);
      expect(found).toBe(true);
    });

    it('TC-ASSET-003 [Happy path G01]: Lọc theo favoritesOnly thành công', async () => {
      const res = await request(app.getHttpServer())
        .get('/assets')
        .query({ tab: 'creative', favorite: 'true' })
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      const found = data.items.some((item: any) => Number(item.id) === adminAssetId);
      expect(found).toBe(true);
    });

    it('TC-ASSET-004 [Auth G03]: 401 khi không truyền Auth token', async () => {
      const res = await request(app.getHttpServer()).get('/assets');
      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  describe('2. GET /assets/:id (Chi tiết asset)', () => {
    it('TC-ASSET-005 [Happy path G01]: Lấy chi tiết asset thuộc sở hữu của user thành công', async () => {
      const res = await request(app.getHttpServer())
        .get(`/assets/${adminAssetId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(200);
      const item = res.body.data || res.body;
      expect(Number(item.id)).toBe(adminAssetId);
    });

    it('TC-ASSET-006 [IDOR G04]: 403 khi truy cập asset của user khác', async () => {
      const res = await request(app.getHttpServer())
        .get(`/assets/${otherAssetId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(403);
    });

    it('TC-ASSET-007 [Error G02]: 404 khi asset không tồn tại', async () => {
      const res = await request(app.getHttpServer())
        .get(`/assets/${nonexistentAssetId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(404);
    });

    it('TC-ASSET-008 [Validation G02]: 400 khi id không phải số nguyên', async () => {
      const res = await request(app.getHttpServer())
        .get('/assets/invalid-id')
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  describe('3. PATCH /assets/:id/favorite (Cập nhật trạng thái yêu thích)', () => {
    it('TC-ASSET-009 [Happy path G01]: Cập nhật trạng thái yêu thích thành công', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/assets/${adminAssetId}/favorite`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ isFavorite: false });

      expect(res.status).toBe(200);
      const item = res.body.data || res.body;
      expect(item.isFavorite).toBe(false);
    });

    it('TC-ASSET-010 [IDOR G04]: 403 khi cập nhật trạng thái asset của user khác', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/assets/${otherAssetId}/favorite`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ isFavorite: true });

      expect(res.status).toBe(403);
    });

    it('TC-ASSET-011 [Error G02]: 404 khi asset không tồn tại', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/assets/${nonexistentAssetId}/favorite`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ isFavorite: true });

      expect(res.status).toBe(404);
    });

    it('TC-ASSET-012 [Validation G02]: 400 khi thiếu trường isFavorite', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/assets/${adminAssetId}/favorite`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });
});
