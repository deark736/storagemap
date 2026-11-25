
const { randomBytes, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = {
  N: 32768,
  r: 8,
  p: 3,
  maxmem: 64 * 1024 * 1024
};

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');

  const derivedKey = await scryptAsync(
    password,
    salt,
    KEY_LENGTH,
    SCRYPT_OPTIONS
  );

  return `${salt}:${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
  if (typeof password !== 'string' ||
      typeof storedHash !== 'string') {
    return false;
  }

  const parts = storedHash.split(':');

  if (parts.length !== 2) {
    return false;
  }

  const [salt, hash] = parts;

  if (!/^[a-f0-9]{32}$/.test(salt) ||
      !/^[a-f0-9]{128}$/.test(hash)) {
    return false;
  }

  const storedKey = Buffer.from(hash, 'hex');

  const derivedKey = await scryptAsync(
    password,
    salt,
    KEY_LENGTH,
    SCRYPT_OPTIONS
  );

  return timingSafeEqual(storedKey, derivedKey);
}

module.exports = {
  hashPassword,
  verifyPassword
};
