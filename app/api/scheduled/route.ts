import { authed, json } from "@/lib/http";
import { all, run } from "@/lib/db";

export const GET = authed(async (_req, user) => json({ posts: all("SELECT * FROM scheduled_posts WHERE user_id = ? ORDER BY run_at DESC LIMIT 200", user.id) }));

export const DELETE = authed(async (req, user) => {
  const id = new URL(req.url).searchParams.get("id");
  if (id) run("UPDATE scheduled_posts SET status = 'cancelled' WHERE id = ? AND user_id = ? AND status = 'scheduled'", id, user.id);
  return json({ ok: true });
});
