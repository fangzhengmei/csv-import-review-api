const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

class CsvService {
  static REQUIRED_FIELDS = ['name', 'email', 'phone'];

  static parseCsv(filePath, validator = null, requiredFields = null) {
    return new Promise((resolve, reject) => {
      const results = [];
      const errors = [];
      let rowNumber = 0;
      let headers = [];
      let headerError = null;

      const fields = requiredFields || this.REQUIRED_FIELDS;

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('headers', (headerList) => {
          headers = headerList;
          const missingHeaders = fields.filter(f => !headers.includes(f));
          if (missingHeaders.length > 0) {
            headerError = `CSV 表头缺少必要字段: ${missingHeaders.join(', ')}. 必需字段: ${fields.join(', ')}`;
          }
        })
        .on('data', (data) => {
          if (headerError) {
            return;
          }

          rowNumber++;
          const row = {
            rowNumber,
            rowData: data,
            isValid: true,
            errorMessage: null
          };

          if (validator) {
            const validation = validator(data, rowNumber);
            row.isValid = validation.valid;
            row.errorMessage = validation.message || null;
          }

          if (row.isValid) {
            results.push(row);
          } else {
            errors.push({
              rowNumber,
              rowData: data,
              errorMessage: row.errorMessage
            });
          }
        })
        .on('end', () => {
          if (headerError) {
            resolve({
              validRows: [],
              invalidRows: [],
              totalRows: 0,
              headerError
            });
            return;
          }

          if (rowNumber === 0 && headers.length === 0) {
            resolve({
              validRows: [],
              invalidRows: [],
              totalRows: 0,
              headerError: 'CSV 文件为空或格式不正确'
            });
            return;
          }

          resolve({
            validRows: results,
            invalidRows: errors,
            totalRows: rowNumber,
            headers
          });
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  static validateRow(data, rowNumber) {
    const requiredFields = this.REQUIRED_FIELDS;
    const errors = [];

    const fieldCheck = this.validateRequiredFields(data, requiredFields);
    if (!fieldCheck.valid) {
      errors.push(...fieldCheck.errors);
    }

    const email = this.sanitizeField(data.email);
    if (email && !this.isValidEmail(email)) {
      errors.push('邮箱格式不正确');
    }

    const phone = this.sanitizeField(data.phone);
    if (phone && !this.isValidPhone(phone)) {
      errors.push('电话格式不正确');
    }

    return {
      valid: errors.length === 0,
      message: errors.length > 0 ? errors.join('; ') : null
    };
  }

  static validateRequiredFields(data, requiredFields) {
    const missingFields = [];
    const errors = [];

    for (const field of requiredFields) {
      const value = data[field];
      if (value === undefined || value === null || 
          (typeof value === 'string' && value.trim() === '')) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      errors.push(`缺少必填字段: ${missingFields.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      missingFields
    };
  }

  static sanitizeField(value) {
    if (value === undefined || value === null) {
      return '';
    }
    if (typeof value === 'string') {
      return value.trim();
    }
    return String(value).trim();
  }

  static isValidEmail(email) {
    if (!email || typeof email !== 'string') {
      return false;
    }
    const trimmedEmail = email.trim();
    if (trimmedEmail.length === 0) {
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(trimmedEmail);
  }

  static isValidPhone(phone) {
    if (!phone || typeof phone !== 'string') {
      return false;
    }
    const trimmedPhone = phone.trim();
    if (trimmedPhone.length === 0) {
      return false;
    }
    const phoneRegex = /^[\d\s\-\+\(\)]{7,20}$/;
    return phoneRegex.test(trimmedPhone);
  }

  static validateFileExtension(filename) {
    const ext = path.extname(filename).toLowerCase();
    return ext === '.csv';
  }

  static validateFileSize(size, maxSize = 10 * 1024 * 1024) {
    return size > 0 && size <= maxSize;
  }
}

module.exports = CsvService;
