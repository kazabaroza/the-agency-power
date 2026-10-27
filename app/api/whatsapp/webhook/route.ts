import { appUrl } from "@/lib/http";
import { findOrCreateUser } from "@/lib/auth";
import { getOrCreateConversation, listMessages } from "@/lib/conversation";
import { handleUserMessage, resolveApproval } from "@/lib/agents/director";
import { markRead, sendApproval, sendMedia, sendText, validSignature, verifyToken } from "@/lib/providers/whatsapp";
import { get, parse } from "@/lib/db";

export const maxDuration = 300;

/** Meta webhook verification handshake. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  if (u.searchParams.get("hub.mode") === "subscribe" && verifyToken() && u.searchParams.get("hub.verify_token") === verifyToken()) {
    return new Response(u.searchParams.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("forbidden", { status: 403 });
}

type WaMessage = {
  from: string; id: string; type: string;
  text?: { body: string };
  interactive?: { button_reply?: { id: string; title: string } };
  button?: { payload: string; text: string };
  image?: { caption?: string };
};

export async function POST(req: Request) {
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get("x-hub-signature-256"))) return new Response("bad signature", { status: 401 });
  const body = parse<{ entry?: { changes?: { value?: { messages?: WaMessage[]; contacts?: { profile?: { name?: string } }[] } }[] }[] }>(raw, {});
  const base = appUrl(req);
  const jobs: Promise<unknown>[] = [];
  for (const entry of body.entry ?? [])
    for (const change of entry.changes ?? []) {
      const value = change.value;
      for (const m of value?.messages ?? []) jobs.push(handle(m, value?.contacts?.[0]?.profile?.name, base));
    }
  // Meta expects a fast 200; the work continues in the background.
  Promise.allSettled(jobs).catch(() => {});
  return new Response("ok");
}

async function handle(m: WaMessage, name: string | undefined, base: string) {
  const phone = m.from;
  const user = findOrCreateUser({ phone, name });
  const conv = getOrCreateConversation(user.id, "whatsapp");
  await markRead(m.id).catch(() => {});

  const buttonId = m.interactive?.button_reply?.id || m.button?.payload;
  if (buttonId && /^(approve|reject):/.test(buttonId)) {
    const [action, approvalId] = buttonId.split(":");
    const r = await resolveApproval(user.id, approvalId, action === "approve", base);
    await sendText(phone, r.ok ? (action === "approve" ? "✅ אושר. מתחיל לעבוד." : "בוטל. שום דבר לא יצא.") : `לא הצלחתי: ${r.error}`);
    await flush(conv.id, phone, Date.now() - 1000);
    return;
  }
  const text = m.text?.body || m.image?.caption || "";
  if (!text) {
    await sendText(phone, "קיבלתי! כרגע אני עובד עם הודעות טקסט. ספרו לי במילים מה תרצו שנכין 🙂");
    return;
  }
  const started = Date.now() - 1000;
  const r = await handleUserMessage(user.id, conv.id, text, base);
  await flush(conv.id, phone, started, r.approvals);
}

/** Sends everything the agent produced during this turn to WhatsApp. */
async function flush(conversationId: string, phone: string, sinceMs: number, approvals: string[] = []) {
  const since = new Date(sinceMs).toISOString().slice(0, 19).replace("T", " ");
  const msgs = listMessages(conversationId).filter((m) => m.role === "assistant" && m.created_at >= since);
  for (const m of msgs) {
    if (m.kind === "asset" && m.meta.assetId) {
      const a = get<{ url: string | null; type: string; data: string }>("SELECT url, type, data FROM assets WHERE id = ?", String(m.meta.assetId));
      const data = parse<{ caption?: string; images?: string[] }>(a?.data, {});
      if (a?.type === "landing_page" && a.url) await sendText(phone, `${m.text}\n${appUrlFrom()}${a.url}`);
      else if (a?.url && /\.(png|jpe?g|webp|mp4)$/i.test(a.url)) await sendMedia(phone, a.url, `${m.text}\n\n${data.caption ?? ""}`.trim());
      else await sendText(phone, `${m.text}${a?.url ? `\n${appUrlFrom()}${a.url}` : ""}${data.caption ? `\n\n${data.caption}` : ""}`);
    } else if (m.kind === "approval" && approvals.includes(String(m.meta.approvalId))) {
      await sendApproval(phone, String(m.meta.approvalId), `🧾 לאישור: ${m.text}${m.meta.cost ? `\nעלות: ${m.meta.cost}` : ""}`);
    } else if (m.kind !== "agent" && m.kind !== "approval") {
      await sendText(phone, m.text);
    }
  }
}

const appUrlFrom = () => (process.env.APP_URL || "").replace(/\/$/, "");
