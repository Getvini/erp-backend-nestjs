import { INestApplication, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { TestDbHelper, RealRoleUsers } from '@test/utils/test-db.helper';
import { SpellingCheckService } from '@modules/project/qc/services/spelling-check.service';

describe('SpellingCheckController (Đầy đủ 10 nhóm kiểm thử G01-G10 trên DB erp_test)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let roles: RealRoleUsers;
  let spellingService: SpellingCheckService;

  beforeAll(async () => {
    const context = await TestDbHelper.createTestingApp();
    app = context.app;
    dataSource = context.dataSource;
    roles = await TestDbHelper.getRealRoleUsers(dataSource);
    spellingService = app.get<SpellingCheckService>(SpellingCheckService);
  });

  afterAll(async () => {
    await TestDbHelper.closeTestingApp();
  });

  // =========================================================================
  // 1. ENDPOINT: POST /spelling-check/sheets-from-url
  // =========================================================================
  describe('1. POST /spelling-check/sheets-from-url', () => {
    it('TC-SPC-001 [Happy path]: Lấy danh sách sheets từ URL file thành công (201)', async () => {
      const mockResult = { sheets: ['Sheet1', 'Sheet2', 'Data'] };
      const spy = jest.spyOn(spellingService, 'listSheetsFromUrl').mockResolvedValueOnce(mockResult);

      const res = await request(app.getHttpServer())
        .post('/spelling-check/sheets-from-url')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          fileUrl: 'https://storage.erp.test/sample.xlsx',
          fileName: 'sample.xlsx',
        })
        .expect(201);

      const data = res.body.data || res.body;
      expect(data).toEqual(mockResult);
      expect(spy).toHaveBeenCalledWith('https://storage.erp.test/sample.xlsx', 'sample.xlsx');
    });

    it('TC-SPC-002 [Default fileName]: Không gửi fileName thì mặc định file.xlsx', async () => {
      const mockResult = { sheets: ['Sheet1'] };
      const spy = jest.spyOn(spellingService, 'listSheetsFromUrl').mockResolvedValueOnce(mockResult);

      const res = await request(app.getHttpServer())
        .post('/spelling-check/sheets-from-url')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          fileUrl: 'https://storage.erp.test/sample.xlsx',
        })
        .expect(201);

      expect(spy).toHaveBeenCalledWith('https://storage.erp.test/sample.xlsx', 'file.xlsx');
    });

    it('TC-SPC-003 [Authentication G03]: Không có token trả về 401', async () => {
      await request(app.getHttpServer())
        .post('/spelling-check/sheets-from-url')
        .send({
          fileUrl: 'https://storage.erp.test/sample.xlsx',
        })
        .expect(401);
    });
  });

  // =========================================================================
  // 2. ENDPOINT: POST /spelling-check/start-from-url
  // =========================================================================
  describe('2. POST /spelling-check/start-from-url (Bắt đầu kiểm tra chính tả)', () => {
    it('TC-SPC-004 [Happy path]: Khởi động tác vụ kiểm tra chính tả từ URL thành công (201)', async () => {
      const mockResult = {
        job_id: 'job-spell-123456',
        status: 'queued',
        message: 'Job started successfully',
      };
      const spy = jest.spyOn(spellingService, 'startFromUrl').mockResolvedValueOnce(mockResult);

      const payload = {
        fileUrl: 'https://storage.erp.test/document.xlsx',
        fileName: 'document.xlsx',
        lang: 'vi',
        sheetNames: 'Sheet1',
        whitelist: 'Getvini,ERP',
        scenarioIds: '1,2',
        regions: 'north',
      };

      const res = await request(app.getHttpServer())
        .post('/spelling-check/start-from-url')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(payload)
        .expect(201);

      const data = res.body.data || res.body;
      expect(data).toEqual(mockResult);
      expect(spy).toHaveBeenCalledWith(
        payload.fileUrl,
        payload.fileName,
        payload.lang,
        payload.sheetNames,
        payload.whitelist,
        payload.scenarioIds,
        payload.regions,
      );
    });

    it('TC-SPC-005 [Default parameters]: Các tham số tuỳ chọn có giá trị mặc định hợp lý', async () => {
      const mockResult = { job_id: 'job-default-789', status: 'queued' };
      const spy = jest.spyOn(spellingService, 'startFromUrl').mockResolvedValueOnce(mockResult);

      const res = await request(app.getHttpServer())
        .post('/spelling-check/start-from-url')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({
          fileUrl: 'https://storage.erp.test/simple.xlsx',
        })
        .expect(201);

      expect(spy).toHaveBeenCalledWith(
        'https://storage.erp.test/simple.xlsx',
        'file.xlsx',
        'both',
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });

    it('TC-SPC-006 [Authentication G03]: Không có token trả về 401', async () => {
      await request(app.getHttpServer())
        .post('/spelling-check/start-from-url')
        .send({ fileUrl: 'https://storage.erp.test/simple.xlsx' })
        .expect(401);
    });
  });

  // =========================================================================
  // 3. ENDPOINT: GET /spelling-check/:jobId
  // =========================================================================
  describe('3. GET /spelling-check/:jobId (Lấy trạng thái kiểm tra chính tả)', () => {
    it('TC-SPC-007 [Happy path]: Lấy trạng thái tác vụ thành công (200)', async () => {
      const mockStatus = {
        job_id: 'job-123',
        status: 'completed',
        errors_found: 2,
        progress: 100,
      };
      const spy = jest.spyOn(spellingService, 'getStatus').mockResolvedValueOnce(mockStatus);

      const res = await request(app.getHttpServer())
        .get('/spelling-check/job-123')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data).toEqual(mockStatus);
      expect(spy).toHaveBeenCalledWith('job-123');
    });

    it('TC-SPC-008 [Not Found G06]: Job ID không tồn tại trả về 404', async () => {
      jest.spyOn(spellingService, 'getStatus').mockRejectedValueOnce(
        new NotFoundException('Không tìm thấy tác vụ kiểm tra chính tả'),
      );

      await request(app.getHttpServer())
        .get('/spelling-check/nonexistent-job-999')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(404);
    });

    it('TC-SPC-009 [Authentication G03]: Không có token trả về 401', async () => {
      await request(app.getHttpServer())
        .get('/spelling-check/job-123')
        .expect(401);
    });
  });

  // =========================================================================
  // 4. ENDPOINT: DELETE /spelling-check/:jobId
  // =========================================================================
  describe('4. DELETE /spelling-check/:jobId (Xóa tác vụ kiểm tra chính tả)', () => {
    it('TC-SPC-010 [Happy path]: Xóa tác vụ kiểm tra chính tả thành công (200)', async () => {
      const mockResult = { deleted: 'job-to-delete-456' };
      const spy = jest.spyOn(spellingService, 'delete').mockResolvedValueOnce(mockResult);

      const res = await request(app.getHttpServer())
        .delete('/spelling-check/job-to-delete-456')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data).toEqual(mockResult);
      expect(spy).toHaveBeenCalledWith('job-to-delete-456');
    });

    it('TC-SPC-011 [Authentication G03]: Không có token trả về 401', async () => {
      await request(app.getHttpServer())
        .delete('/spelling-check/job-123')
        .expect(401);
    });
  });
});
