const request = require('supertest');
const path = require('path');
const fs = require('fs');
const { startApp } = require('../../src/app');
const { createTestCsv, deleteTestCsv, createValidCsvContent, createMixedCsvContent, testUploadsDir } = require('../setup');

describe('Import API Integration Tests', () => {
  let app;
  let testFilePath;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = await startApp();
  });

  afterEach(() => {
    if (testFilePath) {
      deleteTestCsv(testFilePath);
    }
  });

  describe('GET /health', () => {
    test('应该返回健康检查状态', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });

  describe('POST /api/imports/upload', () => {
    test('应该成功上传并预览有效的 CSV 文件', async () => {
      testFilePath = createTestCsv('valid.csv', createValidCsvContent());
      
      const response = await request(app)
        .post('/api/imports/upload')
        .attach('csvFile', testFilePath);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('importId');
      expect(response.body.data).toHaveProperty('totalRows', 4);
      expect(response.body.data).toHaveProperty('validRows', 4);
      expect(response.body.data).toHaveProperty('invalidRows', 0);
    });

    test('应该成功上传包含错误行的 CSV 文件', async () => {
      testFilePath = createTestCsv('mixed.csv', createMixedCsvContent());
      
      const response = await request(app)
        .post('/api/imports/upload')
        .attach('csvFile', testFilePath);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalRows).toBe(4);
      expect(response.body.data.validRows).toBe(2);
      expect(response.body.data.invalidRows).toBe(2);
    });

    test('应该拒绝非 CSV 文件', async () => {
      testFilePath = createTestCsv('test.txt', '这不是 CSV 文件');
      
      const response = await request(app)
        .post('/api/imports/upload')
        .attach('csvFile', testFilePath);

      expect(response.status).toBe(400);
    });

    test('应该拒绝没有文件的请求', async () => {
      const response = await request(app)
        .post('/api/imports/upload');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Import Workflow', () => {
    let importId;

    beforeAll(async () => {
      testFilePath = createTestCsv('workflow.csv', createMixedCsvContent());
      const response = await request(app)
        .post('/api/imports/upload')
        .attach('csvFile', testFilePath);
      importId = response.body.data.importId;
    });

    test('应该获取导入列表', async () => {
      const response = await request(app).get('/api/imports');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('应该获取导入详情', async () => {
      const response = await request(app).get(`/api/imports/${importId}`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(importId);
      expect(response.body.data).toHaveProperty('errorCount');
      expect(response.body.data).toHaveProperty('previewCount');
    });

    test('应该获取预览行', async () => {
      const response = await request(app).get(`/api/imports/${importId}/preview`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('rows');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.rows.length).toBeGreaterThan(0);
    });

    test('应该获取错误行', async () => {
      const response = await request(app).get(`/api/imports/${importId}/errors`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('rows');
      expect(response.body.data).toHaveProperty('pagination');
    });

    test('应该提交审核', async () => {
      const response = await request(app).post(`/api/imports/${importId}/submit`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('reviewing');
    });

    test('应该通过审核', async () => {
      const response = await request(app).post(`/api/imports/${importId}/approve`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('approved');
    });

    test('应该确认导入', async () => {
      const response = await request(app).post(`/api/imports/${importId}/confirm`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('imported');
      expect(response.body.data).toHaveProperty('importedRows');
    });
  });

  describe('Status Flow Validation', () => {
    let importId;

    beforeEach(async () => {
      testFilePath = createTestCsv('flow.csv', createValidCsvContent());
      const response = await request(app)
        .post('/api/imports/upload')
        .attach('csvFile', testFilePath);
      importId = response.body.data.importId;
    });

    test('不能直接通过还没提交的导入', async () => {
      const response = await request(app).post(`/api/imports/${importId}/approve`);
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('不能直接确认还没通过的导入', async () => {
      const response = await request(app).post(`/api/imports/${importId}/confirm`);
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('提交后可以拒绝', async () => {
      await request(app).post(`/api/imports/${importId}/submit`);
      const response = await request(app)
        .post(`/api/imports/${importId}/reject`)
        .send({ reason: '数据质量不达标' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('rejected');
    });

    test('可以取消导入', async () => {
      const response = await request(app).delete(`/api/imports/${importId}`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const detailResponse = await request(app).get(`/api/imports/${importId}`);
      expect(detailResponse.status).toBe(404);
    });
  });

  describe('Pagination', () => {
    let importId;

    beforeAll(async () => {
      let largeCsvContent = 'name,email,phone\n';
      for (let i = 1; i <= 25; i++) {
        largeCsvContent += `用户${i},user${i}@example.com,1380000000${i}\n`;
      }
      testFilePath = createTestCsv('large.csv', largeCsvContent);
      const response = await request(app)
        .post('/api/imports/upload')
        .attach('csvFile', testFilePath);
      importId = response.body.data.importId;
    });

    test('应该支持分页获取预览行', async () => {
      const response1 = await request(app).get(`/api/imports/${importId}/preview?page=1&pageSize=10`);
      expect(response1.body.data.pagination.page).toBe(1);
      expect(response1.body.data.pagination.pageSize).toBe(10);
      expect(response1.body.data.pagination.total).toBe(25);
      expect(response1.body.data.pagination.totalPages).toBe(3);
      expect(response1.body.data.rows.length).toBe(10);

      const response2 = await request(app).get(`/api/imports/${importId}/preview?page=2&pageSize=10`);
      expect(response2.body.data.pagination.page).toBe(2);
      expect(response2.body.data.rows.length).toBe(10);

      const response3 = await request(app).get(`/api/imports/${importId}/preview?page=3&pageSize=10`);
      expect(response3.body.data.pagination.page).toBe(3);
      expect(response3.body.data.rows.length).toBe(5);
    });
  });
});
