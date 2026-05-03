const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('=== 运行 Jest 测试 ===\n');

const projectRoot = __dirname;

try {
  console.log('执行 Jest 测试...');
  
  const jestPath = path.join(projectRoot, 'node_modules', 'jest', 'bin', 'jest.js');
  
  const output = execSync(`node "${jestPath}" --verbose`, {
    cwd: projectRoot,
    env: { ...process.env, NODE_ENV: 'test' },
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  console.log(output);
  console.log('\n✅ 测试执行完成！');
  
} catch (error) {
  console.log('\n=== 测试输出 ===\n');
  console.log(error.stdout || '');
  console.log(error.stderr || '');
  console.log(`\n❌ 测试执行失败，退出码: ${error.status || 1}`);
  process.exit(1);
}
