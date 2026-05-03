const { getDB } = require('../db/database');
const { v4: uuidv4 } = require('uuid');

class Import {
  static async create(filename, fileSize) {
    const db = getDB();
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO imports (id, filename, file_size, status, created_at, updated_at)
      VALUES (?, ?, ?, 'pending', ?, ?)
    `);
    
    stmt.run(id, filename, fileSize, now, now);
    
    return { id, filename, fileSize, status: 'pending', created_at: now, updated_at: now };
  }

  static async findById(id) {
    const db = getDB();
    const stmt = db.prepare(`SELECT * FROM imports WHERE id = ?`);
    return stmt.get(id);
  }

  static async findAll() {
    const db = getDB();
    const stmt = db.prepare(`SELECT * FROM imports ORDER BY created_at DESC`);
    return stmt.all();
  }

  static async updateStats(id, totalRows, validRows, invalidRows) {
    const db = getDB();
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      UPDATE imports 
      SET total_rows = ?, valid_rows = ?, invalid_rows = ?, status = 'previewed', updated_at = ?
      WHERE id = ?
    `);
    
    const result = stmt.run(totalRows, validRows, invalidRows, now, id);
    return result.changes;
  }

  static async updateStatus(id, status) {
    const db = getDB();
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      UPDATE imports 
      SET status = ?, updated_at = ?
      WHERE id = ?
    `);
    
    const result = stmt.run(status, now, id);
    return result.changes;
  }

  static async delete(id) {
    const db = getDB();
    const stmt = db.prepare(`DELETE FROM imports WHERE id = ?`);
    const result = stmt.run(id);
    return result.changes;
  }
}

module.exports = Import;
