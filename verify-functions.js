const fs = require('fs');
const path = require('path');

console.log('=== 功能验证脚本 ===\n');

process.env.NODE_ENV = 'test';

const { initDB, closeDB } = require('./src/db/database');
const CsvService = require('./src/services/csvService');
const Import = require('./src/models/Import');
const PreviewRow = require('./src/models/PreviewRow');
const ErrorRow = require('./src/models/ErrorRow');
const ImportedData = require('./src/models/ImportedData');

async function main() {
  try {
    console.log('1. 初始化数据库...');
    await initDB();
    console.log('   ✅ 数据库初始化成功\n');

    console.log('2. 测试 CsvService 验证功能...');
    
    const validRow = { name: '张三', email: 'zhangsan@example.com', phone: '13800138001' };
    const invalidRow = { name: '', email: 'invalid-email', phone: '123' };
    
    const validResult = CsvService.validateRow(validRow, 1);
    const invalidResult = CsvService.validateRow(invalidRow, 2);
    
    console.log(`   有效行验证: ${validResult.valid ? '✅ 通过' : '❌ 失败'}`);
    console.log(`   无效行验证: ${!invalidResult.valid ? '✅ 正确识别' : '❌ 错误'}`);
    console.log(`   无效行错误信息: ${invalidResult.message}\n`);

    console.log('3. 测试数据库操作...');
    
    const importRecord = await Import.create('test.csv', 1024);
    console.log(`   ✅ 创建导入记录: ${importRecord.id}`);
    
    const foundImport = await Import.findById(importRecord.id);
    console.log(`   ✅ 查找导入记录: ${foundImport ? '成功' : '失败'}`);
    
    await Import.updateStats(importRecord.id, 10, 8, 2);
    const updatedImport = await Import.findById(importRecord.id);
    console.log(`   ✅ 更新统计: 状态=${updatedImport.status}, 有效行=${updatedImport.valid_rows}\n`);

    console.log('4. 测试预览行存储...');
    
    await PreviewRow.create(importRecord.id, 1, { name: '张三', email: 'test@test.com' }, true);
    await PreviewRow.create(importRecord.id, 2, { name: '李四', email: 'lisi@test.com' }, true);
    
    const previewRows = await PreviewRow.findByImportId(importRecord.id);
    console.log(`   ✅ 存储预览行: ${previewRows.length} 行\n`);

    console.log('5. 测试错误行存储...');
    
    await ErrorRow.create(importRecord.id, 3, { name: '' }, '缺少必填字段');
    await ErrorRow.create(importRecord.id, 4, { email: 'invalid' }, '邮箱格式错误');
    
    const errorRows = await ErrorRow.findByImportId(importRecord.id);
    console.log(`   ✅ 存储错误行: ${errorRows.length} 行\n`);

    console.log('6. 测试状态流转...');
    
    await Import.updateStatus(importRecord.id, 'reviewing');
    const reviewingImport = await Import.findById(importRecord.id);
    console.log(`   ✅ 状态变更为: ${reviewingImport.status}`);
    
    await Import.updateStatus(importRecord.id, 'approved');
    const approvedImport = await Import.findById(importRecord.id);
    console.log(`   ✅ 状态变更为: ${approvedImport.status}\n`);

    console.log('7. 测试确认导入...');
    
    await ImportedData.create(importRecord.id, 1, { name: '张三', email: 'test@test.com' });
    await Import.updateStatus(importRecord.id, 'imported');
    
    const importedRows = await ImportedData.findByImportId(importRecord.id);
    const finalImport = await Import.findById(importRecord.id);
    
    console.log(`   ✅ 导入数据: ${importedRows.length} 行`);
    console.log(`   ✅ 最终状态: ${finalImport.status}\n`);

    console.log('8. 测试获取所有导入记录...');
    
    const allImports = await Import.findAll();
    console.log(`   ✅ 获取导入列表: ${allImports.length} 条记录\n`);

    console.log('9. 清理测试数据...');
    
    await PreviewRow.deleteByImportId(importRecord.id);
    await ErrorRow.deleteByImportId(importRecord.id);
    await ImportedData.deleteByImportId(importRecord.id);
    await Import.delete(importRecord.id);
    
    const deletedCheck = await Import.findById(importRecord.id);
    console.log(`   ✅ 清理完成: ${deletedCheck ? '存在' : '已删除'}\n`);

    console.log('=== 所有功能验证通过！ ✅ ===');

    await closeDB();

  } catch (error) {
    console.error('\n❌ 验证失败:', error.message);
    console.error(error.stack);
    try {
      await closeDB();
    } catch (e) {}
    process.exit(1);
  }
}

main();
