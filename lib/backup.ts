import fs from "node:fs";
import path from "node:path";
import { db } from "./db";

/** Where the data lives (the persistent volume on Fly). */
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
export const BACKUP_DIR = path.join(DATA_DIR, "backups");
const KEEP_DAYS = Number(process.env.BACKUP_KEEP_DAYS || 7);

const today = () => new Date().toISOString().slice(0, 10);
const fileFor = (day: string) => path.join(BACKUP_DIR, `agency-${day}.db`);

/**
 * Writes a consistent copy of the database (SQLite VACUUM INTO, safe while the app runs)
 * once a day and keeps the last KEEP_DAYS copies. Volume snapshots on Fly cover the
 * uploaded files; these copies make a quick, known-good database restore possible.
 */
export function dailyBackup(): { made: boolean; file?: string } {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const file = fileFor(today());
  if (fs.existsSync(file)) return { made: false, file };
  const tmp = file + ".tmp";
  if (fs.existsSync(tmp)) fs.rmSync(tmp);
  db().exec(`VACUUM INTO '${tmp.replace(/'/g, "''")}'`);
  fs.renameSync(tmp, file);
  prune();
  console.log(`[backup] wrote ${path.basename(file)} (${(fs.statSync(file).size / 1024).toFixed(0)} KB)`);
  return { made: true, file };
}

function prune() {
  const files = fs.readdirSync(BACKUP_DIR).filter((f) => /^agency-\d{4}-\d{2}-\d{2}\.db$/.test(f)).sort();
  for (const f of files.slice(0, Math.max(0, files.length - KEEP_DAYS))) fs.rmSync(path.join(BACKUP_DIR, f));
}

export function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith(".db")).sort().reverse()
    .map((f) => ({ name: f, kb: Math.round(fs.statSync(path.join(BACKUP_DIR, f)).size / 1024) }));
}
