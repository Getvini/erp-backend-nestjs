import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { ulid } from 'ulid';
import {
  TestDbHelper,
  RealRoleUsers,
} from '../../../../utils/test-db.helper';

describe('ChatRoomController (e2e/integration) - Full Unit & RBAC Test Suite', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let roles: RealRoleUsers;

  let testDmRoomId: string;
  let testGroupRoomId: string;
  const nonexistentRoomId = '01JNONEXISTENTROOM000000000';

  beforeAll(async () => {
    const context = await TestDbHelper.createTestingApp();
    app = context.app;
    dataSource = context.dataSource;
    roles = await TestDbHelper.getRealRoleUsers(dataSource);

    testDmRoomId = ulid();
    testGroupRoomId = ulid();

    // 1. Tạo phòng DM 1-1 giữa admin và staffContent
    await dataSource.query(
      `INSERT INTO chat_rooms (id, name, "isGroup", "creatorId", "createdAt", "updatedAt")
       VALUES ($1, NULL, false, $2, NOW(), NOW())`,
      [testDmRoomId, roles.admin.userId],
    );
    await dataSource.query(
      `INSERT INTO chat_participants (id, "roomId", "userId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, NOW(), NOW()),
              ($4, $2, $5, NOW(), NOW())`,
      [ulid(), testDmRoomId, roles.admin.userId, ulid(), roles.staffContent.userId],
    );

    // 2. Tạo phòng Group giữa admin và staffContent
    await dataSource.query(
      `INSERT INTO chat_rooms (id, name, "isGroup", "creatorId", "createdAt", "updatedAt")
       VALUES ($1, 'Nhóm Dự Án Kiểm Thử', true, $2, NOW(), NOW())`,
      [testGroupRoomId, roles.admin.userId],
    );
    await dataSource.query(
      `INSERT INTO chat_participants (id, "roomId", "userId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, NOW(), NOW()),
              ($4, $2, $5, NOW(), NOW())`,
      [ulid(), testGroupRoomId, roles.admin.userId, ulid(), roles.staffContent.userId],
    );

    // 3. Thêm 1 tin nhắn mẫu vào testDmRoom
    await dataSource.query(
      `INSERT INTO chat_messages (id, "roomId", "senderId", content, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'Xin chào từ kiểm thử', NOW(), NOW())`,
      [ulid(), testDmRoomId, roles.admin.userId],
    );
  });

  afterAll(async () => {
    try {
      await dataSource.query(
        'DELETE FROM chat_messages WHERE "roomId" IN ($1, $2)',
        [testDmRoomId, testGroupRoomId],
      );
      await dataSource.query(
        'DELETE FROM chat_participants WHERE "roomId" IN ($1, $2)',
        [testDmRoomId, testGroupRoomId],
      );
      await dataSource.query(
        'DELETE FROM chat_rooms WHERE id IN ($1, $2)',
        [testDmRoomId, testGroupRoomId],
      );
    } catch {
      // Ignored
    }
    await TestDbHelper.closeTestingApp();
  });

  // =========================================================================
  // 1. ENDPOINT: GET /chat-rooms (Danh sách phòng chat của người dùng)
  // =========================================================================
  describe('1. GET /chat-rooms (Danh sách phòng chat)', () => {
    it('TC-CHAT-001 [Happy path G01]: Lấy danh sách phòng chat thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/chat-rooms')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      const found = data.find((r: any) => r.id === testDmRoomId);
      expect(found).toBeDefined();
    });

    it('TC-CHAT-002 [Auth G03]: 401 khi không truyền Token xác thực', async () => {
      await request(app.getHttpServer())
        .get('/chat-rooms')
        .expect(401);
    });
  });

  // =========================================================================
  // 2. ENDPOINT: POST /chat-rooms (Tạo phòng chat mới)
  // =========================================================================
  describe('2. POST /chat-rooms (Tạo phòng chat mới)', () => {
    it('TC-CHAT-003 [Happy path G01]: Tạo cuộc trò chuyện 1-1 thành công (201)', async () => {
      const payload = {
        isGroup: false,
        recipientId: roles.pm.userId,
      };

      const res = await request(app.getHttpServer())
        .post('/chat-rooms')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(payload)
        .expect(201);

      const data = res.body.data || res.body;
      expect(data.id).toBeDefined();
      expect(data.isGroup).toBe(false);
    });

    it('TC-CHAT-004 [Happy path G01]: Tạo phòng chat nhóm thành công (201)', async () => {
      const payload = {
        isGroup: true,
        name: `Nhóm Chat Test ${Date.now().toString().slice(-5)}`,
        participantIds: [roles.staffContent.userId, roles.pm.userId],
      };

      const res = await request(app.getHttpServer())
        .post('/chat-rooms')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(payload)
        .expect(201);

      const data = res.body.data || res.body;
      expect(data.id).toBeDefined();
      expect(data.isGroup).toBe(true);
      expect(data.name).toBe(payload.name);
    });

    it('TC-CHAT-005 [Validation G02]: 400 khi tạo DM thiếu recipientId', async () => {
      await request(app.getHttpServer())
        .post('/chat-rooms')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ isGroup: false })
        .expect(400);
    });

    it('TC-CHAT-006 [Validation G02]: 400 khi tạo Group thiếu name', async () => {
      await request(app.getHttpServer())
        .post('/chat-rooms')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ isGroup: true, participantIds: [roles.pm.userId] })
        .expect(400);
    });
  });

  // =========================================================================
  // 3. ENDPOINT: POST /chat-rooms/:roomId/participants (Thêm thành viên vào phòng nhóm)
  // =========================================================================
  describe('3. POST /chat-rooms/:roomId/participants (Thêm thành viên)', () => {
    it('TC-CHAT-007 [Happy path G01]: Thêm thành viên vào phòng nhóm thành công (201)', async () => {
      const payload = {
        participantIds: [roles.bd.userId],
      };

      const res = await request(app.getHttpServer())
        .post(`/chat-rooms/${testGroupRoomId}/participants`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(payload)
        .expect(201);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      const found = data.find((p: any) => p.userId === roles.bd.userId);
      expect(found).toBeDefined();
    });

    it('TC-CHAT-008 [Error G02]: 400 khi thêm thành viên vào cuộc trò chuyện 1-1', async () => {
      await request(app.getHttpServer())
        .post(`/chat-rooms/${testDmRoomId}/participants`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ participantIds: [roles.bd.userId] })
        .expect(400);
    });

    it('TC-CHAT-009 [IDOR/RBAC G04]: 403 khi người ngoài phòng cố thêm thành viên', async () => {
      await request(app.getHttpServer())
        .post(`/chat-rooms/${testGroupRoomId}/participants`)
        .set('Authorization', `Bearer ${roles.pm.token}`)
        .send({ participantIds: [roles.bod.userId] })
        .expect(403);
    });

    it('TC-CHAT-010 [Error G02]: 404 khi roomId không tồn tại', async () => {
      await request(app.getHttpServer())
        .post(`/chat-rooms/${nonexistentRoomId}/participants`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ participantIds: [roles.bd.userId] })
        .expect(404);
    });
  });

  // =========================================================================
  // 4. ENDPOINT: GET /chat-rooms/:roomId/messages (Lấy lịch sử tin nhắn)
  // =========================================================================
  describe('4. GET /chat-rooms/:roomId/messages (Lịch sử tin nhắn)', () => {
    it('TC-CHAT-011 [Happy path G01]: Lấy tin nhắn trong phòng thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/chat-rooms/${testDmRoomId}/messages`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(1);
    });

    it('TC-CHAT-012 [IDOR/RBAC G04]: 403 khi người ngoài phòng cố lấy tin nhắn', async () => {
      await request(app.getHttpServer())
        .get(`/chat-rooms/${testDmRoomId}/messages`)
        .set('Authorization', `Bearer ${roles.pm.token}`)
        .expect(403);
    });
  });

  // =========================================================================
  // 5. ENDPOINT: POST /chat-rooms/:roomId/messages (Gửi tin nhắn vào phòng)
  // =========================================================================
  describe('5. POST /chat-rooms/:roomId/messages (Gửi tin nhắn)', () => {
    it('TC-CHAT-013 [Happy path G01]: Thành viên gửi tin nhắn thành công (201)', async () => {
      const payload = {
        content: 'Tin nhắn gửi thử nghiệm tích hợp',
      };

      const res = await request(app.getHttpServer())
        .post(`/chat-rooms/${testDmRoomId}/messages`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(payload)
        .expect(201);

      const data = res.body.data || res.body;
      expect(data.id).toBeDefined();
      expect(data.content).toBe(payload.content);
    });

    it('TC-CHAT-014 [IDOR/RBAC G04]: 403 khi người ngoài phòng cố gửi tin nhắn', async () => {
      const payload = {
        content: 'Cố tình gửi tin nhắn trái phép',
      };

      await request(app.getHttpServer())
        .post(`/chat-rooms/${testDmRoomId}/messages`)
        .set('Authorization', `Bearer ${roles.pm.token}`)
        .send(payload)
        .expect(403);
    });

    it('TC-CHAT-015 [Validation G02]: 400 khi nội dung tin nhắn rỗng', async () => {
      await request(app.getHttpServer())
        .post(`/chat-rooms/${testDmRoomId}/messages`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ content: '' })
        .expect(400);
    });
  });

  // =========================================================================
  // 6. ENDPOINT: POST /chat-rooms/:roomId/read (Đánh dấu đã đọc phòng chat)
  // =========================================================================
  describe('6. POST /chat-rooms/:roomId/read (Đánh dấu đã đọc)', () => {
    it('TC-CHAT-016 [Happy path G01]: Đánh dấu đã đọc phòng chat thành công (201)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/chat-rooms/${testDmRoomId}/read`)
        .set('Authorization', `Bearer ${roles.staffContent.token}`)
        .expect(201);

      const data = res.body.data || res.body;
      expect(data.success).toBe(true);
    });
  });
});
