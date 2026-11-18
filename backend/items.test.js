
const { test } = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const express = require('express');
const { initializeDatabase } = require('./database');
const createItemRouter = require('./items');

async function withItemApi(run) {
  const db = initializeDatabase(new Database(':memory:'));

  const app = express();
  app.use(express.json());
  app.use('/api/items', createItemRouter(db));

  const server = app.listen(0);

  try {
    const base =
      `http://127.0.0.1:${server.address().port}/api/items`;

    const request = (path, method = 'GET', body) =>
      fetch(`${base}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        ...(body !== undefined
          ? { body: JSON.stringify(body) }
          : {})
      });

    const insertLocation = db.prepare(
      'INSERT INTO locations (name) VALUES (?)'
    );

    const garageId = insertLocation.run('Garage').lastInsertRowid;
    const kitchenId = insertLocation.run('Kitchen').lastInsertRowid;
    const bedroomId = insertLocation.run('Bedroom').lastInsertRowid;

    const categoryId = db.prepare(
      'INSERT INTO categories (name) VALUES (?)'
    ).run('Tools').lastInsertRowid;

    await run({
      request,
      garageId,
      kitchenId,
      bedroomId,
      categoryId
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
    db.close();
  }
}

test('item API creates and retrieves items', async () => {
  await withItemApi(async ({
    request,
    garageId,
    categoryId
  }) => {
    const response = await request('/', 'POST', {
      name: ' Hammer ',
      description: 'Claw hammer',
      quantity: 2,
      locationId: garageId,
      categoryId
    });

    assert.equal(response.status, 201);

    const item = await response.json();

    assert.ok(Number.isSafeInteger(item.id));
    assert.equal(item.name, 'Hammer');
    assert.equal(item.description, 'Claw hammer');
    assert.equal(item.quantity, 2);
    assert.equal(item.locationId, garageId);
    assert.equal(item.categoryId, categoryId);
    assert.ok(item.createdAt);

    assert.equal(
      response.headers.get('location'),
      `/api/items/${item.id}`
    );

    const retrieved = await request(`/${item.id}`);

    assert.equal(retrieved.status, 200);
    assert.deepEqual(await retrieved.json(), item);

    const all = await request('/');

    assert.equal(all.status, 200);
    assert.deepEqual(await all.json(), [item]);
  });
});

test('item API supports optional fields and default quantity', async () => {
  await withItemApi(async ({ request, garageId }) => {
    const response = await request('/', 'POST', {
      name: 'Screwdriver',
      locationId: garageId
    });

    assert.equal(response.status, 201);

    const item = await response.json();

    assert.equal(item.name, 'Screwdriver');
    assert.equal(item.locationId, garageId);
    assert.equal(item.quantity, 1);
    assert.equal(item.description, null);
    assert.equal(item.categoryId, null);
  });
});

test('item API filters items by storage location', async () => {
  await withItemApi(async ({
    request,
    garageId,
    kitchenId,
    bedroomId
  }) => {
    const firstResponse = await request('/', 'POST', {
      name: 'Hammer',
      locationId: garageId
    });

    assert.equal(firstResponse.status, 201);
    const hammer = await firstResponse.json();

    const secondResponse = await request('/', 'POST', {
      name: 'Screwdriver',
      locationId: garageId
    });

    assert.equal(secondResponse.status, 201);
    const screwdriver = await secondResponse.json();

    const thirdResponse = await request('/', 'POST', {
      name: 'Plate',
      locationId: kitchenId
    });

    assert.equal(thirdResponse.status, 201);
    const plate = await thirdResponse.json();

    const all = await request('/');

    assert.equal(all.status, 200);
    assert.deepEqual(
      await all.json(),
      [hammer, screwdriver, plate]
    );

    const garage = await request(
      `/?locationId=${garageId}`
    );

    assert.equal(garage.status, 200);
    assert.deepEqual(
      await garage.json(),
      [hammer, screwdriver]
    );

    const kitchen = await request(
      `/?locationId=${kitchenId}`
    );

    assert.equal(kitchen.status, 200);
    assert.deepEqual(await kitchen.json(), [plate]);

    const bedroom = await request(
      `/?locationId=${bedroomId}`
    );

    assert.equal(bedroom.status, 200);
    assert.deepEqual(await bedroom.json(), []);
  });
});

test('item API rejects invalid creation requests', async () => {
  await withItemApi(async ({ request, garageId }) => {
    const valid = {
      name: 'Hammer',
      locationId: garageId
    };

    const invalidRequests = [
      {},
      [],
      { ...valid, name: '' },
      { ...valid, name: ' ' },
      { ...valid, name: 123 },
      { ...valid, name: 'a'.repeat(101) },
      { ...valid, description: 123 },
      { ...valid, quantity: 0 },
      { ...valid, quantity: -1 },
      { ...valid, quantity: 1.5 },
      { ...valid, quantity: '2' },
      { ...valid, quantity: null },
      { name: 'Hammer' },
      { ...valid, locationId: null },
      { ...valid, locationId: 0 },
      { ...valid, locationId: '1' },
      { ...valid, categoryId: 0 },
      { ...valid, categoryId: 1.5 },
      { ...valid, categoryId: '1' },
      { ...valid, unexpectedField: true }
    ];

    for (const body of invalidRequests) {
      const response = await request('/', 'POST', body);

      assert.equal(
        response.status,
        400,
        `Expected rejection for ${JSON.stringify(body)}`
      );

      assert.equal(
        typeof (await response.json()).error,
        'string'
      );
    }

    const all = await request('/');

    assert.equal(all.status, 200);
    assert.deepEqual(await all.json(), []);
  });
});

test('item API rejects nonexistent resource references', async () => {
  await withItemApi(async ({ request, garageId }) => {
    const missingLocation = await request('/', 'POST', {
      name: 'Hammer',
      locationId: 99999
    });

    assert.equal(missingLocation.status, 404);

    const missingCategory = await request('/', 'POST', {
      name: 'Hammer',
      locationId: garageId,
      categoryId: 99999
    });

    assert.equal(missingCategory.status, 404);

    const missingItem = await request('/99999');

    assert.equal(missingItem.status, 404);

    const missingFilterLocation = await request(
      '/?locationId=99999'
    );

    assert.equal(missingFilterLocation.status, 404);

    const all = await request('/');

    assert.equal(all.status, 200);
    assert.deepEqual(await all.json(), []);
  });
});

test('item API rejects invalid retrieval parameters', async () => {
  await withItemApi(async ({ request }) => {
    const invalidPaths = [
      '/0',
      '/-1',
      '/1.5',
      '/abc',
      '/?locationId=',
      '/?locationId=0',
      '/?locationId=-1',
      '/?locationId=1.5',
      '/?locationId=abc',
      '/?locationId=1&locationId=2'
    ];

    for (const path of invalidPaths) {
      const response = await request(path);

      assert.equal(
        response.status,
        400,
        `Expected rejection for ${path}`
      );

      assert.equal(
        typeof (await response.json()).error,
        'string'
      );
    }
  });
});
