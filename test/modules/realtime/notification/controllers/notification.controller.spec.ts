import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { ulid } from 'ulid';
import {
  TestDbHelper,
  RealRoleUsers,
} from '../../../../utils/test-db.helper';
import { NotificationEmitterService } from '../../../../../src/modules/realtime/notification/services/notification-emitter.service';

describe('NotificationController (e2e/integration) - Full Unit & RBAC Test Suite', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let roles: RealRoleUsers;

  let testNotificationId: string;
  const nonexistentId = '01JNONEXISTENTNOTIF00000000';

  beforeAll(async () => {
    const context = await TestDbHelper.createTestingApp();
    app = context.app;
    dataSource = context.dataSource;
    roles = await TestDbHelper.getRealRoleUsers(dataSource);

    testNotificationId = ulid();

    // 1. Tạo 1 thông báo mẫu cho admin
    await dataSource.query(
      `INSERT INTO notifications (
        id, title, content, type, "isRead", "recipientId", "senderId", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, false, $5, $6, NOW(), NOW())`,
      [
        testNotificationId,
        'Yêu cầu duyệt đề xuất mới',
        'Có một đề xuất thanh toán mới cần bạn xét duyệt.',
        'TASK_APPROVAL',
        roles.admin.userId,
        roles.staffContent.userId,
      ],
    );
  });

  afterAll(async () => {
    try {
      await dataSource.query(
        'DELETE FROM notifications WHERE id = $1',
        [testNotificationId],
      );
    } catch {
      // Ignored
    }
    await TestDbHelper.closeTestingApp();
  });

  // =========================================================================
  // 1. ENDPOINT: GET /notifications/me (Danh sách thông báo của tài khoản hiện tại)
  // =========================================================================
  describe('1. GET /notifications/me (Danh sách thông báo của tôi)', () => {
    it('TC-NOTIF-001 [Happy path G01]: Lấy danh sách thông báo thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications/me')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      const found = data.find((n: any) => n.id === testNotificationId);
      expect(found).toBeDefined();
      expect(found.title).toBe('Yêu cầu duyệt đề xuất mới');
      expect(found.isRead).toBe(false);
    });

    it('TC-NOTIF-002 [Auth G03]: 401 khi không truyền Token xác thực', async () => {
      await request(app.getHttpServer())
        .get('/notifications/me')
        .expect(401);
    });
  });

  // =========================================================================
  // 2. ENDPOINT: PUT /notifications/:id/read (Đánh dấu thông báo đã đọc)
  // =========================================================================
  describe('2. PUT /notifications/:id/read (Đánh dấu đã đọc)', () => {
    it('TC-NOTIF-003 [Happy path G01]: Đánh dấu thông báo đã đọc thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .put(`/notifications/${testNotificationId}/read`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.id).toBe(testNotificationId);
      expect(data.isRead).toBe(true);
      expect(data.readAt).toBeDefined();
    });

    it('TC-NOTIF-004 [Error G02]: 404 khi ID thông báo không tồn tại', async () => {
      await request(app.getHttpServer())
        .put(`/notifications/${nonexistentId}/read`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(404);
    });
  });

  // =========================================================================
  // 3. ENDPOINT: GET /notifications/stream (SSE Stream nhận thông báo thời gian thực)
  // =========================================================================
  describe('3. GET /notifications/stream (SSE Stream)', () => {
    it('TC-NOTIF-005 [Happy path G01]: Kết nối SSE Stream thành công (200 text/event-stream)', async () => {
      const emitter = app.get(NotificationEmitterService);
      const addConnSpy = jest.spyOn(emitter, 'addConnection').mockImplementationOnce((_channel, _userId, res: any) => {
        res.end(); // Đóng kết nối ngay lập tức sau khi flush headers để tránh open handle trong Jest
      });

      const res = await request(app.getHttpServer())
        .get('/notifications/stream')
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/event-stream');
      expect(addConnSpy).toHaveBeenCalled();
    });

    it('TC-NOTIF-006 [Auth G03]: 401 khi kết nối Stream không có Token xác thực', async () => {
      await request(app.getHttpServer())
        .get('/notifications/stream')
        .expect(401);
    });
  });
});
