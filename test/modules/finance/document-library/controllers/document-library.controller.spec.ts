import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { ulid } from 'ulid';
import {
  TestDbHelper,
  RealRoleUsers,
} from '../../../../utils/test-db.helper';

describe('DocumentLibraryController (e2e/integration) - Full Unit & RBAC Test Suite', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let roles: RealRoleUsers;

  let testDocId: string;
  let testVersionId: string;
  let docToDeleteId: string;
  const nonexistentId = '01JNONEXISTENTDOC0000000000';

  beforeAll(async () => {
    const context = await TestDbHelper.createTestingApp();
    app = context.app;
    dataSource = context.dataSource;
    roles = await TestDbHelper.getRealRoleUsers(dataSource);

    testDocId = ulid();
    testVersionId = ulid();
    docToDeleteId = ulid();

    // 1. Tạo document chính để test
    await dataSource.query(
      `INSERT INTO documents (
        id, "displayName", description, "fileUrl", "originalFileName",
        "fileExtension", "mimeType", "fileSizeBytes", "resourceType",
        "currentVersion", tags, "downloadCount", "uploadedById", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())`,
      [
        testDocId,
        'Hợp đồng biểu mẫu tiêu chuẩn 2026',
        'Tài liệu mẫu hướng dẫn soạn thảo hợp đồng',
        'https://storage.example.com/templates/contract-sample.docx',
        'contract-sample.docx',
        'docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        1048576,
        'raw',
        1,
        'hop-dong,bieu-mau,phap-che',
        5,
        roles.admin.id,
      ],
    );

    // 2. Tạo version liên kết
    await dataSource.query(
      `INSERT INTO document_versions (
        id, "documentId", "versionNumber", "fileUrl", "originalFileName",
        "fileExtension", "mimeType", "fileSizeBytes", "resourceType",
        "uploadedById", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
      [
        testVersionId,
        testDocId,
        1,
        'https://storage.example.com/templates/contract-sample-v1.docx',
        'contract-sample-v1.docx',
        'docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        1048576,
        'raw',
        roles.admin.id,
      ],
    );

    // 3. Tạo document riêng để test delete
    await dataSource.query(
      `INSERT INTO documents (
        id, "displayName", description, "fileUrl", "originalFileName",
        "fileExtension", "mimeType", "fileSizeBytes", "resourceType",
        "currentVersion", tags, "downloadCount", "uploadedById", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())`,
      [
        docToDeleteId,
        'Biểu mẫu nháp để xóa',
        'Mô tả tài liệu nháp',
        'https://storage.example.com/templates/draft-delete.docx',
        'draft-delete.docx',
        'docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        512000,
        'raw',
        1,
        'nhap,xoa',
        0,
        roles.admin.id,
      ],
    );
  });

  afterAll(async () => {
    try {
      await dataSource.query(
        'DELETE FROM document_versions WHERE "documentId" IN ($1, $2)',
        [testDocId, docToDeleteId],
      );
      await dataSource.query(
        'DELETE FROM documents WHERE id IN ($1, $2)',
        [testDocId, docToDeleteId],
      );
    } catch {
      // Ignored
    }
    await TestDbHelper.closeTestingApp();
  });

  // =========================================================================
  // 1. ENDPOINT: GET /document-library (Danh sách tài liệu biểu mẫu)
  // =========================================================================
  describe('1. GET /document-library (Danh sách tài liệu biểu mẫu)', () => {
    it('TC-DOCLIB-001 [Happy path G01]: Lấy danh sách tài liệu thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/document-library')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      const found = data.find((d: any) => d.id === testDocId);
      expect(found).toBeDefined();
      expect(found.displayName).toBe('Hợp đồng biểu mẫu tiêu chuẩn 2026');
      expect(found.category).toBe('document');
    });

    it('TC-DOCLIB-002 [Filter]: Lọc theo search, category, tags thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/document-library')
        .query({ search: 'tiêu chuẩn', category: 'document', tags: 'hop-dong' })
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      const found = data.find((d: any) => d.id === testDocId);
      expect(found).toBeDefined();
    });

    it('TC-DOCLIB-003 [Filter]: Lọc theo khoảng ngày fromDate, toDate (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/document-library?fromDate=2020-01-01&toDate=2030-01-01')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
    });

    it('TC-DOCLIB-004 [Filter]: Sắp xếp theo sort=mostDownloaded và sort=newest (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/document-library?sort=mostDownloaded')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
    });

    it('TC-DOCLIB-005 [Auth G03]: 401 khi không truyền Token xác thực', async () => {
      await request(app.getHttpServer())
        .get('/document-library')
        .expect(401);
    });
  });

  // =========================================================================
  // 2. ENDPOINT: GET /document-library/tags (Danh sách tất cả tags)
  // =========================================================================
  describe('2. GET /document-library/tags (Danh sách tags)', () => {
    it('TC-DOCLIB-006 [Happy path G01]: Lấy danh sách tags phân loại thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/document-library/tags')
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data).toContain('hop-dong');
      expect(data).toContain('bieu-mau');
    });
  });

  // =========================================================================
  // 3. ENDPOINT: GET /document-library/:id (Chi tiết tài liệu)
  // =========================================================================
  describe('3. GET /document-library/:id (Chi tiết tài liệu)', () => {
    it('TC-DOCLIB-007 [Happy path G01]: Lấy chi tiết tài liệu theo ID thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/document-library/${testDocId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.id).toBe(testDocId);
      expect(data.displayName).toBe('Hợp đồng biểu mẫu tiêu chuẩn 2026');
      expect(data.fileUrl).toBeDefined();
    });

    it('TC-DOCLIB-008 [Error G02]: 404 khi ID tài liệu không tồn tại', async () => {
      await request(app.getHttpServer())
        .get(`/document-library/${nonexistentId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(404);
    });
  });

  // =========================================================================
  // 4. ENDPOINT: GET /document-library/:id/download (Lấy link tải và tăng lượt tải)
  // =========================================================================
  describe('4. GET /document-library/:id/download (Tải tài liệu)', () => {
    it('TC-DOCLIB-009 [Happy path G01]: Lấy link tải tài liệu và tăng downloadCount (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/document-library/${testDocId}/download`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.downloadUrl).toBe('https://storage.example.com/templates/contract-sample.docx');

      // Xác minh downloadCount đã được tăng
      const verifyRes = await request(app.getHttpServer())
        .get(`/document-library/${testDocId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const verifyData = verifyRes.body.data || verifyRes.body;
      expect(verifyData.downloadCount).toBeGreaterThanOrEqual(6);
    });

    it('TC-DOCLIB-010 [Error G02]: 404 khi ID tải xuống không tồn tại', async () => {
      await request(app.getHttpServer())
        .get(`/document-library/${nonexistentId}/download`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(404);
    });
  });

  // =========================================================================
  // 5. ENDPOINT: GET /document-library/:id/versions (Lịch sử các phiên bản)
  // =========================================================================
  describe('5. GET /document-library/:id/versions (Danh sách phiên bản)', () => {
    it('TC-DOCLIB-011 [Happy path G01]: Lấy lịch sử các phiên bản thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/document-library/${testDocId}/versions`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(1);
      const v1 = data.find((v: any) => v.id === testVersionId);
      expect(v1).toBeDefined();
      expect(v1.versionNumber).toBe(1);
    });

    it('TC-DOCLIB-012 [Error G02]: 404 khi ID tài liệu không tồn tại', async () => {
      await request(app.getHttpServer())
        .get(`/document-library/${nonexistentId}/versions`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(404);
    });
  });

  // =========================================================================
  // 6. ENDPOINT: GET /document-library/:id/versions/:versionId/download (Tải phiên bản cụ thể)
  // =========================================================================
  describe('6. GET /document-library/:id/versions/:versionId/download (Tải phiên bản cụ thể)', () => {
    it('TC-DOCLIB-013 [Happy path G01]: Lấy link tải phiên bản cụ thể thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/document-library/${testDocId}/versions/${testVersionId}/download`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.downloadUrl).toBe('https://storage.example.com/templates/contract-sample-v1.docx');
    });

    it('TC-DOCLIB-014 [Error G02]: 404 khi versionId không tồn tại', async () => {
      await request(app.getHttpServer())
        .get(`/document-library/${testDocId}/versions/01JNONEXISTENTVER000000000/download`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(404);
    });
  });

  // =========================================================================
  // 7. ENDPOINT: PUT /document-library/:id (Cập nhật thông tin tài liệu)
  // =========================================================================
  describe('7. PUT /document-library/:id (Cập nhật thông tin tài liệu)', () => {
    it('TC-DOCLIB-015 [Happy path G01]: Admin/BOD cập nhật thông tin thành công (200)', async () => {
      const payload = {
        displayName: 'Hợp đồng biểu mẫu tiêu chuẩn 2026 (Đã cập nhật)',
        description: 'Mô tả cập nhật mới cho bộ biểu mẫu',
        tags: ['hop-dong', 'bieu-mau', 'phap-che', 'cap-nhat'],
      };

      const res = await request(app.getHttpServer())
        .put(`/document-library/${testDocId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send(payload)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.displayName).toBe(payload.displayName);
      expect(data.description).toBe(payload.description);
    });

    it('TC-DOCLIB-016 [RBAC G04]: 403 khi Staff Content thực hiện cập nhật', async () => {
      const payload = {
        displayName: 'Cố gắng sửa bởi nhân viên không có quyền',
      };

      await request(app.getHttpServer())
        .put(`/document-library/${testDocId}`)
        .set('Authorization', `Bearer ${roles.staffContent.token}`)
        .send(payload)
        .expect(403);
    });

    it('TC-DOCLIB-017 [Error G02]: 404 khi ID tài liệu không tồn tại', async () => {
      await request(app.getHttpServer())
        .put(`/document-library/${nonexistentId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .send({ displayName: 'Tên tài liệu không tồn tại' })
        .expect(404);
    });
  });

  // =========================================================================
  // 8. ENDPOINT: DELETE /document-library/:id (Xóa tài liệu)
  // =========================================================================
  describe('8. DELETE /document-library/:id (Xóa tài liệu)', () => {
    it('TC-DOCLIB-018 [RBAC G04]: 403 khi Staff Content thực hiện xóa tài liệu', async () => {
      await request(app.getHttpServer())
        .delete(`/document-library/${docToDeleteId}`)
        .set('Authorization', `Bearer ${roles.staffContent.token}`)
        .expect(403);
    });

    it('TC-DOCLIB-019 [Error G02]: 404 khi ID cần xóa không tồn tại', async () => {
      await request(app.getHttpServer())
        .delete(`/document-library/${nonexistentId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(404);
    });

    it('TC-DOCLIB-020 [Happy path G01]: Admin xóa tài liệu thành công (200)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/document-library/${docToDeleteId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(200);

      const data = res.body.data || res.body;
      expect(data.message).toContain('Xóa tài liệu thành công');

      // Xác minh không còn tìm thấy trong DB
      await request(app.getHttpServer())
        .get(`/document-library/${docToDeleteId}`)
        .set('Authorization', `Bearer ${roles.admin.token}`)
        .expect(404);
    });
  });
});
