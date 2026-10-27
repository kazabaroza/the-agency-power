import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = process.env.DATABASE_PATH || path.join(DATA_DIR, "agency.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT UNIQUE, phone TEXT UNIQUE, name TEXT,
  language TEXT DEFAULT 'he', created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS otps (
  email TEXT PRIMARY KEY, code_hash TEXT, expires_at INTEGER, attempts INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY, user_id TEXT, name TEXT, website TEXT, description TEXT,
  audience TEXT, tone TEXT, colors TEXT, logo_url TEXT, language TEXT DEFAULT 'he',
  phone TEXT, location TEXT, created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY, user_id TEXT, brand_id TEXT, channel TEXT DEFAULT 'web',
  history TEXT DEFAULT '[]', created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY, conversation_id TEXT, role TEXT, kind TEXT DEFAULT 'text',
  text TEXT, meta TEXT, created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY, conversation_id TEXT, user_id TEXT, skill TEXT, input TEXT,
  summary TEXT, cost_label TEXT, status TEXT DEFAULT 'pending', result TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY, user_id TEXT, brand_id TEXT, type TEXT, title TEXT,
  data TEXT, url TEXT, status TEXT DEFAULT 'ready', created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS landing_pages (
  id TEXT PRIMARY KEY, user_id TEXT, brand_id TEXT, slug TEXT UNIQUE, title TEXT,
  style TEXT, html TEXT, published INTEGER DEFAULT 1, views INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY, landing_page_id TEXT, user_id TEXT, name TEXT, email TEXT,
  phone TEXT, message TEXT, created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id TEXT PRIMARY KEY, user_id TEXT, brand_id TEXT, asset_id TEXT, platforms TEXT,
  caption TEXT, media_url TEXT, run_at TEXT, status TEXT DEFAULT 'scheduled',
  result TEXT, created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY, user_id TEXT, brand_id TEXT, platform TEXT, name TEXT,
  objective TEXT, daily_budget REAL, currency TEXT DEFAULT 'ILS', location TEXT,
  audiences TEXT, creatives TEXT, keywords TEXT, structure TEXT, landing_url TEXT,
  status TEXT DEFAULT 'draft', external_ids TEXT, metrics TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS connections (
  user_id TEXT, provider TEXT, data TEXT, updated_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, provider)
);
CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY, conversation_id TEXT, agent_slug TEXT, task TEXT, output TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_assets_user ON assets(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sched_due ON scheduled_posts(status, run_at);
`;

const g = globalThis as unknown as { __agencyDb?: DatabaseSync };

export function db(): DatabaseSync {
  if (!g.__agencyDb) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const d = new DatabaseSync(DB_PATH);
    d.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    d.exec(SCHEMA);
    g.__agencyDb = d;
  }
  return g.__agencyDb;
}

export const id = (prefix = "") => prefix + crypto.randomBytes(9).toString("base64url");

type Row = Record<string, unknown>;
type Param = string | number | null | bigint;

export function all<T = Row>(sql: string, ...params: Param[]): T[] {
  return db().prepare(sql).all(...params) as T[];
}
export function get<T = Row>(sql: string, ...params: Param[]): T | undefined {
  return db().prepare(sql).get(...params) as T | undefined;
}
export function run(sql: string, ...params: Param[]) {
  return db().prepare(sql).run(...params);
}

/** Insert a row from an object; objects/arrays are JSON-encoded. */
export function insert(table: string, row: Record<string, unknown>) {
  const keys = Object.keys(row).filter((k) => row[k] !== undefined);
  const vals = keys.map((k) => encode(row[k]));
  run(
    `INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`,
    ...vals,
  );
}

export function update(table: string, idValue: string, patch: Record<string, unknown>, idCol = "id") {
  const keys = Object.keys(patch).filter((k) => patch[k] !== undefined);
  if (!keys.length) return;
  run(
    `UPDATE ${table} SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE ${idCol} = ?`,
    ...keys.map((k) => encode(patch[k])),
    idValue,
  );
}

function encode(v: unknown): Param {
  if (v === null || v === undefined) return null;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "string" || typeof v === "number" || typeof v === "bigint") return v;
  return JSON.stringify(v);
}

export function parse<T>(v: unknown, fallback: T): T {
  if (typeof v !== "string" || !v) return fallback;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}
