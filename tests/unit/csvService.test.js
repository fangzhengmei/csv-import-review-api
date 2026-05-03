const CsvService = require('../../src/services/csvService');
const Validation = require('../../src/utils/validation');
const StatusMachine = require('../../src/utils/statusMachine');
const { createTestCsv, deleteTestCsv, testUploadsDir } = require('../setup');
const path = require('path');
const fs = require('fs');

describe('CsvService', () => {
  let testFilePath;

  afterEach(() => {
    if (testFilePath && fs.existsSync(testFilePath)) {
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

    test('应该拒绝缺少必填字段的行 - name 为空', () => {
      const invalidRow = {
        name: '',
        email: 'zhangsan@example.com',
        phone: '13800138001'
      };

      const result = CsvService.validateRow(invalidRow, 1);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('缺少必填字段');
    });

    test('应该拒绝缺少必填字段的行 - name 为 undefined', () => {
      const invalidRow = {
        email: 'zhangsan@example.com',
        phone: '13800138001'
      };

      const result = CsvService.validateRow(invalidRow, 1);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('缺少必填字段');
    });

    test('应该拒绝缺少必填字段的行 - name 为 null', () => {
      const invalidRow = {
        name: null,
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

    test('应该同时报告多个错误', () => {
      const invalidRow = {
        name: '',
        email: 'invalid-email',
        phone: '123'
      };

      const result = CsvService.validateRow(invalidRow, 1);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('缺少必填字段');
      expect(result.message).toContain('邮箱格式不正确');
      expect(result.message).toContain('电话格式不正确');
    });
  });

  describe('isValidEmail', () => {
    test('应该验证有效的邮箱', () => {
      expect(CsvService.isValidEmail('test@example.com')).toBe(true);
      expect(CsvService.isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(CsvService.isValidEmail('  test@example.com  ')).toBe(true);
    });

    test('应该拒绝无效的邮箱', () => {
      expect(CsvService.isValidEmail('invalid-email')).toBe(false);
      expect(CsvService.isValidEmail('missing@domain')).toBe(false);
      expect(CsvService.isValidEmail('')).toBe(false);
      expect(CsvService.isValidEmail(null)).toBe(false);
      expect(CsvService.isValidEmail(undefined)).toBe(false);
      expect(CsvService.isValidEmail(123)).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    test('应该验证有效的电话号码', () => {
      expect(CsvService.isValidPhone('13800138001')).toBe(true);
      expect(CsvService.isValidPhone('+86 138-0013-8001')).toBe(true);
      expect(CsvService.isValidPhone('(010) 12345678')).toBe(true);
      expect(CsvService.isValidPhone('  13800138001  ')).toBe(true);
    });

    test('应该拒绝无效的电话号码', () => {
      expect(CsvService.isValidPhone('123')).toBe(false);
      expect(CsvService.isValidPhone('abc')).toBe(false);
      expect(CsvService.isValidPhone('')).toBe(false);
      expect(CsvService.isValidPhone(null)).toBe(false);
      expect(CsvService.isValidPhone(undefined)).toBe(false);
    });
  });

  describe('validateFileExtension', () => {
    test('应该验证 .csv 文件', () => {
      expect(CsvService.validateFileExtension('data.csv')).toBe(true);
      expect(CsvService.validateFileExtension('DATA.CSV')).toBe(true);
      expect(CsvService.validateFileExtension('users.2024.csv')).toBe(true);
    });

    test('应该拒绝非 .csv 文件', () => {
      expect(CsvService.validateFileExtension('data.txt')).toBe(false);
      expect(CsvService.validateFileExtension('data.xlsx')).toBe(false);
      expect(CsvService.validateFileExtension('data')).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    test('应该验证有效的文件大小', () => {
      expect(CsvService.validateFileSize(1024)).toBe(true);
      expect(CsvService.validateFileSize(10 * 1024 * 1024)).toBe(true);
    });

    test('应该拒绝无效的文件大小', () => {
      expect(CsvService.validateFileSize(0)).toBe(false);
      expect(CsvService.validateFileSize(-1)).toBe(false);
      expect(CsvService.validateFileSize(11 * 1024 * 1024)).toBe(false);
    });
  });

  describe('parseCsv', () => {
    test('应该正确解析有效的 CSV 文件', async () => {
      const content = `name,email,phone
张三,zhangsan@example.com,13800138001
李四,lisi@example.com,13800138002`;
      
      testFilePath = createTestCsv('valid.csv', content);
      const result = await CsvService.parseCsv(testFilePath);

      expect(result.totalRows).toBe(2);
      expect(result.validRows.length).toBe(2);
      expect(result.invalidRows.length).toBe(0);
      expect(result.headers).toEqual(['name', 'email', 'phone']);
    });

    test('应该检测缺少表头字段的 CSV 文件', async () => {
      const content = `name,phone
张三,13800138001`;
      
      testFilePath = createTestCsv('missing-headers.csv', content);
      const result = await CsvService.parseCsv(
        testFilePath, 
        CsvService.validateRow.bind(CsvService),
        ['name', 'email', 'phone']
      );

      expect(result.headerError).toBeDefined();
      expect(result.headerError).toContain('缺少必要字段');
      expect(result.totalRows).toBe(0);
    });

    test('应该检测空的 CSV 文件', async () => {
      const content = ``;
      
      testFilePath = createTestCsv('empty.csv', content);
      const result = await CsvService.parseCsv(testFilePath);

      expect(result.headerError).toBeDefined();
      expect(result.totalRows).toBe(0);
    });

    test('应该应用验证器并正确分类有效和无效行', async () => {
      const content = `name,email,phone
张三,zhangsan@example.com,13800138001
,,13800138002
王五,invalid-email,
赵六,zhaoliu@example.com,13800138004`;
      
      testFilePath = createTestCsv('mixed.csv', content);
      const result = await CsvService.parseCsv(
        testFilePath, 
        CsvService.validateRow.bind(CsvService)
      );

      expect(result.totalRows).toBe(4);
      expect(result.validRows.length).toBe(2);
      expect(result.invalidRows.length).toBe(2);
    });
  });
});

describe('Validation', () => {
  describe('isValidUUID', () => {
    test('应该验证有效的 UUID', () => {
      expect(Validation.isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(Validation.isValidUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
    });

    test('应该拒绝无效的 UUID', () => {
      expect(Validation.isValidUUID('invalid-uuid')).toBe(false);
      expect(Validation.isValidUUID('')).toBe(false);
      expect(Validation.isValidUUID(null)).toBe(false);
      expect(Validation.isValidUUID(undefined)).toBe(false);
      expect(Validation.isValidUUID(123)).toBe(false);
    });
  });

  describe('sanitizePage', () => {
    test('应该返回有效的页码', () => {
      expect(Validation.sanitizePage(1)).toBe(1);
      expect(Validation.sanitizePage(10)).toBe(10);
      expect(Validation.sanitizePage('5')).toBe(5);
    });

    test('应该对无效的页码使用默认值', () => {
      expect(Validation.sanitizePage(0)).toBe(1);
      expect(Validation.sanitizePage(-1)).toBe(1);
      expect(Validation.sanitizePage('invalid')).toBe(1);
      expect(Validation.sanitizePage(null)).toBe(1);
      expect(Validation.sanitizePage(undefined)).toBe(1);
    });

    test('应该使用自定义默认值', () => {
      expect(Validation.sanitizePage(0, 5)).toBe(5);
      expect(Validation.sanitizePage(-1, 10)).toBe(10);
    });
  });

  describe('sanitizePageSize', () => {
    test('应该返回有效的分页大小', () => {
      expect(Validation.sanitizePageSize(10)).toBe(10);
      expect(Validation.sanitizePageSize(50)).toBe(50);
      expect(Validation.sanitizePageSize('20')).toBe(20);
    });

    test('应该对无效的分页大小使用默认值', () => {
      expect(Validation.sanitizePageSize(0)).toBe(20);
      expect(Validation.sanitizePageSize(-1)).toBe(20);
      expect(Validation.sanitizePageSize('invalid')).toBe(20);
    });

    test('应该限制最大分页大小', () => {
      expect(Validation.sanitizePageSize(200, 20, 100)).toBe(100);
      expect(Validation.sanitizePageSize(150, 20, 100)).toBe(100);
    });
  });
});

describe('StatusMachine', () => {
  describe('STATUS 常量', () => {
    test('应该包含所有状态常量', () => {
      expect(StatusMachine.STATUS.PENDING).toBe('pending');
      expect(StatusMachine.STATUS.PREVIEWED).toBe('previewed');
      expect(StatusMachine.STATUS.REVIEWING).toBe('reviewing');
      expect(StatusMachine.STATUS.APPROVED).toBe('approved');
      expect(StatusMachine.STATUS.REJECTED).toBe('rejected');
      expect(StatusMachine.STATUS.IMPORTED).toBe('imported');
    });
  });

  describe('canTransition', () => {
    test('应该允许有效的状态转换', () => {
      expect(StatusMachine.canTransition('pending', 'previewed')).toBe(true);
      expect(StatusMachine.canTransition('previewed', 'reviewing')).toBe(true);
      expect(StatusMachine.canTransition('reviewing', 'approved')).toBe(true);
      expect(StatusMachine.canTransition('reviewing', 'rejected')).toBe(true);
      expect(StatusMachine.canTransition('approved', 'imported')).toBe(true);
      expect(StatusMachine.canTransition('rejected', 'previewed')).toBe(true);
    });

    test('应该拒绝无效的状态转换', () => {
      expect(StatusMachine.canTransition('pending', 'reviewing')).toBe(false);
      expect(StatusMachine.canTransition('pending', 'imported')).toBe(false);
      expect(StatusMachine.canTransition('previewed', 'approved')).toBe(false);
      expect(StatusMachine.canTransition('approved', 'rejected')).toBe(false);
      expect(StatusMachine.canTransition('imported', 'previewed')).toBe(false);
    });
  });

  describe('validateTransition', () => {
    test('应该返回成功的验证结果', () => {
      const result = StatusMachine.validateTransition('pending', 'previewed');
      expect(result.valid).toBe(true);
    });

    test('应该返回失败的验证结果并包含消息', () => {
      const result = StatusMachine.validateTransition('pending', 'imported');
      expect(result.valid).toBe(false);
      expect(result.message).toBeDefined();
      expect(result.message).toContain('无法从');
    });

    test('应该拒绝无效的源状态', () => {
      const result = StatusMachine.validateTransition('invalid-status', 'previewed');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('无效的状态');
    });

    test('应该拒绝无效的目标状态', () => {
      const result = StatusMachine.validateTransition('pending', 'invalid-status');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('无效的目标状态');
    });
  });

  describe('getValidNextStatuses', () => {
    test('应该返回 pending 状态的有效转换', () => {
      const statuses = StatusMachine.getValidNextStatuses('pending');
      expect(statuses).toEqual(['previewed']);
    });

    test('应该返回 reviewing 状态的有效转换', () => {
      const statuses = StatusMachine.getValidNextStatuses('reviewing');
      expect(statuses).toContain('approved');
      expect(statuses).toContain('rejected');
      expect(statuses.length).toBe(2);
    });

    test('应该返回空数组给最终状态', () => {
      const statuses = StatusMachine.getValidNextStatuses('imported');
      expect(statuses).toEqual([]);
    });
  });

  describe('isTerminalStatus', () => {
    test('应该识别 imported 为最终状态', () => {
      expect(StatusMachine.isTerminalStatus('imported')).toBe(true);
    });

    test('应该识别其他状态为非最终状态', () => {
      expect(StatusMachine.isTerminalStatus('pending')).toBe(false);
      expect(StatusMachine.isTerminalStatus('previewed')).toBe(false);
      expect(StatusMachine.isTerminalStatus('reviewing')).toBe(false);
      expect(StatusMachine.isTerminalStatus('approved')).toBe(false);
      expect(StatusMachine.isTerminalStatus('rejected')).toBe(false);
    });
  });

  describe('isValidStatus', () => {
    test('应该验证有效的状态', () => {
      expect(StatusMachine.isValidStatus('pending')).toBe(true);
      expect(StatusMachine.isValidStatus('previewed')).toBe(true);
      expect(StatusMachine.isValidStatus('reviewing')).toBe(true);
      expect(StatusMachine.isValidStatus('approved')).toBe(true);
      expect(StatusMachine.isValidStatus('rejected')).toBe(true);
      expect(StatusMachine.isValidStatus('imported')).toBe(true);
    });

    test('应该拒绝无效的状态', () => {
      expect(StatusMachine.isValidStatus('invalid')).toBe(false);
      expect(StatusMachine.isValidStatus('')).toBe(false);
      expect(StatusMachine.isValidStatus(null)).toBe(false);
    });
  });

  describe('getAllStatuses', () => {
    test('应该返回所有状态', () => {
      const statuses = StatusMachine.getAllStatuses();
      expect(statuses).toContain('pending');
      expect(statuses).toContain('previewed');
      expect(statuses).toContain('reviewing');
      expect(statuses).toContain('approved');
      expect(statuses).toContain('rejected');
      expect(statuses).toContain('imported');
      expect(statuses.length).toBe(6);
    });
  });
});
