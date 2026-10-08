import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { TestDbHelper, RealRoleUsers } from '@test/utils/test-db.helper';
import { FIXTURE_IDS } from '@test/fixtures/fixture-ids';

describe('SpellingWhitelistController (Đầy đủ 10 nhóm kiểm thử G01-G10 trên DB erp_test)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let roles: RealRoleUsers;

  const projectId = FIXTURE_IDS.PROJECTS[0];
  const invalidProjectId = '01JNONEXISTENTPROJECT000000';
  let createdWhitelistId: string;

  beforeAll(async () => {
    const context = await TestDbHelper.createTestingApp();
    app = context.app;
    dataSource = context.dataSource;
    roles = await TestDbHelper.getRealRoleUsers(dataSource);
  });

  afterAll(async () => {
    if (createdWhitelistId) {
      await dataSource.query(`DELETE FROM project_spell_check_whitelists WHERE id = $1`, [createdWhitelistId]);
    }
    // Clean up any test whitelist entries created during test
    await dataSource.query(`DELETE FROM project_spell_check_whitelists WHERE word LIKE 'TEST_%'`);
    await TestDbHelper.closeTestingApp();
  });

  // =========================================================================
  // 1. ENDPOINT: GET /projects/:projectId/spelling-whitelist
  // =========================================================================
  describe('1. GET /projects/:projectId/spelling-whitelist', () => {
    it('TC-SPW-001 [Happy path]: Lấy danh sách từ whitelist của dự án thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/projects/${projectId}/spelling-whitelist`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data).toBeDefined();
      expect(Array.isArray(data.items)).toBe(true);
    });

    it('TC-SPW-002 [Authentication G03]: Không có token trả về 401', async () => {
      await request(app.getHttpServer())
        .get(`/projects/${projectId}/spelling-whitelist`)
        .expect(401);
    });

    it('TC-SPW-003 [Not Found G06]: Dự án không tồn tại trả về 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/projects/${invalidProjectId}/spelling-whitelist`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(404);

      expect(res.body.message).toContain('Không tìm thấy dự án');
    });
  });

  // =========================================================================
  // 2. ENDPOINT: POST /projects/:projectId/spelling-whitelist
  // =========================================================================
  describe('2. POST /projects/:projectId/spelling-whitelist (Thêm từ vào whitelist)', () => {
    it('TC-SPW-004 [Happy path]: Thêm từ mới vào whitelist thành công (201)', async () => {
      const testWord = `TEST_ERP_${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post(`/projects/${projectId}/spelling-whitelist`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ word: testWord })
        .expect(201);

      const data = res.body.data || res.body;
      expect(data.items).toBeDefined();
      expect(Array.isArray(data.items)).toBe(true);
      expect(data.items.length).toBeGreaterThan(0);
      expect(data.items[0].word).toBe(testWord);
      expect(data.items[0].projectId).toBe(projectId);

      createdWhitelistId = data.items[0].id;
    });

    it('TC-SPW-005 [Idempotency / Existing]: Thêm lại cùng một từ trả về entry hiện có mà không bị lỗi', async () => {
      const testWord = `TEST_EXISTING_${Date.now()}`;
      const res1 = await request(app.getHttpServer())
        .post(`/projects/${projectId}/spelling-whitelist`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ word: testWord })
        .expect(201);

      const data1 = res1.body.data || res1.body;
      const firstId = data1.items[0].id;

      const res2 = await request(app.getHttpServer())
        .post(`/projects/${projectId}/spelling-whitelist`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ word: testWord })
        .expect(201);

      const data2 = res2.body.data || res2.body;
      expect(data2.items[0].id).toBe(firstId);
    });

    it('TC-SPW-006 [Validation G04]: Gửi từ rỗng trả về 400', async () => {
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/spelling-whitelist`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ word: '   ' })
        .expect(400);
    });

    it('TC-SPW-007 [Authentication G03]: Không có token trả về 401', async () => {
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/spelling-whitelist`)
        .send({ word: 'TEST_NO_AUTH' })
        .expect(401);
    });

    it('TC-SPW-008 [Not Found G06]: Thêm từ vào dự án không tồn tại trả về 404', async () => {
      await request(app.getHttpServer())
        .post(`/projects/${invalidProjectId}/spelling-whitelist`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ word: 'TEST_WORD' })
        .expect(404);
    });
  });

  // =========================================================================
  // 3. ENDPOINT: DELETE /projects/:projectId/spelling-whitelist/:whitelistId
  // =========================================================================
  describe('3. DELETE /projects/:projectId/spelling-whitelist/:whitelistId (Xóa từ whitelist)', () => {
    it('TC-SPW-009 [Happy path]: Xóa từ khỏi whitelist thành công (200)', async () => {
      // Create a temporary word to delete
      const addRes = await request(app.getHttpServer())
        .post(`/projects/${projectId}/spelling-whitelist`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ word: `TEST_TO_DELETE_${Date.now()}` })
        .expect(201);

      const addData = addRes.body.data || addRes.body;
      const targetId = addData.items[0].id;

      const res = await request(app.getHttpServer())
        .delete(`/projects/${projectId}/spelling-whitelist/${targetId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.deleted).toBe(targetId);

      // Verify removal in DB
      const check = await dataSource.query(`SELECT id FROM project_spell_check_whitelists WHERE id = $1`, [targetId]);
      expect(check.length).toBe(0);
    });

    it('TC-SPW-010 [Not Found G06]: Xóa ID từ không tồn tại trả về 404', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/projects/${projectId}/spelling-whitelist/01JNONEXISTENTENTRY000000000`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(404);

      expect(res.body.message).toContain('Không tìm thấy từ trong whitelist');
    });

    it('TC-SPW-011 [Authentication G03]: Không có token trả về 401', async () => {
      await request(app.getHttpServer())
        .delete(`/projects/${projectId}/spelling-whitelist/any-id`)
        .expect(401);
    });
  });
});
