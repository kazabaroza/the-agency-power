import { authed, json } from "@/lib/http";
import { all, get, id, insert, update } from "@/lib/db";

export const GET = authed(async (_req, user) => json({ brands: all("SELECT * FROM brands WHERE user_id = ? ORDER BY created_at", user.id) }));

export const POST = authed(async (req, user) => {
  const b = (await req.json()) as Record<string, unknown>;
  const row = {
    name: String(b.name || "").slice(0, 120), website: b.website ? String(b.website) : null, description: b.description ? String(b.description) : null,
    audience: b.audience ? String(b.audience) : null, tone: b.tone ? String(b.tone) : null, colors: Array.isArray(b.colors) ? b.colors : undefined,
    language: b.language === "en" ? "en" : "he", phone: b.phone ? String(b.phone) : null, location: b.location ? String(b.location) : null,
  };
  if (b.id && get("SELECT id FROM brands WHERE id = ? AND user_id = ?", String(b.id), user.id)) update("brands", String(b.id), row);
  else insert("brands", { id: id("b_"), user_id: user.id, ...row });
  return json({ ok: true, brands: all("SELECT * FROM brands WHERE user_id = ? ORDER BY created_at", user.id) });
});
