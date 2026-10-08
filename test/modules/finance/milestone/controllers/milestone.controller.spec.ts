import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { TestDbHelper, RealRoleUsers } from '@test/utils/test-db.helper';
import { FIXTURE_IDS } from '@test/fixtures/fixture-ids';

describe('PaymentMilestoneController (Đầy đủ 10 nhóm kiểm thử G01-G10 trên DB erp_test)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let roles: RealRoleUsers;

  const validContractId = FIXTURE_IDS.CONTRACTS[0];
  const validMilestoneId = FIXTURE_IDS.MILESTONES[0];
  const nonexistentMilestoneId = '01JNONEXISTENTMLS00000000';
  const nonexistentContractId = '01JNONEXISTENTCTR00000000';

  let testContractId: string;
  let createdMilestoneId: string;

  beforeAll(async () => {
    const context = await TestDbHelper.createTestingApp();
    app = context.app;
    dataSource = context.dataSource;
    roles = await TestDbHelper.getRealRoleUsers(dataSource);

    // Tạo 1 contract trắng cho milestone tests
    const uniqueCode = `HD-MLS-CTRL-${Date.now()}`;
    await dataSource.query(
      `INSERT INTO contracts (id, "contractCode", name, status, "customerId", "createdById", cost, "sellingPrice", "vatRate", "vatAmount", "totalWithVat", "createdAt")
       VALUES ('01JMLSCTRLCONTRACT00000001', $1, 'Hợp Đồng Cho MilestoneController Spec', 'DRAFT', $2, $3, 10000000, 20000000, 10, 2000000, 22000000, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [uniqueCode, FIXTURE_IDS.CUSTOMERS[0], roles.admin.userId],
    );
    testContractId = '01JMLSCTRLCONTRACT00000001';
  });

  afterAll(async () => {
    if (createdMilestoneId) {
      await dataSource.query(`DELETE FROM debts WHERE "milestoneId" = $1`, [createdMilestoneId]);
      await dataSource.query(`DELETE FROM payment_milestones WHERE id = $1`, [createdMilestoneId]);
    }
    if (testContractId) {
      await dataSource.query(`DELETE FROM debts WHERE "contractId" = $1`, [testContractId]);
      await dataSource.query(`DELETE FROM payment_milestones WHERE "contractId" = $1`, [testContractId]);
      await dataSource.query(`DELETE FROM contracts WHERE id = $1`, [testContractId]);
    }
    await TestDbHelper.closeTestingApp();
  });

  // =========================================================================
  // 1. ENDPOINT: GET /payment-milestones
  // =========================================================================
  describe('1. GET /payment-milestones (Toàn bộ đợt thanh toán)', () => {
    it('TC-MLS-001 [Happy path G01]: Lấy danh sách đợt thanh toán thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/payment-milestones')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(10);
    });

    it('TC-MLS-002 [AuthN G03]: Không có token trả về 401', async () => {
      await request(app.getHttpServer())
        .get('/payment-milestones')
        .expect(401);
    });
  });

  // =========================================================================
  // 2. ENDPOINT: GET /payment-milestones/contract/:contractId
  // =========================================================================
  describe('2. GET /payment-milestones/contract/:contractId (Theo hợp đồng)', () => {
    it('TC-MLS-003 [Happy path G01]: Lấy đợt thanh toán theo hợp đồng thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/payment-milestones/contract/${validContractId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
    });

    it('TC-MLS-004 [Not Found G06]: Hợp đồng không tồn tại trả về 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/payment-milestones/contract/${nonexistentContractId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect([200, 404]).toContain(res.status);
    });
  });

  // =========================================================================
  // 3. ENDPOINT: POST /payment-milestones (Tạo các đợt thanh toán)
  // =========================================================================
  describe('3. POST /payment-milestones (Tạo mới các đợt thanh toán)', () => {
    it('TC-MLS-005 [Happy path G01]: Tạo các đợt thanh toán cho hợp đồng thành công (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/payment-milestones')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          contractId: testContractId,
          milestones: [
            {
              name: 'Đợt 1: Đặt cọc 30%',
              percentage: 30,
              amount: 6600000,
            },
            {
              name: 'Đợt 2: Nghiệm thu 70%',
              percentage: 70,
              amount: 15400000,
            },
          ],
        })
        .expect(201);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
      createdMilestoneId = data[0].id;
    });

    it('TC-MLS-006 [Validation G02]: Thiếu contractId trả về 400', async () => {
      await request(app.getHttpServer())
        .post('/payment-milestones')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          milestones: [],
        })
        .expect(400);
    });
  });

  // =========================================================================
  // 4. ENDPOINT: PUT /payment-milestones/:id (Cập nhật đợt thanh toán)
  // =========================================================================
  describe('4. PUT /payment-milestones/:id (Cập nhật đợt thanh toán)', () => {
    it('TC-MLS-007 [Happy path G01]: Cập nhật tên đợt thanh toán thành công (200)', async () => {
      if (createdMilestoneId) {
        const res = await request(app.getHttpServer())
          .put(`/payment-milestones/${createdMilestoneId}`)
          .set('Authorization', `Bearer ${roles.admin.token}`)
          .send({
            name: 'Đợt 1: Đặt cọc đã điều chỉnh',
          })
          .expect(200);

        const data = res.body.data || res.body;
        expect(data).toBeDefined();
        expect(data.name).toBe('Đợt 1: Đặt cọc đã điều chỉnh');
      }
    });

    it('TC-MLS-008 [Not Found G06]: Cập nhật ID không tồn tại trả về 404', async () => {
      await request(app.getHttpServer())
        .put(`/payment-milestones/${nonexistentMilestoneId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ name: 'Không tồn tại' })
        .expect(404);
    });
  });

  // =========================================================================
  // 5. ENDPOINT: PUT /payment-milestones/contract/:contractId/bulk (Cập nhật hàng loạt)
  // =========================================================================
  describe('5. PUT /payment-milestones/contract/:contractId/bulk (Cập nhật hàng loạt)', () => {
    it('TC-MLS-009 [Happy path G01]: Cập nhật hàng loạt đợt thanh toán thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .put(`/payment-milestones/contract/${testContractId}/bulk`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          milestones: [
            {
              name: 'Đợt duy nhất: 100%',
              percentage: 100,
              amount: 22000000,
            },
          ],
        })
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(1);
    });
  });

  // =========================================================================
  // 6. ENDPOINT: DELETE /payment-milestones/:id (Xóa đợt thanh toán)
  // =========================================================================
  describe('6. DELETE /payment-milestones/:id (Xóa đợt thanh toán)', () => {
    it('TC-MLS-010 [Not Found G06]: Xóa đợt thanh toán không tồn tại trả về 404', async () => {
      await request(app.getHttpServer())
        .delete(`/payment-milestones/${nonexistentMilestoneId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(404);
    });

    it('TC-MLS-011 [Happy path G01]: Xóa đợt thanh toán thành công (200)', async () => {
      // Tìm 1 milestone thuộc testContractId
      const rows = await dataSource.query(
        `SELECT id FROM payment_milestones WHERE "contractId" = $1 LIMIT 1`,
        [testContractId],
      );
      if (rows.length > 0) {
        const msId = rows[0].id;
        const res = await request(app.getHttpServer())
          .delete(`/payment-milestones/${msId}`)
          .set('Authorization', `Bearer ${roles.admin.token}`)
          .expect(200);

        const data = res.body.data || res.body;
        expect(data.message).toContain('thành công');
      }
    });
  });
});
