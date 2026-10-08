import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
  TestDbHelper,
  RealRoleUsers,
} from '../../../../utils/test-db.helper';

describe('ChatBotController (e2e/integration) - Full Unit & Integration Test Suite', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let roles: RealRoleUsers;

  const originalN8nUrl = process.env.N8N_URL;
  const originalFetch = global.fetch;

  beforeAll(async () => {
    const context = await TestDbHelper.createTestingApp();
    app = context.app;
    dataSource = context.dataSource;
    roles = await TestDbHelper.getRealRoleUsers(dataSource);
  });

  afterAll(async () => {
    process.env.N8N_URL = originalN8nUrl;
    global.fetch = originalFetch;
    await app.close();
  });

  describe('1. POST /chat (Gửi tin nhắn cho Chatbot AI)', () => {
    it('TC-BOT-001 [Happy path G01]: Gửi tin nhắn thành công khi n8n phản hồi 200', async () => {
      process.env.N8N_URL = 'http://localhost:5678/webhook/test-chat';
      const mockAiResponse = { output: 'Xin chào, tôi là trợ lý ảo AI!' };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockAiResponse),
      } as any);

      const res = await request(app.getHttpServer())
        .post('/chat')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          message: 'Xin chào trợ lý',
          sessionId: 'session-uuid-001',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toEqual(mockAiResponse);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('TC-BOT-002 [Happy path G01]: Gửi tin nhắn không kèm sessionId vẫn thành công', async () => {
      process.env.N8N_URL = 'http://localhost:5678/webhook/test-chat';
      const mockAiResponse = { output: 'Tôi có thể giúp gì cho bạn?' };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockAiResponse),
      } as any);

      const res = await request(app.getHttpServer())
        .post('/chat')
        .set('Authorization', `Bearer ${roles.staffContent.token}`)
        .send({
          message: 'Hỏi đáp nghiệp vụ',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toEqual(mockAiResponse);
    });

    it('TC-BOT-003 [Auth G03]: 401 khi không truyền Auth token', async () => {
      const res = await request(app.getHttpServer())
        .post('/chat')
        .send({
          message: 'Khách hỏi thăm',
        });

      expect(res.status).toBe(401);
    });

    it('TC-BOT-004 [Validation G02]: 400 khi thiếu message', async () => {
      const res = await request(app.getHttpServer())
        .post('/chat')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          sessionId: 'session-uuid-001',
        });

      expect(res.status).toBe(400);
    });

    it('TC-BOT-005 [Validation G02]: 400 khi message rỗng', async () => {
      const res = await request(app.getHttpServer())
        .post('/chat')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          message: '',
        });

      expect(res.status).toBe(400);
    });

    it('TC-BOT-006 [Validation G02]: 400 khi message là null', async () => {
      const res = await request(app.getHttpServer())
        .post('/chat')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          message: null,
        });

      expect(res.status).toBe(400);
    });

    it('TC-BOT-007 [Config Error G02]: 400 khi N8N_URL chưa được cấu hình', async () => {
      delete process.env.N8N_URL;

      const res = await request(app.getHttpServer())
        .post('/chat')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          message: 'Kiểm tra config N8N',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('N8N_URL chưa được cấu hình');
    });

    it('TC-BOT-008 [External Error G02]: 400 khi máy chủ n8n bị lỗi hoặc ngắt kết nối', async () => {
      process.env.N8N_URL = 'http://localhost:5678/webhook/test-chat';

      global.fetch = jest.fn().mockRejectedValue(new Error('Network connection failed'));

      const res = await request(app.getHttpServer())
        .post('/chat')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          message: 'Kiểm tra lỗi kết nối',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Không thể kết nối với Chatbot');
    });

    it('TC-BOT-009 [External Error G02]: 400 khi máy chủ n8n trả về HTTP status 500', async () => {
      process.env.N8N_URL = 'http://localhost:5678/webhook/test-chat';

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      } as any);

      const res = await request(app.getHttpServer())
        .post('/chat')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          message: 'Kiểm tra lỗi status 500 từ N8N',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Không thể kết nối với Chatbot');
    });
  });
});
