const ImportService = require('../services/importService');
const Validation = require('../utils/validation');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeFilename = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${uniqueSuffix}-${safeFilename}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('只允许上传 CSV 文件'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

class ImportController {
  static upload = upload.single('csvFile');

  static async uploadCsv(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '请选择要上传的 CSV 文件',
          code: 'NO_FILE'
        });
      }

      const importRecord = await ImportService.uploadCsv(req.file);

      const preview = await ImportService.previewCsv(importRecord.id, req.file.path);

      res.json({
        success: true,
        data: {
          importId: importRecord.id,
          filename: importRecord.filename,
          ...preview
        }
      });
    } catch (error) {
      console.error('上传 CSV 失败:', error);
      
      let statusCode = 500;
      let errorCode = 'UPLOAD_FAILED';
      let message = error.message || '上传失败';

      if (message.includes('文件为空') || message.includes('文件大小') || 
          message.includes('只允许上传')) {
        statusCode = 400;
        errorCode = 'INVALID_FILE';
      } else if (message.includes('表头') || message.includes('CSV 文件为空')) {
        statusCode = 400;
        errorCode = 'INVALID_CSV_FORMAT';
      }

      res.status(statusCode).json({
        success: false,
        message,
        code: errorCode
      });
    }
  }

  static async getImportList(req, res) {
    try {
      const imports = await ImportService.getImportList();
      res.json({
        success: true,
        data: imports
      });
    } catch (error) {
      console.error('获取导入列表失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取失败',
        code: 'GET_LIST_FAILED'
      });
    }
  }

  static async getImportDetail(req, res) {
    try {
      const { importId } = req.params;
      
      if (!Validation.isValidUUID(importId)) {
        return res.status(400).json({
          success: false,
          message: '无效的导入记录 ID',
          code: 'INVALID_ID'
        });
      }

      const detail = await ImportService.getImportDetail(importId);
      res.json({
        success: true,
        data: detail
      });
    } catch (error) {
      console.error('获取导入详情失败:', error);
      
      if (error.message.includes('不存在')) {
        res.status(404).json({
          success: false,
          message: error.message || '导入记录不存在',
          code: 'NOT_FOUND'
        });
      } else if (error.message.includes('无效')) {
        res.status(400).json({
          success: false,
          message: error.message,
          code: 'INVALID_INPUT'
        });
      } else {
        res.status(500).json({
          success: false,
          message: error.message || '获取失败',
          code: 'GET_DETAIL_FAILED'
        });
      }
    }
  }

  static async getPreviewRows(req, res) {
    try {
      const { importId } = req.params;
      
      if (!Validation.isValidUUID(importId)) {
        return res.status(400).json({
          success: false,
          message: '无效的导入记录 ID',
          code: 'INVALID_ID'
        });
      }

      const page = req.query.page;
      const pageSize = req.query.pageSize;

      const result = await ImportService.getPreviewRows(importId, page, pageSize);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('获取预览行失败:', error);
      
      if (error.message.includes('不存在')) {
        res.status(404).json({
          success: false,
          message: error.message,
          code: 'NOT_FOUND'
        });
      } else if (error.message.includes('无效')) {
        res.status(400).json({
          success: false,
          message: error.message,
          code: 'INVALID_INPUT'
        });
      } else {
        res.status(500).json({
          success: false,
          message: error.message || '获取失败',
          code: 'GET_PREVIEW_FAILED'
        });
      }
    }
  }

  static async getErrorRows(req, res) {
    try {
      const { importId } = req.params;
      
      if (!Validation.isValidUUID(importId)) {
        return res.status(400).json({
          success: false,
          message: '无效的导入记录 ID',
          code: 'INVALID_ID'
        });
      }

      const page = req.query.page;
      const pageSize = req.query.pageSize;

      const result = await ImportService.getErrorRows(importId, page, pageSize);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('获取错误行失败:', error);
      
      if (error.message.includes('不存在')) {
        res.status(404).json({
          success: false,
          message: error.message,
          code: 'NOT_FOUND'
        });
      } else if (error.message.includes('无效')) {
        res.status(400).json({
          success: false,
          message: error.message,
          code: 'INVALID_INPUT'
        });
      } else {
        res.status(500).json({
          success: false,
          message: error.message || '获取失败',
          code: 'GET_ERRORS_FAILED'
        });
      }
    }
  }

  static async submitForReview(req, res) {
    try {
      const { importId } = req.params;
      
      if (!Validation.isValidUUID(importId)) {
        return res.status(400).json({
          success: false,
          message: '无效的导入记录 ID',
          code: 'INVALID_ID'
        });
      }

      const result = await ImportService.submitForReview(importId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('提交审核失败:', error);
      
      if (error.message.includes('不存在')) {
        res.status(404).json({
          success: false,
          message: error.message,
          code: 'NOT_FOUND'
        });
      } else if (error.message.includes('状态') || error.message.includes('无法')) {
        res.status(400).json({
          success: false,
          message: error.message,
          code: 'INVALID_STATUS_TRANSITION'
        });
      } else if (error.message.includes('无效')) {
        res.status(400).json({
          success: false,
          message: error.message,
          code: 'INVALID_INPUT'
        });
      } else {
        res.status(500).json({
          success: false,
          message: error.message || '提交失败',
          code: 'SUBMIT_FAILED'
        });
      }
    }
  }

  static async approveImport(req, res) {
    try {
      const { importId } = req.params;
      
      if (!Validation.isValidUUID(importId)) {
        return res.status(400).json({
          success: false,
          message: '无效的导入记录 ID',
          code: 'INVALID_ID'
        });
      }

      const result = await ImportService.approveImport(importId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('审核通过失败:', error);
      
      if (error.message.includes('不存在')) {
        res.status(404).json({
          success: false,
          message: error.message,
          code: 'NOT_FOUND'
        });
      } else if (error.message.includes('状态') || error.message.includes('无法')) {
        res.status(400).json({
          success: false,
          message: error.message,
          code: 'INVALID_STATUS_TRANSITION'
        });
      } else if (error.message.includes('无效')) {
        res.status(400).json({
          success: false,
          message: error.message,
          code: 'INVALID_INPUT'
        });
      } else {
        res.status(500).json({
          success: false,
          message: error.message || '操作失败',
          code: 'APPROVE_FAILED'
        });
      }
    }
  }

  static async rejectImport(req, res) {
    try {
      const { importId } = req.params;
      
      if (!Validation.isValidUUID(importId)) {
        return res.status(400).json({
          success: false,
          message: '无效的导入记录 ID',
          code: 'INVALID_ID'
        });
      }

      const { reason } = req.body;
      const result = await ImportService.rejectImport(importId, reason);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('拒绝导入失败:', error);
      
      if (error.message.includes('不存在')) {
        res.status(404).json({
          success: false,
          message: error.message,
          code: 'NOT_FOUND'
        });
      } else if (error.message.includes('状态') || error.message.includes('无法')) {
        res.status(400).json({
          success: false,
          message: error.message,
          code: 'INVALID_STATUS_TRANSITION'
        });
      } else if (error.message.includes('无效')) {
        res.status(400).json({
          success: false,
          message: error.message,
          code: 'INVALID_INPUT'
        });
      } else {
        res.status(500).json({
          success: false,
          message: error.message || '操作失败',
          code: 'REJECT_FAILED'
        });
      }
    }
  }

  static async confirmImport(req, res) {
    try {
      const { importId } = req.params;
      
      if (!Validation.isValidUUID(importId)) {
        return res.status(400).json({
          success: false,
          message: '无效的导入记录 ID',
          code: 'INVALID_ID'
        });
      }

      const result = await ImportService.confirmImport(importId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('确认导入失败:', error);
      
      if (error.message.includes('不存在')) {
        res.status(404).json({
          success: false,
          message: error.message,
          code: 'NOT_FOUND'
        });
      } else if (error.message.includes('状态') || error.message.includes('无法') || 
                 error.message.includes('没有有效数据')) {
        res.status(400).json({
          success: false,
          message: error.message,
          code: 'INVALID_STATUS_TRANSITION'
        });
      } else if (error.message.includes('无效')) {
        res.status(400).json({
          success: false,
          message: error.message,
          code: 'INVALID_INPUT'
        });
      } else {
        res.status(500).json({
          success: false,
          message: error.message || '操作失败',
          code: 'CONFIRM_FAILED'
        });
      }
    }
  }

  static async cancelImport(req, res) {
    try {
      const { importId } = req.params;
      
      if (!Validation.isValidUUID(importId)) {
        return res.status(400).json({
          success: false,
          message: '无效的导入记录 ID',
          code: 'INVALID_ID'
        });
      }

      const result = await ImportService.cancelImport(importId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('取消导入失败:', error);
      
      if (error.message.includes('不存在')) {
        res.status(404).json({
          success: false,
          message: error.message,
          code: 'NOT_FOUND'
        });
      } else if (error.message.includes('最终状态') || error.message.includes('无法')) {
        res.status(400).json({
          success: false,
          message: error.message,
          code: 'INVALID_STATUS_TRANSITION'
        });
      } else if (error.message.includes('无效')) {
        res.status(400).json({
          success: false,
          message: error.message,
          code: 'INVALID_INPUT'
        });
      } else {
        res.status(500).json({
          success: false,
          message: error.message || '操作失败',
          code: 'CANCEL_FAILED'
        });
      }
    }
  }

  static async getStatuses(req, res) {
    try {
      const result = await ImportService.getAllStatuses();
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('获取状态列表失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取失败',
        code: 'GET_STATUSES_FAILED'
      });
    }
  }
}

module.exports = ImportController;
