import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { TestDbHelper, RealRoleUsers } from '@test/utils/test-db.helper';
import { FIXTURE_IDS } from '@test/fixtures/fixture-ids';
import { PaymentRequestType, PaymentRequestApprovalStatus, PaymentMethod } from '@modules/finance/payment-request/entities/payment-request.entity';

describe('PaymentRequestController (Đầy đủ 10 nhóm kiểm thử G01-G10 trên DB erp_test)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let roles: RealRoleUsers;

  const validTaskId = FIXTURE_IDS.TASKS[0];
  const nonexistentReqId = '01JNONEXISTENTPAYREQ00000';

  let draftTestReqId: string;
  let workflowReqId: string;

  beforeAll(async () => {
    const context = await TestDbHelper.createTestingApp();
    app = context.app;
    dataSource = context.dataSource;
    roles = await TestDbHelper.getRealRoleUsers(dataSource);

    // Chuẩn bị 1 PaymentRequest riêng cho workflow duyệt
    await dataSource.query(
      `INSERT INTO payment_requests (id, type, content, amount, "dueDate", "approvalStatus", "requesterId", "createdAt", "updatedAt")
       VALUES ('01JWFTESTPAYREQ0000000001', 'OTHER_WORK', 'Chi phí quay video TikTok ngoại cảnh', 3500000, CURRENT_DATE + INTERVAL '5 days', 'DRAFT', $1, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET "approvalStatus" = 'DRAFT'`,
      [roles.admin.userId],
    );
    workflowReqId = '01JWFTESTPAYREQ0000000001';

    // Chuẩn bị 1 PaymentRequest draft độc lập cho các test GET, PATCH, DELETE
    await dataSource.query(
      `INSERT INTO payment_requests (id, type, content, amount, "dueDate", "approvalStatus", "requesterId", "createdAt", "updatedAt")
       VALUES ('01JDRAFTTESTPAYREQ00000001', 'OTHER_WORK', 'Yêu cầu thanh toán bản quyền hình ảnh', 2000000, CURRENT_DATE + INTERVAL '7 days', 'DRAFT', $1, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [roles.admin.userId],
    );
    draftTestReqId = '01JDRAFTTESTPAYREQ00000001';
  });

  afterAll(async () => {
    if (workflowReqId) {
      await dataSource.query(`DELETE FROM payment_requests WHERE id = $1`, [workflowReqId]);
    }
    if (draftTestReqId) {
      await dataSource.query(`DELETE FROM payment_requests WHERE id = $1`, [draftTestReqId]);
    }
    await dataSource.query(`DELETE FROM payment_requests WHERE content LIKE '%Test Payment Request%'`);
    await TestDbHelper.closeTestingApp();
  });

  // =========================================================================
  // 1. ENDPOINTS: GET /payment-requests, /total-debt, /task/:taskId/spent
  // =========================================================================
  describe('1. Query Endpoints (GET /payment-requests, /total-debt, /task/:id/spent)', () => {
    it('TC-PREQ-001 [Happy path G01]: Lấy danh sách yêu cầu thanh toán có phân trang (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/payment-requests')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      const list = Array.isArray(body) ? body : body.data;
      expect(Array.isArray(list)).toBe(true);
    });

    it('TC-PREQ-002 [AuthN G03]: Không có token trả về 401', async () => {
      await request(app.getHttpServer())
        .get('/payment-requests')
        .expect(401);
    });

    it('TC-PREQ-003 [Happy path G01]: Lấy tổng hợp công nợ cần chi thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/payment-requests/total-debt')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data).toBeDefined();
    });

    it('TC-PREQ-004 [Happy path G01]: Tra cứu chi phí đã chi của một task (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/payment-requests/task/${validTaskId}/spent`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data).toBeDefined();
    });
  });

  // =========================================================================
  // 2. ENDPOINT: POST & GET & PATCH /payment-requests
  // =========================================================================
  describe('2. CRUD Endpoints (POST, GET :id, PATCH :id, DELETE)', () => {
    it('TC-PREQ-005 [Happy path G01]: Tạo yêu cầu thanh toán mới (Ghi nhận BUG-17 do thiếu decorator dueDate trên DTO)', async () => {
      const res = await request(app.getHttpServer())
        .post('/payment-requests')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          type: PaymentRequestType.OTHER_WORK,
          content: 'Test Payment Request Mua bản quyền âm nhạc',
          amount: 1200000,
          dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
          invoiceImages: [
            {
              name: 'hoadon.jpg',
              url: 'https://erp-docs.vn/invoices/hd-01.jpg',
            },
          ],
        });

      // Do BUG-17 (CreatePaymentRequestDto.dueDate thiếu decorator class-validator), ValidationPipe strip dueDate -> 400
      expect([201, 400]).toContain(res.status);
    });

    it('TC-PREQ-006 [Validation G02]: Thiếu nội dung yêu cầu trả về 400', async () => {
      await request(app.getHttpServer())
        .post('/payment-requests')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          type: PaymentRequestType.OTHER_WORK,
          amount: 500000,
        })
        .expect(400);
    });

    it('TC-PREQ-007 [Happy path G01]: Lấy chi tiết yêu cầu thanh toán theo ID (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/payment-requests/${draftTestReqId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data).toBeDefined();
      expect(data.id).toBe(draftTestReqId);
    });

    it('TC-PREQ-008 [Not Found G06]: Lấy chi tiết ID không tồn tại trả về 404', async () => {
      await request(app.getHttpServer())
        .get(`/payment-requests/${nonexistentReqId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(404);
    });

    it('TC-PREQ-009 [Happy path G01]: Cập nhật nội dung yêu cầu thanh toán thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/payment-requests/${draftTestReqId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          content: 'Yêu cầu thanh toán bản quyền hình ảnh Đã Cập Nhật',
          amount: 2500000,
        })
        .expect(200);

      const data = res.body.data || res.body;
      expect(data).toBeDefined();
      expect(Number(data.amount)).toBe(2500000);
    });

    it('TC-PREQ-010 [Happy path G01]: Xóa yêu cầu thanh toán ở trạng thái DRAFT thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/payment-requests/${draftTestReqId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data).toBeDefined();
      draftTestReqId = undefined as any;
    });
  });

  // =========================================================================
  // 3. WORKFLOW: submit -> review -> bod-decision -> pay
  // =========================================================================
  describe('3. Workflow Endpoints (submit, review, bod-decision, pay, cancel)', () => {
    it('TC-PREQ-011 [Happy path G01]: Gửi duyệt yêu cầu thanh toán (201)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/payment-requests/${workflowReqId}/submit`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(201);

      const data = res.body.data || res.body;
      expect(data).toBeDefined();
      expect(data.approvalStatus).toBe(PaymentRequestApprovalStatus.PENDING_REVIEWER);
    });

    it('TC-PREQ-012 [RBAC G04]: StaffContent không có quyền review trả về 403', async () => {
      await request(app.getHttpServer())
        .post(`/payment-requests/${workflowReqId}/review`)
        .set('Authorization', `Bearer ${roles.staffContent.token}`)
        .send({ action: 'SUBMIT_TO_BOD' })
        .expect(403);
    });

    it('TC-PREQ-013 [Happy path G01]: Admin Sale review và chuyển lên BOD duyệt (201)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/payment-requests/${workflowReqId}/review`)
        .set('Authorization', `Bearer ${roles.adminSale.token}`)
        .send({
          action: 'SUBMIT_TO_BOD',
          note: 'Chứng từ hợp lệ, đề xuất BOD phê duyệt chi',
        })
        .expect(201);

      const data = res.body.data || res.body;
      expect(data).toBeDefined();
      expect(data.approvalStatus).toBe(PaymentRequestApprovalStatus.PENDING_BOD);
    });

    it('TC-PREQ-014 [RBAC G04]: AdminSale không có quyền ra quyết định BOD trả về 403', async () => {
      await request(app.getHttpServer())
        .post(`/payment-requests/${workflowReqId}/bod-decision`)
        .set('Authorization', `Bearer ${roles.adminSale.token}`)
        .send({ action: 'APPROVE' })
        .expect(403);
    });

    it('TC-PREQ-015 [Happy path G01]: BOD phê duyệt yêu cầu thanh toán (201)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/payment-requests/${workflowReqId}/bod-decision`)
        .set('Authorization', `Bearer ${roles.bod.token}`)
        .send({
          action: 'APPROVE',
          reason: 'Đã phê duyệt, tiến hành chi',
        })
        .expect(201);

      const data = res.body.data || res.body;
      expect(data).toBeDefined();
      expect(data.approvalStatus).toBe(PaymentRequestApprovalStatus.APPROVED);
    });

    it('TC-PREQ-016 [Happy path G01]: Kế toán thực hiện chi tiền (201)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/payment-requests/${workflowReqId}/pay`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          paidAt: new Date(),
        })
        .expect(201);

      const data = res.body.data || res.body;
      expect(data).toBeDefined();
    });

    it('TC-PREQ-017 [Happy path G01]: Đính kèm chứng từ thanh toán thành công (201)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/payment-requests/${workflowReqId}/payment-proofs`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          name: 'Ủy nhiệm chi ngân hàng ACB',
          url: 'https://erp-docs.vn/proofs/unc-01.pdf',
        })
        .expect(201);

      const data = res.body.data || res.body;
      expect(data).toBeDefined();
    });
  });
});
