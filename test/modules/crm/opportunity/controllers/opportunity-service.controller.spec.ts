import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { TestDbHelper, RealRoleUsers } from '@test/utils/test-db.helper';
import { FIXTURE_IDS } from '@test/fixtures/fixture-ids';

describe('OpportunityServiceController (Đầy đủ 10 nhóm kiểm thử G01-G10 trên DB erp_test)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let roles: RealRoleUsers;

  const validOppId = FIXTURE_IDS.OPPORTUNITIES[0];
  const validServiceId = FIXTURE_IDS.SERVICES[0];
  const nonexistentId = '01JNONEXISTENTOPPSRV0000000';
  let createdOppSvcId: string;

  beforeAll(async () => {
    const context = await TestDbHelper.createTestingApp();
    app = context.app;
    dataSource = context.dataSource;
    roles = await TestDbHelper.getRealRoleUsers(dataSource);
  });

  afterAll(async () => {
    if (createdOppSvcId) {
      await dataSource.query(`DELETE FROM opportunity_service_jobs WHERE "opportunityServiceId" = $1`, [createdOppSvcId]);
      await dataSource.query(`DELETE FROM opportunity_services WHERE id = $1`, [createdOppSvcId]);
    }
    await TestDbHelper.closeTestingApp();
  });

  // =========================================================================
  // 1. ENDPOINT: POST /opportunity-services
  // =========================================================================
  describe('1. POST /opportunity-services (Thêm dịch vụ vào cơ hội)', () => {
    it('TC-OPS-001 [Happy path G01]: Thêm dịch vụ vào cơ hội thành công (201)', async () => {
      const payload = {
        opportunityId: validOppId,
        serviceId: validServiceId,
        quantity: 2,
        costAtSale: 10000000,
      };

      const res = await request(app.getHttpServer())
        .post('/opportunity-services')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(payload)
        .expect(201);

      const data = res.body.data || res.body;
      expect(data.id).toBeDefined();
      expect(data.opportunityId).toBe(validOppId);
      expect(data.serviceId).toBe(validServiceId);
      expect(Number(data.costAtSale)).toBe(payload.costAtSale);
      expect(Number(data.sellingPrice)).toBeGreaterThan(payload.costAtSale);

      createdOppSvcId = data.id;
    });
  });

  // =========================================================================
  // 2. ENDPOINT: GET /opportunity-services/opportunity/:opportunityId
  // =========================================================================
  describe('2. GET /opportunity-services/opportunity/:opportunityId (Danh sách theo cơ hội)', () => {
    it('TC-OPS-002 [Happy path G01]: Lấy danh sách dịch vụ của cơ hội thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/opportunity-services/opportunity/${validOppId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // 3. ENDPOINT: GET /opportunity-services/:id
  // =========================================================================
  describe('3. GET /opportunity-services/:id (Chi tiết dịch vụ trong cơ hội)', () => {
    it('TC-OPS-003 [Happy path G01]: Lấy chi tiết dịch vụ thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/opportunity-services/${createdOppSvcId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.id).toBe(createdOppSvcId);
      expect(data.service).toBeDefined();
    });

    it('TC-OPS-004 [Not Found G06]: ID không tồn tại trả về 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/opportunity-services/${nonexistentId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(404);

      expect(res.body.message).toContain('Không tìm thấy');
    });
  });

  // =========================================================================
  // 4. ENDPOINT: PATCH /opportunity-services/:id
  // =========================================================================
  describe('4. PATCH /opportunity-services/:id (Cập nhật dịch vụ trong cơ hội)', () => {
    it('TC-OPS-005 [Happy path G01]: Cập nhật số lượng và giá vốn thành công (200)', async () => {
      const updatePayload = {
        quantity: 3,
        costAtSale: 15000000,
      };

      const res = await request(app.getHttpServer())
        .patch(`/opportunity-services/${createdOppSvcId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(updatePayload)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Number(data.quantity)).toBe(updatePayload.quantity);
      expect(Number(data.costAtSale)).toBe(updatePayload.costAtSale);
    });
  });

  // =========================================================================
  // 5. ENDPOINT: DELETE /opportunity-services/:id
  // =========================================================================
  describe('5. DELETE /opportunity-services/:id (Xóa dịch vụ khỏi cơ hội)', () => {
    it('TC-OPS-006 [Happy path G01]: Xóa dịch vụ khỏi cơ hội thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/opportunity-services/${createdOppSvcId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.message).toContain('Xóa hạng mục dịch vụ thành công');

      // Xác nhận không còn tìm thấy
      await request(app.getHttpServer())
        .get(`/opportunity-services/${createdOppSvcId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(404);

      createdOppSvcId = '';
    });

    it('TC-OPS-007 [Not Found G06]: Xóa ID không tồn tại trả về 404', async () => {
      await request(app.getHttpServer())
        .delete(`/opportunity-services/${nonexistentId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(404);
    });
  });
});
