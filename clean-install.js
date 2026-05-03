const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== 清理并重新安装依赖 ===\n');

const projectRoot = __dirname;
const nodeModulesPath = path.join(projectRoot, 'node_modules');
const packageLockPath = path.join(projectRoot, 'package-lock.json');

try {
  console.log('1. 清理旧文件...');
  
  if (fs.existsSync(nodeModulesPath)) {
    console.log('   删除 node_modules...');
    fs.rmSync(nodeModulesPath, { recursive: true, force: true });
    console.log('   ✅ node_modules 已删除');
  }
  
  if (fs.existsSync(packageLockPath)) {
    console.log('   删除 package-lock.json...');
    fs.unlinkSync(packageLockPath);
    console.log('   ✅ package-lock.json 已删除');
  }
  
  console.log('\n2. 安装依赖...');
  execSync('npm install', { 
    stdio: 'inherit',
    cwd: projectRoot
  });
  
  console.log('\n✅ 依赖安装完成！');
  
} catch (error) {
  console.error('\n❌ 操作失败:');
  console.error(error.message);
  process.exit(1);
}
