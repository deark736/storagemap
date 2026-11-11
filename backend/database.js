const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'storagemap.db');
const db = new Database(dbPath);

db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 100),
    parent_id INTEGER REFERENCES locations(id) ON DELETE RESTRICT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_locations_parent_id ON locations(parent_id);
`);

module.exports = db;
