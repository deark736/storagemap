
const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "storagemap.db");
const db = new Database(dbPath);

db.pragma("foreign_keys = ON");

module.exports = db;
