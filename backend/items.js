
const express = require('express');

function createItemRouter(db) {
  const router = express.Router();

  const fields = `
    id,
    name,
    description,
    quantity,
    location_id AS locationId,
    category_id AS categoryId,
    created_at AS createdAt
  `;

  const select = db.prepare(`
    SELECT ${fields}
    FROM items
    WHERE id = ?
  `);

  const selectLocation = db.prepare(
    'SELECT id FROM locations WHERE id = ?'
  );

  const selectCategory = db.prepare(
    'SELECT id FROM categories WHERE id = ?'
  );

  router.get('/', (req, res) => {
    const { locationId } = req.query;

    if (locationId !== undefined) {
      const id = Number(locationId);

      if (typeof locationId !== 'string' ||
          !Number.isSafeInteger(id) || id < 1) {
        return res.status(400).json({
          error: 'Invalid locationId'
        });
      }

      if (!selectLocation.get(id)) {
        return res.status(404).json({
          error: 'Location not found'
        });
      }

      const items = db.prepare(`
        SELECT ${fields}
        FROM items
        WHERE location_id = ?
        ORDER BY id
      `).all(id);

      return res.json(items);
    }

    const items = db.prepare(`
      SELECT ${fields}
      FROM items
      ORDER BY id
    `).all();

    res.json(items);
  });

  router.get('/:id', (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({
        error: 'Invalid item ID'
      });
    }

    const item = select.get(id);

    if (!item) {
      return res.status(404).json({
        error: 'Item not found'
      });
    }

    res.json(item);
  });

  router.post('/', (req, res) => {
    const body = req.body;

    if (!body || typeof body !== 'object' ||
        Array.isArray(body)) {
      return res.status(400).json({
        error: 'Invalid request body'
      });
    }

    const {
      name,
      description = null,
      quantity = 1,
      locationId,
      categoryId = null
    } = body;

    const allowedFields = [
      'name',
      'description',
      'quantity',
      'locationId',
      'categoryId'
    ];

    if (Object.keys(body).some(
      key => !allowedFields.includes(key)
    )) {
      return res.status(400).json({
        error: 'Invalid item fields'
      });
    }

    if (typeof name !== 'string' ||
        !name.trim() ||
        name.trim().length > 100) {
      return res.status(400).json({
        error: 'Name must be 1–100 characters'
      });
    }

    if (description !== null &&
        typeof description !== 'string') {
      return res.status(400).json({
        error: 'Description must be a string or null'
      });
    }

    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        error: 'Quantity must be a positive integer'
      });
    }

    if (!Number.isSafeInteger(locationId) || locationId < 1) {
      return res.status(400).json({
        error: 'Invalid locationId'
      });
    }

    if (!selectLocation.get(locationId)) {
      return res.status(404).json({
        error: 'Location not found'
      });
    }

    if (categoryId !== null) {
      if (!Number.isSafeInteger(categoryId) || categoryId < 1) {
        return res.status(400).json({
          error: 'Invalid categoryId'
        });
      }

      if (!selectCategory.get(categoryId)) {
        return res.status(404).json({
          error: 'Category not found'
        });
      }
    }

    const result = db.prepare(`
      INSERT INTO items (
        name,
        description,
        quantity,
        location_id,
        category_id
      )
      VALUES (?, ?, ?, ?, ?)
    `).run(
      name.trim(),
      description,
      quantity,
      locationId,
      categoryId
    );

    res.status(201)
      .location(`/api/items/${result.lastInsertRowid}`)
      .json(select.get(result.lastInsertRowid));
  });


  router.patch('/:id', (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({
        error: 'Invalid item ID'
      });
    }

    const item = select.get(id);

    if (!item) {
      return res.status(404).json({
        error: 'Item not found'
      });
    }

    const body = req.body;

    if (!body || typeof body !== 'object' ||
        Array.isArray(body)) {
      return res.status(400).json({
        error: 'Invalid request body'
      });
    }

    const allowedFields = [
      'name',
      'description',
      'quantity',
      'categoryId'
    ];

    const keys = Object.keys(body);

    if (!keys.length ||
        keys.some(key => !allowedFields.includes(key))) {
      return res.status(400).json({
        error: 'Invalid update fields'
      });
    }

    let {
      name,
      description,
      quantity,
      categoryId
    } = item;

    if (Object.hasOwn(body, 'name')) {
      if (typeof body.name !== 'string' ||
          !body.name.trim() ||
          body.name.trim().length > 100) {
        return res.status(400).json({
          error: 'Name must be 1–100 characters'
        });
      }

      name = body.name.trim();
    }

    if (Object.hasOwn(body, 'description')) {
      if (body.description !== null &&
          typeof body.description !== 'string') {
        return res.status(400).json({
          error: 'Description must be a string or null'
        });
      }

      description = body.description;
    }

    if (Object.hasOwn(body, 'quantity')) {
      if (!Number.isSafeInteger(body.quantity) ||
          body.quantity < 1) {
        return res.status(400).json({
          error: 'Quantity must be a positive integer'
        });
      }

      quantity = body.quantity;
    }

    if (Object.hasOwn(body, 'categoryId')) {
      categoryId = body.categoryId;

      if (categoryId !== null) {
        if (!Number.isSafeInteger(categoryId) ||
            categoryId < 1) {
          return res.status(400).json({
            error: 'Invalid categoryId'
          });
        }

        if (!selectCategory.get(categoryId)) {
          return res.status(404).json({
            error: 'Category not found'
          });
        }
      }
    }

    db.prepare(`
      UPDATE items
      SET name = ?,
          description = ?,
          quantity = ?,
          category_id = ?
      WHERE id = ?
    `).run(
      name,
      description,
      quantity,
      categoryId,
      id
    );

    res.json(select.get(id));
  });

  router.delete('/:id', (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({
        error: 'Invalid item ID'
      });
    }

    const item = select.get(id);

    if (!item) {
      return res.status(404).json({
        error: 'Item not found'
      });
    }

    db.prepare(
      'DELETE FROM items WHERE id = ?'
    ).run(id);

    res.status(204).end();
  });

  return router;
}

module.exports = createItemRouter;
