const { getDB } = require('../db/database');

class ImportedData {
  static async create(importId, rowNumber, data) {
    const db = getDB();
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO imported_data (import_id, row_number, data, imported_at)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(importId, rowNumber, JSON.stringify(data), now);
    return result.lastInsertRowid;
  }

  static async createBatch(importId, rows) {
    const db = getDB();
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO imported_data (import_id, row_number, data, imported_at)
      VALUES (?, ?, ?, ?)
    `);
    
    const insert = db.transaction((items) => {
      for (const row of items) {
        stmt.run(importId, row.rowNumber, JSON.stringify(row.rowData), now);
      }
    });
    
    insert(rows);
  }

  static async findByImportId(importId, limit = 100, offset = 0) {
    const db = getDB();
    const stmt = db.prepare(`
      SELECT * FROM imported_data WHERE import_id = ? ORDER BY row_number LIMIT ? OFFSET ?
    `);
    
    const rows = stmt.all(importId, limit, offset);
    return rows.map(row => ({
      ...row,
      data: JSON.parse(row.data)
    }));
  }

  static async countByImportId(importId) {
    const db = getDB();
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM imported_data WHERE import_id = ?
    `);
    
    const result = stmt.get(importId);
    return result.count;
  }

  static async deleteByImportId(importId) {
    const db = getDB();
    const stmt = db.prepare(`DELETE FROM imported_data WHERE import_id = ?`);
    const result = stmt.run(importId);
    return result.changes;
  }
}

module.exports = ImportedData;
