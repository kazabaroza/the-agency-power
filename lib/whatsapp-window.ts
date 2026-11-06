import { all, get, id, insert, run } from "./db";
import { sendMedia, sendText, sendUpdateTemplate } from "./providers/whatsapp";

// WhatsApp lets a business send free-form messages only within 24 hours of the user's
// last message. A small margin keeps us clear of the edge.
const WINDOW_MS = 23.5 * 60 * 60_000;
// After one template, later updates wait quietly in the queue for a while instead of
// sending another template each time.
const TEMPLATE_GAP_MS = 6 * 60 * 60_000;

export function markInbound(phone: string) {
  run("INSERT INTO wa_state (phone, last_inbound) VALUES (?, ?) ON CONFLICT(phone) DO UPDATE SET last_inbound = excluded.last_inbound", phone, Date.now());
}

export function windowOpen(phone: string) {
  const s = get<{ last_inbound: number | null }>("SELECT last_inbound FROM wa_state WHERE phone = ?", phone);
  return !!s?.last_inbound && Date.now() - s.last_inbound < WINDOW_MS;
}

/** Sends an update now when the window is open; otherwise queues it and sends the template. */
export async function deliverUpdate(phone: string, text: string, media?: { url: string; caption?: string }) {
  if (windowOpen(phone)) {
    if (media) await sendMedia(phone, media.url, media.caption ? `${text}\n\n${media.caption}` : text);
    else await sendText(phone, text);
    return "sent" as const;
  }
  insert("wa_pending", { id: id("wp_"), phone, text, media_url: media?.url ?? null, caption: media?.caption ?? null, created_at: Date.now() });
  const s = get<{ last_template: number | null }>("SELECT last_template FROM wa_state WHERE phone = ?", phone);
  if (s?.last_template && Date.now() - s.last_template < TEMPLATE_GAP_MS) return "queued" as const;
  const ok = await sendUpdateTemplate(phone, text.split("\n")[0]);
  if (ok) run("INSERT INTO wa_state (phone, last_template) VALUES (?, ?) ON CONFLICT(phone) DO UPDATE SET last_template = excluded.last_template", phone, Date.now());
  return ok ? ("template" as const) : ("queued" as const);
}

/** Sends everything that waited while the window was closed. Returns how many were sent. */
export async function flushPending(phone: string) {
  const rows = all<{ id: string; text: string; media_url: string | null; caption: string | null }>(
    "SELECT id, text, media_url, caption FROM wa_pending WHERE phone = ? AND delivered = 0 ORDER BY created_at LIMIT 20", phone);
  for (const r of rows) {
    run("UPDATE wa_pending SET delivered = 1 WHERE id = ?", r.id);
    if (r.media_url) await sendMedia(phone, r.media_url, r.caption ? `${r.text}\n\n${r.caption}` : r.text);
    else await sendText(phone, r.text);
  }
  run("UPDATE wa_state SET last_template = NULL WHERE phone = ?", phone);
  run("DELETE FROM wa_pending WHERE delivered = 1 AND created_at < ?", Date.now() - 30 * 24 * 60 * 60_000);
  return rows.length;
}
