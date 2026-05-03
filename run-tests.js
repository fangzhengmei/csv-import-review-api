const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== CSV 导入审核 API 测试 ===\n');

const projectRoot = __dirname;

function checkNodeModules() {
  const nodeModulesPath = path.join(projectRoot, 'node_modules');
  return fs.existsSync(nodeModulesPath);
}

function installDependencies() {
  console.log('正在安装项目依赖...');
  try {
    execSync('npm install', { 
      stdio: ['ignore', cwd: projectRoot, timeout: 300000 });
    console.log('✅ 依赖安装成功！\n');
    return true;
  } catch (error) {
    console.error('❌ 依赖安装失败:', error.message);
    return false;
  }
}

function runJest() {
  console.log('正在运行 Jest 测试...\n');
  
  return new Promise((resolve, reject) => {
    const jest = spawn('node', [
      path.join(projectRoot, 'node_modules', 'jest', 'bin', 'jest.js'),
      '--verbose'
    ], {
      cwd: projectRoot,
      env: { ...process.env, NODE_ENV: 'test' }
    });

    jest.stdout.on('data', (data) => {
      process.stdout.write(data.toString());
    });

    jest.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });

    jest.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ 所有测试通过！');
        resolve(true);
      } else {
        console.log(`\n❌ 测试失败，退出码: ${code}`);
        resolve(false);
      }
    });

    jest.on('error', (error) => {
      console.error('❌ Jest 执行错误:', error.message);
      reject(error);
    });
  });
}

async function main() {
  try {
    if (!checkNodeModules()) {
      console.log('⚠️  node_modules 不存在，需要安装依赖...\n');
      const installed = installDependencies();
      if (!installed) {
        process.exit(1);
      }
    } else {
      console.log('✅ node_modules 已存在\n');
    }

    const testResult = await runJest();
    process.exit(testResult ? 0 : 1);
  } catch (error) {
    console.error('❌ 执行过程中出错:', error.message);
    process.exit(1);
  }
}

main();
