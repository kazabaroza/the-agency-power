import { createOtp } from "@/lib/auth";
import { json } from "@/lib/http";
import { accessCodeOk, clientIp, hasEmailProvider, isPublicDeploy, loginAllowlist, rateLimit, tooMany } from "@/lib/security";

export async function POST(req: Request) {
  const { email, accessCode } = (await req.json().catch(() => ({}))) as { email?: string; accessCode?: string };
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "אימייל לא תקין" }, 400);
  const e = email.toLowerCase().trim();
  if (!rateLimit(`otp-ip:${clientIp(req)}`, 10, 15 * 60_000) || !rateLimit(`otp-mail:${e}`, 5, 15 * 60_000)) return tooMany();

  const list = loginAllowlist();
  if (list.length && !list.includes(e)) return json({ error: "לכתובת הזו אין הרשאת כניסה למערכת." }, 403);

  // Without an email provider the code is shown on screen. On a public site that is only
  // safe after a personal access code that only the owner knows.
  if (!hasEmailProvider() && isPublicDeploy()) {
    if (!process.env.ACCESS_CODE) return json({ error: "הכניסה נעולה: צריך להגדיר ACCESS_CODE או שירות שליחת מיילים." }, 403);
    if (!accessCodeOk(accessCode)) return json({ error: accessCode ? "קוד הגישה שגוי." : "נדרש קוד גישה אישי.", needAccessCode: true }, 403);
  }

  const r = await createOtp(e);
  if (r.error) return json({ error: r.error }, 502);
  return json({ ok: true, sent: r.sent, demoCode: r.demoCode });
}
