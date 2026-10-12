const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// Relational database file (mirrors the MongoDB collections in a normalized SQL schema)
const DB_PATH = path.join(__dirname, '..', 'data', 'food_management.sqlite');

let db = null;
let isConnected = false;
let lastError = null;

// Open the SQLite database (read/write so the lab can also modify rows)
const connectSqlite = () =>
  new Promise((resolve) => {
    if (!fs.existsSync(DB_PATH)) {
      lastError = `SQLite database file not found at ${DB_PATH}`;
      console.error('❌ SQLite:', lastError);
      return resolve(false);
    }

    db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
      if (err) {
        isConnected = false;
        lastError = err.message;
        console.error('❌ SQLite Connection Error:', err.message);
        return resolve(false);
      }
      isConnected = true;
      lastError = null;
      console.log(`✅ SQLite Connected: ${path.basename(DB_PATH)}`);
      resolve(true);
    });
  });

const getDatabase = () => db;

const getSqliteStatus = () => ({
  isConnected,
  database: path.basename(DB_PATH),
  path: DB_PATH,
  error: lastError,
});

// Promisified helpers
const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    if (!db) return reject(new Error('SQLite database is not connected'));
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    if (!db) return reject(new Error('SQLite database is not connected'));
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes, lastID: this.lastID });
    });
  });

const closeSqlite = () =>
  new Promise((resolve) => {
    if (!db) return resolve();
    db.close(() => {
      db = null;
      isConnected = false;
      resolve();
    });
  });

module.exports = { connectSqlite, getDatabase, getSqliteStatus, closeSqlite, all, run, DB_PATH };
