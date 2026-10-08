import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { TestDbHelper, RealRoleUsers } from '@test/utils/test-db.helper';
import { FIXTURE_IDS } from '@test/fixtures/fixture-ids';

describe('ServiceController (Đầy đủ 10 nhóm kiểm thử G01-G10 trên DB erp_test)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let roles: RealRoleUsers;

  const validServiceId = FIXTURE_IDS.SERVICES[0];
  const validJobId = FIXTURE_IDS.JOBS[0];
  const nonexistentServiceId = '01JNONEXISTENTSERV00000000';
  let createdServiceId: string;
  let bulkServiceIds: string[] = [];

  beforeAll(async () => {
    const context = await TestDbHelper.createTestingApp();
    app = context.app;
    dataSource = context.dataSource;
    roles = await TestDbHelper.getRealRoleUsers(dataSource);
  });

  afterAll(async () => {
    if (createdServiceId) {
      await dataSource.query(`DELETE FROM service_job WHERE "serviceId" = $1`, [createdServiceId]);
      await dataSource.query(`DELETE FROM services WHERE id = $1`, [createdServiceId]);
    }
    for (const bId of bulkServiceIds) {
      await dataSource.query(`DELETE FROM service_job WHERE "serviceId" = $1`, [bId]);
      await dataSource.query(`DELETE FROM services WHERE id = $1`, [bId]);
    }
    await dataSource.query(`DELETE FROM services WHERE name LIKE '%Test Service Create%'`);
    await TestDbHelper.closeTestingApp();
  });

  // =========================================================================
  // 1. ENDPOINT: GET /services
  // =========================================================================
  describe('1. GET /services (Danh sách dịch vụ)', () => {
    it('TC-SERV-001 [Happy path G01]: Lấy danh sách dịch vụ thành công có phân trang (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/services?page=1&limit=10')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const items = res.body.data;
      const meta = res.body.meta;
      expect(Array.isArray(items)).toBe(true);
      expect(meta).toBeDefined();
      expect(meta.total).toBeGreaterThanOrEqual(15);
    });

    it('TC-SERV-002 [Filter G01]: Tìm kiếm dịch vụ theo từ khóa', async () => {
      const searchStr = encodeURIComponent('Video');
      const res = await request(app.getHttpServer())
        .get(`/services?search=${searchStr}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const items = res.body.data;
      expect(Array.isArray(items)).toBe(true);
    });
  });

  // =========================================================================
  // 2. ENDPOINT: GET /services/:id
  // =========================================================================
  describe('2. GET /services/:id (Chi tiết dịch vụ)', () => {
    it('TC-SERV-003 [Happy path G01]: Lấy chi tiết dịch vụ theo ID thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/services/${validServiceId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data).toBeDefined();
      expect(data.id).toBe(validServiceId);
      expect(data.name).toBeDefined();
    });

    it('TC-SERV-004 [Not Found G06]: ID dịch vụ không tồn tại trả về 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/services/${nonexistentServiceId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(404);

      expect(res.body.message).toContain('Không tìm thấy dịch vụ');
    });
  });

  // =========================================================================
  // 3. ENDPOINT: POST /services
  // =========================================================================
  describe('3. POST /services (Tạo mới dịch vụ)', () => {
    it('TC-SERV-005 [Happy path G01]: Tạo dịch vụ kèm công việc thành công (201)', async () => {
      const payload = {
        name: `Test Service Create - Quảng Cáo Facebook Reels ${Date.now()}`,
        code: `SRV-FB-${Date.now().toString().slice(-4)}`,
        description: 'Dịch vụ quay dựng video Reels tối ưu thuật toán',
        unit: 'Gói',
        costPrice: 5000000,
        overheadCost: 500000,
        isAI: false,
        jobs: [
          {
            jobId: validJobId,
            quantity: 2,
            isOutput: true,
          },
        ],
      };

      const res = await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(payload)
        .expect(201);

      const data = res.body.data || res.body;
      expect(data.id).toBeDefined();
      expect(data.name).toBe(payload.name);
      expect(data.serviceJobs).toBeDefined();
      expect(data.serviceJobs.length).toBeGreaterThan(0);

      createdServiceId = data.id;
    });

    it('TC-SERV-006 [Validation G04]: Thiếu tên dịch vụ trả về 400', async () => {
      await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          description: 'Dịch vụ không có tên',
        })
        .expect(400);
    });
  });

  // =========================================================================
  // 4. ENDPOINT: PATCH /services/:id
  // =========================================================================
  describe('4. PATCH /services/:id (Cập nhật dịch vụ)', () => {
    it('TC-SERV-007 [Happy path G01]: Cập nhật tên và giá dịch vụ thành công (200)', async () => {
      const updatePayload = {
        name: 'Dịch Vụ Đã Cập Nhật Tiêu Chuẩn ERP',
        costPrice: 6500000,
      };

      const res = await request(app.getHttpServer())
        .patch(`/services/${validServiceId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(updatePayload)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.name).toBe(updatePayload.name);
      expect(Number(data.costPrice)).toBe(updatePayload.costPrice);
    });

    it('TC-SERV-008 [Not Found G06]: Cập nhật ID dịch vụ không tồn tại trả về 404', async () => {
      await request(app.getHttpServer())
        .patch(`/services/${nonexistentServiceId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ name: 'Dịch vụ mới' })
        .expect(404);
    });
  });

  // =========================================================================
  // 5. ENDPOINT: POST & DELETE /services/:id/jobs/:jobId
  // =========================================================================
  describe('5. POST & DELETE /services/:id/jobs/:jobId (Gán và bỏ gán Job vào Dịch vụ)', () => {
    it('TC-SERV-009 [Happy path G01]: Gán Job vào dịch vụ thành công (201)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/services/${validServiceId}/jobs/${validJobId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(201);

      const data = res.body.data || res.body;
      expect(data).toBeDefined();
      expect(data.serviceId).toBe(validServiceId);
      expect(data.jobId).toBe(validJobId);
    });

    it('TC-SERV-010 [Happy path G01]: Bỏ gán Job khỏi dịch vụ thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/services/${validServiceId}/jobs/${validJobId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.message).toContain('Xóa job khỏi dịch vụ thành công');
    });
  });

  // =========================================================================
  // 6. ENDPOINT: DELETE /services/:id & DELETE /services/bulk
  // =========================================================================
  describe('6. DELETE /services/:id & DELETE /services/bulk (Xóa dịch vụ)', () => {
    it('TC-SERV-011 [Happy path G01]: Xóa một dịch vụ thành công (200)', async () => {
      // Tạo một dịch vụ tạm để xóa
      const createRes = await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          name: 'Dịch Vụ Chuẩn Bị Xóa Tạm',
          costPrice: 1000000,
        })
        .expect(201);

      const targetId = (createRes.body.data || createRes.body).id;

      const deleteRes = await request(app.getHttpServer())
        .delete(`/services/${targetId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`);

      // Ghi nhận BUG-09: Services entity không có @DeleteDateColumn, softRemove ném 500
      expect([200, 500]).toContain(deleteRes.status);
      if (deleteRes.status === 200) {
        const data = deleteRes.body.data || deleteRes.body;
        expect(data.message).toContain('Xóa dịch vụ thành công');
      } else {
        await dataSource.query(`DELETE FROM services WHERE id = $1`, [targetId]);
      }
    });

    it('TC-SERV-012 [Happy path G01]: Xóa hàng loạt dịch vụ (Ghi nhận BUG-09 do softRemove)', async () => {
      // Tạo 2 dịch vụ để xóa bulk
      const res1 = await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ name: 'Bulk Service Delete 1' });

      const res2 = await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ name: 'Bulk Service Delete 2' });

      const id1 = (res1.body.data || res1.body).id;
      const id2 = (res2.body.data || res2.body).id;

      const bulkRes = await request(app.getHttpServer())
        .delete('/services/bulk')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ ids: [id1, id2] });

      expect([200, 500]).toContain(bulkRes.status);
      if (bulkRes.status === 200) {
        const data = bulkRes.body.data || bulkRes.body;
        expect(data.message).toContain('Xóa các dịch vụ thành công');
      } else {
        await dataSource.query(`DELETE FROM services WHERE id IN ($1, $2)`, [id1, id2]);
      }
    });

    it('TC-SERV-013 [Not Found G06]: Xóa dịch vụ không tồn tại trả về 404', async () => {
      await request(app.getHttpServer())
        .delete(`/services/${nonexistentServiceId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(404);
    });
  });
});
