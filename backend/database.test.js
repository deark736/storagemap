
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');

test('locations schema supports optional icons', () => {
  const db = new Database(':memory:');

  try {
    db.exec(`
      CREATE TABLE locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        parent_id INTEGER REFERENCES locations(id),
        icon TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const columns = db.pragma('table_info(locations)');
    assert.ok(columns.some(column => column.name === 'icon'));

    db.prepare('INSERT INTO locations (name) VALUES (?)')
      .run('Garage');

    const location = db.prepare(
      'SELECT name, icon FROM locations WHERE id = 1'
    ).get();

    assert.equal(location.name, 'Garage');
    assert.equal(location.icon, null);
  } finally {
    db.close();
  }
});
