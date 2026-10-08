import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
  TestDbHelper,
  RealRoleUsers,
} from '../../../../utils/test-db.helper';
import { VinicoinTransactionType } from '../../../../../src/modules/project/reward/entities/vinicoin-transaction.entity';

describe('VinicoinController (e2e/integration) - Full Unit & RBAC Test Suite', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let roles: RealRoleUsers;
  let targetAccountId: string;
  let initialBalance: number;
  const nonexistentAccountId = '01JNONEXISTENTACC0000000001';

  beforeAll(async () => {
    const context = await TestDbHelper.createTestingApp();
    app = context.app;
    dataSource = context.dataSource;
    roles = await TestDbHelper.getRealRoleUsers(dataSource);

    targetAccountId = roles.staffContent.id;

    // Lưu lại số dư ban đầu của target account để dọn dẹp sau test
    const [acc] = await dataSource.query(
      'SELECT vinicoin, "vinicoinTotal" FROM accounts WHERE id = $1',
      [targetAccountId],
    );
    initialBalance = acc?.vinicoin || 0;
  });

  afterAll(async () => {
    try {
      // Dọn dẹp giao dịch vinicoin test và khôi phục số dư
      await dataSource.query(
        'DELETE FROM vinicoin_transactions WHERE "accountId" = $1 AND description LIKE $2',
        [targetAccountId, '%Test adjustment%'],
      );
      await dataSource.query(
        'UPDATE accounts SET vinicoin = $1 WHERE id = $2',
        [initialBalance, targetAccountId],
      );
    } catch {
      // Ignored
    }
    await TestDbHelper.closeTestingApp();
  });

  // =========================================================================
  // 1. ENDPOINT: GET /vinicoin/balance (Xem số dư tài khoản hiện tại)
  // =========================================================================
  describe('1. GET /vinicoin/balance (Xem số dư tài khoản)', () => {
    it('TC-COIN-001 [Happy path G01]: Lấy số dư Vinicoin của chính mình thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/vinicoin/balance')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.accountId).toBe(roles.admin.id);
      expect(data.username).toBe(roles.admin.username);
      expect(typeof data.balance).toBe('number');
      expect(typeof data.totalEarned).toBe('number');
      expect(typeof data.withdrawn).toBe('number');
    });

    it('TC-COIN-002 [Auth G03]: 401 khi không truyền Token xác thực', async () => {
      await request(app.getHttpServer())
        .get('/vinicoin/balance')
        .expect(401);
    });
  });

  // =========================================================================
  // 2. ENDPOINT: GET /vinicoin/history (Lịch sử biến động của tài khoản hiện tại)
  // =========================================================================
  describe('2. GET /vinicoin/history (Lịch sử biến động cá nhân)', () => {
    it('TC-COIN-003 [Happy path G01]: Lấy lịch sử biến động Vinicoin thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/vinicoin/history')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.page).toBe(1);
    });

    it('TC-COIN-004 [Filter]: Lọc theo loại giao dịch và phân trang page=1&limit=5 (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/vinicoin/history?type=${VinicoinTransactionType.ADJUSTMENT}&page=1&limit=5`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.limit).toBe(5);
    });
  });

  // =========================================================================
  // 3. ENDPOINT: GET /vinicoin/accounts/:accountId/history (Xem lịch sử tài khoản bất kỳ)
  // =========================================================================
  describe('3. GET /vinicoin/accounts/:accountId/history (Lịch sử tài khoản bất kỳ)', () => {
    it('TC-COIN-005 [Happy path G01]: Admin/BOD xem lịch sử của tài khoản khác thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/vinicoin/accounts/${targetAccountId}/history`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });

    it('TC-COIN-006 [RBAC G04]: Staff Content bị chặn khi xem lịch sử của tài khoản khác (403)', async () => {
      await request(app.getHttpServer())
        .get(`/vinicoin/accounts/${roles.admin.id}/history`)
        .set('Authorization', `Bearer ${roles.staffContent.token}`)
        .expect(403);
    });

    it('TC-COIN-007 [Empty state]: Xem lịch sử tài khoản không có giao dịch trả về danh sách rỗng (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/vinicoin/accounts/${nonexistentAccountId}/history`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(0);
    });
  });

  // =========================================================================
  // 4. ENDPOINT: POST /vinicoin/adjust (Điều chỉnh Vinicoin thủ công)
  // =========================================================================
  describe('4. POST /vinicoin/adjust (Điều chỉnh Vinicoin thủ công)', () => {
    it('TC-COIN-008 [Happy path G01]: Admin cộng điểm Vinicoin thành công (201)', async () => {
      const payload = {
        accountId: targetAccountId,
        amount: 50,
        description: 'Test adjustment cộng 50 điểm khen thưởng',
      };

      const res = await request(app.getHttpServer())
        .post('/vinicoin/adjust')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(payload)
        .expect(201);

      const data = res.body.data || res.body;
      expect(data.success).toBe(true);
      expect(data.transaction).toBeDefined();
      expect(data.transaction.amount).toBe(50);
      expect(data.newBalance).toBeGreaterThanOrEqual(50);
    });

    it('TC-COIN-009 [Happy path G01]: Admin trừ điểm Vinicoin hợp lệ thành công (201)', async () => {
      const payload = {
        accountId: targetAccountId,
        amount: -20,
        description: 'Test adjustment trừ 20 điểm khấu trừ',
      };

      const res = await request(app.getHttpServer())
        .post('/vinicoin/adjust')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(payload)
        .expect(201);

      const data = res.body.data || res.body;
      expect(data.success).toBe(true);
      expect(data.transaction.amount).toBe(-20);
    });

    it('TC-COIN-010 [RBAC G04]: Staff Content bị chặn khi gọi điều chỉnh điểm (403)', async () => {
      const payload = {
        accountId: targetAccountId,
        amount: 100,
        description: 'Cố tình điều chỉnh trái phép',
      };

      await request(app.getHttpServer())
        .post('/vinicoin/adjust')
        .set('Authorization', `Bearer ${roles.staffContent.token}`)
        .send(payload)
        .expect(403);
    });

    it('TC-COIN-011 [Validation G02]: 400 khi số điểm điều chỉnh amount = 0', async () => {
      const payload = {
        accountId: targetAccountId,
        amount: 0,
        description: 'Điểm bằng 0',
      };

      const res = await request(app.getHttpServer())
        .post('/vinicoin/adjust')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(payload)
        .expect(400);

      const err = res.body;
      expect(err.message).toContain('Số điểm điều chỉnh phải khác 0');
    });

    it('TC-COIN-012 [Business Logic G08]: 400 khi số điểm trừ vượt quá số dư hiện có', async () => {
      const payload = {
        accountId: targetAccountId,
        amount: -999999999,
        description: 'Trừ vượt quá số dư',
      };

      const res = await request(app.getHttpServer())
        .post('/vinicoin/adjust')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(payload)
        .expect(400);

      const err = res.body;
      expect(err.message).toContain('Số dư Vinicoin không đủ để trừ');
    });

    it('TC-COIN-013 [Error G06]: 404 khi accountId không tồn tại', async () => {
      const payload = {
        accountId: nonexistentAccountId,
        amount: 10,
        description: 'Tài khoản không tồn tại',
      };

      await request(app.getHttpServer())
        .post('/vinicoin/adjust')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(payload)
        .expect(404);
    });
  });
});
