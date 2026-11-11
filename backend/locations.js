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

  return router;
}

module.exports = createLocationRouter;
