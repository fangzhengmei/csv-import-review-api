class Validation {
  static isValidUUID(id) {
    if (!id || typeof id !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  static sanitizePage(page, defaultValue = 1) {
    const num = parseInt(page, 10);
    if (isNaN(num) || num < 1) {
      return defaultValue;
    }
    return num;
  }

  static sanitizePageSize(pageSize, defaultValue = 20, maxValue = 100) {
    const num = parseInt(pageSize, 10);
    if (isNaN(num) || num < 1) {
      return defaultValue;
    }
    if (num > maxValue) {
      return maxValue;
    }
    return num;
  }

  static sanitizeString(str, maxLength = 1000) {
    if (typeof str !== 'string') {
      return '';
    }
    const trimmed = str.trim();
    if (trimmed.length > maxLength) {
      return trimmed.substring(0, maxLength);
    }
    return trimmed;
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

  static isString(value) {
    return typeof value === 'string';
  }

  static isNonEmptyString(value) {
    return this.isString(value) && value.trim().length > 0;
  }
}

module.exports = Validation;
