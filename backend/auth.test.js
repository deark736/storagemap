
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const Database = require('better-sqlite3');
const express = require('express');
const { initializeDatabase } = require('./database');
const createAuthRouter = require('./auth');
const { hashPassword, verifyPassword } = require('./passwords');

const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'StorageMapTest123!'
};

async function withAuthApi(run) {
  const db = initializeDatabase(new Database(':memory:'));

  const app = express();
  app.use(express.json());
  app.use('/api/auth', createAuthRouter(db));

  const server = app.listen(0);

  try {
    const base =
      `http://127.0.0.1:${server.address().port}/api/auth`;

    const request = (path, method = 'GET', body, cookie) =>
      fetch(`${base}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(cookie ? { Cookie: cookie } : {})
        },
        ...(body !== undefined
          ? { body: JSON.stringify(body) }
          : {})
      });

    const register = () =>
      request('/register', 'POST', testUser);

    const login = () =>
      request('/login', 'POST', {
        identifier: testUser.username,
        password: testUser.password
      });

    await run({ db, request, register, login });
  } finally {
    await new Promise(resolve => server.close(resolve));
    db.close();
  }
}

function extractCookie(response) {
  const header = response.headers.get('set-cookie');

  assert.ok(header);
  assert.match(header, /HttpOnly/i);
  assert.match(header, /SameSite=Lax/i);

  return header.split(';')[0];
}

test('password hashing uses unique salts and verifies passwords', async () => {
  const firstHash = await hashPassword(testUser.password);
  const secondHash = await hashPassword(testUser.password);

  assert.notEqual(firstHash, testUser.password);
  assert.notEqual(firstHash, secondHash);

  assert.equal(
    await verifyPassword(testUser.password, firstHash),
    true
  );

  assert.equal(
    await verifyPassword('WrongPassword', firstHash),
    false
  );

  assert.equal(
    await verifyPassword(testUser.password, 'invalid-hash'),
    false
  );
});

test('auth API registers users without exposing passwords', async () => {
  await withAuthApi(async ({ db, register }) => {
    const response = await register();

    assert.equal(response.status, 201);

    const user = await response.json();

    assert.equal(user.username, testUser.username);
    assert.equal(user.email, testUser.email);
    assert.ok(user.id);
    assert.ok(user.createdAt);
    assert.equal(user.password, undefined);
    assert.equal(user.password_hash, undefined);

    const stored = db.prepare(`
      SELECT password_hash
      FROM users
      WHERE id = ?
    `).get(user.id);

    assert.notEqual(stored.password_hash, testUser.password);

    assert.equal(
      await verifyPassword(
        testUser.password,
        stored.password_hash
      ),
      true
    );
  });
});

test('auth API rejects invalid registration requests', async () => {
  await withAuthApi(async ({ db, request }) => {
    const invalidUsers = [
      {},
      { ...testUser, username: 'ab' },
      { ...testUser, username: 'invalid username' },
      { ...testUser, email: 'invalid-email' },
      { ...testUser, password: 'short' },
      { ...testUser, password: 'a'.repeat(129) }
    ];

    for (const user of invalidUsers) {
      const response = await request(
        '/register', 'POST', user
      );

      assert.equal(response.status, 400);
    }

    const result = db.prepare(`
      SELECT COUNT(*) AS count FROM users
    `).get();

    assert.equal(result.count, 0);
  });
});

test('auth API rejects duplicate usernames and emails', async () => {
  await withAuthApi(async ({ request, register }) => {
    assert.equal((await register()).status, 201);

    const duplicateUsername = await request(
      '/register', 'POST', {
        ...testUser,
        username: 'TESTUSER',
        email: 'another@example.com'
      }
    );

    assert.equal(duplicateUsername.status, 409);

    const duplicateEmail = await request(
      '/register', 'POST', {
        ...testUser,
        username: 'anotheruser',
        email: 'TEST@EXAMPLE.COM'
      }
    );

    assert.equal(duplicateEmail.status, 409);
  });
});

test('auth API supports login by username or email', async () => {
  await withAuthApi(async ({ request, register }) => {
    assert.equal((await register()).status, 201);

    for (const identifier of [
      testUser.username,
      'TESTUSER',
      testUser.email,
      'TEST@EXAMPLE.COM'
    ]) {
      const response = await request('/login', 'POST', {
        identifier,
        password: testUser.password
      });

      assert.equal(response.status, 200);

      const user = await response.json();

      assert.equal(user.username, testUser.username);
      assert.equal(user.password_hash, undefined);

      extractCookie(response);
    }
  });
});

test('auth API rejects incorrect login credentials', async () => {
  await withAuthApi(async ({ request, register }) => {
    assert.equal((await register()).status, 201);

    for (const credentials of [
      {
        identifier: testUser.username,
        password: 'WrongPassword'
      },
      {
        identifier: 'unknownuser',
        password: testUser.password
      }
    ]) {
      const response = await request(
        '/login', 'POST', credentials
      );

      assert.equal(response.status, 401);
      assert.equal(response.headers.get('set-cookie'), null);

      const result = await response.json();

      assert.equal(
        result.error,
        'Invalid username, email, or password'
      );
    }
  });
});

test('auth API stores hashed session tokens', async () => {
  await withAuthApi(async ({ db, register, login }) => {
    assert.equal((await register()).status, 201);

    const response = await login();

    assert.equal(response.status, 200);

    const cookie = extractCookie(response);
    const token = cookie.split('=')[1];

    const expectedHash = createHash('sha256')
      .update(token)
      .digest('hex');

    const session = db.prepare(`
      SELECT token_hash, expires_at
      FROM sessions
    `).get();

    assert.notEqual(session.token_hash, token);
    assert.equal(session.token_hash, expectedHash);
    assert.ok(session.expires_at > Date.now());
  });
});

test('auth API retrieves the authenticated user', async () => {
  await withAuthApi(async ({ request, register, login }) => {
    assert.equal((await register()).status, 201);

    const loginResponse = await login();

    assert.equal(loginResponse.status, 200);

    const cookie = extractCookie(loginResponse);

    const response = await request(
      '/me', 'GET', undefined, cookie
    );

    assert.equal(response.status, 200);

    const user = await response.json();

    assert.equal(user.username, testUser.username);
    assert.equal(user.email, testUser.email);
    assert.equal(user.password_hash, undefined);
  });
});

test('auth API rejects missing or invalid sessions', async () => {
  await withAuthApi(async ({ request }) => {
    const missing = await request('/me');

    assert.equal(missing.status, 401);

    const invalid = await request(
      '/me',
      'GET',
      undefined,
      'storagemap_session=' + '0'.repeat(64)
    );

    assert.equal(invalid.status, 401);
  });
});

test('auth API rejects expired sessions', async () => {
  await withAuthApi(async ({
    db, request, register, login
  }) => {
    assert.equal((await register()).status, 201);

    const loginResponse = await login();
    const cookie = extractCookie(loginResponse);

    db.prepare(`
      UPDATE sessions SET expires_at = ?
    `).run(Date.now() - 1000);

    const response = await request(
      '/me', 'GET', undefined, cookie
    );

    assert.equal(response.status, 401);
  });
});

test('auth API replaces the previous session on login', async () => {
  await withAuthApi(async ({
    request, register, login
  }) => {
    assert.equal((await register()).status, 201);

    const firstLogin = await login();
    const oldCookie = extractCookie(firstLogin);

    const secondLogin = await request(
      '/login', 'POST', {
        identifier: testUser.username,
        password: testUser.password
      }, oldCookie
    );

    assert.equal(secondLogin.status, 200);

    const newCookie = extractCookie(secondLogin);

    assert.notEqual(oldCookie, newCookie);

    const oldSession = await request(
      '/me', 'GET', undefined, oldCookie
    );

    assert.equal(oldSession.status, 401);

    const newSession = await request(
      '/me', 'GET', undefined, newCookie
    );

    assert.equal(newSession.status, 200);
  });
});

test('auth API invalidates sessions on logout', async () => {
  await withAuthApi(async ({
    db, request, register, login
  }) => {
    assert.equal((await register()).status, 201);

    const loginResponse = await login();
    const cookie = extractCookie(loginResponse);

    const logoutResponse = await request(
      '/logout', 'POST', undefined, cookie
    );

    assert.equal(logoutResponse.status, 204);

    assert.match(
      logoutResponse.headers.get('set-cookie') || '',
      /storagemap_session=;/
    );

    const sessions = db.prepare(`
      SELECT COUNT(*) AS count FROM sessions
    `).get();

    assert.equal(sessions.count, 0);

    const response = await request(
      '/me', 'GET', undefined, cookie
    );

    assert.equal(response.status, 401);

    const repeatedLogout = await request(
      '/logout', 'POST'
    );

    assert.equal(repeatedLogout.status, 204);
  });
});
