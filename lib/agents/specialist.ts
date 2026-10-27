import type Anthropic from "@anthropic-ai/sdk";
import { getAgent } from "./registry";
import { createMessage, textOf } from "../providers/llm";
import { id, insert } from "../db";
import type { Brand } from "../providers/media";

export function brandBrief(b: Brand | null) {
  if (!b) return "No brand profile yet. Ask for the business name, what it sells and who it serves if this matters for the task.";
  return [
    `Business: ${b.name}`,
    b.website && `Website: ${b.website}`,
    b.description && `What it does: ${b.description}`,
    b.audience && `Audience: ${b.audience}`,
    b.tone && `Tone of voice: ${b.tone}`,
    b.location && `Location: ${b.location}`,
    `Language for customer-facing copy: ${b.language === "en" ? "English" : "Hebrew"}`,
  ].filter(Boolean).join("\n");
}

/**
 * Runs one specialist from The Agency as a sub-agent: its markdown persona is the
 * system prompt, the director's task and the brand brief are the user message.
 */
export async function runSpecialist(opts: {
  client: Anthropic;
  slug: string;
  task: string;
  brand: Brand | null;
  conversationId?: string;
  json?: boolean;
  webSearch?: boolean;
}): Promise<string> {
  const agent = getAgent(opts.slug);
  if (!agent) throw new Error(`Unknown agent: ${opts.slug}`);
  const system = [
    agent.body,
    "",
    "---",
    "You are working inside The Agency Power, an AI marketing agency for small businesses. The account director hands you one task at a time.",
    "Deliver the finished work, not a plan to do it. Keep it practical and specific to this business. Write customer-facing copy in the brand's language.",
    "Never invent facts about the business (prices, awards, client names, testimonials). If something is unknown, leave a clearly marked placeholder.",
    opts.json ? "Return ONLY valid JSON matching the shape the task asks for. No prose, no code fences." : "",
  ].join("\n");

  const tools = opts.webSearch ? ([{ type: "web_search_20260209", name: "web_search", max_uses: 5 }] as unknown as Anthropic.Tool[]) : undefined;
  let messages: Anthropic.MessageParam[] = [{ role: "user", content: `${brandBrief(opts.brand)}\n\nTask:\n${opts.task}` }];
  let msg = await createMessage(opts.client, { system, messages, tools, effort: "medium", max_tokens: 32000 });
  // Server tools can pause a long turn; send it back so the server continues.
  for (let i = 0; i < 4 && msg.stop_reason === "pause_turn"; i++) {
    messages = [...messages, { role: "assistant", content: msg.content }];
    msg = await createMessage(opts.client, { system, messages, tools, effort: "medium", max_tokens: 32000 });
  }
  if (msg.stop_reason === "refusal") return opts.json ? "null" : "(the specialist declined this task)";
  const out = textOf(msg);
  if (opts.conversationId) insert("agent_runs", { id: id("r_"), conversation_id: opts.conversationId, agent_slug: opts.slug, task: opts.task, output: out });
  return out;
}

export function parseJson<T>(text: string): T | null {
  const t = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  const start = t.search(/[[{]/);
  const end = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(t.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
