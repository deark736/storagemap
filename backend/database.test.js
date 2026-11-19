
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const { initializeDatabase } = require('./database');

test('locations schema supports optional icons', () => {
  const db = initializeDatabase(new Database(':memory:'));

  try {
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

test('items schema supports items with optional categories', () => {
  const db = initializeDatabase(new Database(':memory:'));

  try {
    const locationId = db.prepare(
      'INSERT INTO locations (name) VALUES (?)'
    ).run('Garage').lastInsertRowid;

    const categoryId = db.prepare(
      'INSERT INTO categories (name) VALUES (?)'
    ).run('Tools').lastInsertRowid;

    const itemId = db.prepare(`
      INSERT INTO items (name, description, quantity, location_id, category_id)
      VALUES (?, ?, ?, ?, ?)
    `).run('Hammer', 'Claw hammer', 2, locationId, categoryId).lastInsertRowid;

    const item = db.prepare(
      'SELECT * FROM items WHERE id = ?'
    ).get(itemId);

    assert.equal(item.name, 'Hammer');
    assert.equal(item.description, 'Claw hammer');
    assert.equal(item.quantity, 2);
    assert.equal(item.location_id, locationId);
    assert.equal(item.category_id, categoryId);

    const uncategorizedId = db.prepare(`
      INSERT INTO items (name, location_id)
      VALUES (?, ?)
    `).run('Screwdriver', locationId).lastInsertRowid;

    const uncategorizedItem = db.prepare(
      'SELECT * FROM items WHERE id = ?'
    ).get(uncategorizedId);

    assert.equal(uncategorizedItem.category_id, null);
    assert.equal(uncategorizedItem.quantity, 1);
    assert.equal(uncategorizedItem.description, null);
  } finally {
    db.close();
  }
});

test('items require valid storage locations and categories', () => {
  const db = initializeDatabase(new Database(':memory:'));

  try {
    const locationId = db.prepare(
      'INSERT INTO locations (name) VALUES (?)'
    ).run('Garage').lastInsertRowid;

    assert.throws(() => {
      db.prepare(`
        INSERT INTO items (name, location_id)
        VALUES (?, ?)
      `).run('Hammer', 999);
    }, { code: 'SQLITE_CONSTRAINT_FOREIGNKEY' });

    assert.throws(() => {
      db.prepare(`
        INSERT INTO items (name, location_id, category_id)
        VALUES (?, ?, ?)
      `).run('Hammer', locationId, 999);
    }, { code: 'SQLITE_CONSTRAINT_FOREIGNKEY' });
  } finally {
    db.close();
  }
});

test('locations containing items cannot be deleted', () => {
  const db = initializeDatabase(new Database(':memory:'));

  try {
    const locationId = db.prepare(
      'INSERT INTO locations (name) VALUES (?)'
    ).run('Garage').lastInsertRowid;

    db.prepare(`
      INSERT INTO items (name, location_id)
      VALUES (?, ?)
    `).run('Hammer', locationId);

    assert.throws(() => {
      db.prepare('DELETE FROM locations WHERE id = ?')
        .run(locationId);
    }, { code: 'SQLITE_CONSTRAINT_TRIGGER' });

    const location = db.prepare(
      'SELECT * FROM locations WHERE id = ?'
    ).get(locationId);

    assert.ok(location);
  } finally {
    db.close();
  }
});

test('deleting a category preserves its associated items', () => {
  const db = initializeDatabase(new Database(':memory:'));

  try {
    const locationId = db.prepare(
      'INSERT INTO locations (name) VALUES (?)'
    ).run('Garage').lastInsertRowid;

    const categoryId = db.prepare(
      'INSERT INTO categories (name) VALUES (?)'
    ).run('Tools').lastInsertRowid;

    const itemId = db.prepare(`
      INSERT INTO items (name, location_id, category_id)
      VALUES (?, ?, ?)
    `).run('Hammer', locationId, categoryId).lastInsertRowid;

    db.prepare('DELETE FROM categories WHERE id = ?')
      .run(categoryId);

    const item = db.prepare(
      'SELECT * FROM items WHERE id = ?'
    ).get(itemId);

    assert.ok(item);
    assert.equal(item.category_id, null);
    assert.equal(item.location_id, locationId);
  } finally {
    db.close();
  }
});

test('items reject non-positive quantities', () => {
  const db = initializeDatabase(new Database(':memory:'));

  try {
    const locationId = db.prepare(
      'INSERT INTO locations (name) VALUES (?)'
    ).run('Garage').lastInsertRowid;

    const insertItem = db.prepare(`
      INSERT INTO items (name, quantity, location_id)
      VALUES (?, ?, ?)
    `);

    assert.throws(() => {
      insertItem.run('Hammer', 0, locationId);
    }, { code: 'SQLITE_CONSTRAINT_CHECK' });

    assert.throws(() => {
      insertItem.run('Hammer', -1, locationId);
    }, { code: 'SQLITE_CONSTRAINT_CHECK' });
  } finally {
    db.close();
  }
});
