const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.NODE_ENV === 'test' 
  ? path.join(__dirname, '../../test.db') 
  : path.join(__dirname, '../../app.db');

let db;

const initDB = () => {
  return new Promise((resolve, reject) => {
    try {
      db = new Database(dbPath);
      
      db.exec(`
        CREATE TABLE IF NOT EXISTS imports (
          id TEXT PRIMARY KEY,
          filename TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          total_rows INTEGER DEFAULT 0,
          valid_rows INTEGER DEFAULT 0,
          invalid_rows INTEGER DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'pending',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      db.exec(`
        CREATE TABLE IF NOT EXISTS error_rows (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          import_id TEXT NOT NULL,
          row_number INTEGER NOT NULL,
          row_data TEXT NOT NULL,
          error_message TEXT NOT NULL,
          FOREIGN KEY (import_id) REFERENCES imports(id)
        )
      `);

      db.exec(`
        CREATE TABLE IF NOT EXISTS preview_rows (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          import_id TEXT NOT NULL,
          row_number INTEGER NOT NULL,
          row_data TEXT NOT NULL,
          is_valid INTEGER DEFAULT 1,
          FOREIGN KEY (import_id) REFERENCES imports(id)
        )
      `);

      db.exec(`
        CREATE TABLE IF NOT EXISTS imported_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          import_id TEXT NOT NULL,
          row_number INTEGER NOT NULL,
          data TEXT NOT NULL,
          imported_at TEXT NOT NULL,
          FOREIGN KEY (import_id) REFERENCES imports(id)
        )
      `);

      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

const closeDB = () => {
  return new Promise((resolve, reject) => {
    try {
      if (db) {
        db.close();
      }
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

const getDB = () => db;

module.exports = {
  getDB,
  initDB,
  closeDB
};
