const fs = require('fs');
const path = require('path');

const testUploadsDir = path.join(__dirname, '../test-uploads');

beforeAll(async () => {
  if (!fs.existsSync(testUploadsDir)) {
    fs.mkdirSync(testUploadsDir, { recursive: true });
  }
});

afterAll(async () => {
  const testDbPath = path.join(__dirname, '../test.db');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  
  if (fs.existsSync(testUploadsDir)) {
    const files = fs.readdirSync(testUploadsDir);
    for (const file of files) {
      fs.unlinkSync(path.join(testUploadsDir, file));
    }
    fs.rmdirSync(testUploadsDir);
  }
});

const createTestCsv = (filename, content) => {
  const filePath = path.join(testUploadsDir, filename);
  fs.writeFileSync(filePath, content);
  return filePath;
};

const deleteTestCsv = (filePath) => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

const createValidCsvContent = () => {
  return `name,email,phone
张三,zhangsan@example.com,13800138001
李四,lisi@example.com,13800138002
王五,wangwu@example.com,13800138003
赵六,zhaoliu@example.com,13800138004
`;
};

const createInvalidCsvContent = () => {
  return `name,email,phone
张三,zhangsan@example.com,13800138001
,,13800138002
王五,invalid-email,
赵六,zhaoliu@example.com,13800138004
`;
};

const createMixedCsvContent = () => {
  return `name,email,phone
张三,zhangsan@example.com,13800138001
,,13800138002
王五,wangwu@example.com,
赵六,zhaoliu@example.com,13800138004
`;
};

module.exports = {
  createTestCsv,
  deleteTestCsv,
  createValidCsvContent,
  createInvalidCsvContent,
  createMixedCsvContent,
  testUploadsDir
};
