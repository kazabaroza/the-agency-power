import crypto from "node:crypto";
import { cookies } from "next/headers";
import { get, insert, id, run } from "./db";

export type User = { id: string; email: string | null; phone: string | null; name: string | null; language: string };

const COOKIE = "tap_session";
const SECRET = process.env.SESSION_SECRET || "dev-only-secret-change-me";
const MAX_AGE = 60 * 60 * 24 * 30;

const sign = (v: string) => crypto.createHmac("sha256", SECRET).update(v).digest("base64url");
const hash = (v: string) => crypto.createHash("sha256").update(v + SECRET).digest("hex");

export function makeToken(userId: string) {
  const payload = `${userId}.${Math.floor(Date.now() / 1000) + MAX_AGE}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token?: string): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const payload = `${parts[0]}.${parts[1]}`;
  const expected = sign(payload);
  if (expected.length !== parts[2].length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts[2]))) return null;
  if (Number(parts[1]) < Date.now() / 1000) return null;
  return parts[0];
}

export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  const uid = verifyToken(jar.get(COOKIE)?.value);
  if (!uid) return null;
  return get<User>("SELECT id, email, phone, name, language FROM users WHERE id = ?", uid) ?? null;
}

export async function requireUser(): Promise<User> {
  const u = await currentUser();
  if (!u) throw new Response("Unauthorized", { status: 401 });
  return u;
}

export async function setSession(userId: string) {
  const jar = await cookies();
  jar.set(COOKIE, makeToken(userId), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: MAX_AGE, path: "/" });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

/** Creates a 6-digit login code. Returns the code only when no email provider is configured (demo). */
export async function createOtp(email: string): Promise<{ sent: boolean; demoCode?: string }> {
  const code = String(crypto.randomInt(100000, 1000000));
  run("DELETE FROM otps WHERE email = ?", email);
  insert("otps", { email, code_hash: hash(code), expires_at: Date.now() + 10 * 60_000, attempts: 0 });
  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: "קוד הכניסה שלך ל-The Agency Power",
        text: `קוד הכניסה שלך: ${code}\nהקוד בתוקף ל-10 דקות.`,
      }),
    });
    if (res.ok) return { sent: true };
  }
  return { sent: false, demoCode: code };
}

export function verifyOtp(email: string, code: string): boolean {
  const row = get<{ code_hash: string; expires_at: number; attempts: number }>("SELECT * FROM otps WHERE email = ?", email);
  if (!row || row.expires_at < Date.now() || row.attempts >= 5) return false;
  if (row.code_hash !== hash(code.trim())) {
    run("UPDATE otps SET attempts = attempts + 1 WHERE email = ?", email);
    return false;
  }
  run("DELETE FROM otps WHERE email = ?", email);
  return true;
}

export function findOrCreateUser(by: { email?: string; phone?: string; name?: string }): User {
  const existing = by.email
    ? get<User>("SELECT id, email, phone, name, language FROM users WHERE email = ?", by.email)
    : get<User>("SELECT id, email, phone, name, language FROM users WHERE phone = ?", by.phone ?? "");
  if (existing) return existing;
  const uid = id("u_");
  insert("users", { id: uid, email: by.email ?? null, phone: by.phone ?? null, name: by.name ?? null });
  return get<User>("SELECT id, email, phone, name, language FROM users WHERE id = ?", uid)!;
}
