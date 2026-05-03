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
    if (testFilePath && fs.existsSync(testFilePath)) {
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

  describe('GET /api/imports/statuses', () => {
    test('应该返回所有状态和转换规则', async () => {
      const response = await request(app).get('/api/imports/statuses');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('statuses');
      expect(response.body.data).toHaveProperty('transitions');
      expect(Array.isArray(response.body.data.statuses)).toBe(true);
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
      expect(response.body.data).toHaveProperty('headers');
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

    test('应该拒绝缺少表头的 CSV 文件', async () => {
      const invalidHeaderContent = `name,phone
张三,13800138001`;
      
      testFilePath = createTestCsv('invalid-headers.csv', invalidHeaderContent);
      
      const response = await request(app)
        .post('/api/imports/upload')
        .attach('csvFile', testFilePath);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('表头');
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

  describe('Input Validation', () => {
    test('应该拒绝无效的 importId', async () => {
      const response = await request(app).get('/api/imports/invalid-uuid');
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_ID');
    });

    test('应该对不存在的 importId 返回 404', async () => {
      const response = await request(app).get('/api/imports/550e8400-e29b-41d4-a716-446655440000');
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
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
      expect(response1.status).toBe(200);
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

    test('应该处理无效的分页参数', async () => {
      const response1 = await request(app).get(`/api/imports/${importId}/preview?page=invalid&pageSize=abc`);
      expect(response1.status).toBe(200);
      expect(response1.body.data.pagination.page).toBe(1);
      expect(response1.body.data.pagination.pageSize).toBe(20);
    });

    test('应该处理负数页码', async () => {
      const response = await request(app).get(`/api/imports/${importId}/preview?page=-1&pageSize=10`);
      expect(response.status).toBe(200);
      expect(response.body.data.pagination.page).toBe(1);
    });

    test('应该处理页码 0', async () => {
      const response = await request(app).get(`/api/imports/${importId}/preview?page=0&pageSize=10`);
      expect(response.status).toBe(200);
      expect(response.body.data.pagination.page).toBe(1);
    });

    test('应该限制最大分页大小', async () => {
      const response = await request(app).get(`/api/imports/${importId}/preview?page=1&pageSize=200`);
      expect(response.status).toBe(200);
      expect(response.body.data.pagination.pageSize).toBe(100);
    });

    test('应该对超出范围的页码返回空数据', async () => {
      const response = await request(app).get(`/api/imports/${importId}/preview?page=10&pageSize=10`);
      expect(response.status).toBe(200);
      expect(response.body.data.rows.length).toBe(0);
      expect(response.body.data.pagination.message).toContain('超出范围');
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
      expect(response.body.data).toHaveProperty('validNextStatuses');
      expect(response.body.data).toHaveProperty('isTerminal');
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
  });

  describe('Status Flow', () => {
    let importId;

    beforeEach(async () => {
      testFilePath = createTestCsv('flow.csv', createValidCsvContent());
      const response = await request(app)
        .post('/api/imports/upload')
        .attach('csvFile', testFilePath);
      importId = response.body.data.importId;
    });

    test('应该执行完整的审核流程', async () => {
      const detail1 = await request(app).get(`/api/imports/${importId}`);
      expect(detail1.body.data.status).toBe('previewed');
      expect(detail1.body.data.validNextStatuses).toContain('reviewing');

      const submitResponse = await request(app).post(`/api/imports/${importId}/submit`);
      expect(submitResponse.status).toBe(200);
      expect(submitResponse.body.data.status).toBe('reviewing');
      expect(submitResponse.body.data.validNextStatuses).toContain('approved');
      expect(submitResponse.body.data.validNextStatuses).toContain('rejected');

      const approveResponse = await request(app).post(`/api/imports/${importId}/approve`);
      expect(approveResponse.status).toBe(200);
      expect(approveResponse.body.data.status).toBe('approved');
      expect(approveResponse.body.data.validNextStatuses).toContain('imported');

      const confirmResponse = await request(app).post(`/api/imports/${importId}/confirm`);
      expect(confirmResponse.status).toBe(200);
      expect(confirmResponse.body.data.status).toBe('imported');
    });

    test('应该支持拒绝后重新预览', async () => {
      await request(app).post(`/api/imports/${importId}/submit`);

      const rejectResponse = await request(app)
        .post(`/api/imports/${importId}/reject`)
        .send({ reason: '数据质量不达标' });
      
      expect(rejectResponse.status).toBe(200);
      expect(rejectResponse.body.data.status).toBe('rejected');
      expect(rejectResponse.body.data.validNextStatuses).toContain('previewed');

      const detail = await request(app).get(`/api/imports/${importId}`);
      expect(detail.body.data.isTerminal).toBe(false);
    });

    test('不能直接通过还没提交的导入', async () => {
      const response = await request(app).post(`/api/imports/${importId}/approve`);
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_STATUS_TRANSITION');
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

    test('已导入的记录不能取消', async () => {
      await request(app).post(`/api/imports/${importId}/submit`);
      await request(app).post(`/api/imports/${importId}/approve`);
      await request(app).post(`/api/imports/${importId}/confirm`);

      const response = await request(app).delete(`/api/imports/${importId}`);
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_STATUS_TRANSITION');
    });
  });

  describe('Error Handling', () => {
    test('应该返回一致的错误格式', async () => {
      const response = await request(app).get('/api/imports/invalid-id');
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
      expect(response.body.success).toBe(false);
    });

    test('应该对不存在的资源返回 404', async () => {
      const response = await request(app).get('/api/imports/00000000-0000-0000-0000-000000000000');
      expect(response.status).toBe(404);
      expect(response.body.code).toBe('NOT_FOUND');
    });

    test('应该对无效的状态转换返回清晰的错误信息', async () => {
      testFilePath = createTestCsv('error-test.csv', createValidCsvContent());
      const uploadResponse = await request(app)
        .post('/api/imports/upload')
        .attach('csvFile', testFilePath);
      
      const invalidId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app).post(`/api/imports/${invalidId}/submit`);
      expect(response.status).toBe(404);
    });
  });
});
