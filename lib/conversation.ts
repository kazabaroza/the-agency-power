import type Anthropic from "@anthropic-ai/sdk";
import { all, get, id, insert, parse, update } from "./db";
import type { Brand } from "./providers/media";

export type ChatMessage = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  kind: "text" | "approval" | "asset" | "status" | "agent";
  text: string;
  meta: Record<string, unknown>;
  created_at: string;
};

export function getOrCreateConversation(userId: string, channel: "web" | "whatsapp" = "web") {
  const c = get<{ id: string; brand_id: string | null }>(
    "SELECT id, brand_id FROM conversations WHERE user_id = ? AND channel = ? ORDER BY created_at DESC LIMIT 1", userId, channel,
  );
  if (c) return c;
  const cid = id("c_");
  const brand = get<{ id: string }>("SELECT id FROM brands WHERE user_id = ? ORDER BY created_at LIMIT 1", userId);
  insert("conversations", { id: cid, user_id: userId, channel, brand_id: brand?.id ?? null, history: "[]" });
  return { id: cid, brand_id: brand?.id ?? null };
}

export function addMessage(conversationId: string, m: { role: ChatMessage["role"]; kind?: ChatMessage["kind"]; text: string; meta?: Record<string, unknown> }) {
  const mid = id("m_");
  insert("messages", { id: mid, conversation_id: conversationId, role: m.role, kind: m.kind ?? "text", text: m.text, meta: m.meta ?? {} });
  return mid;
}

export function listMessages(conversationId: string, after?: string): ChatMessage[] {
  const rows = after
    ? all<Record<string, string>>("SELECT * FROM messages WHERE conversation_id = ? AND created_at >= (SELECT created_at FROM messages WHERE id = ?) AND id != ? ORDER BY created_at, rowid", conversationId, after, after)
    : all<Record<string, string>>("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at, rowid", conversationId);
  return rows.map((r) => ({ ...r, meta: parse(r.meta, {}) }) as unknown as ChatMessage);
}

export function getHistory(conversationId: string): Anthropic.MessageParam[] {
  return parse(get<{ history: string }>("SELECT history FROM conversations WHERE id = ?", conversationId)?.history, []);
}

export function saveHistory(conversationId: string, history: Anthropic.MessageParam[]) {
  // Keep the last ~60 turns, cut at a user text turn so tool_use/tool_result pairs stay intact.
  let h = history;
  if (h.length > 60) {
    let start = h.length - 60;
    const isUserText = (m: Anthropic.MessageParam) =>
      m.role === "user" && (typeof m.content === "string" || m.content.every((b) => b.type === "text"));
    while (start < h.length && !isUserText(h[start])) start++;
    h = h.slice(start);
  }
  update("conversations", conversationId, { history: h });
}

export function brandFor(userId: string, brandId?: string | null): Brand | null {
  if (brandId) {
    const b = get<Brand>("SELECT * FROM brands WHERE id = ? AND user_id = ?", brandId, userId);
    if (b) return b;
  }
  return get<Brand>("SELECT * FROM brands WHERE user_id = ? ORDER BY created_at LIMIT 1", userId) ?? null;
}
