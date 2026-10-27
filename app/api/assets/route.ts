import { authed, json } from "@/lib/http";
import { all, run } from "@/lib/db";

export const GET = authed(async (req, user) => {
  const type = new URL(req.url).searchParams.get("type");
  const rows = type
    ? all("SELECT * FROM assets WHERE user_id = ? AND type = ? ORDER BY created_at DESC LIMIT 200", user.id, type)
    : all("SELECT * FROM assets WHERE user_id = ? ORDER BY created_at DESC LIMIT 200", user.id);
  return json({ assets: rows });
});

export const DELETE = authed(async (req, user) => {
  const id = new URL(req.url).searchParams.get("id");
  if (id) run("DELETE FROM assets WHERE id = ? AND user_id = ?", id, user.id);
  return json({ ok: true });
});
