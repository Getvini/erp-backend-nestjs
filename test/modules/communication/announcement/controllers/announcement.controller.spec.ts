import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { ulid } from 'ulid';
import {
  TestDbHelper,
  RealRoleUsers,
} from '../../../../utils/test-db.helper';
import {
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementScopeType,
  AnnouncementStatus,
} from '../../../../../src/modules/communication/announcement/entities/announcement.entity';

describe('AnnouncementController (e2e/integration) - Full Unit & RBAC Test Suite', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let roles: RealRoleUsers;

  let testAnnouncementId: string;
  let toDeleteAnnouncementId: string;
  let testCommentId: string;
  let createdAnnouncementId: string;
  const nonexistentId = '01JNONEXISTENTANN000000000';

  beforeAll(async () => {
    const context = await TestDbHelper.createTestingApp();
    app = context.app;
    dataSource = context.dataSource;
    roles = await TestDbHelper.getRealRoleUsers(dataSource);

    testAnnouncementId = ulid();
    toDeleteAnnouncementId = ulid();
    testCommentId = ulid();

    // 1. Tạo thông báo chính
    await dataSource.query(
      `INSERT INTO announcements (
        id, title, content, category, priority, "scopeType", status,
        "createdById", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
      [
        testAnnouncementId,
        'Thông báo lịch nghỉ lễ Quốc Khánh 2026',
        'Nội dung chi tiết về lịch nghỉ lễ và phân công trực.',
        AnnouncementCategory.GENERAL,
        AnnouncementPriority.HIGH,
        AnnouncementScopeType.ALL,
        AnnouncementStatus.SENT,
        roles.admin.userId,
      ],
    );

    // 2. Thêm recipient cho staffContent
    await dataSource.query(
      `INSERT INTO announcement_recipients (
        id, "announcementId", "recipientId", "isRead", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, false, NOW(), NOW())`,
      [ulid(), testAnnouncementId, roles.staffContent.userId],
    );

    // 3. Tạo thông báo riêng để test DELETE
    await dataSource.query(
      `INSERT INTO announcements (
        id, title, content, category, priority, "scopeType", status,
        "createdById", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
      [
        toDeleteAnnouncementId,
        'Thông báo nháp chuẩn bị xóa',
        'Nội dung nháp',
        AnnouncementCategory.GENERAL,
        AnnouncementPriority.LOW,
        AnnouncementScopeType.ALL,
        AnnouncementStatus.DRAFT,
        roles.admin.userId,
      ],
    );

    // 4. Tạo comment sẵn của StaffContent
    await dataSource.query(
      `INSERT INTO announcement_comments (
        id, "announcementId", "authorId", content, "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      [
        testCommentId,
        testAnnouncementId,
        roles.staffContent.userId,
        'Bình luận mẫu từ nhân viên Content',
      ],
    );
  });

  afterAll(async () => {
    try {
      await dataSource.query(
        'DELETE FROM announcement_comments WHERE "announcementId" IN ($1, $2)',
        [testAnnouncementId, toDeleteAnnouncementId],
      );
      await dataSource.query(
        'DELETE FROM announcement_recipients WHERE "announcementId" IN ($1, $2)',
        [testAnnouncementId, toDeleteAnnouncementId],
      );
      await dataSource.query(
        'DELETE FROM announcements WHERE id IN ($1, $2)',
        [testAnnouncementId, toDeleteAnnouncementId],
      );
      if (createdAnnouncementId) {
        await dataSource.query(
          'DELETE FROM announcements WHERE id = $1',
          [createdAnnouncementId],
        );
      }
    } catch {
      // Ignored
    }
    await TestDbHelper.closeTestingApp();
  });

  // =========================================================================
  // 1. ENDPOINT: GET /announcements (Danh sách bản tin thông báo)
  // =========================================================================
  describe('1. GET /announcements (Danh sách thông báo)', () => {
    it('TC-ANN-001 [Happy path G01]: Lấy danh sách thông báo thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/announcements')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      const found = data.find((a: any) => a.id === testAnnouncementId);
      expect(found).toBeDefined();
      expect(found.title).toBe('Thông báo lịch nghỉ lễ Quốc Khánh 2026');
      expect(found.readCount).toBeDefined();
    });

    it('TC-ANN-002 [Auth G03]: 401 khi không truyền Token xác thực', async () => {
      await request(app.getHttpServer())
        .get('/announcements')
        .expect(401);
    });
  });

  // =========================================================================
  // 2. ENDPOINT: GET /announcements/:id (Chi tiết bản tin)
  // =========================================================================
  describe('2. GET /announcements/:id (Chi tiết thông báo)', () => {
    it('TC-ANN-003 [Happy path G01]: Lấy chi tiết thông báo theo ID thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/announcements/${testAnnouncementId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.id).toBe(testAnnouncementId);
      expect(data.title).toBe('Thông báo lịch nghỉ lễ Quốc Khánh 2026');
      expect(data.isRead).toBeDefined();
    });

    it('TC-ANN-004 [Error G02]: 404 khi ID thông báo không tồn tại', async () => {
      await request(app.getHttpServer())
        .get(`/announcements/${nonexistentId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(404);
    });
  });

  // =========================================================================
  // 3. ENDPOINT: POST /announcements (Tạo bản tin mới)
  // =========================================================================
  describe('3. POST /announcements (Tạo bản tin mới)', () => {
    it('TC-ANN-005 [Happy path G01]: Tạo thông báo mới thành công (201)', async () => {
      const payload = {
        title: `Họp toàn thể công ty ${Date.now().toString().slice(-6)}`,
        content: 'Nội dung họp triển khai kế hoạch quý 4/2026',
        category: AnnouncementCategory.EVENT,
        priority: AnnouncementPriority.NORMAL,
        scopeType: AnnouncementScopeType.ALL,
        status: AnnouncementStatus.SENT,
      };

      const res = await request(app.getHttpServer())
        .post('/announcements')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(payload)
        .expect(201);

      const data = res.body.data || res.body;
      expect(data.id).toBeDefined();
      createdAnnouncementId = data.id;
      expect(data.title).toBe(payload.title);
    });

    it('TC-ANN-006 [Validation G02]: 400 khi thiếu tiêu đề hoặc nội dung', async () => {
      const payload = {
        category: AnnouncementCategory.GENERAL,
        scopeType: AnnouncementScopeType.ALL,
      };

      await request(app.getHttpServer())
        .post('/announcements')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(payload)
        .expect(400);
    });

    it('TC-ANN-007 [Business Logic G08]: 400 khi ngày kết thúc sự kiện trước ngày bắt đầu', async () => {
      const payload = {
        title: 'Sự kiện sai thời gian',
        content: 'Nội dung sự kiện',
        scopeType: AnnouncementScopeType.ALL,
        eventStartAt: '2026-10-15T09:00:00.000Z',
        eventEndAt: '2026-10-10T09:00:00.000Z',
      };

      const res = await request(app.getHttpServer())
        .post('/announcements')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(payload)
        .expect(400);

      const err = res.body;
      expect(err.message).toContain('Ngày kết thúc không được trước ngày bắt đầu');
    });
  });

  // =========================================================================
  // 4. ENDPOINT: PUT /announcements/:id (Cập nhật bản tin)
  // =========================================================================
  describe('4. PUT /announcements/:id (Cập nhật bản tin)', () => {
    it('TC-ANN-008 [Happy path G01]: Cập nhật thông báo thành công (200)', async () => {
      const payload = {
        title: 'Thông báo lịch nghỉ lễ Quốc Khánh 2026 (Đã cập nhật)',
        content: 'Nội dung chi tiết cập nhật mới',
        scopeType: AnnouncementScopeType.ALL,
        priority: AnnouncementPriority.URGENT,
      };

      const res = await request(app.getHttpServer())
        .put(`/announcements/${testAnnouncementId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(payload)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.title).toBe(payload.title);
      expect(data.priority).toBe(AnnouncementPriority.URGENT);
    });

    it('TC-ANN-009 [Error G02]: 404 khi cập nhật thông báo không tồn tại', async () => {
      const payload = {
        title: 'Không tồn tại',
        content: 'Nội dung',
        scopeType: AnnouncementScopeType.ALL,
      };

      await request(app.getHttpServer())
        .put(`/announcements/${nonexistentId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(payload)
        .expect(404);
    });
  });

  // =========================================================================
  // 5. ENDPOINT: PUT /announcements/:id/read (Đánh dấu đã đọc)
  // =========================================================================
  describe('5. PUT /announcements/:id/read (Đánh dấu đã đọc)', () => {
    it('TC-ANN-010 [Happy path G01]: Đánh dấu đã đọc thông báo thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .put(`/announcements/${testAnnouncementId}/read`)
        .set('Authorization', `Bearer ${roles.staffContent.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.success).toBe(true);
    });
  });

  // =========================================================================
  // 6. ENDPOINT: GET /announcements/:id/comments (Danh sách bình luận)
  // =========================================================================
  describe('6. GET /announcements/:id/comments (Danh sách bình luận)', () => {
    it('TC-ANN-011 [Happy path G01]: Lấy danh sách bình luận thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/announcements/${testAnnouncementId}/comments`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // 7. ENDPOINT: POST /announcements/:id/comments (Thêm bình luận mới)
  // =========================================================================
  describe('7. POST /announcements/:id/comments (Thêm bình luận)', () => {
    it('TC-ANN-012 [Happy path G01]: Thêm bình luận vào thông báo thành công (201)', async () => {
      const payload = {
        content: 'Tôi đã nắm rõ thông tin lịch nghỉ lễ!',
      };

      const res = await request(app.getHttpServer())
        .post(`/announcements/${testAnnouncementId}/comments`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(payload)
        .expect(201);

      const data = res.body.data || res.body;
      expect(data.id).toBeDefined();
      expect(data.content).toBe(payload.content);
    });

    it('TC-ANN-013 [Error G02]: 404 khi bình luận vào thông báo không tồn tại', async () => {
      await request(app.getHttpServer())
        .post(`/announcements/${nonexistentId}/comments`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ content: 'Bình luận ảo' })
        .expect(404);
    });
  });

  // =========================================================================
  // 8. ENDPOINT: DELETE /announcements/:id/comments/:commentId (Xóa bình luận)
  // =========================================================================
  describe('8. DELETE /announcements/:id/comments/:commentId (Xóa bình luận)', () => {
    it('TC-ANN-014 [RBAC G04]: 403 khi xóa bình luận của người khác', async () => {
      // testCommentId là do staffContent tạo, admin cố tình xóa hoặc user khác cố xóa
      // Trong announcement.service.ts: if (comment.authorId !== userId) throw new ForbiddenException(...)
      await request(app.getHttpServer())
        .delete(`/announcements/${testAnnouncementId}/comments/${testCommentId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(403);
    });

    it('TC-ANN-015 [Happy path G01]: Tác giả xóa bình luận của chính mình thành công (200)', async () => {
      await request(app.getHttpServer())
        .delete(`/announcements/${testAnnouncementId}/comments/${testCommentId}`)
        .set('Authorization', `Bearer ${roles.staffContent.token}`)
        .expect(200);

      // Xác minh bình luận không còn trong danh sách
      const checkRes = await request(app.getHttpServer())
        .get(`/announcements/${testAnnouncementId}/comments`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const comments = checkRes.body.data || checkRes.body;
      const found = comments.find((c: any) => c.id === testCommentId);
      expect(found).toBeUndefined();
    });

    it('TC-ANN-016 [Error G02]: 404 khi xóa bình luận không tồn tại', async () => {
      await request(app.getHttpServer())
        .delete(`/announcements/${testAnnouncementId}/comments/${nonexistentId}`)
        .set('Authorization', `Bearer ${roles.staffContent.token}`)
        .expect(404);
    });
  });

  // =========================================================================
  // 9. ENDPOINT: DELETE /announcements/:id (Xóa bản tin thông báo)
  // =========================================================================
  describe('9. DELETE /announcements/:id (Xóa thông báo)', () => {
    it('TC-ANN-017 [Error G02]: 404 khi xóa thông báo không tồn tại', async () => {
      await request(app.getHttpServer())
        .delete(`/announcements/${nonexistentId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(404);
    });

    it('TC-ANN-018 [Happy path G01]: Xóa thông báo thành công (200)', async () => {
      await request(app.getHttpServer())
        .delete(`/announcements/${toDeleteAnnouncementId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      // Xác minh thông báo đã bị xóa
      await request(app.getHttpServer())
        .get(`/announcements/${toDeleteAnnouncementId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(404);
    });
  });
});
