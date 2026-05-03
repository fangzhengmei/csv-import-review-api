const { spawn } = require('child_process');
const path = require('path');

console.log('=== 运行 Jest 测试 ===\n');

const projectRoot = __dirname;

const jestPath = path.join(projectRoot, 'node_modules', '.bin', 'jest');

const jest = spawn('node', [
  path.join(projectRoot, 'node_modules', 'jest', 'bin', 'jest.js'),
  '--verbose',
  '--no-coverage'
], {
  cwd: projectRoot,
  env: { ...process.env, NODE_ENV: 'test' },
  shell: true
});

jest.stdout.on('data', (data) => {
  process.stdout.write(data.toString());
});

jest.stderr.on('data', (data) => {
  process.stderr.write(data.toString());
});

jest.on('close', (code) => {
  console.log(`\n=== 测试完成，退出码: ${code} ===`);
  process.exit(code);
});

jest.on('error', (error) => {
  console.error('❌ Jest 执行错误:', error.message);
  process.exit(1);
});
