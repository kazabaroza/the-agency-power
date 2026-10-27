import { all, get, parse, update } from "./db";
import { publish, type Platform, type PublishResult } from "./providers/social";
import { pollVideo } from "./providers/media";
import { addMessage } from "./conversation";
import { notifyUser } from "./notify";

/** Publishes one scheduled post to all of its platforms. */
export async function publishScheduled(sid: string): Promise<PublishResult[]> {
  const s = get<{ id: string; user_id: string; platforms: string; caption: string; media_url: string | null; status: string }>("SELECT * FROM scheduled_posts WHERE id = ?", sid);
  if (!s || s.status === "published" || s.status === "publishing") return [];
  update("scheduled_posts", sid, { status: "publishing" });
  const results: PublishResult[] = [];
  for (const p of parse<Platform[]>(s.platforms, [])) results.push(await publish(p, { caption: s.caption, mediaUrl: s.media_url }, s.user_id));
  const ok = results.every((r) => r.ok);
  update("scheduled_posts", sid, { status: ok ? "published" : results.some((r) => r.ok) ? "partial" : "failed", result: results });
  const lines = results.map((r) => `${r.platform}: ${r.ok ? (r.demo ? "פורסם בהדגמה (החשבון לא מחובר)" : "פורסם ✔") : `נכשל – ${r.error}`}`);
  await notifyUser(s.user_id, `📣 עדכון פרסום\n${lines.join("\n")}`);
  return results;
}

/** Runs every minute: due posts and finished videos. */
export async function tick() {
  const due = all<{ id: string }>("SELECT id FROM scheduled_posts WHERE status = 'scheduled' AND run_at <= ?", new Date().toISOString());
  for (const d of due) await publishScheduled(d.id).catch((e) => console.error("[scheduler] publish", e));

  const videos = all<{ id: string; user_id: string; data: string }>("SELECT id, user_id, data FROM assets WHERE type = 'video' AND status = 'processing'");
  for (const v of videos) {
    const data = parse<{ jobId?: string; caption?: string }>(v.data, {});
    if (!data.jobId) continue;
    try {
      const r = await pollVideo(data.jobId, v.user_id);
      if (r.status === "completed" && r.url) {
        update("assets", v.id, { status: "ready", url: r.url });
        await notifyUser(v.user_id, "🎬 הסרטון מוכן!", { assetId: v.id, mediaUrl: r.url, caption: data.caption });
      } else if (r.status === "failed") {
        update("assets", v.id, { status: "failed", data: { ...data, error: r.error } });
        await notifyUser(v.user_id, `הרינדור של הסרטון נכשל: ${r.error}`);
      }
    } catch (e) {
      console.error("[scheduler] video poll", e);
    }
  }
}

const g = globalThis as unknown as { __agencyTimer?: NodeJS.Timeout };
export function startScheduler() {
  if (g.__agencyTimer) return;
  g.__agencyTimer = setInterval(() => tick().catch((e) => console.error("[scheduler]", e)), 60_000);
  console.log("[scheduler] started (every 60s)");
}

export { addMessage };
