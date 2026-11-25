
const { randomBytes, createHash } = require('node:crypto');

const SESSION_COOKIE = 'storagemap_session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function createSession(db, userId) {
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = Date.now() + SESSION_DURATION;

  db.prepare(`
    DELETE FROM sessions
    WHERE expires_at <= ?
  `).run(Date.now());

  db.prepare(`
    INSERT INTO sessions (token_hash, user_id, expires_at)
    VALUES (?, ?, ?)
  `).run(tokenHash, userId, expiresAt);

  return token;
}

function getSessionToken(req) {
  const cookies = (req.headers.cookie || '').split(';');

  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');

    if (
      name === SESSION_COOKIE &&
      /^[a-f0-9]{64}$/.test(value || '')
    ) {
      return value;
    }
  }

  return null;
}

function getSessionUser(db, token) {
  if (!token) {
    return null;
  }

  return db.prepare(`
    SELECT
      users.id,
      users.username,
      users.email,
      users.created_at AS createdAt
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ?
      AND sessions.expires_at > ?
  `).get(hashToken(token), Date.now()) || null;
}

function deleteSession(db, token) {
  if (token) {
    db.prepare(`
      DELETE FROM sessions
      WHERE token_hash = ?
    `).run(hashToken(token));
  }
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  };
}

function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, {
    ...sessionCookieOptions(),
    maxAge: SESSION_DURATION
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
}

module.exports = {
  createSession,
  getSessionToken,
  getSessionUser,
  deleteSession,
  setSessionCookie,
  clearSessionCookie
};
