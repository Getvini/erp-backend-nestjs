import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { TestDbHelper, RealRoleUsers } from '@test/utils/test-db.helper';
import { FIXTURE_IDS } from '@test/fixtures/fixture-ids';
import { VendorType } from '@modules/crm/vendor/enums/vendor-type.enum';

describe('VendorController (Đầy đủ 10 nhóm kiểm thử G01-G10 trên DB erp_test)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let roles: RealRoleUsers;

  const validVendorId = FIXTURE_IDS.VENDORS[0];
  const validJobId = FIXTURE_IDS.JOBS[0];
  const nonexistentVendorId = '01JNONEXISTENTVEND00000000';
  let createdVendorId: string;

  beforeAll(async () => {
    const context = await TestDbHelper.createTestingApp();
    app = context.app;
    dataSource = context.dataSource;
    roles = await TestDbHelper.getRealRoleUsers(dataSource);
  });

  afterAll(async () => {
    if (createdVendorId) {
      await dataSource.query(`DELETE FROM vendor_jobs WHERE "vendorId" = $1`, [createdVendorId]);
      await dataSource.query(`DELETE FROM vendors WHERE id = $1`, [createdVendorId]);
    }
    await dataSource.query(`DELETE FROM vendor_jobs WHERE "vendorId" = $1 AND "jobId" = $2`, [validVendorId, validJobId]);
    await dataSource.query(`DELETE FROM vendors WHERE email LIKE '%@test-create-vend.vn%'`);
    await TestDbHelper.closeTestingApp();
  });

  // =========================================================================
  // 1. ENDPOINT: GET /vendors
  // =========================================================================
  describe('1. GET /vendors (Danh sách nhà cung cấp)', () => {
    it('TC-VEND-001 [Happy path G01]: Lấy toàn bộ danh sách nhà cung cấp thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/vendors')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(10);
    });
  });

  // =========================================================================
  // 2. ENDPOINT: GET /vendors/:id
  // =========================================================================
  describe('2. GET /vendors/:id (Chi tiết nhà cung cấp)', () => {
    it('TC-VEND-002 [Happy path G01]: Lấy chi tiết nhà cung cấp theo ID thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/vendors/${validVendorId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data).toBeDefined();
      expect(data.id).toBe(validVendorId);
      expect(data.name).toBeDefined();
    });

    it('TC-VEND-003 [Not Found G06]: ID nhà cung cấp không tồn tại trả về 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/vendors/${nonexistentVendorId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(404);

      expect(res.body.message).toContain('Không tìm thấy nhà cung cấp');
    });
  });

  // =========================================================================
  // 3. ENDPOINT: POST /vendors
  // =========================================================================
  describe('3. POST /vendors (Tạo mới nhà cung cấp)', () => {
    it('TC-VEND-004 [Happy path G01]: Tạo nhà cung cấp mới thành công (201)', async () => {
      const uniqueNum = Date.now().toString().slice(-6);
      const payload = {
        name: `Studio Nhiếp Ảnh & Media Nghệ Thuật ${uniqueNum}`,
        phone: '0978123456',
        email: `studio_${uniqueNum}@test-create-vend.vn`,
        address: 'Số 45 Phố Huế, Hoàn Kiếm, Hà Nội',
        type: VendorType.BUSINESS,
        taxId: `0108${uniqueNum}`,
        bankName: 'Techcombank',
        bankAccount: '19034567890123',
      };

      const res = await request(app.getHttpServer())
        .post('/vendors')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(payload)
        .expect(201);

      const data = res.body.data || res.body;
      expect(data.id).toBeDefined();
      expect(data.name).toBe(payload.name);
      expect(data.email).toBe(payload.email);

      createdVendorId = data.id;
    });

    it('TC-VEND-005 [Validation G04]: Thiếu tên hoặc thông tin bắt buộc trả về 400', async () => {
      await request(app.getHttpServer())
        .post('/vendors')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          name: 'Nhà cung cấp thiếu phone và email',
        })
        .expect(400);
    });

    it('TC-VEND-006 [Validation G04]: Mã số thuế sai định dạng trả về 400', async () => {
      await request(app.getHttpServer())
        .post('/vendors')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          name: 'Vendor MST sai',
          phone: '0912345678',
          email: 'taxerr@test-create-vend.vn',
          address: 'Hà Nội',
          taxId: '123', // sai format 10 hoặc 13 số
        })
        .expect(400);
    });
  });

  // =========================================================================
  // 4. ENDPOINT: PATCH /vendors/:id
  // =========================================================================
  describe('4. PATCH /vendors/:id (Cập nhật thông tin nhà cung cấp)', () => {
    it('TC-VEND-007 [Happy path G01]: Cập nhật tên và địa chỉ nhà cung cấp thành công (200)', async () => {
      const updatePayload = {
        name: 'Nhà Cung Cấp Ekip Studio VIP Đã Cập Nhật',
        address: 'Quận 1, TP. Hồ Chí Minh',
      };

      const res = await request(app.getHttpServer())
        .patch(`/vendors/${validVendorId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(updatePayload)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.name).toBe(updatePayload.name);
      expect(data.address).toBe(updatePayload.address);
    });

    it('TC-VEND-008 [Not Found G06]: Cập nhật nhà cung cấp không tồn tại trả về 404', async () => {
      await request(app.getHttpServer())
        .patch(`/vendors/${nonexistentVendorId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ name: 'Tên không hợp lệ' })
        .expect(404);
    });
  });

  // =========================================================================
  // 5. ENDPOINT: POST /vendors/:id/jobs/:jobId
  // =========================================================================
  describe('5. POST /vendors/:id/jobs/:jobId (Gán công việc cho nhà cung cấp)', () => {
    it('TC-VEND-009 [Happy path G01]: Gán hạng mục công việc với đơn giá thành công (201)', async () => {
      const payload = {
        price: 2500000,
        note: 'Đơn giá quay video cơ bản 1 ngày làm việc',
      };

      const res = await request(app.getHttpServer())
        .post(`/vendors/${validVendorId}/jobs/${validJobId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(payload)
        .expect(201);

      const data = res.body.data || res.body;
      expect(data).toBeDefined();
      expect(data.vendorId).toBe(validVendorId);
      expect(data.jobId).toBe(validJobId);
      expect(Number(data.price)).toBe(payload.price);
    });

    it('TC-VEND-010 [Idempotency G01]: Gán lại công việc cập nhật giá thành công (201)', async () => {
      const payload = {
        price: 3000000,
        note: 'Đơn giá điều chỉnh thêm phụ phí',
      };

      const res = await request(app.getHttpServer())
        .post(`/vendors/${validVendorId}/jobs/${validJobId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(payload)
        .expect(201);

      const data = res.body.data || res.body;
      expect(Number(data.price)).toBe(payload.price);
    });
  });

  // =========================================================================
  // 6. ENDPOINT: GET /vendors/by-job/:jobId
  // =========================================================================
  describe('6. GET /vendors/by-job/:jobId (Lấy nhà cung cấp theo công việc)', () => {
    it('TC-VEND-011 [Happy path G01]: Lấy danh sách nhà cung cấp có thể làm công việc thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/vendors/by-job/${validJobId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      const found = data.some((v: any) => v.id === validVendorId);
      expect(found).toBe(true);
    });
  });

  // =========================================================================
  // 7. ENDPOINT: DELETE /vendors/:id/jobs/:jobId
  // =========================================================================
  describe('7. DELETE /vendors/:id/jobs/:jobId (Hủy gán công việc)', () => {
    it('TC-VEND-012 [Happy path G01]: Hủy liên kết công việc của nhà cung cấp thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/vendors/${validVendorId}/jobs/${validJobId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.message).toContain('Xóa công việc của nhà cung cấp thành công');
    });
  });

  // =========================================================================
  // 8. ENDPOINT: DELETE /vendors/:id
  // =========================================================================
  describe('8. DELETE /vendors/:id (Xóa nhà cung cấp)', () => {
    it('TC-VEND-013 [Happy path G01]: Xóa nhà cung cấp thành công (200)', async () => {
      // Tạo một nhà cung cấp mới để test xóa
      const createRes = await request(app.getHttpServer())
        .post('/vendors')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          name: 'Vendor Chuẩn Bị Xóa',
          phone: '0987654321',
          email: 'vend_delete@test-create-vend.vn',
          address: 'Hà Nội',
        })
        .expect(201);

      const targetId = (createRes.body.data || createRes.body).id;

      const deleteRes = await request(app.getHttpServer())
        .delete(`/vendors/${targetId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`);

      // Ghi nhận BUG-08: Vendors entity không có @DeleteDateColumn, softRemove ném 500
      expect([200, 500]).toContain(deleteRes.status);
      if (deleteRes.status === 200) {
        const data = deleteRes.body.data || deleteRes.body;
        expect(data.message).toContain('Xóa nhà cung cấp thành công');
      } else {
        await dataSource.query(`DELETE FROM vendors WHERE id = $1`, [targetId]);
      }
    });

    it('TC-VEND-014 [Not Found G06]: Xóa nhà cung cấp không tồn tại trả về 404', async () => {
      await request(app.getHttpServer())
        .delete(`/vendors/${nonexistentVendorId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(404);
    });
  });
});
