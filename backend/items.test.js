
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

test('item API updates items and preserves unchanged fields', async () => {
  await withItemApi(async ({
    request,
    garageId,
    categoryId
  }) => {
    const created = await request('/', 'POST', {
      name: 'Hammer',
      description: 'Claw hammer',
      quantity: 2,
      locationId: garageId
    });

    assert.equal(created.status, 201);

    const item = await created.json();
    const path = `/${item.id}`;

    const updated = await request(path, 'PATCH', {
      name: ' Heavy-duty Hammer ',
      description: 'Steel claw hammer',
      quantity: 5,
      categoryId
    });

    assert.equal(updated.status, 200);

    const updatedItem = await updated.json();

    assert.deepEqual(updatedItem, {
      ...item,
      name: 'Heavy-duty Hammer',
      description: 'Steel claw hammer',
      quantity: 5,
      categoryId
    });

    const partial = await request(path, 'PATCH', {
      quantity: 3
    });

    assert.equal(partial.status, 200);

    const partialItem = await partial.json();

    assert.deepEqual(partialItem, {
      ...updatedItem,
      quantity: 3
    });

    const retrieved = await request(path);

    assert.equal(retrieved.status, 200);
    assert.deepEqual(await retrieved.json(), partialItem);
  });
});

test('item API clears optional item fields', async () => {
  await withItemApi(async ({
    request,
    garageId,
    categoryId
  }) => {
    const created = await request('/', 'POST', {
      name: 'Hammer',
      description: 'Claw hammer',
      locationId: garageId,
      categoryId
    });

    assert.equal(created.status, 201);

    const item = await created.json();

    const updated = await request(
      `/${item.id}`,
      'PATCH',
      {
        description: null,
        categoryId: null
      }
    );

    assert.equal(updated.status, 200);

    assert.deepEqual(await updated.json(), {
      ...item,
      description: null,
      categoryId: null
    });
  });
});

test('item API rejects invalid updates without modifying items', async () => {
  await withItemApi(async ({
    request,
    garageId,
    kitchenId
  }) => {
    const created = await request('/', 'POST', {
      name: 'Hammer',
      locationId: garageId
    });

    assert.equal(created.status, 201);

    const item = await created.json();
    const path = `/${item.id}`;

    const invalidUpdates = [
      {},
      [],
      { name: '' },
      { name: ' ' },
      { name: 123 },
      { name: null },
      { name: 'a'.repeat(101) },
      { description: 123 },
      { quantity: 0 },
      { quantity: -1 },
      { quantity: 1.5 },
      { quantity: '2' },
      { quantity: null },
      { categoryId: 0 },
      { categoryId: -1 },
      { categoryId: 1.5 },
      { categoryId: '1' },
      { locationId: kitchenId },
      { id: 999 },
      { createdAt: '2026-01-01' },
      { unexpectedField: true },
      { name: 'Changed', quantity: 0 }
    ];

    for (const body of invalidUpdates) {
      const response = await request(path, 'PATCH', body);

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

    const missingCategory = await request(path, 'PATCH', {
      categoryId: 99999
    });

    assert.equal(missingCategory.status, 404);

    const retrieved = await request(path);

    assert.equal(retrieved.status, 200);
    assert.deepEqual(await retrieved.json(), item);
  });
});

test('item API deletes items safely', async () => {
  await withItemApi(async ({ request, garageId }) => {
    const first = await request('/', 'POST', {
      name: 'Hammer',
      locationId: garageId
    });

    assert.equal(first.status, 201);
    const hammer = await first.json();

    const second = await request('/', 'POST', {
      name: 'Screwdriver',
      locationId: garageId
    });

    assert.equal(second.status, 201);
    const screwdriver = await second.json();

    const deleted = await request(
      `/${hammer.id}`,
      'DELETE'
    );

    assert.equal(deleted.status, 204);
    assert.equal(await deleted.text(), '');

    const missing = await request(`/${hammer.id}`);

    assert.equal(missing.status, 404);

    const all = await request('/');

    assert.equal(all.status, 200);
    assert.deepEqual(await all.json(), [screwdriver]);

    const filtered = await request(
      `/?locationId=${garageId}`
    );

    assert.equal(filtered.status, 200);
    assert.deepEqual(await filtered.json(), [screwdriver]);

    const repeated = await request(
      `/${hammer.id}`,
      'DELETE'
    );

    assert.equal(repeated.status, 404);
  });
});

test('item API rejects invalid editing and deletion IDs', async () => {
  await withItemApi(async ({ request }) => {
    const invalidPaths = [
      '/0',
      '/-1',
      '/1.5',
      '/abc'
    ];

    for (const path of invalidPaths) {
      const updated = await request(path, 'PATCH', {
        name: 'Hammer'
      });

      assert.equal(updated.status, 400);

      const deleted = await request(path, 'DELETE');

      assert.equal(deleted.status, 400);
    }

    const missingUpdate = await request(
      '/99999',
      'PATCH',
      { name: 'Hammer' }
    );

    assert.equal(missingUpdate.status, 404);

    const missingDelete = await request(
      '/99999',
      'DELETE'
    );

    assert.equal(missingDelete.status, 404);
  });
});
