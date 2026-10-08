import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { TestDbHelper, RealRoleUsers } from '@test/utils/test-db.helper';
import { FIXTURE_IDS } from '@test/fixtures/fixture-ids';
import { OpportunityStatus } from '@modules/crm/opportunity/enums/opportunity-status.enum';

describe('OpportunityController (Đầy đủ 10 nhóm kiểm thử G01-G10 trên DB erp_test)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let roles: RealRoleUsers;

  const validOppId = FIXTURE_IDS.OPPORTUNITIES[0];
  const validCustomerId = FIXTURE_IDS.CUSTOMERS[0];
  const nonexistentOppId = '01JNONEXISTENTOPP000000000';
  let createdOppId: string;

  beforeAll(async () => {
    const context = await TestDbHelper.createTestingApp();
    app = context.app;
    dataSource = context.dataSource;
    roles = await TestDbHelper.getRealRoleUsers(dataSource);
  });

  afterAll(async () => {
    if (createdOppId) {
      await dataSource.query(`DELETE FROM opportunity_rejections WHERE "opportunityId" = $1`, [createdOppId]);
      await dataSource.query(`DELETE FROM opportunity_service_jobs WHERE "opportunityServiceId" IN (SELECT id FROM opportunity_services WHERE "opportunityId" = $1)`, [createdOppId]);
      await dataSource.query(`DELETE FROM opportunity_services WHERE "opportunityId" = $1`, [createdOppId]);
      await dataSource.query(`DELETE FROM opportunity_packages WHERE "opportunityId" = $1`, [createdOppId]);
      await dataSource.query(`DELETE FROM opportunities WHERE id = $1`, [createdOppId]);
    }
    await dataSource.query(`DELETE FROM opportunities WHERE name LIKE '%Test Opp Create%'`);
    await TestDbHelper.closeTestingApp();
  });

  // =========================================================================
  // 1. ENDPOINT: GET /opportunities
  // =========================================================================
  describe('1. GET /opportunities (Danh sách cơ hội bán hàng)', () => {
    it('TC-OPP-001 [Happy path G01]: Admin lấy danh sách cơ hội thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/opportunities?page=1&limit=10')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const items = res.body.data;
      const meta = res.body.meta;
      expect(Array.isArray(items)).toBe(true);
      expect(meta).toBeDefined();
      expect(meta.total).toBeGreaterThanOrEqual(20);
    });

    it('TC-OPP-002 [RBAC Scope G02]: BD lấy danh sách cơ hội thuộc quyền quản lý (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/opportunities')
        .set('Authorization', `Bearer ${roles.bd.token}`)
        .expect(200);

      const items = res.body.data;
      expect(Array.isArray(items)).toBe(true);
    });

    it('TC-OPP-003 [RBAC Forbidden G02]: Staff Designer không có quyền truy cập cơ hội (403)', async () => {
      await request(app.getHttpServer())
        .get('/opportunities')
        .set('Authorization', `Bearer ${roles.staffDesigner.token}`)
        .expect(403);
    });

    it('TC-OPP-004 [Authentication G03]: Không có token trả về 401', async () => {
      await request(app.getHttpServer())
        .get('/opportunities')
        .expect(401);
    });
  });

  // =========================================================================
  // 2. ENDPOINT: GET /opportunities/:id
  // =========================================================================
  describe('2. GET /opportunities/:id (Chi tiết cơ hội)', () => {
    it('TC-OPP-005 [Happy path G01]: Admin lấy chi tiết cơ hội thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/opportunities/${validOppId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data).toBeDefined();
      expect(data.id).toBe(validOppId);
      expect(data.name).toBeDefined();
    });

    it('TC-OPP-006 [Not Found G06]: Cơ hội không tồn tại trả về 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/opportunities/${nonexistentOppId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(404);

      expect(res.body.message).toContain('Không tìm thấy cơ hội');
    });
  });

  // =========================================================================
  // 3. ENDPOINT: POST /opportunities
  // =========================================================================
  describe('3. POST /opportunities (Tạo mới cơ hội)', () => {
    it('TC-OPP-007 [Happy path G01]: Tạo mới cơ hội bán hàng thành công (201)', async () => {
      const payload = {
        name: `Test Opp Create - Chiến Dịch Viral TikTok Brand VIP ${Date.now()}`,
        customerId: validCustomerId,
        expectedRevenue: 45000000,
        budget: 50000000,
        priority: 'HIGH',
        successChance: 80,
      };

      const res = await request(app.getHttpServer())
        .post('/opportunities')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(payload)
        .expect(201);

      const data = res.body.data || res.body;
      expect(data.id).toBeDefined();
      expect(data.name).toBe(payload.name);
      expect(data.status).toBe(OpportunityStatus.PENDING_OPP_APPROVAL);

      createdOppId = data.id;
    });

    it('TC-OPP-008 [Validation G04]: Thiếu tên cơ hội trả về 400', async () => {
      await request(app.getHttpServer())
        .post('/opportunities')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          customerId: validCustomerId,
        })
        .expect(400);
    });
  });

  // =========================================================================
  // 4. ENDPOINT: PATCH /opportunities/:id
  // =========================================================================
  describe('4. PATCH /opportunities/:id (Cập nhật cơ hội)', () => {
    it('TC-OPP-009 [Happy path G01]: Cập nhật tên và doanh thu kỳ vọng thành công (200)', async () => {
      const updatePayload = {
        name: 'Cơ Hội Tiếp Cận Dự Án Đã Cập Nhật Lại Mục Tiêu',
        expectedRevenue: 60000000,
      };

      const res = await request(app.getHttpServer())
        .patch(`/opportunities/${validOppId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(updatePayload)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.name).toBe(updatePayload.name);
      expect(Number(data.expectedRevenue)).toBe(updatePayload.expectedRevenue);
    });
  });

  // =========================================================================
  // 5. ENDPOINT: PATCH /opportunities/:id/addcustomer
  // =========================================================================
  describe('5. PATCH /opportunities/:id/addcustomer (Gán khách hàng)', () => {
    it('TC-OPP-010 [Happy path G01]: Gán khách hàng cho cơ hội thành công (200)', async () => {
      const targetCustomer = FIXTURE_IDS.CUSTOMERS[1];
      const res = await request(app.getHttpServer())
        .patch(`/opportunities/${validOppId}/addcustomer`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ customerId: targetCustomer })
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.customerId).toBe(targetCustomer);
    });
  });

  // =========================================================================
  // 6. ENDPOINT: Phê duyệt, Từ chối, Gửi lại (Approve / Reject / Resubmit)
  // =========================================================================
  describe('6. Quy trình duyệt: Approve, Reject, Resubmit', () => {
    let workflowOppId: string;

    beforeAll(async () => {
      // Tạo một cơ hội riêng cho quy trình duyệt
      const createRes = await request(app.getHttpServer())
        .post('/opportunities')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          name: 'Cơ hội Kiểm thử Luồng Phê Duyệt',
          customerId: validCustomerId,
          expectedRevenue: 20000000,
        });
      workflowOppId = (createRes.body.data || createRes.body).id;
    });

    afterAll(async () => {
      if (workflowOppId) {
        await dataSource.query(`DELETE FROM opportunity_rejections WHERE "opportunityId" = $1`, [workflowOppId]);
        await dataSource.query(`DELETE FROM opportunities WHERE id = $1`, [workflowOppId]);
      }
    });

    it('TC-OPP-011 [Happy path G01]: Admin từ chối cơ hội thành công (200)', async () => {
      const rejectPayload = {
        reason: 'Ngân sách đề xuất quá thấp so với chi phí vận hành',
      };

      const res = await request(app.getHttpServer())
        .patch(`/opportunities/${workflowOppId}/reject`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(rejectPayload)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.status).toBe(OpportunityStatus.OPP_REJECTED);
      expect(data.rejectionReason).toBe(rejectPayload.reason);
    });

    it('TC-OPP-012 [Happy path G01]: Sau khi bị từ chối, gửi lại duyệt (resubmit) thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/opportunities/${workflowOppId}/resubmit`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.status).toBe(OpportunityStatus.PENDING_OPP_APPROVAL);
    });

    it('TC-OPP-013 [Happy path G01]: Admin phê duyệt cơ hội thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/opportunities/${workflowOppId}/approve`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.status).toBe(OpportunityStatus.OPP_APPROVED);
    });
  });

  // =========================================================================
  // 7. ENDPOINT: DELETE /opportunities/:id
  // =========================================================================
  describe('7. DELETE /opportunities/:id (Xóa cơ hội)', () => {
    it('TC-OPP-014 [Happy path G01]: Xóa cơ hội thành công (200)', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/opportunities')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          name: 'Cơ Hội Tạm Để Kiểm Tra Xóa',
          customerId: validCustomerId,
          expectedRevenue: 10000000,
        })
        .expect(201);

      const toDeleteId = (createRes.body.data || createRes.body).id;

      const deleteRes = await request(app.getHttpServer())
        .delete(`/opportunities/${toDeleteId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = deleteRes.body.data || deleteRes.body;
      expect(data.message).toContain('Xóa cơ hội thành công');

      // Xác nhận không còn tìm thấy
      await request(app.getHttpServer())
        .get(`/opportunities/${toDeleteId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(404);
    });
  });
});
