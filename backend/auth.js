
const express = require('express');
const { hashPassword, verifyPassword } = require('./passwords');
const {
  createSession,
  getSessionToken,
  getSessionUser,
  deleteSession,
  setSessionCookie,
  clearSessionCookie
} = require('./sessions');

function createAuthRouter(db) {
  const router = express.Router();

  const insertUser = db.prepare(`
    INSERT INTO users (username, email, password_hash)
    VALUES (?, ?, ?)
  `);

  const selectUser = db.prepare(`
    SELECT
      id,
      username,
      email,
      created_at AS createdAt
    FROM users
    WHERE id = ?
  `);

  const selectUserByIdentifier = db.prepare(`
    SELECT
      id,
      username,
      email,
      password_hash,
      created_at AS createdAt
    FROM users
    WHERE username = ? OR email = ?
  `);

  router.post('/register', async (req, res, next) => {
    const { username, email, password } = req.body || {};

    if (
      typeof username !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string'
    ) {
      return res.status(400).json({
        error: 'Username, email, and password are required'
      });
    }

    const normalizedUsername = username.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[a-zA-Z0-9_]{3,50}$/.test(normalizedUsername)) {
      return res.status(400).json({
        error: 'Username must contain 3–50 letters, numbers, or underscores'
      });
    }

    if (
      normalizedEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      return res.status(400).json({
        error: 'Invalid email address'
      });
    }

    if (password.length < 15 || password.length > 128) {
      return res.status(400).json({
        error: 'Password must contain 15–128 characters'
      });
    }

    try {
      const passwordHash = await hashPassword(password);

      const result = insertUser.run(
        normalizedUsername,
        normalizedEmail,
        passwordHash
      );

      const user = selectUser.get(result.lastInsertRowid);

      return res.status(201).json(user);
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({
          error: 'Username or email already exists'
        });
      }

      return next(error);
    }
  });


  router.post('/login', async (req, res, next) => {
    const { identifier, password } = req.body || {};

    if (
      typeof identifier !== 'string' ||
      typeof password !== 'string' ||
      !identifier.trim() ||
      identifier.trim().length > 254 ||
      !password ||
      password.length > 128
    ) {
      return res.status(400).json({
        error: 'Valid login credentials are required'
      });
    }

    try {
      const normalizedIdentifier = identifier.trim();

      const user = selectUserByIdentifier.get(
        normalizedIdentifier,
        normalizedIdentifier
      );

      const validPassword = await verifyPassword(
        password,
        user?.password_hash ||
          '0'.repeat(32) + ':' + '0'.repeat(128)
      );

      if (!user || !validPassword) {
        return res.status(401).json({
          error: 'Invalid username, email, or password'
        });
      }

      const previousToken = getSessionToken(req);
      const token = createSession(db, user.id);

      deleteSession(db, previousToken);
      setSessionCookie(res, token);

      return res.status(200).json({
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/me', (req, res, next) => {
    try {
      const token = getSessionToken(req);
      const user = getSessionUser(db, token);

      if (!user) {
        return res.status(401).json({
          error: 'Authentication required'
        });
      }

      res.set('Cache-Control', 'no-store');

      return res.status(200).json(user);
    } catch (error) {
      return next(error);
    }
  });


  router.post('/logout', (req, res, next) => {
    try {
      const token = getSessionToken(req);

      deleteSession(db, token);
      clearSessionCookie(res);

      return res.status(204).end();
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = createAuthRouter;
