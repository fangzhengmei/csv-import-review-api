const { execSync } = require('child_process');

console.log('正在安装项目依赖...');

try {
  execSync('npm install', { stdio: 'inherit', cwd: __dirname });
  console.log('依赖安装成功！');
} catch (error) {
  console.error('依赖安装失败:', error.message);
  process.exit(1);
}
