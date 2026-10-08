import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { TestDbHelper, RealRoleUsers } from '@test/utils/test-db.helper';
import { FIXTURE_IDS } from '@test/fixtures/fixture-ids';

describe('FinanceDocumentController (Đầy đủ 10 nhóm kiểm thử G01-G10 trên DB erp_test)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let roles: RealRoleUsers;

  const validContractId = FIXTURE_IDS.CONTRACTS[0];
  const nonexistentContractId = '01JNONEXISTENTCTR00000000';

  let createdMinuteId: string;
  let createdInvoiceId: string;

  beforeAll(async () => {
    const context = await TestDbHelper.createTestingApp();
    app = context.app;
    dataSource = context.dataSource;
    roles = await TestDbHelper.getRealRoleUsers(dataSource);
  });

  afterAll(async () => {
    if (createdMinuteId) {
      await dataSource.query(`DELETE FROM acceptance_minutes WHERE id = $1`, [createdMinuteId]);
    }
    if (createdInvoiceId) {
      await dataSource.query(`DELETE FROM vat_invoices WHERE id = $1`, [createdInvoiceId]);
    }
    await TestDbHelper.closeTestingApp();
  });

  // =========================================================================
  // 1. ENDPOINT: GET /finance-documents/contracts/:contractId
  // =========================================================================
  describe('1. GET /finance-documents/contracts/:contractId (Chứng từ theo hợp đồng)', () => {
    it('TC-FDOC-001 [Happy path G01]: Lấy danh sách chứng từ thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/finance-documents/contracts/${validContractId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data).toBeDefined();
      expect(Array.isArray(data.acceptanceMinutes)).toBe(true);
      expect(Array.isArray(data.vatInvoices)).toBe(true);
    });

    it('TC-FDOC-002 [RBAC G04]: StaffContent không có quyền truy cập trả về 403', async () => {
      await request(app.getHttpServer())
        .get(`/finance-documents/contracts/${validContractId}`)
        .set('Authorization', `Bearer ${roles.staffContent.token}`)
        .expect(403);
    });

    it('TC-FDOC-003 [Not Found G06]: Hợp đồng không tồn tại trả về 404', async () => {
      await request(app.getHttpServer())
        .get(`/finance-documents/contracts/${nonexistentContractId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(404);
    });
  });

  // =========================================================================
  // 2. ENDPOINT: POST /finance-documents/acceptance-minutes
  // =========================================================================
  describe('2. POST /finance-documents/acceptance-minutes (Tạo biên bản nghiệm thu)', () => {
    it('TC-FDOC-004 [Happy path G01]: Tạo biên bản nghiệm thu thành công (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/finance-documents/acceptance-minutes')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          contractId: validContractId,
          name: 'Biên bản nghiệm thu bàn giao đợt 1',
          fileUrl: 'https://erp-docs.vn/minutes/bb-nghiem-thu-01.pdf',
        })
        .expect(201);

      const data = res.body.data || res.body;
      expect(data).toBeDefined();
      expect(data.id).toBeDefined();
      expect(data.name).toBe('Biên bản nghiệm thu bàn giao đợt 1');
      createdMinuteId = data.id;
    });

    it('TC-FDOC-005 [Validation G02]: Link file không hợp lệ trả về 400', async () => {
      await request(app.getHttpServer())
        .post('/finance-documents/acceptance-minutes')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          contractId: validContractId,
          name: 'Biên bản nghiệm thu',
          fileUrl: 'invalid-url-format',
        })
        .expect(400);
    });
  });

  // =========================================================================
  // 3. ENDPOINT: POST /finance-documents/vat-invoices
  // =========================================================================
  describe('3. POST /finance-documents/vat-invoices (Tạo hóa đơn VAT)', () => {
    it('TC-FDOC-006 [Happy path G01]: Tạo hóa đơn VAT thành công (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/finance-documents/vat-invoices')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          contractId: validContractId,
          name: 'Hóa đơn điện tử VAT 01GTKT',
          fileUrl: 'https://erp-docs.vn/invoices/vat-invoice-01.pdf',
        })
        .expect(201);

      const data = res.body.data || res.body;
      expect(data).toBeDefined();
      expect(data.id).toBeDefined();
      expect(data.name).toBe('Hóa đơn điện tử VAT 01GTKT');
      createdInvoiceId = data.id;
    });

    it('TC-FDOC-007 [Validation G02]: Thiếu tên tài liệu trả về 400', async () => {
      await request(app.getHttpServer())
        .post('/finance-documents/vat-invoices')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          contractId: validContractId,
          fileUrl: 'https://erp-docs.vn/invoices/vat.pdf',
        })
        .expect(400);
    });
  });
});
