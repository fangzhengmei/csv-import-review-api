const CsvService = require('../../src/services/csvService');
const { createTestCsv, deleteTestCsv, createValidCsvContent, createInvalidCsvContent, createMixedCsvContent } = require('../setup');

describe('CsvService', () => {
  let testFilePath;

  afterEach(() => {
    if (testFilePath) {
      deleteTestCsv(testFilePath);
    }
  });

  describe('validateRow', () => {
    test('应该通过有效的行数据', () => {
      const validRow = {
        name: '张三',
        email: 'zhangsan@example.com',
        phone: '13800138001'
      };

      const result = CsvService.validateRow(validRow, 1);
      expect(result.valid).toBe(true);
      expect(result.message).toBeNull();
    });

    test('应该拒绝缺少必填字段的行', () => {
      const invalidRow = {
        name: '',
        email: 'zhangsan@example.com',
        phone: '13800138001'
      };

      const result = CsvService.validateRow(invalidRow, 1);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('缺少必填字段');
    });

    test('应该拒绝无效的邮箱格式', () => {
      const invalidRow = {
        name: '张三',
        email: 'invalid-email',
        phone: '13800138001'
      };

      const result = CsvService.validateRow(invalidRow, 1);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('邮箱格式不正确');
    });

    test('应该拒绝无效的电话格式', () => {
      const invalidRow = {
        name: '张三',
        email: 'zhangsan@example.com',
        phone: '123'
      };

      const result = CsvService.validateRow(invalidRow, 1);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('电话格式不正确');
    });
  });

  describe('isValidEmail', () => {
    test('应该验证有效的邮箱', () => {
      expect(CsvService.isValidEmail('test@example.com')).toBe(true);
      expect(CsvService.isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    test('应该拒绝无效的邮箱', () => {
      expect(CsvService.isValidEmail('invalid-email')).toBe(false);
      expect(CsvService.isValidEmail('missing@domain')).toBe(false);
      expect(CsvService.isValidEmail('')).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    test('应该验证有效的电话号码', () => {
      expect(CsvService.isValidPhone('13800138001')).toBe(true);
      expect(CsvService.isValidPhone('+86 138-0013-8001')).toBe(true);
      expect(CsvService.isValidPhone('(010) 12345678')).toBe(true);
    });

    test('应该拒绝无效的电话号码', () => {
      expect(CsvService.isValidPhone('123')).toBe(false);
      expect(CsvService.isValidPhone('abc')).toBe(false);
      expect(CsvService.isValidPhone('')).toBe(false);
    });
  });

  describe('parseCsv', () => {
    test('应该正确解析有效的 CSV 文件', async () => {
      testFilePath = createTestCsv('valid.csv', createValidCsvContent());
      const result = await CsvService.parseCsv(testFilePath);

      expect(result.totalRows).toBe(4);
      expect(result.validRows.length).toBe(4);
      expect(result.invalidRows.length).toBe(0);
      expect(result.validRows[0].rowData.name).toBe('张三');
    });

    test('应该应用验证器并正确分类有效和无效行', async () => {
      testFilePath = createTestCsv('mixed.csv', createMixedCsvContent());
      const result = await CsvService.parseCsv(testFilePath, CsvService.validateRow);

      expect(result.totalRows).toBe(4);
      expect(result.validRows.length).toBe(2);
      expect(result.invalidRows.length).toBe(2);
    });
  });
});
