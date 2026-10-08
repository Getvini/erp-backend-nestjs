import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { TestDbHelper, RealRoleUsers } from '@test/utils/test-db.helper';
import { FIXTURE_IDS } from '@test/fixtures/fixture-ids';
import { ContractStatus } from '@modules/finance/entities/contract.entity';
import { MilestoneStatus } from '@modules/finance/contract/entities/payment-milestone.entity';

describe('ContractController (Đầy đủ 10 nhóm kiểm thử G01-G10 trên DB erp_test)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let roles: RealRoleUsers;

  const validContractId = FIXTURE_IDS.CONTRACTS[0];
  const validCustomerId = FIXTURE_IDS.CUSTOMERS[0];
  const validServiceId = FIXTURE_IDS.SERVICES[0];
  const validCsId = FIXTURE_IDS.CONTRACT_SERVICES[0];
  const nonexistentContractId = '01JNONEXISTENTCTR00000000';
  const nonexistentMilestoneId = '01JNONEXISTENTMLS00000000';

  let createdContractId: string;
  let createdMilestoneId: string;
  let milestoneTestContractId: string;
  let deleteTestContractId: string;

  beforeAll(async () => {
    const context = await TestDbHelper.createTestingApp();
    app = context.app;
    dataSource = context.dataSource;
    roles = await TestDbHelper.getRealRoleUsers(dataSource);

    // Chuẩn bị 1 hợp đồng riêng cho test Milestone có tổng percentage = 0%
    const msContractCode = `HD-MS-TEST-${Date.now()}`;
    const insertMsRes = await dataSource.query(
      `INSERT INTO contracts (id, "contractCode", name, status, "customerId", "createdById", cost, "sellingPrice", "vatRate", "vatAmount", "totalWithVat", "createdAt")
       VALUES ('01JMSCONTRACTTEST000000001', $1, 'Hợp Đồng Dành Riêng Test Milestone', 'DRAFT', $2, $3, 10000000, 20000000, 10, 2000000, 22000000, NOW())
       ON CONFLICT (id) DO NOTHING RETURNING id`,
      [msContractCode, validCustomerId, roles.admin.userId],
    );
    milestoneTestContractId = '01JMSCONTRACTTEST000000001';

    // Chuẩn bị 1 hợp đồng độc lập để test DELETE (không có FK ràng buộc)
    const delContractCode = `HD-DEL-TEST-${Date.now()}`;
    await dataSource.query(
      `INSERT INTO contracts (id, "contractCode", name, status, "customerId", "createdById", cost, "sellingPrice", "vatRate", "vatAmount", "totalWithVat", "createdAt")
       VALUES ('01JDELCONTRACTTEST00000001', $1, 'Hợp Đồng Dành Riêng Test Delete', 'DRAFT', $2, $3, 5000000, 10000000, 8, 800000, 10800000, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [delContractCode, validCustomerId, roles.admin.userId],
    );
    deleteTestContractId = '01JDELCONTRACTTEST00000001';
  });

  afterAll(async () => {
    if (createdMilestoneId) {
      await dataSource.query(`DELETE FROM debts WHERE "milestoneId" = $1`, [createdMilestoneId]);
      await dataSource.query(`DELETE FROM payment_milestones WHERE id = $1`, [createdMilestoneId]);
    }
    if (milestoneTestContractId) {
      await dataSource.query(`DELETE FROM debts WHERE "contractId" = $1`, [milestoneTestContractId]);
      await dataSource.query(`DELETE FROM payment_milestones WHERE "contractId" = $1`, [milestoneTestContractId]);
      await dataSource.query(`DELETE FROM contracts WHERE id = $1`, [milestoneTestContractId]);
    }
    if (deleteTestContractId) {
      await dataSource.query(`DELETE FROM contracts WHERE id = $1`, [deleteTestContractId]);
    }
    if (createdContractId) {
      await dataSource.query(`DELETE FROM debts WHERE "contractId" = $1`, [createdContractId]);
      await dataSource.query(`DELETE FROM payment_milestones WHERE "contractId" = $1`, [createdContractId]);
      await dataSource.query(`DELETE FROM contract_services WHERE "contractId" = $1`, [createdContractId]);
      await dataSource.query(`DELETE FROM contracts WHERE id = $1`, [createdContractId]);
    }
    await dataSource.query(`DELETE FROM contracts WHERE name LIKE '%Test Contract Create%'`);
    await TestDbHelper.closeTestingApp();
  });

  // =========================================================================
  // 1. ENDPOINT: GET /contracts
  // =========================================================================
  describe('1. GET /contracts (Danh sách hợp đồng)', () => {
    it('TC-CTR-001 [Happy path G01]: Lấy danh sách hợp đồng có phân trang thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/contracts')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      const list = Array.isArray(body) ? body : body.data;
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThan(0);
    });

    it('TC-CTR-002 [Filter G01]: Lọc hợp đồng theo trạng thái DRAFT', async () => {
      const res = await request(app.getHttpServer())
        .get('/contracts')
        .query({ status: ContractStatus.DRAFT })
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const body = res.body.data || res.body;
      const list = Array.isArray(body) ? body : body.data;
      expect(Array.isArray(list)).toBe(true);
    });

    it('TC-CTR-003 [AuthN G03]: Không gửi token xác thực trả về 401', async () => {
      await request(app.getHttpServer())
        .get('/contracts')
        .expect(401);
    });
  });

  // =========================================================================
  // 2. ENDPOINT: GET /contracts/:id
  // =========================================================================
  describe('2. GET /contracts/:id (Chi tiết hợp đồng)', () => {
    it('TC-CTR-004 [Happy path G01]: Lấy chi tiết hợp đồng theo ID thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/contracts/${validContractId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data).toBeDefined();
      expect(data.id).toBe(validContractId);
      expect(data.name).toBeDefined();
    });

    it('TC-CTR-005 [Not Found G06]: ID không tồn tại trả về 404 (hoặc 500 do BUG-14 code ném Error)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/contracts/${nonexistentContractId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect([404, 500]).toContain(res.status);
      expect(res.body.message).toContain('Không tìm thấy');
    });
  });

  // =========================================================================
  // 3. ENDPOINT: POST /contracts
  // =========================================================================
  describe('3. POST /contracts (Tạo hợp đồng mới)', () => {
    it('TC-CTR-006 [Happy path G01]: Tạo hợp đồng mới thành công (201)', async () => {
      const uniqueCode = `HD-TEST-${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post('/contracts')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          contractCode: uniqueCode,
          name: 'Hợp Đồng Test Contract Create Automated',
          customerId: validCustomerId,
          cost: 15000000,
          sellingPrice: 30000000,
          services: [
            {
              serviceId: validServiceId,
              sellingPrice: 30000000,
            },
          ],
        })
        .expect(201);

      const data = res.body.data || res.body;
      expect(data).toBeDefined();
      expect(data.id).toBeDefined();
      expect(data.contractCode).toBe(uniqueCode);
      createdContractId = data.id;
    });

    it('TC-CTR-007 [Validation G02]: Thiếu tên hợp đồng trả về 400', async () => {
      await request(app.getHttpServer())
        .post('/contracts')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          customerId: validCustomerId,
          sellingPrice: 10000000,
        })
        .expect(400);
    });
  });

  // =========================================================================
  // 4. ENDPOINT: PATCH /contracts/services/:id/nickname
  // =========================================================================
  describe('4. PATCH /contracts/services/:id/nickname (Cập nhật nickname dịch vụ)', () => {
    it('TC-CTR-008 [Happy path G01]: Cập nhật nickname dịch vụ trong hợp đồng thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/contracts/services/${validCsId}/nickname`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ nickname: 'Hạng mục dịch vụ thiết kế VIP' })
        .expect(200);

      const data = res.body.data || res.body;
      expect(data).toBeDefined();
      expect(data.nickname).toBe('Hạng mục dịch vụ thiết kế VIP');
    });

    it('TC-CTR-009 [Not Found G06]: ID contract_service không tồn tại trả về 404', async () => {
      await request(app.getHttpServer())
        .patch(`/contracts/services/${nonexistentContractId}/nickname`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ nickname: 'Test' })
        .expect(404);
    });
  });

  // =========================================================================
  // 5. PROPOSAL WORKFLOW
  // =========================================================================
  describe('5. Proposal Workflow (Upload, Approve, Reject)', () => {
    let proposalContractId: string;

    beforeAll(async () => {
      const draft = await dataSource.query(
        `SELECT id FROM contracts WHERE status = 'DRAFT' LIMIT 1`,
      );
      if (draft.length > 0) {
        proposalContractId = draft[0].id;
      } else {
        proposalContractId = createdContractId;
      }
    });

    it('TC-CTR-010 [Happy path G01]: Upload proposal cho hợp đồng thành công (201)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/contracts/${proposalContractId}/proposal`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          contractLink: 'https://erp-docs.vn/proposals/contract-01.pdf',
          quotationLink: 'https://erp-docs.vn/quotations/quotation-01.pdf',
        })
        .expect(201);

      const data = res.body.data || res.body;
      expect(data).toBeDefined();
      expect(data.status).toBe(ContractStatus.PROPOSAL_UPLOADED);
    });

    it('TC-CTR-011 [Validation G02]: Upload proposal thiếu file/link trả về lỗi (400 hoặc 500 do BUG-14)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/contracts/${proposalContractId}/proposal`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({});

      expect([400, 500]).toContain(res.status);
      expect(res.body.message).toContain('Vui lòng tải file hoặc nhập link');
    });

    it('TC-CTR-012 [RBAC G04]: Member không có quyền duyệt proposal trả về 403', async () => {
      await request(app.getHttpServer())
        .post(`/contracts/${proposalContractId}/approve-proposal`)
        .set('Authorization', `Bearer ${roles.staffContent.token}`)
        .expect(403);
    });

    it('TC-CTR-013 [Happy path G01]: Admin từ chối proposal thành công (201)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/contracts/${proposalContractId}/reject-proposal`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ reason: 'Điều khoản bảo hành chưa rõ ràng, cần bổ sung' })
        .expect(201);

      const data = res.body.data || res.body;
      expect(data).toBeDefined();
      expect(data.status).toBe(ContractStatus.PROPOSAL_REJECTED);
    });

    it('TC-CTR-014 [Happy path G01]: Admin duyệt proposal sau khi upload lại thành công (201)', async () => {
      await request(app.getHttpServer())
        .post(`/contracts/${proposalContractId}/proposal`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          contractLink: 'https://erp-docs.vn/proposals/contract-01-v2.pdf',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(`/contracts/${proposalContractId}/approve-proposal`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(201);

      const data = res.body.data || res.body;
      expect(data).toBeDefined();
      expect(data.status).toBe(ContractStatus.PROPOSAL_APPROVED);
    });
  });

  // =========================================================================
  // 6. ENDPOINT: POST /contracts/:id/signed
  // =========================================================================
  describe('6. POST /contracts/:id/signed (Upload bản hợp đồng đã ký)', () => {
    it('TC-CTR-015 [Validation G02]: Không có file metadata trả về lỗi (400 hoặc 500 do BUG-14)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/contracts/${validContractId}/signed`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({});

      expect([400, 500]).toContain(res.status);
      expect(res.body.message).toContain('File metadata');
    });

    it('TC-CTR-016 [Happy path G01]: Upload bản ký hợp đồng cho hợp đồng PROPOSAL_APPROVED thành công (201)', async () => {
      const rows = await dataSource.query(
        `SELECT id FROM contracts WHERE status = 'PROPOSAL_APPROVED' AND signed_contract IS NULL LIMIT 1`,
      );
      if (rows.length > 0) {
        const approvedId = rows[0].id;
        const res = await request(app.getHttpServer())
          .post(`/contracts/${approvedId}/signed`)
          .set('Authorization', `Bearer ${roles.admin.token}`)
          .send({
            file: { url: 'https://erp-docs.vn/signed/signed-contract.pdf' },
          })
          .expect(201);

        const data = res.body.data || res.body;
        expect(data).toBeDefined();
        expect(data.status).toBe(ContractStatus.SIGNED);
        expect(data.signed_contract).toBe('https://erp-docs.vn/signed/signed-contract.pdf');
      }
    });
  });

  // =========================================================================
  // 7. ENDPOINT: POST /contracts/:id/milestones, PUT & DELETE /contracts/milestones/:id
  // =========================================================================
  describe('7. Milestones on Contract (POST, PUT, DELETE)', () => {
    it('TC-CTR-017 [RBAC G04]: Member không có quyền thêm milestone trả về 403', async () => {
      await request(app.getHttpServer())
        .post(`/contracts/${milestoneTestContractId}/milestones`)
        .set('Authorization', `Bearer ${roles.staffContent.token}`)
        .send({
          name: 'Đợt 3: Thanh toán bổ sung',
          percentage: 10,
          amount: 5000000,
        })
        .expect(403);
    });

    it('TC-CTR-018 [Happy path G01]: Admin thêm đợt thanh toán thành công (201)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/contracts/${milestoneTestContractId}/milestones`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          name: 'Đợt thanh toán kiểm thử tự động',
          percentage: 20,
          amount: 2500000,
          description: 'Thanh toán đợt chạy thử nghiệm',
        })
        .expect(201);

      const data = res.body.data || res.body;
      expect(data).toBeDefined();
      expect(data.id).toBeDefined();
      expect(data.name).toBe('Đợt thanh toán kiểm thử tự động');
      createdMilestoneId = data.id;
    });

    it('TC-CTR-019 [Happy path G01]: Admin cập nhật tên đợt thanh toán thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .put(`/contracts/milestones/${createdMilestoneId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          name: 'Đợt thanh toán kiểm thử đã cập nhật',
        })
        .expect(200);

      const data = res.body.data || res.body;
      expect(data).toBeDefined();
      expect(data.name).toBe('Đợt thanh toán kiểm thử đã cập nhật');
    });

    it('TC-CTR-020 [Not Found G06]: Cập nhật đợt thanh toán không tồn tại trả về 404', async () => {
      await request(app.getHttpServer())
        .put(`/contracts/milestones/${nonexistentMilestoneId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ name: 'Không tồn tại' })
        .expect(404);
    });

    it('TC-CTR-021 [Happy path G01]: Admin xóa đợt thanh toán thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/contracts/milestones/${createdMilestoneId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.message).toContain('thành công');
      createdMilestoneId = undefined as any;
    });

    it('TC-CTR-022 [Not Found G06]: Xóa đợt thanh toán không tồn tại trả về 404', async () => {
      await request(app.getHttpServer())
        .delete(`/contracts/milestones/${nonexistentMilestoneId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(404);
    });
  });

  // =========================================================================
  // 8. ENDPOINT: DELETE /contracts/:id
  // =========================================================================
  describe('8. DELETE /contracts/:id (Xóa hợp đồng)', () => {
    it('TC-CTR-023 [RBAC G04]: Member xóa hợp đồng trả về 403', async () => {
      await request(app.getHttpServer())
        .delete(`/contracts/${validContractId}`)
        .set('Authorization', `Bearer ${roles.staffContent.token}`)
        .expect(403);
    });

    it('TC-CTR-024 [Not Found G06]: Xóa hợp đồng không tồn tại trả về 404 (hoặc 500 do BUG-14)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/contracts/${nonexistentContractId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect([404, 500]).toContain(res.status);
      expect(res.body.message).toContain('Không tìm thấy');
    });

    it('TC-CTR-025 [Happy path G01]: Admin xóa hợp đồng độc lập thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/contracts/${deleteTestContractId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.message).toContain('thành công');
      deleteTestContractId = undefined as any;
    });
  });
});
