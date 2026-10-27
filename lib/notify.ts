import { get } from "./db";
import { addMessage, getOrCreateConversation } from "./conversation";
import { sendMedia, sendText, whatsappEnabled } from "./providers/whatsapp";

/** Sends an update to the user in the web chat and, when they use WhatsApp, on WhatsApp too. */
export async function notifyUser(userId: string, text: string, opts: { assetId?: string; mediaUrl?: string; caption?: string } = {}) {
  const web = getOrCreateConversation(userId, "web");
  addMessage(web.id, { role: "assistant", kind: opts.assetId ? "asset" : "status", text, meta: opts.assetId ? { assetId: opts.assetId } : {} });
  const wa = get<{ id: string }>("SELECT id FROM conversations WHERE user_id = ? AND channel = 'whatsapp' LIMIT 1", userId);
  const phone = get<{ phone: string | null }>("SELECT phone FROM users WHERE id = ?", userId)?.phone;
  if (wa && phone && whatsappEnabled()) {
    addMessage(wa.id, { role: "assistant", kind: "status", text });
    if (opts.mediaUrl) await sendMedia(phone, opts.mediaUrl, opts.caption ? `${text}\n\n${opts.caption}` : text);
    else await sendText(phone, text);
  }
}
