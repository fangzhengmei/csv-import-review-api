const { getDB } = require('../db/database');

class PreviewRow {
  static async create(importId, rowNumber, rowData, isValid = true) {
    const db = getDB();
    const stmt = db.prepare(`
      INSERT INTO preview_rows (import_id, row_number, row_data, is_valid)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(importId, rowNumber, JSON.stringify(rowData), isValid ? 1 : 0);
    return result.lastInsertRowid;
  }

  static async createBatch(importId, rows) {
    const db = getDB();
    const stmt = db.prepare(`
      INSERT INTO preview_rows (import_id, row_number, row_data, is_valid)
      VALUES (?, ?, ?, ?)
    `);
    
    const insert = db.transaction((items) => {
      for (const row of items) {
        stmt.run(importId, row.rowNumber, JSON.stringify(row.rowData), row.isValid ? 1 : 0);
      }
    });
    
    insert(rows);
  }

  static async findByImportId(importId, limit = 100, offset = 0) {
    const db = getDB();
    const stmt = db.prepare(`
      SELECT * FROM preview_rows WHERE import_id = ? ORDER BY row_number LIMIT ? OFFSET ?
    `);
    
    const rows = stmt.all(importId, limit, offset);
    return rows.map(row => ({
      ...row,
      row_data: JSON.parse(row.row_data),
      is_valid: row.is_valid === 1
    }));
  }

  static async countByImportId(importId) {
    const db = getDB();
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM preview_rows WHERE import_id = ?
    `);
    
    const result = stmt.get(importId);
    return result.count;
  }

  static async deleteByImportId(importId) {
    const db = getDB();
    const stmt = db.prepare(`DELETE FROM preview_rows WHERE import_id = ?`);
    const result = stmt.run(importId);
    return result.changes;
  }
}

module.exports = PreviewRow;
