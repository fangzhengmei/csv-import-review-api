const ImportService = require('../services/importService');
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
    cb(null, `${uniqueSuffix}-${file.originalname}`);
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
          message: '请选择要上传的 CSV 文件'
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
      res.status(500).json({
        success: false,
        message: error.message || '上传失败'
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
        message: error.message || '获取失败'
      });
    }
  }

  static async getImportDetail(req, res) {
    try {
      const { importId } = req.params;
      const detail = await ImportService.getImportDetail(importId);
      res.json({
        success: true,
        data: detail
      });
    } catch (error) {
      console.error('获取导入详情失败:', error);
      res.status(404).json({
        success: false,
        message: error.message || '导入记录不存在'
      });
    }
  }

  static async getPreviewRows(req, res) {
    try {
      const { importId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 20;

      const result = await ImportService.getPreviewRows(importId, page, pageSize);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('获取预览行失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取失败'
      });
    }
  }

  static async getErrorRows(req, res) {
    try {
      const { importId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 20;

      const result = await ImportService.getErrorRows(importId, page, pageSize);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('获取错误行失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取失败'
      });
    }
  }

  static async submitForReview(req, res) {
    try {
      const { importId } = req.params;
      const result = await ImportService.submitForReview(importId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('提交审核失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '提交失败'
      });
    }
  }

  static async approveImport(req, res) {
    try {
      const { importId } = req.params;
      const result = await ImportService.approveImport(importId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('审核通过失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '操作失败'
      });
    }
  }

  static async rejectImport(req, res) {
    try {
      const { importId } = req.params;
      const { reason } = req.body;
      const result = await ImportService.rejectImport(importId, reason);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('拒绝导入失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '操作失败'
      });
    }
  }

  static async confirmImport(req, res) {
    try {
      const { importId } = req.params;
      const result = await ImportService.confirmImport(importId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('确认导入失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '操作失败'
      });
    }
  }

  static async cancelImport(req, res) {
    try {
      const { importId } = req.params;
      const result = await ImportService.cancelImport(importId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('取消导入失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '操作失败'
      });
    }
  }
}

module.exports = ImportController;
