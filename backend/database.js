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
    icon TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_locations_parent_id
  ON locations(parent_id);
`);

// Add the icon column to databases created before this change.
const columns = db.pragma('table_info(locations)');

if (!columns.some(column => column.name === 'icon')) {
  db.exec('ALTER TABLE locations ADD COLUMN icon TEXT');
}

// Categories: optional labels to group items by type
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE CHECK(length(trim(name)) BETWEEN 1 AND 50),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

// Items: each item is stored in exactly one location
db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 100),
    description TEXT,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity >= 1),
    location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_items_location_id ON items(location_id);
  CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id);
  CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
`);

module.exports = db;