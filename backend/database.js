const Database = require('better-sqlite3');
const path = require('path');

function initializeDatabase(db) {
  db.pragma('foreign_keys = ON');

    // Users: registered StorageMap accounts
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL COLLATE NOCASE UNIQUE
        CHECK(length(trim(username)) BETWEEN 3 AND 50),
      email TEXT NOT NULL COLLATE NOCASE UNIQUE
        CHECK(length(trim(email)) BETWEEN 3 AND 254),
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Sessions: authenticated user sessions
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY NOT NULL,
      user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id
    ON sessions(user_id);

    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
    ON sessions(expires_at);
  `);

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

  return db;
}

const dbPath = path.join(__dirname, 'storagemap.db');
const db = initializeDatabase(new Database(dbPath));

module.exports = db;
module.exports.initializeDatabase = initializeDatabase;
