import { DatabaseSync } from "node:sqlite";
import path from "path";

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "data.sqlite");

// Node's built-in SQLite module (stable since Node 22.5, no flag needed) —
// used instead of better-sqlite3 so `npm install` never needs a C++
// compiler/Python toolchain to build a native module. Its prepare/run/get/all
// API and error messages (e.g. "UNIQUE constraint failed: ...") match
// better-sqlite3 closely enough that the rest of this codebase is unchanged.
const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

/**
 * node:sqlite's own types are stricter than this codebase wants — params
 * reject `undefined` (only `null`), and get/all return a generic
 * SQLOutputValue record that doesn't overlap with our row interfaces, so
 * every `as SomeRow` cast at the call site fails to typecheck. Routes
 * already validate/narrow their inputs and know their own row shapes, so
 * this wrapper loosens both back to `any`, matching better-sqlite3's own
 * (equally loose) types — that's what every call site was written against.
 */
export function prepare(sql: string) {
  const stmt = db.prepare(sql);
  return {
    get: (...params: unknown[]): any => stmt.get(...(params as any[])),
    all: (...params: unknown[]): any[] => stmt.all(...(params as any[])),
    run: (...params: unknown[]) => stmt.run(...(params as any[])),
  };
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    email_verified INTEGER NOT NULL DEFAULT 0,
    phone_verified INTEGER NOT NULL DEFAULT 0,
    display_name TEXT NOT NULL,
    postcode TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    radius_miles INTEGER NOT NULL DEFAULT 15,
    bio TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS otp_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    channel TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    consumed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS card_listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    list_type TEXT NOT NULL CHECK (list_type IN ('have', 'want')),
    card_id TEXT NOT NULL,
    card_name TEXT NOT NULL,
    set_name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    image_url_large TEXT NOT NULL DEFAULT '',
    market_price REAL,
    market_price_currency TEXT,
    condition TEXT,
    added_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, list_type, card_id)
  );

  CREATE TABLE IF NOT EXISTS swipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('like', 'pass')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, target_user_id)
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_a INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_a, user_b)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    confirmed_by_a INTEGER NOT NULL DEFAULT 0,
    confirmed_by_b INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trade_id INTEGER NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    rater_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ratee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
    review TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(trade_id, rater_id)
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    details TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_card_listings_card ON card_listings(card_id);
  CREATE INDEX IF NOT EXISTS idx_swipes_user ON swipes(user_id);
  CREATE INDEX IF NOT EXISTS idx_messages_match ON messages(match_id);
`);

// Lightweight migration: CREATE TABLE IF NOT EXISTS above doesn't add new
// columns to a table that already existed from a previous run, so add any
// missing ones by hand for databases created before they existed.
const cardListingColumns = db.prepare(`PRAGMA table_info(card_listings)`).all() as { name: string }[];
const existingColumnNames = new Set(cardListingColumns.map((c) => c.name));
const cardListingMigrations: Record<string, string> = {
  image_url_large: `ALTER TABLE card_listings ADD COLUMN image_url_large TEXT NOT NULL DEFAULT ''`,
  market_price_currency: `ALTER TABLE card_listings ADD COLUMN market_price_currency TEXT`,
};
for (const [column, statement] of Object.entries(cardListingMigrations)) {
  if (!existingColumnNames.has(column)) db.exec(statement);
}
