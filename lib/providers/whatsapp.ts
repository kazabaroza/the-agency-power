import crypto from "node:crypto";
import { creds } from "../connections";
import { absoluteUrl } from "../storage";

const GRAPH = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || "v23.0"}`;

/** WhatsApp runs on the operator's own number, so it uses the environment credentials. */
function wa() {
  const c = creds("whatsapp", null);
  return { token: c.WHATSAPP_TOKEN, phoneId: c.WHATSAPP_PHONE_NUMBER_ID, verify: c.WHATSAPP_VERIFY_TOKEN, secret: c.WHATSAPP_APP_SECRET };
}

export const whatsappEnabled = () => !!(wa().token && wa().phoneId);
export const verifyToken = () => wa().verify;

export function validSignature(raw: string, header: string | null) {
  const secret = wa().secret;
  if (!secret) return true; // signature check is enabled once the app secret is set
  if (!header?.startsWith("sha256=")) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
  return expected.length === header.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(header));
}

async function send(payload: Record<string, unknown>) {
  const { token, phoneId } = wa();
  if (!token || !phoneId) return;
  const r = await fetch(`${GRAPH}/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", ...payload }),
  });
  if (!r.ok) console.error("[whatsapp] send failed", r.status, await r.text());
}

export const sendText = (to: string, body: string) => send({ to, type: "text", text: { body: body.slice(0, 4096), preview_url: true } });

export function sendMedia(to: string, url: string, caption?: string) {
  const type = /\.mp4(\?|$)/i.test(url) ? "video" : /\.(png|jpe?g|webp)(\?|$)/i.test(url) ? "image" : "document";
  return send({ to, type, [type]: { link: absoluteUrl(url), ...(caption ? { caption: caption.slice(0, 1024) } : {}) } });
}

/** Approval card with two reply buttons. Button ids carry the approval id. */
export function sendApproval(to: string, approvalId: string, text: string) {
  return send({
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: text.slice(0, 1024) },
      action: {
        buttons: [
          { type: "reply", reply: { id: `approve:${approvalId}`, title: "✅ מאשר" } },
          { type: "reply", reply: { id: `reject:${approvalId}`, title: "✖️ לא עכשיו" } },
        ],
      },
    },
  });
}

export async function markRead(messageId: string) {
  await send({ status: "read", message_id: messageId });
}
