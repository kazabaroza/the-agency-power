import { authed, json } from "@/lib/http";
import { all, get, parse, update } from "@/lib/db";
import { metaInsights, setGoogleStatus, setMetaStatus } from "@/lib/providers/ads";

export const GET = authed(async (_req, user) => {
  const rows = all<Record<string, string>>("SELECT * FROM campaigns WHERE user_id = ? ORDER BY created_at DESC", user.id);
  for (const c of rows) {
    const ext = parse<{ campaign?: string }>(c.external_ids, {});
    if (c.platform === "meta" && c.status === "active" && ext.campaign) {
      const m = await metaInsights(ext.campaign, user.id).catch(() => null);
      if (m) { update("campaigns", c.id, { metrics: m }); c.metrics = JSON.stringify(m); }
    }
  }
  return json({ campaigns: rows });
});

/** Pause / resume. Resuming spends money again, so it is an explicit button press. */
export const POST = authed(async (req, user) => {
  const { id, action } = (await req.json()) as { id: string; action: "pause" | "resume" };
  const c = get<{ platform: string; external_ids: string; status: string }>("SELECT * FROM campaigns WHERE id = ? AND user_id = ?", id, user.id);
  if (!c) return json({ error: "not found" }, 404);
  const ext = parse<{ campaign?: string }>(c.external_ids, {});
  if (ext.campaign) {
    if (c.platform === "meta") await setMetaStatus(ext.campaign, action === "pause" ? "PAUSED" : "ACTIVE", user.id);
    else await setGoogleStatus(ext.campaign, action === "pause" ? "PAUSED" : "ENABLED", user.id);
  }
  if (c.status !== "demo") update("campaigns", id, { status: action === "pause" ? "paused" : "active" });
  return json({ ok: true });
});
