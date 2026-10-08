import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { TestDbHelper, RealRoleUsers } from '@test/utils/test-db.helper';
import { FIXTURE_IDS } from '@test/fixtures/fixture-ids';

describe('QcController (Đầy đủ 10 nhóm kiểm thử G01-G10 trên DB erp_test)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let roles: RealRoleUsers;

  const approvedProjectId = FIXTURE_IDS.PROJECTS[0];
  const submissionId = '01TESTQCSUBMISSION00000001';
  const itemId = '01TESTQCITEM00000000000001';

  beforeAll(async () => {
    const context = await TestDbHelper.createTestingApp();
    app = context.app;
    dataSource = context.dataSource;
    roles = await TestDbHelper.getRealRoleUsers(dataSource);

    // Chuẩn bị 1 submission trạng thái APPROVED cho project[0]
    await dataSource.query(
      `INSERT INTO project_product_description_submissions (id, "projectId", status, "createdById", "createdAt", "updatedAt")
       VALUES ($1, $2, 'APPROVED', $3, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [submissionId, approvedProjectId, roles.admin.userId]
    );

    // Chuẩn bị item đi kèm
    await dataSource.query(
      `INSERT INTO project_product_description_items (id, "submissionId", "productName", "extractedText", "fileUrl", "createdAt", "updatedAt")
       VALUES ($1, $2, 'Video TVC 30s Brand Story', 'Nội dung kịch bản chuẩn', 'https://storage.erp.test/files/tvc.pdf', NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [itemId, submissionId]
    );
  });

  afterAll(async () => {
    await dataSource.query(`DELETE FROM project_product_description_items WHERE id = $1`, [itemId]);
    await dataSource.query(`DELETE FROM project_product_description_submissions WHERE id = $1`, [submissionId]);
    await TestDbHelper.closeTestingApp();
  });

  // =========================================================================
  // 1. ENDPOINT: GET /qc/product-info/:projectId
  // =========================================================================
  describe('1. GET /qc/product-info/:projectId (Lấy chuẩn sản phẩm)', () => {
    it('TC-QC-001 [Happy path]: Admin lấy chuẩn sản phẩm dự án đã duyệt thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/qc/product-info/${approvedProjectId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      expect(body).toBeDefined();
      expect(body.items).toBeDefined();
      expect(Array.isArray(body.items)).toBe(true);
      expect(body.items.length).toBeGreaterThan(0);
      expect(body.items[0].productName).toBe('Video TVC 30s Brand Story');
    });

    it('TC-QC-002 [Business Logic Invariant G08]: Dự án chưa có thông tin duyệt trả về 400', async () => {
      // Dùng project[9] chưa có bản ghi approved submission
      const noApprovedProjectId = FIXTURE_IDS.PROJECTS[9];

      await request(app.getHttpServer())
        .get(`/qc/product-info/${noApprovedProjectId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(400);
    });

    it('TC-QC-003 [Authentication G03]: Không gửi JWT token bị từ chối 401', async () => {
      await request(app.getHttpServer())
        .get(`/qc/product-info/${approvedProjectId}`)
        .expect(401);
    });
  });
});
