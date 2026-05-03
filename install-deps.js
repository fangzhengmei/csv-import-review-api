const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('正在安装项目依赖...');

const projectRoot = __dirname;

try {
  console.log('执行 npm install...');
  execSync('npm install', { 
    stdio: 'inherit',
    cwd: projectRoot
  });
  
  if (fs.existsSync(path.join(projectRoot, 'node_modules'))) {
    console.log('\n✅ 依赖安装成功！');
    console.log('node_modules 目录已创建');
  } else {
    console.log('\n⚠️  安装完成但未找到 node_modules 目录');
  }
} catch (error) {
  console.error('\n❌ 依赖安装失败:');
  console.error(error.message);
  process.exit(1);
}
