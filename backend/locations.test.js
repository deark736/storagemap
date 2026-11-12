const { test } = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const createLocationRouter = require('./locations');
const express = require('express');

// In-memory SQLite makes tests independent of the project's actual data.
test('location API creates and retrieves nested locations', async () => {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec('CREATE TABLE locations (id INTEGER PRIMARY KEY, name TEXT NOT NULL, parent_id INTEGER REFERENCES locations(id))');
  const app = express();
  app.use(express.json());
  app.use('/api/locations', createLocationRouter(db));
  const server = app.listen(0);
  try {
    const base = `http://127.0.0.1:${server.address().port}/api/locations`;
    const post = (data) => fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const roomResponse = await post({ name: 'Garage' });
    assert.equal(roomResponse.status, 201);
    const room = await roomResponse.json();
    assert.equal(room.parentId, null);
    const shelfResponse = await post({ name: 'Shelf', parentId: room.id });
    assert.equal(shelfResponse.status, 201);
    const shelf = await shelfResponse.json();
    assert.equal(shelf.parentId, room.id);
    const all = await (await fetch(base)).json();
    assert.equal(all.length, 2);
    assert.deepEqual(await (await fetch(`${base}/${shelf.id}`)).json(), shelf);
    assert.equal((await post({ name: 'Drawer', parentId: 99999 })).status, 404);
    assert.equal((await post({ name: ' ' })).status, 400);
    assert.equal((await fetch(`${base}/99999`)).status, 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
    db.close();
  }
});
