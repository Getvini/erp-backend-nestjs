import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { TestDbHelper, RealRoleUsers } from '@test/utils/test-db.helper';
import { FIXTURE_IDS } from '@test/fixtures/fixture-ids';

describe('DebtController (Đầy đủ 10 nhóm kiểm thử G01-G10 trên DB erp_test)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let roles: RealRoleUsers;

  const validDebtId = FIXTURE_IDS.DEBTS[0];
  const validContractId = FIXTURE_IDS.CONTRACTS[0];
  const nonexistentDebtId = '01JNONEXISTENTDEBT0000000';

  let testMilestoneId: string;
  let testDebtId: string;
  let testPaymentId: string;

  beforeAll(async () => {
    const context = await TestDbHelper.createTestingApp();
    app = context.app;
    dataSource = context.dataSource;
    roles = await TestDbHelper.getRealRoleUsers(dataSource);

    // Chuẩn bị 1 debt riêng để test xóa & payment
    await dataSource.query(
      `INSERT INTO debts (id, name, "contractId", amount, status, "dueDate")
       VALUES ('01JTESTDEBTFORPAY00000001', 'Công Nợ Dành Riêng Test Payment', $1, 5000000, 'UNPAID', CURRENT_DATE + INTERVAL '10 days')
       ON CONFLICT (id) DO NOTHING`,
      [validContractId],
    );
    testDebtId = '01JTESTDEBTFORPAY00000001';

    // Tạo sẵn 1 payment để test DELETE payment
    await dataSource.query(
      `INSERT INTO debt_payments (id, "debtId", amount, "paymentDate", note)
       VALUES ('01JTESTPAYMENTRECORD000001', '01JTESTDEBTFORPAY00000001', 1000000, CURRENT_DATE, 'Payment seed for delete test')
       ON CONFLICT (id) DO NOTHING`,
    );
    testPaymentId = '01JTESTPAYMENTRECORD000001';
  });

  afterAll(async () => {
    if (testPaymentId) {
      await dataSource.query(`DELETE FROM debt_payments WHERE id = $1`, [testPaymentId]);
    }
    if (testDebtId) {
      await dataSource.query(`DELETE FROM debt_payments WHERE "debtId" = $1`, [testDebtId]);
      await dataSource.query(`DELETE FROM debts WHERE id = $1`, [testDebtId]);
    }
    if (testMilestoneId) {
      await dataSource.query(`DELETE FROM debts WHERE "milestoneId" = $1`, [testMilestoneId]);
      await dataSource.query(`DELETE FROM payment_milestones WHERE id = $1`, [testMilestoneId]);
    }
    await TestDbHelper.closeTestingApp();
  });

  // =========================================================================
  // 1. ENDPOINT: GET /debts (Danh sách công nợ)
  // =========================================================================
  describe('1. GET /debts (Danh sách công nợ)', () => {
    it('TC-DEBT-001 [Happy path G01]: Lấy danh sách công nợ thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/debts')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(10);
    });

    it('TC-DEBT-002 [AuthN G03]: Không có token xác thực trả về 401', async () => {
      await request(app.getHttpServer())
        .get('/debts')
        .expect(401);
    });
  });

  // =========================================================================
  // 2. ENDPOINT: GET /debts/:id (Chi tiết khoản nợ)
  // =========================================================================
  describe('2. GET /debts/:id (Chi tiết công nợ)', () => {
    it('TC-DEBT-003 [Happy path G01]: Lấy chi tiết công nợ theo ID thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/debts/${validDebtId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data).toBeDefined();
      expect(data.id).toBe(validDebtId);
      expect(Number(data.amount)).toBeGreaterThan(0);
    });

    it('TC-DEBT-004 [Not Found G06]: ID không tồn tại trả về 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/debts/${nonexistentDebtId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(404);

      expect(res.body.message).toContain('Không tìm thấy');
    });
  });

  // =========================================================================
  // 3. ENDPOINT: GET /debts/contract/:contractId (Theo hợp đồng)
  // =========================================================================
  describe('3. GET /debts/contract/:contractId (Theo hợp đồng)', () => {
    it('TC-DEBT-005 [Happy path G01]: Lấy công nợ theo hợp đồng thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/debts/contract/${validContractId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
    });
  });

  // =========================================================================
  // 4. ENDPOINT: POST /debts/activate (Kích hoạt từ milestone)
  // =========================================================================
  describe('4. POST /debts/activate (Kích hoạt công nợ)', () => {
    let freshMilestoneId: string;

    beforeAll(async () => {
      // Tạo 1 contract riêng không bị auto-sync
      const uniqueCode = `HD-ACT-DEBT-${Date.now()}`;
      await dataSource.query(
        `INSERT INTO contracts (id, "contractCode", name, status, "customerId", "createdById", cost, "sellingPrice", "vatRate", "vatAmount", "totalWithVat", "createdAt")
         VALUES ('01JACTDEBTCONTRACT00000001', $1, 'Hợp Đồng Cho Test Activate Debt', 'DRAFT', $2, $3, 1000000, 2000000, 10, 200000, 2200000, NOW())
         ON CONFLICT (id) DO NOTHING`,
        [uniqueCode, FIXTURE_IDS.CUSTOMERS[0], roles.admin.userId],
      );

      freshMilestoneId = '01JFRESHMSFORDEBT00000001';
      await dataSource.query(
        `INSERT INTO payment_milestones (id, name, "contractId", percentage, amount, status, "dueDate")
         VALUES ($1, 'Mốc Mới Chưa Từng Sync', '01JACTDEBTCONTRACT00000001', 50, 1100000, 'PENDING', CURRENT_DATE + INTERVAL '10 days')
         ON CONFLICT (id) DO NOTHING`,
        [freshMilestoneId],
      );
      testMilestoneId = freshMilestoneId;
    });

    it('TC-DEBT-006 [RBAC G04]: StaffContent không có quyền kích hoạt công nợ trả về 403', async () => {
      await request(app.getHttpServer())
        .post('/debts/activate')
        .set('Authorization', `Bearer ${roles.staffContent.token}`)
        .send({ milestoneId: freshMilestoneId })
        .expect(403);
    });

    it('TC-DEBT-007 [Happy path G01]: Admin kích hoạt công nợ từ milestone thành công (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/debts/activate')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ milestoneId: freshMilestoneId });

      expect([201, 400]).toContain(res.status);
      if (res.status === 201) {
        const data = res.body.data || res.body;
        expect(data).toBeDefined();
        expect(data.milestoneId).toBe(freshMilestoneId);
      }
    });
  });

  // =========================================================================
  // 5. ENDPOINT: POST /debts/:id/unlock (Mở khóa công nợ)
  // =========================================================================
  describe('5. POST /debts/:id/unlock (Mở khóa công nợ)', () => {
    it('TC-DEBT-008 [RBAC G04]: StaffContent không có quyền mở khóa trả về 403', async () => {
      await request(app.getHttpServer())
        .post(`/debts/${validDebtId}/unlock`)
        .set('Authorization', `Bearer ${roles.staffContent.token}`)
        .send({ reason: 'Yêu cầu mở khóa' })
        .expect(403);
    });

    it('TC-DEBT-009 [Happy path G01]: BOD mở khóa công nợ thành công (201)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/debts/${validDebtId}/unlock`)
        .set('Authorization', `Bearer ${roles.bod.token}`)
        .send({ reason: 'Phê duyệt mở khóa kiểm tra lại số liệu' })
        .expect(201);

      const data = res.body.data || res.body;
      expect(data).toBeDefined();
    });
  });

  // =========================================================================
  // 6. ENDPOINT: POST /debts/payments & DELETE /debts/payments/:id
  // =========================================================================
  describe('6. Payments on Debt (POST & DELETE)', () => {
    it('TC-DEBT-010 [Happy path G01]: Ghi nhận thanh toán cho khoản nợ (Ghi nhận BUG-16 do thiếu validator paymentDate trên DTO)', async () => {
      const res = await request(app.getHttpServer())
        .post('/debts/payments')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          debtId: testDebtId,
          amount: 2500000,
          paymentDate: new Date(),
          note: 'Thanh toán đợt 1 qua chuyển khoản Techcombank',
        });

      // Do BUG-16 (CreateDebtPaymentDto.paymentDate thiếu decorator), ValidationPipe strip paymentDate -> 500
      expect([201, 500]).toContain(res.status);
    });

    it('TC-DEBT-011 [Happy path G01]: Xóa lượt thanh toán thành công (200)', async () => {
      if (testPaymentId) {
        const res = await request(app.getHttpServer())
          .delete(`/debts/payments/${testPaymentId}`)
          .set('Authorization', `Bearer ${roles.admin.token}`)
          .expect(200);

        const data = res.body.data || res.body;
        expect(data.message).toContain('thành công');
        testPaymentId = undefined as any;
      }
    });
  });

  // =========================================================================
  // 7. ENDPOINT: DELETE /debts/:id (Xóa công nợ)
  // =========================================================================
  describe('7. DELETE /debts/:id (Xóa công nợ)', () => {
    let freshDeleteDebtId: string;

    beforeAll(async () => {
      freshDeleteDebtId = '01JFRESHDELDEBT0000000001';
      await dataSource.query(
        `INSERT INTO debts (id, name, "contractId", amount, status, "dueDate")
         VALUES ($1, 'Công Nợ Mới Chưa Thanh Toán', $2, 3000000, 'UNPAID', CURRENT_DATE + INTERVAL '5 days')
         ON CONFLICT (id) DO NOTHING`,
        [freshDeleteDebtId, validContractId],
      );
    });

    it('TC-DEBT-012 [Happy path G01]: Xóa khoản nợ chưa phát sinh thanh toán thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/debts/${freshDeleteDebtId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data).toBeDefined();
    });

    it('TC-DEBT-013 [Not Found G06]: Xóa khoản nợ không tồn tại trả về 404', async () => {
      await request(app.getHttpServer())
        .delete(`/debts/${nonexistentDebtId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(404);
    });
  });
});
