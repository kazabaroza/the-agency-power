import { findOrCreateUser, setSession, verifyOtp } from "@/lib/auth";
import { json } from "@/lib/http";
import { clientIp, rateLimit, tooMany } from "@/lib/security";

export async function POST(req: Request) {
  const { email, code, name } = (await req.json().catch(() => ({}))) as { email?: string; code?: string; name?: string };
  const e = (email || "").toLowerCase().trim();
  if (!rateLimit(`verify-ip:${clientIp(req)}`, 20, 15 * 60_000) || !rateLimit(`verify-mail:${e}`, 10, 15 * 60_000)) return tooMany();
  if (!e || !code || !verifyOtp(e, code)) return json({ error: "הקוד שגוי או שפג תוקפו" }, 400);
  const user = findOrCreateUser({ email: e, name });
  await setSession(user.id);
  return json({ ok: true });
}
