const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== 环境检查 ===\n');

try {
  console.log('1. 检查 Node.js 版本...');
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  console.log(`   Node.js 版本: ${nodeVersion}\n`);

  console.log('2. 检查 npm 版本...');
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log(`   npm 版本: ${npmVersion}\n`);

  console.log('3. 检查项目结构...');
  const projectRoot = __dirname;
  console.log(`   项目路径: ${projectRoot}`);
  
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    console.log('   ✅ package.json 存在');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    console.log(`   项目名称: ${packageJson.name}`);
    console.log(`   依赖数量: ${Object.keys(packageJson.dependencies || {}).length}`);
    console.log(`   开发依赖数量: ${Object.keys(packageJson.devDependencies || {}).length}\n`);
  } else {
    console.log('   ❌ package.json 不存在\n');
  }

  console.log('4. 检查 node_modules...');
  const nodeModulesPath = path.join(projectRoot, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    console.log('   ✅ node_modules 存在');
    try {
      const files = fs.readdirSync(nodeModulesPath);
      console.log(`   已安装包数量: ${files.length}\n`);
    } catch (err) {
      console.log(`   无法读取 node_modules: ${err.message}\n`);
    }
  } else {
    console.log('   ❌ node_modules 不存在，需要安装依赖\n');
  }

  console.log('=== 环境检查完成 ===');

} catch (error) {
  console.error('❌ 检查失败:', error.message);
  process.exit(1);
}
