import { NextResponse } from "next/server";
import { get, id, insert } from "@/lib/db";
import { authed, json } from "@/lib/http";
import { all } from "@/lib/db";
import { notifyUser } from "@/lib/notify";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
export const OPTIONS = () => new NextResponse(null, { headers: cors });

/** Public endpoint used by published landing pages. */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, string>;
  const page = get<{ id: string; user_id: string; title: string }>("SELECT id, user_id, title FROM landing_pages WHERE id = ?", String(b.page || ""));
  if (!page) return NextResponse.json({ error: "unknown page" }, { status: 404, headers: cors });
  const clip = (v?: string) => (v ? String(v).slice(0, 500) : null);
  if (!b.name && !b.phone && !b.email) return NextResponse.json({ error: "empty" }, { status: 400, headers: cors });
  insert("leads", { id: id("l_"), landing_page_id: page.id, user_id: page.user_id, name: clip(b.name), email: clip(b.email), phone: clip(b.phone), message: clip(b.message) });
  await notifyUser(page.user_id, `🎉 ליד חדש מ"${page.title}"\n${[b.name, b.phone, b.email].filter(Boolean).join(" · ")}`).catch(() => {});
  return NextResponse.json({ ok: true }, { headers: cors });
}

export const GET = authed(async (_req, user) =>
  json({ leads: all("SELECT l.*, lp.title page_title FROM leads l LEFT JOIN landing_pages lp ON lp.id = l.landing_page_id WHERE l.user_id = ? ORDER BY l.created_at DESC LIMIT 500", user.id) }),
);
