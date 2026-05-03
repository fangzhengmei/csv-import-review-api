const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== 安装 better-sqlite3 ===\n');

const projectRoot = __dirname;

try {
  console.log('安装 better-sqlite3...');
  execSync('npm install better-sqlite3 --save', { 
    stdio: 'inherit',
    cwd: projectRoot
  });
  
  const betterSqlitePath = path.join(projectRoot, 'node_modules', 'better-sqlite3');
  if (fs.existsSync(betterSqlitePath)) {
    console.log('\n✅ better-sqlite3 安装成功！');
    
    const bindingPath = path.join(betterSqlitePath, 'build', 'Release', 'better_sqlite3.node');
    if (fs.existsSync(bindingPath)) {
      console.log('✅ 二进制绑定文件已找到');
    } else {
      console.log('⚠️  二进制绑定文件未找到，可能需要重新构建');
    }
  } else {
    console.log('\n❌ better-sqlite3 安装失败');
    process.exit(1);
  }
  
} catch (error) {
  console.error('\n❌ 安装失败:');
  console.error(error.message);
  process.exit(1);
}
