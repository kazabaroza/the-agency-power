import crypto from "node:crypto";
import dns from "node:dns/promises";
import net from "node:net";
import { get, run } from "./db";

// ---------------------------------------------------------------- deployment

/** True on a real public deployment (production with a non-local APP_URL). */
export const isPublicDeploy = () =>
  process.env.NODE_ENV === "production" && !/localhost|127\.0\.0\.1/.test(process.env.APP_URL || "localhost");

export const hasEmailProvider = () => !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

/** Client IP as seen by the platform proxy (Fly sets Fly-Client-IP). */
export function clientIp(req: Request) {
  return (
    req.headers.get("fly-client-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

// ---------------------------------------------------------------- rate limiting

type Bucket = { count: number; reset: number };
const g = globalThis as unknown as { __rate?: Map<string, Bucket> };
const buckets = (g.__rate ??= new Map());

/**
 * Fixed-window limiter, in memory (the app runs as one machine).
 * Returns true when the call is allowed.
 */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 20000) for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k);
    return true;
  }
  b.count += 1;
  return b.count <= max;
}

export const tooMany = () =>
  Response.json({ error: "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות." }, { status: 429 });

// ---------------------------------------------------------------- allowlists

const list = (v?: string) => (v || "").split(/[,\s]+/).map((x) => x.trim()).filter(Boolean);

export const loginAllowlist = () => list(process.env.LOGIN_ALLOWLIST).map((e) => e.toLowerCase());

/** Phone numbers as digits only, Israeli 05x normalised to 9725x. */
export function normalizePhone(p: string) {
  const d = p.replace(/\D/g, "");
  return d.startsWith("0") ? "972" + d.slice(1) : d;
}

export const whatsappAllowlist = () => list(process.env.WHATSAPP_ALLOWLIST).map(normalizePhone);

/**
 * Who may talk to the agent on WhatsApp. On a public deployment this is
 * default-deny: only numbers in WHATSAPP_ALLOWLIST get the agent.
 */
export function whatsappAllowed(phone: string) {
  const allowed = whatsappAllowlist();
  if (!allowed.length) return !isPublicDeploy();
  return allowed.includes(normalizePhone(phone));
}

// ---------------------------------------------------------------- access code

/**
 * Without an email provider the login code cannot be delivered privately, so on a
 * public site a personal ACCESS_CODE is required before a code is issued.
 */
export function accessCodeOk(given: string | undefined) {
  const expected = process.env.ACCESS_CODE || "";
  if (!expected || !given) return false;
  const a = crypto.createHash("sha256").update(given.trim()).digest();
  const b = crypto.createHash("sha256").update(expected.trim()).digest();
  return crypto.timingSafeEqual(a, b);
}

// ---------------------------------------------------------------- usage caps

const DAY = () => new Date().toISOString().slice(0, 10);

function ensureUsageTable() {
  run("CREATE TABLE IF NOT EXISTS usage (user_id TEXT, day TEXT, kind TEXT, n INTEGER DEFAULT 0, PRIMARY KEY (user_id, day, kind))");
}

const LIMITS: Record<"turn" | "paid", () => number> = {
  turn: () => Number(process.env.DAILY_TURN_LIMIT || 150),
  paid: () => Number(process.env.DAILY_PAID_LIMIT || 15),
};

/** Counts one unit of usage. Returns false (and counts nothing) when today's cap is reached. */
export function useQuota(userId: string, kind: "turn" | "paid"): boolean {
  ensureUsageTable();
  const day = DAY();
  const used = get<{ n: number }>("SELECT n FROM usage WHERE user_id = ? AND day = ? AND kind = ?", userId, day, kind)?.n ?? 0;
  if (used >= LIMITS[kind]()) return false;
  run(
    "INSERT INTO usage (user_id, day, kind, n) VALUES (?, ?, ?, 1) ON CONFLICT(user_id, day, kind) DO UPDATE SET n = n + 1",
    userId, day, kind,
  );
  return true;
}

// ---------------------------------------------------------------- outbound fetch (SSRF)

function privateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
    );
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return privateIp(v.slice(7));
  return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("ff");
}

async function assertPublicUrl(raw: string): Promise<URL> {
  const u = new URL(raw);
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("only http(s) addresses are allowed");
  if (u.port && !["80", "443"].includes(u.port)) throw new Error("port not allowed");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (/^(localhost|.*\.local|.*\.internal|metadata\..*)$/i.test(host)) throw new Error("internal address not allowed");
  const addrs = net.isIP(host) ? [host] : (await dns.lookup(host, { all: true })).map((a) => a.address);
  if (!addrs.length || addrs.some(privateIp)) throw new Error("internal address not allowed");
  return u;
}

/** fetch() for user-supplied URLs: public http(s) only, redirects re-checked, size-capped text. */
export async function safeFetchText(raw: string, opts: { timeoutMs?: number; maxBytes?: number } = {}) {
  let url = await assertPublicUrl(raw);
  for (let hop = 0; hop < 4; hop++) {
    const r = await fetch(url, {
      redirect: "manual",
      headers: { "User-Agent": "TheAgencyPower/1.0 (+site analysis)" },
      signal: AbortSignal.timeout(opts.timeoutMs ?? 12000),
    });
    if (r.status >= 300 && r.status < 400 && r.headers.get("location")) {
      url = await assertPublicUrl(new URL(r.headers.get("location")!, url).toString());
      continue;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    return buf.subarray(0, opts.maxBytes ?? 2_000_000).toString("utf8");
  }
  throw new Error("too many redirects");
}

// ---------------------------------------------------------------- per-conversation lock

const locks = new Map<string, Promise<unknown>>();

/** Runs fn after any earlier work on the same key has finished (one turn at a time per conversation). */
export function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  const next = prev.catch(() => {}).then(fn);
  locks.set(key, next);
  next.finally(() => { if (locks.get(key) === next) locks.delete(key); }).catch(() => {});
  return next;
}
