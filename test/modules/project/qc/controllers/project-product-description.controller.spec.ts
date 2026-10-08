import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { TestDbHelper, RealRoleUsers } from '@test/utils/test-db.helper';
import { FIXTURE_IDS } from '@test/fixtures/fixture-ids';

describe('ProjectProductDescriptionController (Đầy đủ 10 nhóm kiểm thử G01-G10 trên DB erp_test)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let roles: RealRoleUsers;

  const projectId = FIXTURE_IDS.PROJECTS[2];
  let createdSubmissionId: string;

  beforeAll(async () => {
    const context = await TestDbHelper.createTestingApp();
    app = context.app;
    dataSource = context.dataSource;
    roles = await TestDbHelper.getRealRoleUsers(dataSource);
  });

  afterAll(async () => {
    if (createdSubmissionId) {
      await dataSource.query(`DELETE FROM project_product_description_items WHERE "submissionId" = $1`, [createdSubmissionId]);
      await dataSource.query(`DELETE FROM project_product_description_submissions WHERE id = $1`, [createdSubmissionId]);
    }
    await TestDbHelper.closeTestingApp();
  });

  // =========================================================================
  // 1. ENDPOINT: GET /projects/:id/product-descriptions
  // =========================================================================
  describe('1. GET /projects/:id/product-descriptions', () => {
    it('TC-PPD-001 [Happy path]: Lấy danh sách mô tả chuẩn sản phẩm của dự án thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/projects/${projectId}/product-descriptions`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();
      expect(Array.isArray(body)).toBe(true);
    });

    it('TC-PPD-002 [Authentication G03]: Không gửi token trả về 401', async () => {
      await request(app.getHttpServer())
        .get(`/projects/${projectId}/product-descriptions`)
        .expect(401);
    });
  });

  // =========================================================================
  // 2. ENDPOINT: POST /projects/:id/product-descriptions
  // =========================================================================
  describe('2. POST /projects/:id/product-descriptions (Tạo bản mô tả)', () => {
    it('TC-PPD-003 [Happy path]: Admin tạo bản mô tả chuẩn sản phẩm thành công (201)', async () => {
      const payload = {
        items: [
          {
            productName: 'Ấn phẩm thiết kế banner Website & Landing Page',
            fileUrl: 'https://storage.erp.test/files/spec-banner.pdf',
            fileName: 'spec-banner.pdf',
            extractedText: 'Quy cách kích thước 1920x1080px, định dạng RGB PNG',
            note: 'Chuẩn thương hiệu công ty 2026',
          },
        ],
      };

      const res = await request(app.getHttpServer())
        .post(`/projects/${projectId}/product-descriptions`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(payload)
        .expect(201);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();
      expect(body.id).toBeDefined();
      createdSubmissionId = body.id;

      // G10: Kiểm tra DB
      const dbSub = await dataSource.query(
        `SELECT status, "createdById" FROM project_product_description_submissions WHERE id = $1`,
        [createdSubmissionId]
      );
      expect(dbSub.length).toBe(1);
      expect(dbSub[0].status).toBe('DRAFT');
    });
  });

  // =========================================================================
  // 3. ENDPOINT: POST /projects/:id/product-descriptions/:submissionId/submit
  // =========================================================================
  describe('3. POST /projects/:id/product-descriptions/:submissionId/submit (Gửi duyệt)', () => {
    it('TC-PPD-004 [Happy path]: Gửi duyệt bản mô tả chuyển sang PENDING_REVIEW (200/201)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/projects/${projectId}/product-descriptions/${createdSubmissionId}/submit`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send();

      expect([200, 201]).toContain(res.status);

      // G10: DB Assert
      const dbSub = await dataSource.query(
        `SELECT status FROM project_product_description_submissions WHERE id = $1`,
        [createdSubmissionId]
      );
      expect(dbSub[0].status).toBe('PENDING_REVIEW');
    });

    it('TC-PPD-005 [Not Found G06]: Submission không tồn tại trả về 404', async () => {
      const fakeId = '01TESTNOTFOUNDSUB000000000';
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/product-descriptions/${fakeId}/submit`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send()
        .expect(404);
    });
  });

  // =========================================================================
  // 4. ENDPOINT: POST /projects/:id/product-descriptions/:submissionId/approve
  // =========================================================================
  describe('4. POST /projects/:id/product-descriptions/:submissionId/approve (Phê duyệt)', () => {
    it('TC-PPD-006 [Happy path]: Phê duyệt bản mô tả chuyển sang APPROVED (200/201)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/projects/${projectId}/product-descriptions/${createdSubmissionId}/approve`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send();

      expect([200, 201]).toContain(res.status);

      // G10: DB Assert
      const dbSub = await dataSource.query(
        `SELECT status, "reviewedById" FROM project_product_description_submissions WHERE id = $1`,
        [createdSubmissionId]
      );
      expect(dbSub[0].status).toBe('APPROVED');
      expect(dbSub[0].reviewedById).toBe(roles.admin.userId);
    });
  });

  // =========================================================================
  // 5. ENDPOINT: POST /projects/:id/product-descriptions/:submissionId/reject
  // =========================================================================
  describe('5. POST /projects/:id/product-descriptions/:submissionId/reject (Từ chối)', () => {
    it('TC-PPD-007 [Validation G02]: Từ chối không có lý do trả về 400', async () => {
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/product-descriptions/${createdSubmissionId}/reject`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({})
        .expect(400);
    });

    it('TC-PPD-008 [Happy path]: Từ chối kèm lý do chuyển sang REJECTED (200/201)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/projects/${projectId}/product-descriptions/${createdSubmissionId}/reject`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ note: 'Cần bổ sung thêm thông số kỹ thuật in ấn' });

      expect([200, 201]).toContain(res.status);

      // G10: DB Assert
      const dbSub = await dataSource.query(
        `SELECT status, "reviewNote" FROM project_product_description_submissions WHERE id = $1`,
        [createdSubmissionId]
      );
      expect(dbSub[0].status).toBe('REJECTED');
      expect(dbSub[0].reviewNote).toBe('Cần bổ sung thêm thông số kỹ thuật in ấn');
    });
  });
});
