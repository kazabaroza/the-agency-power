import { createOtp } from "@/lib/auth";
import { json } from "@/lib/http";

export async function POST(req: Request) {
  const { email } = (await req.json()) as { email?: string };
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "אימייל לא תקין" }, 400);
  const r = await createOtp(email.toLowerCase().trim());
  return json({ ok: true, sent: r.sent, demoCode: r.demoCode });
}
