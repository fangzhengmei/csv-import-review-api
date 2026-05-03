const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('=== 运行 Jest 测试 ===\n');

const projectRoot = __dirname;
const outputFile = path.join(projectRoot, 'test-output.txt');
const outputStream = fs.createWriteStream(outputFile);

const jest = spawn('node', [
  path.join(projectRoot, 'node_modules', 'jest', 'bin', 'jest.js'),
  '--verbose'
], {
  cwd: projectRoot,
  env: { ...process.env, NODE_ENV: 'test' }
});

jest.stdout.on('data', (data) => {
  const str = data.toString();
  process.stdout.write(str);
  outputStream.write(str);
});

jest.stderr.on('data', (data) => {
  const str = data.toString();
  process.stderr.write(str);
  outputStream.write(str);
});

jest.on('close', (code) => {
  outputStream.end();
  console.log(`\n=== 测试完成，退出码: ${code} ===`);
  console.log(`输出已保存到: ${outputFile}`);
  process.exit(code);
});

jest.on('error', (error) => {
  console.error('❌ Jest 执行错误:', error.message);
  outputStream.end();
  process.exit(1);
});
