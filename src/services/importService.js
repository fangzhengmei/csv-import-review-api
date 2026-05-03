const Import = require('../models/Import');
const PreviewRow = require('../models/PreviewRow');
const ErrorRow = require('../models/ErrorRow');
const ImportedData = require('../models/ImportedData');
const CsvService = require('./csvService');
const fs = require('fs');
const path = require('path');

class ImportService {
  static async uploadCsv(file) {
    const importRecord = await Import.create(file.originalname, file.size);
    return importRecord;
  }

  static async previewCsv(importId, filePath) {
    const importRecord = await Import.findById(importId);
    if (!importRecord) {
      throw new Error('导入记录不存在');
    }

    const result = await CsvService.parseCsv(filePath, CsvService.validateRow);

    await PreviewRow.deleteByImportId(importId);
    await ErrorRow.deleteByImportId(importId);

    if (result.validRows.length > 0) {
      await PreviewRow.createBatch(importId, result.validRows);
    }

    if (result.invalidRows.length > 0) {
      await ErrorRow.createBatch(importId, result.invalidRows);
    }

    await Import.updateStats(
      importId,
      result.totalRows,
      result.validRows.length,
      result.invalidRows.length
    );

    return {
      importId,
      totalRows: result.totalRows,
      validRows: result.validRows.length,
      invalidRows: result.invalidRows.length,
      sampleRows: result.validRows.slice(0, 10),
      sampleErrors: result.invalidRows.slice(0, 10)
    };
  }

  static async getImportList() {
    return await Import.findAll();
  }

  static async getImportDetail(importId) {
    const importRecord = await Import.findById(importId);
    if (!importRecord) {
      throw new Error('导入记录不存在');
    }

    const errorCount = await ErrorRow.countByImportId(importId);
    const previewCount = await PreviewRow.countByImportId(importId);

    return {
      ...importRecord,
      errorCount,
      previewCount
    };
  }

  static async getPreviewRows(importId, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    const rows = await PreviewRow.findByImportId(importId, pageSize, offset);
    const total = await PreviewRow.countByImportId(importId);

    return {
      rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  static async getErrorRows(importId, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    const rows = await ErrorRow.findByImportId(importId, pageSize, offset);
    const total = await ErrorRow.countByImportId(importId);

    return {
      rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  static async submitForReview(importId) {
    const importRecord = await Import.findById(importId);
    if (!importRecord) {
      throw new Error('导入记录不存在');
    }

    if (importRecord.status !== 'previewed') {
      throw new Error('只有预览完成的记录才能提交审核');
    }

    await Import.updateStatus(importId, 'reviewing');
    return await Import.findById(importId);
  }

  static async approveImport(importId) {
    const importRecord = await Import.findById(importId);
    if (!importRecord) {
      throw new Error('导入记录不存在');
    }

    if (importRecord.status !== 'reviewing') {
      throw new Error('只有审核中的记录才能通过');
    }

    await Import.updateStatus(importId, 'approved');
    return await Import.findById(importId);
  }

  static async rejectImport(importId, reason = '') {
    const importRecord = await Import.findById(importId);
    if (!importRecord) {
      throw new Error('导入记录不存在');
    }

    if (importRecord.status !== 'reviewing') {
      throw new Error('只有审核中的记录才能拒绝');
    }

    await Import.updateStatus(importId, 'rejected');
    return await Import.findById(importId);
  }

  static async confirmImport(importId) {
    const importRecord = await Import.findById(importId);
    if (!importRecord) {
      throw new Error('导入记录不存在');
    }

    if (importRecord.status !== 'approved') {
      throw new Error('只有审核通过的记录才能确认导入');
    }

    const previewRows = await PreviewRow.findByImportId(importId, importRecord.valid_rows, 0);
    
    const validRows = previewRows.map(row => ({
      rowNumber: row.row_number,
      rowData: row.row_data
    }));

    await ImportedData.createBatch(importId, validRows);
    await Import.updateStatus(importId, 'imported');

    return {
      importId,
      importedRows: validRows.length,
      status: 'imported'
    };
  }

  static async cancelImport(importId) {
    const importRecord = await Import.findById(importId);
    if (!importRecord) {
      throw new Error('导入记录不存在');
    }

    if (importRecord.status === 'imported') {
      throw new Error('已导入的记录不能取消');
    }

    await PreviewRow.deleteByImportId(importId);
    await ErrorRow.deleteByImportId(importId);
    await Import.delete(importId);

    return {
      message: '导入已取消',
      importId
    };
  }
}

module.exports = ImportService;
