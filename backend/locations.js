const express = require('express');

function createLocationRouter(db) {
  const router = express.Router();
  const select = db.prepare('SELECT id, name, parent_id AS parentId FROM locations WHERE id = ?');

  router.get('/', (req, res) => {
    const locations = db.prepare('SELECT id, name, parent_id AS parentId FROM locations ORDER BY id').all();
    res.json(locations);
  });

  router.get('/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid location ID' });
    const location = select.get(id);
    if (!location) return res.status(404).json({ error: 'Location not found' });
    res.json(location);
  });

  router.post('/', (req, res) => {
    const { name, parentId = null } = req.body || {};
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
      return res.status(400).json({ error: 'Name must be 1–100 characters' });
    }
    if (parentId !== null && (!Number.isSafeInteger(parentId) || parentId < 1)) {
      return res.status(400).json({ error: 'Invalid parentId' });
    }
    if (parentId !== null && !select.get(parentId)) {
      return res.status(404).json({ error: 'Parent location not found' });
    }
    const result = db.prepare('INSERT INTO locations (name, parent_id) VALUES (?, ?)').run(name.trim(), parentId);
    res.status(201).location(`/api/locations/${result.lastInsertRowid}`).json(select.get(result.lastInsertRowid));
  });

  router.patch('/:id', (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid location ID' });
    }

    const location = select.get(id);

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const body = req.body;

    if (!body || typeof body !== 'object' ||
        Array.isArray(body)) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const keys = Object.keys(body);

    if (!keys.length ||
        keys.some(key => !['name', 'parentId'].includes(key))) {
      return res.status(400).json({ error: 'Invalid update fields' });
    }

    let name = location.name;
    let parentId = location.parentId;

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

    if (Object.hasOwn(body, 'parentId')) {
      parentId = body.parentId;

      if (parentId !== null &&
          (!Number.isSafeInteger(parentId) || parentId < 1)) {
        return res.status(400).json({
          error: 'Invalid parentId'
        });
      }

      if (parentId === id) {
        return res.status(400).json({
          error: 'A location cannot be its own parent'
        });
      }

      if (parentId !== null && !select.get(parentId)) {
        return res.status(404).json({
          error: 'Parent location not found'
        });
      }

      // Prevent moving a location inside its own descendant.
      let current = parentId;
      const visited = new Set();

      while (current !== null) {
        if (current === id || visited.has(current)) {
          return res.status(400).json({
            error: 'Circular location hierarchy'
          });
        }

        visited.add(current);
        current = select.get(current)?.parentId ?? null;
      }
    }

    db.prepare(`
      UPDATE locations
      SET name = ?, parent_id = ?
      WHERE id = ?
    `).run(name, parentId, id);

    res.json(select.get(id));
  });

  router.delete('/:id', (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({
        error: 'Invalid location ID'
      });
    }

    const location = select.get(id);

    if (!location) {
      return res.status(404).json({
        error: 'Location not found'
      });
    }

    try {
      db.prepare(
        'DELETE FROM locations WHERE id = ?'
      ).run(id);

      res.status(204).end();

    } catch (error) {
      if (
        error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' ||
        error.code === 'SQLITE_CONSTRAINT_TRIGGER'
      ) {
        return res.status(409).json({
          error: 'Location contains child locations or items'
        });
      }

      throw error;
    }
  });

  return router;
}

module.exports = createLocationRouter;
