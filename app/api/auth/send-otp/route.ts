import { createOtp } from "@/lib/auth";
import { json } from "@/lib/http";

/** Comma-separated emails allowed to sign in. Empty = anyone (only safe with a real email provider). */
function allowlist(): string[] {
  return (process.env.LOGIN_ALLOWLIST || "").split(/[,\s]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
}

const hasEmailProvider = () => !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
const isPublic = () => process.env.NODE_ENV === "production" && !/localhost|127\.0\.0\.1/.test(process.env.APP_URL || "localhost");

export async function POST(req: Request) {
  const { email } = (await req.json()) as { email?: string };
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "אימייל לא תקין" }, 400);
  const e = email.toLowerCase().trim();
  const list = allowlist();

  if (list.length && !list.includes(e)) return json({ error: "לכתובת הזו אין הרשאת כניסה למערכת." }, 403);
  // Without an email provider the code is shown on screen. On a public site that would let
  // anyone sign in as anyone, so it is only allowed for allowlisted addresses.
  if (!hasEmailProvider() && isPublic() && !list.length) {
    return json({ error: "הכניסה נעולה: צריך להגדיר LOGIN_ALLOWLIST (רשימת מיילים מורשים) או שירות שליחת מיילים." }, 403);
  }

  const r = await createOtp(e);
  return json({ ok: true, sent: r.sent, demoCode: r.demoCode });
}
