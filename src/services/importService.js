const Import = require('../models/Import');
const PreviewRow = require('../models/PreviewRow');
const ErrorRow = require('../models/ErrorRow');
const ImportedData = require('../models/ImportedData');
const CsvService = require('./csvService');
const StatusMachine = require('../utils/statusMachine');
const Validation = require('../utils/validation');
const fs = require('fs');

class ImportService {
  static async uploadCsv(file) {
    if (!file) {
      throw new Error('文件为空');
    }

    if (!CsvService.validateFileExtension(file.originalname)) {
      throw new Error('只允许上传 CSV 文件');
    }

    if (!CsvService.validateFileSize(file.size)) {
      throw new Error('文件大小超出限制（最大 10MB）');
    }

    const importRecord = await Import.create(file.originalname, file.size);
    return importRecord;
  }

  static async previewCsv(importId, filePath) {
    if (!Validation.isValidUUID(importId)) {
      throw new Error('无效的导入记录 ID');
    }

    const importRecord = await Import.findById(importId);
    if (!importRecord) {
      throw new Error('导入记录不存在');
    }

    const currentStatus = importRecord.status;
    const allowedStatuses = [
      StatusMachine.STATUS.PENDING,
      StatusMachine.STATUS.REJECTED
    ];

    if (!allowedStatuses.includes(currentStatus)) {
      const nextStatuses = StatusMachine.getValidNextStatuses(currentStatus);
      throw new Error(
        `当前状态 "${currentStatus}" 无法重新预览。` +
        `只有 "pending" 或 "rejected" 状态可以预览。` +
        (nextStatuses.length > 0 ? ` 当前状态允许的操作: ${nextStatuses.join(', ')}` : '')
      );
    }

    const result = await CsvService.parseCsv(filePath, CsvService.validateRow.bind(CsvService));

    if (result.headerError) {
      throw new Error(result.headerError);
    }

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
      sampleErrors: result.invalidRows.slice(0, 10),
      headers: result.headers
    };
  }

  static async getImportList() {
    return await Import.findAll();
  }

  static async getImportDetail(importId) {
    if (!Validation.isValidUUID(importId)) {
      throw new Error('无效的导入记录 ID');
    }

    const importRecord = await Import.findById(importId);
    if (!importRecord) {
      throw new Error('导入记录不存在');
    }

    const errorCount = await ErrorRow.countByImportId(importId);
    const previewCount = await PreviewRow.countByImportId(importId);

    return {
      ...importRecord,
      errorCount,
      previewCount,
      validNextStatuses: StatusMachine.getValidNextStatuses(importRecord.status),
      isTerminal: StatusMachine.isTerminalStatus(importRecord.status)
    };
  }

  static async getPreviewRows(importId, page = 1, pageSize = 20) {
    if (!Validation.isValidUUID(importId)) {
      throw new Error('无效的导入记录 ID');
    }

    const safePage = Validation.sanitizePage(page, 1);
    const safePageSize = Validation.sanitizePageSize(pageSize, 20, 100);

    const importRecord = await Import.findById(importId);
    if (!importRecord) {
      throw new Error('导入记录不存在');
    }

    const offset = (safePage - 1) * safePageSize;
    const rows = await PreviewRow.findByImportId(importId, safePageSize, offset);
    const total = await PreviewRow.countByImportId(importId);

    const totalPages = total === 0 ? 0 : Math.ceil(total / safePageSize);

    if (safePage > totalPages && total > 0) {
      return {
        rows: [],
        pagination: {
          page: safePage,
          pageSize: safePageSize,
          total,
          totalPages,
          message: `请求的页码超出范围，共 ${totalPages} 页`
        }
      };
    }

    return {
      rows,
      pagination: {
        page: safePage,
        pageSize: safePageSize,
        total,
        totalPages
      }
    };
  }

  static async getErrorRows(importId, page = 1, pageSize = 20) {
    if (!Validation.isValidUUID(importId)) {
      throw new Error('无效的导入记录 ID');
    }

    const safePage = Validation.sanitizePage(page, 1);
    const safePageSize = Validation.sanitizePageSize(pageSize, 20, 100);

    const importRecord = await Import.findById(importId);
    if (!importRecord) {
      throw new Error('导入记录不存在');
    }

    const offset = (safePage - 1) * safePageSize;
    const rows = await ErrorRow.findByImportId(importId, safePageSize, offset);
    const total = await ErrorRow.countByImportId(importId);

    const totalPages = total === 0 ? 0 : Math.ceil(total / safePageSize);

    if (safePage > totalPages && total > 0) {
      return {
        rows: [],
        pagination: {
          page: safePage,
          pageSize: safePageSize,
          total,
          totalPages,
          message: `请求的页码超出范围，共 ${totalPages} 页`
        }
      };
    }

    return {
      rows,
      pagination: {
        page: safePage,
        pageSize: safePageSize,
        total,
        totalPages
      }
    };
  }

  static async submitForReview(importId) {
    if (!Validation.isValidUUID(importId)) {
      throw new Error('无效的导入记录 ID');
    }

    const importRecord = await Import.findById(importId);
    if (!importRecord) {
      throw new Error('导入记录不存在');
    }

    const currentStatus = importRecord.status;
    const targetStatus = StatusMachine.STATUS.REVIEWING;

    const validation = StatusMachine.validateTransition(currentStatus, targetStatus);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    await Import.updateStatus(importId, targetStatus);
    const updatedRecord = await Import.findById(importId);

    return {
      ...updatedRecord,
      validNextStatuses: StatusMachine.getValidNextStatuses(targetStatus)
    };
  }

  static async approveImport(importId) {
    if (!Validation.isValidUUID(importId)) {
      throw new Error('无效的导入记录 ID');
    }

    const importRecord = await Import.findById(importId);
    if (!importRecord) {
      throw new Error('导入记录不存在');
    }

    const currentStatus = importRecord.status;
    const targetStatus = StatusMachine.STATUS.APPROVED;

    const validation = StatusMachine.validateTransition(currentStatus, targetStatus);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    await Import.updateStatus(importId, targetStatus);
    const updatedRecord = await Import.findById(importId);

    return {
      ...updatedRecord,
      validNextStatuses: StatusMachine.getValidNextStatuses(targetStatus)
    };
  }

  static async rejectImport(importId, reason = '') {
    if (!Validation.isValidUUID(importId)) {
      throw new Error('无效的导入记录 ID');
    }

    const importRecord = await Import.findById(importId);
    if (!importRecord) {
      throw new Error('导入记录不存在');
    }

    const currentStatus = importRecord.status;
    const targetStatus = StatusMachine.STATUS.REJECTED;

    const validation = StatusMachine.validateTransition(currentStatus, targetStatus);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    await Import.updateStatus(importId, targetStatus);
    const updatedRecord = await Import.findById(importId);

    return {
      ...updatedRecord,
      rejectReason: Validation.sanitizeString(reason, 500),
      validNextStatuses: StatusMachine.getValidNextStatuses(targetStatus)
    };
  }

  static async confirmImport(importId) {
    if (!Validation.isValidUUID(importId)) {
      throw new Error('无效的导入记录 ID');
    }

    const importRecord = await Import.findById(importId);
    if (!importRecord) {
      throw new Error('导入记录不存在');
    }

    const currentStatus = importRecord.status;
    const targetStatus = StatusMachine.STATUS.IMPORTED;

    const validation = StatusMachine.validateTransition(currentStatus, targetStatus);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    const validRowsCount = importRecord.valid_rows || 0;
    if (validRowsCount === 0) {
      throw new Error('没有有效数据可导入');
    }

    const previewRows = await PreviewRow.findByImportId(importId, validRowsCount, 0);
    
    const validRows = previewRows.map(row => ({
      rowNumber: row.row_number,
      rowData: row.row_data
    }));

    await ImportedData.createBatch(importId, validRows);
    await Import.updateStatus(importId, targetStatus);

    const finalRecord = await Import.findById(importId);

    return {
      importId,
      importedRows: validRows.length,
      status: targetStatus,
      record: finalRecord
    };
  }

  static async cancelImport(importId) {
    if (!Validation.isValidUUID(importId)) {
      throw new Error('无效的导入记录 ID');
    }

    const importRecord = await Import.findById(importId);
    if (!importRecord) {
      throw new Error('导入记录不存在');
    }

    if (StatusMachine.isTerminalStatus(importRecord.status)) {
      throw new Error(`当前状态 "${importRecord.status}" 是最终状态，无法取消`);
    }

    await PreviewRow.deleteByImportId(importId);
    await ErrorRow.deleteByImportId(importId);
    await Import.delete(importId);

    return {
      message: '导入已取消',
      importId,
      cancelledStatus: importRecord.status
    };
  }

  static async getAllStatuses() {
    return {
      statuses: StatusMachine.getAllStatuses(),
      transitions: StatusMachine.TRANSITIONS
    };
  }
}

module.exports = ImportService;
