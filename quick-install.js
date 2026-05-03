const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== 快速安装依赖 ===\n');

const projectRoot = __dirname;

const packages = [
  'express@^4.18.2',
  'better-sqlite3@^11.0.0',
  'csv-parser@^3.0.0',
  'multer@^1.4.5-lts.1',
  'uuid@^9.0.0'
];

const devPackages = [
  'jest@^29.7.0',
  'supertest@^6.3.3',
  'nodemon@^3.0.1'
];

try {
  console.log('1. 安装生产依赖...');
  for (const pkg of packages) {
    console.log(`   安装 ${pkg}...`);
    execSync(`npm install ${pkg} --save`, { 
      stdio: 'inherit',
      cwd: projectRoot
    });
  }
  
  console.log('\n2. 安装开发依赖...');
  for (const pkg of devPackages) {
    console.log(`   安装 ${pkg} --save-dev...`);
    execSync(`npm install ${pkg} --save-dev`, { 
      stdio: 'inherit',
      cwd: projectRoot
    });
  }
  
  console.log('\n✅ 所有依赖安装完成！');
  
  console.log('\n3. 验证安装...');
  const nodeModules = path.join(projectRoot, 'node_modules');
  const betterSqlite = path.join(nodeModules, 'better-sqlite3');
  const express = path.join(nodeModules, 'express');
  const jest = path.join(nodeModules, 'jest');
  
  if (fs.existsSync(betterSqlite)) {
    console.log('   ✅ better-sqlite3 已安装');
  } else {
    console.log('   ❌ better-sqlite3 未安装');
  }
  
  if (fs.existsSync(express)) {
    console.log('   ✅ express 已安装');
  } else {
    console.log('   ❌ express 未安装');
  }
  
  if (fs.existsSync(jest)) {
    console.log('   ✅ jest 已安装');
  } else {
    console.log('   ❌ jest 未安装');
  }
  
} catch (error) {
  console.error('\n❌ 安装失败:');
  console.error(error.message);
  process.exit(1);
}
