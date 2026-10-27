import { findOrCreateUser, setSession, verifyOtp } from "@/lib/auth";
import { json } from "@/lib/http";

export async function POST(req: Request) {
  const { email, code, name } = (await req.json()) as { email?: string; code?: string; name?: string };
  const e = (email || "").toLowerCase().trim();
  if (!e || !code || !verifyOtp(e, code)) return json({ error: "הקוד שגוי או שפג תוקפו" }, 400);
  const user = findOrCreateUser({ email: e, name });
  await setSession(user.id);
  return json({ ok: true });
}
