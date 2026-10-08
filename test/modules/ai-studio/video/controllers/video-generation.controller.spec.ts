import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { ulid } from 'ulid';
import {
  TestDbHelper,
  RealRoleUsers,
} from '../../../../utils/test-db.helper';

describe('VideoGenerationController (e2e/integration) - Full Unit & RBAC Test Suite', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let roles: RealRoleUsers;

  let testProjectId: string;
  let testTaskId: string;
  let testProviderId: string;
  let testModelId: string;
  let charAssetId: number;
  let motionRefAssetId: number;
  let testVideoGenId: number;
  let testMotionGenId: number;
  const nonexistentTaskId = '01JNONEXISTENTTASK000000000';
  const nonexistentGenId = 999999999;

  beforeAll(async () => {
    const context = await TestDbHelper.createTestingApp();
    app = context.app;
    dataSource = context.dataSource;
    roles = await TestDbHelper.getRealRoleUsers(dataSource);

    testProjectId = ulid();
    testTaskId = ulid();
    testProviderId = ulid();
    testModelId = ulid();

    // 0. Tạo 2 asset phục vụ motion generation
    const a1 = await dataSource.query(
      `INSERT INTO assets (user_id, asset_type, source_type, stored_url, is_favorite, created_at)
       VALUES ($1, 'image', 'uploaded', 'https://example.com/char.jpg', false, NOW())
       RETURNING id`,
      [roles.admin.id],
    );
    charAssetId = Number(a1[0].id);

    const a2 = await dataSource.query(
      `INSERT INTO assets (user_id, asset_type, source_type, stored_url, is_favorite, created_at)
       VALUES ($1, 'video', 'uploaded', 'https://example.com/motion-ref.mp4', false, NOW())
       RETURNING id`,
      [roles.admin.id],
    );
    motionRefAssetId = Number(a2[0].id);

    // 1. Tạo AI Provider & Model
    await dataSource.query(
      `INSERT INTO ai_providers (id, code, name, is_active, created_at, updated_at)
       VALUES ($1, $2, 'Kling Video Prov', true, NOW(), NOW())`,
      [testProviderId, `prov_vid_${Date.now()}`],
    );
    await dataSource.query(
      `INSERT INTO ai_models (id, provider_id, code, name, model_type, is_active, supports_motion_control, created_at, updated_at)
       VALUES ($1, $2, 'kling_vid_model', 'Kling Video Model', 'video', true, true, NOW(), NOW())`,
      [testModelId, testProviderId],
    );

    // 2. Tạo project test
    await dataSource.query(
      `INSERT INTO projects (id, name, status, "createdAt", "updatedAt")
       VALUES ($1, 'Video Gen Test Project', 'IN_PROGRESS', NOW(), NOW())`,
      [testProjectId],
    );

    // 3. Tạo task test gán cho admin có giá vốn hợp lệ (10.000.000 VNĐ)
    await dataSource.query(
      `INSERT INTO tasks (id, code, name, "projectId", "assigneeId", cost, status, "createdAt", "updatedAt")
       VALUES ($1, $2, 'Video Gen Test Task', $3, $4, 10000000, 'DOING', NOW(), NOW())`,
      [testTaskId, `TSK_VID_${Date.now()}`, testProjectId, roles.admin.userId],
    );

    // 4. Tạo mẫu video_generation
    const vgRes = await dataSource.query(
      `INSERT INTO video_generations (user_id, task_id, model_id, project_id, motion_prompt, status, created_at)
       VALUES ($1, $2, $3, $4, 'Prompt test video', 'succeeded', NOW())
       RETURNING id`,
      [roles.admin.id, testTaskId, testModelId, testProjectId],
    );
    testVideoGenId = Number(vgRes[0].id);

    // 5. Tạo mẫu motion_generation
    const mgRes = await dataSource.query(
      `INSERT INTO motion_generations (user_id, task_id, model_id, project_id, character_image_asset_id, motion_reference_asset_id, motion_prompt, character_orientation, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'Prompt test motion', 'image', 'succeeded', NOW())
       RETURNING id`,
      [roles.admin.id, testTaskId, testModelId, testProjectId, charAssetId, motionRefAssetId],
    );
    testMotionGenId = Number(mgRes[0].id);
  });

  afterAll(async () => {
    try {
      if (testVideoGenId) {
        await dataSource.query(`DELETE FROM video_generations WHERE id = $1`, [testVideoGenId]);
      }
      if (testMotionGenId) {
        await dataSource.query(`DELETE FROM motion_generations WHERE id = $1`, [testMotionGenId]);
      }
      if (charAssetId || motionRefAssetId) {
        await dataSource.query(`DELETE FROM assets WHERE id IN ($1, $2)`, [charAssetId || 0, motionRefAssetId || 0]);
      }
      await dataSource.query(`DELETE FROM tasks WHERE id = $1`, [testTaskId]);
      await dataSource.query(`DELETE FROM projects WHERE id = $1`, [testProjectId]);
      await dataSource.query(`DELETE FROM ai_models WHERE id = $1`, [testModelId]);
      await dataSource.query(`DELETE FROM ai_providers WHERE id = $1`, [testProviderId]);
    } catch {
      // ignore
    }
    await app.close();
  });

  // =========================================================================
  describe('1. GET /video-generations/tasks/:taskId/budget (Kiểm tra ngân sách AI của task)', () => {
    it('TC-VID-001 [Happy path G01]: Lấy ngân sách task của chính mình thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/video-generations/tasks/${testTaskId}/budget`)
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data).toHaveProperty('budgetMode');
      expect(data).toHaveProperty('used');
    });

    it('TC-VID-002 [IDOR/RBAC G04]: 403 khi staff khác cố xem ngân sách task không được phân công', async () => {
      const res = await request(app.getHttpServer())
        .get(`/video-generations/tasks/${testTaskId}/budget`)
        .set('Authorization', `Bearer ${roles.staffContent.token}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Bạn không phải người được phân công');
    });

    it('TC-VID-003 [Error G02]: 404 khi taskId không tồn tại', async () => {
      const res = await request(app.getHttpServer())
        .get(`/video-generations/tasks/${nonexistentTaskId}/budget`)
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Không tìm thấy công việc');
    });
  });

  // =========================================================================
  describe('2. GET /video-generations/history (Lịch sử sinh video)', () => {
    it('TC-VID-004 [Happy path G01]: Lấy lịch sử sinh video của user thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/video-generations/history')
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.some((vg: any) => Number(vg.id) === testVideoGenId)).toBe(true);
    });
  });

  // =========================================================================
  describe('3. GET /video-generations/:id/status (Trạng thái sinh video)', () => {
    it('TC-VID-005 [Happy path G01]: Lấy trạng thái video generation tồn tại thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/video-generations/${testVideoGenId}/status`)
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(Number(data.id)).toBe(testVideoGenId);
      expect(data.status).toBe('succeeded');
    });

    it('TC-VID-006 [Error G02]: 404 khi id video generation không tồn tại', async () => {
      const res = await request(app.getHttpServer())
        .get(`/video-generations/${nonexistentGenId}/status`)
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Không tìm thấy video generation');
    });
  });

  // =========================================================================
  describe('4. GET /video-generations/motion-control/history (Lịch sử Motion Control)', () => {
    it('TC-VID-007 [Happy path G01]: Lấy lịch sử motion control của user thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/video-generations/motion-control/history')
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.some((mg: any) => Number(mg.id) === testMotionGenId)).toBe(true);
    });
  });

  // =========================================================================
  describe('5. GET /video-generations/motion-control/:id/status (Trạng thái Motion Control)', () => {
    it('TC-VID-008 [Happy path G01]: Lấy trạng thái motion control tồn tại thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/video-generations/motion-control/${testMotionGenId}/status`)
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(Number(data.id)).toBe(testMotionGenId);
      expect(data.status).toBe('succeeded');
    });

    it('TC-VID-009 [Error G02]: 404 khi id motion control không tồn tại', async () => {
      const res = await request(app.getHttpServer())
        .get(`/video-generations/motion-control/${nonexistentGenId}/status`)
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Không tìm thấy motion generation');
    });
  });

  // =========================================================================
  describe('6. POST Validation (Tạo video & Motion control)', () => {
    it('TC-VID-010 [Validation G02]: 400 khi POST /create thiếu prompt/taskId/modelId', async () => {
      const res = await request(app.getHttpServer())
        .post('/video-generations/create')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('TC-VID-011 [Validation G02]: 400 khi POST /create-motion-control thiếu thông tin bắt buộc', async () => {
      const res = await request(app.getHttpServer())
        .post('/video-generations/create-motion-control')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('TC-VID-012 [Auth G03]: 401 khi không truyền Auth token', async () => {
      const res = await request(app.getHttpServer())
        .get('/video-generations/history');

      expect(res.status).toBe(401);
    });
  });
});
