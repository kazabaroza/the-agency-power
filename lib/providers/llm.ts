import Anthropic from "@anthropic-ai/sdk";
import { creds } from "../connections";

export const MODEL = process.env.AGENT_MODEL || "claude-opus-5-5";
const EFFORT = (process.env.AGENT_EFFORT || "medium") as "low" | "medium" | "high" | "xhigh" | "max";

export function anthropicFor(userId?: string | null): Anthropic | null {
  const key = creds("anthropic", userId).ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

type CreateParams = {
  system: string | Anthropic.TextBlockParam[];
  messages: Anthropic.MessageParam[];
  tools?: Anthropic.Tool[];
  max_tokens?: number;
  effort?: typeof EFFORT;
};

/**
 * One Messages API call with the project defaults:
 * adaptive thinking (default on this model), explicit effort, and server-side
 * refusal fallbacks ("default" routing) so a declined request is retried on the
 * recommended fallback model instead of failing.
 */
export async function createMessage(client: Anthropic, p: CreateParams): Promise<Anthropic.Message> {
  const body = {
    model: MODEL,
    max_tokens: p.max_tokens ?? 16000,
    system: p.system,
    messages: p.messages,
    ...(p.tools?.length ? { tools: p.tools } : {}),
    output_config: { effort: p.effort ?? EFFORT },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  };
  const res = await client.beta.messages.create(
    body as unknown as Parameters<typeof client.beta.messages.create>[0],
  );
  return res as unknown as Anthropic.Message;
}

export function textOf(msg: Anthropic.Message): string {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/** Ask Claude for JSON matching a description; tolerant of code fences. */
export async function askJson<T>(client: Anthropic, system: string, prompt: string, effort: typeof EFFORT = "low"): Promise<T | null> {
  const msg = await createMessage(client, {
    system: system + "\nReturn ONLY valid JSON, no prose, no code fences.",
    messages: [{ role: "user", content: prompt }],
    effort,
    max_tokens: 16000,
  });
  if (msg.stop_reason === "refusal") return null;
  const t = textOf(msg).replace(/^```(?:json)?\s*|\s*```$/g, "");
  const start = t.search(/[[{]/);
  try {
    return JSON.parse(start > 0 ? t.slice(start) : t) as T;
  } catch {
    return null;
  }
}
