const { getDB } = require('../db/database');

class ErrorRow {
  static async create(importId, rowNumber, rowData, errorMessage) {
    const db = getDB();
    const stmt = db.prepare(`
      INSERT INTO error_rows (import_id, row_number, row_data, error_message)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(importId, rowNumber, JSON.stringify(rowData), errorMessage);
    return result.lastInsertRowid;
  }

  static async createBatch(importId, errors) {
    const db = getDB();
    const stmt = db.prepare(`
      INSERT INTO error_rows (import_id, row_number, row_data, error_message)
      VALUES (?, ?, ?, ?)
    `);
    
    const insert = db.transaction((items) => {
      for (const error of items) {
        stmt.run(importId, error.rowNumber, JSON.stringify(error.rowData), error.errorMessage);
      }
    });
    
    insert(errors);
  }

  static async findByImportId(importId, limit = 100, offset = 0) {
    const db = getDB();
    const stmt = db.prepare(`
      SELECT * FROM error_rows WHERE import_id = ? ORDER BY row_number LIMIT ? OFFSET ?
    `);
    
    const rows = stmt.all(importId, limit, offset);
    return rows.map(row => ({
      ...row,
      row_data: JSON.parse(row.row_data)
    }));
  }

  static async countByImportId(importId) {
    const db = getDB();
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM error_rows WHERE import_id = ?
    `);
    
    const result = stmt.get(importId);
    return result.count;
  }

  static async deleteByImportId(importId) {
    const db = getDB();
    const stmt = db.prepare(`DELETE FROM error_rows WHERE import_id = ?`);
    const result = stmt.run(importId);
    return result.changes;
  }
}

module.exports = ErrorRow;
