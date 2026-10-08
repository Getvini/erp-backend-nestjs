import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
  TestDbHelper,
  RealRoleUsers,
} from '../../../../utils/test-db.helper';

describe('CloudinaryController (e2e/integration) - Full Unit & Integration Test Suite', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let roles: RealRoleUsers;

  const originalCloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const originalApiKey = process.env.CLOUDINARY_API_KEY;
  const originalApiSecret = process.env.CLOUDINARY_API_SECRET;

  beforeAll(async () => {
    const context = await TestDbHelper.createTestingApp();
    app = context.app;
    dataSource = context.dataSource;
    roles = await TestDbHelper.getRealRoleUsers(dataSource);
  });

  afterAll(async () => {
    process.env.CLOUDINARY_CLOUD_NAME = originalCloudName;
    process.env.CLOUDINARY_API_KEY = originalApiKey;
    process.env.CLOUDINARY_API_SECRET = originalApiSecret;
    await app.close();
  });

  describe('1. GET /cloudinary/signature (Lấy chữ ký bảo mật tải file lên Cloudinary)', () => {
    it('TC-CLOUD-001 [Happy path G01]: Lấy chữ ký tải lên thành công khi đầy đủ cấu hình env', async () => {
      process.env.CLOUDINARY_CLOUD_NAME = 'test_cloud';
      process.env.CLOUDINARY_API_KEY = 'test_api_key_123';
      process.env.CLOUDINARY_API_SECRET = 'test_api_secret_456';

      const res = await request(app.getHttpServer())
        .get('/cloudinary/signature')
        .query({ folder: 'projects/test-folder' })
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data).toHaveProperty('signature');
      expect(data).toHaveProperty('timestamp');
      expect(data.cloud_name).toBe('test_cloud');
      expect(data.api_key).toBe('test_api_key_123');
      expect(data.folder).toContain('projects/test-folder');
    });

    it('TC-CLOUD-002 [Happy path G01]: Lấy chữ ký mặc định khi không truyền folder', async () => {
      process.env.CLOUDINARY_CLOUD_NAME = 'test_cloud';
      process.env.CLOUDINARY_API_KEY = 'test_api_key_123';
      process.env.CLOUDINARY_API_SECRET = 'test_api_secret_456';

      const res = await request(app.getHttpServer())
        .get('/cloudinary/signature')
        .set('Authorization', `Bearer ${roles.staffDesigner.token}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data).toHaveProperty('signature');
      expect(data).toHaveProperty('folder');
    });

    it('TC-CLOUD-003 [Auth G03]: 401 khi không truyền Auth token', async () => {
      const res = await request(app.getHttpServer())
        .get('/cloudinary/signature');

      expect(res.status).toBe(401);
    });

    it('TC-CLOUD-004 [Config Error G02]: 500 khi server thiếu cấu hình Cloudinary env keys', async () => {
      delete process.env.CLOUDINARY_CLOUD_NAME;
      delete process.env.CLOUDINARY_API_KEY;
      delete process.env.CLOUDINARY_API_SECRET;

      const res = await request(app.getHttpServer())
        .get('/cloudinary/signature')
        .set('Authorization', `Bearer ${roles.admin.token}`);

      expect(res.status).toBe(500);
      expect(res.body.message).toContain('Cấu hình Cloudinary');
    });
  });
});
