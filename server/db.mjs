import { execFile } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const SQLITE = process.env.SQLITE_BIN || '/usr/bin/sqlite3';
const DB_PATH =
  process.env.DATABASE_URL || join(dirname(fileURLToPath(import.meta.url)), 'data', 'focusflow.sqlite');
let dbQueue = Promise.resolve();

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

async function runSql(sql, { json = false } = {}) {
  const task = dbQueue.then(async () => {
    const args = json ? ['-json', DB_PATH, sql] : [DB_PATH, sql];
    const { stdout } = await execFileAsync(SQLITE, args, { maxBuffer: 10 * 1024 * 1024 });
    return json ? JSON.parse(stdout || '[]') : stdout;
  });

  dbQueue = task.catch(() => {});
  return task;
}

export async function initDatabase() {
  mkdirSync(dirname(DB_PATH), { recursive: true });

  await runSql(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      display_name TEXT,
      password_hash TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      project TEXT NOT NULL DEFAULT 'Inbox',
      status TEXT NOT NULL DEFAULT 'active',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS steps (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      minutes INTEGER NOT NULL DEFAULT 15,
      done INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS focus_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      task_id TEXT,
      step_id TEXT,
      planned_minutes INTEGER NOT NULL DEFAULT 0,
      elapsed_seconds INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      settings_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_states (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      state_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    DELETE FROM sessions WHERE expires_at <= CURRENT_TIMESTAMP;
  `);
}

export async function createUser({ id, email, displayName, passwordHash }) {
  await runSql(`
    INSERT INTO users (id, email, display_name, password_hash)
    VALUES (${sqlString(id)}, ${sqlString(email)}, ${sqlString(displayName)}, ${sqlString(passwordHash)});
  `);
}

export async function getUserByEmail(email) {
  const rows = await runSql(
    `SELECT id, email, display_name, password_hash FROM users WHERE email = ${sqlString(email)} LIMIT 1;`,
    { json: true }
  );
  return rows[0] || null;
}

export async function getUserById(userId) {
  const rows = await runSql(
    `SELECT id, email, display_name FROM users WHERE id = ${sqlString(userId)} LIMIT 1;`,
    { json: true }
  );
  return rows[0] || null;
}

export async function createSession({ id, userId, expiresAt }) {
  await runSql(`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (${sqlString(id)}, ${sqlString(userId)}, ${sqlString(expiresAt)});
  `);
}

export async function getSession(sessionId) {
  const rows = await runSql(
    `SELECT sessions.id, sessions.user_id, users.email, users.display_name
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.id = ${sqlString(sessionId)}
       AND sessions.expires_at > CURRENT_TIMESTAMP
     LIMIT 1;`,
    { json: true }
  );
  return rows[0] || null;
}

export async function deleteSession(sessionId) {
  await runSql(`DELETE FROM sessions WHERE id = ${sqlString(sessionId)};`);
}

export async function getAppState(userId) {
  const rows = await runSql(
    `SELECT state_json FROM app_states WHERE user_id = ${sqlString(userId)} LIMIT 1;`,
    { json: true }
  );

  if (!rows[0]?.state_json) return null;
  return JSON.parse(rows[0].state_json);
}

export async function saveAppState(userId, state) {
  const stateJson = JSON.stringify(state);
  await runSql(`
    INSERT INTO app_states (user_id, state_json, updated_at)
    VALUES (${sqlString(userId)}, ${sqlString(stateJson)}, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      state_json = excluded.state_json,
      updated_at = CURRENT_TIMESTAMP;
  `);
}

export async function getDatabaseInfo(userId = '') {
  const rows = await runSql(
    userId
      ? `SELECT updated_at FROM app_states WHERE user_id = ${sqlString(userId)} LIMIT 1;`
      : 'SELECT updated_at FROM app_states ORDER BY updated_at DESC LIMIT 1;',
    { json: true }
  );

  const userRows = await runSql('SELECT COUNT(*) AS count FROM users;', { json: true });

  return {
    type: 'sqlite',
    path: DB_PATH,
    userId: userId || null,
    users: Number(userRows[0]?.count || 0),
    hasState: Boolean(rows[0]),
    updatedAt: rows[0]?.updated_at || null
  };
}
