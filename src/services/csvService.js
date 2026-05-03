const csv = require('csv-parser');
const fs = require('fs');

class CsvService {
  static parseCsv(filePath, validator = null) {
    return new Promise((resolve, reject) => {
      const results = [];
      const errors = [];
      let rowNumber = 0;

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
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
          resolve({
            validRows: results,
            invalidRows: errors,
            totalRows: rowNumber
          });
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  static validateRow(data, rowNumber) {
    const requiredFields = ['name', 'email', 'phone'];
    const missingFields = [];
    const errors = [];

    for (const field of requiredFields) {
      if (!data[field] || data[field].trim() === '') {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      errors.push(`缺少必填字段: ${missingFields.join(', ')}`);
    }

    if (data.email && !this.isValidEmail(data.email)) {
      errors.push('邮箱格式不正确');
    }

    if (data.phone && !this.isValidPhone(data.phone)) {
      errors.push('电话格式不正确');
    }

    return {
      valid: errors.length === 0,
      message: errors.length > 0 ? errors.join('; ') : null
    };
  }

  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidPhone(phone) {
    const phoneRegex = /^[\d\s\-\+\(\)]{7,20}$/;
    return phoneRegex.test(phone);
  }
}

module.exports = CsvService;
