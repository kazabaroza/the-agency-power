import { authed, appUrl, json } from "@/lib/http";
import { getOrCreateConversation } from "@/lib/conversation";
import { handleUserMessage } from "@/lib/agents/director";

export const maxDuration = 300;

export const POST = authed(async (req, user) => {
  const { text } = (await req.json()) as { text?: string };
  if (!text?.trim()) return json({ error: "empty" }, 400);
  const conv = getOrCreateConversation(user.id, "web");
  const r = await handleUserMessage(user.id, conv.id, text.trim().slice(0, 8000), appUrl(req));
  return json({ ok: true, ...r });
});
