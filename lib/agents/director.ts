import type Anthropic from "@anthropic-ai/sdk";
import { get, id, insert, parse, update } from "../db";
import { addMessage, brandFor, getHistory, getOrCreateConversation, saveHistory } from "../conversation";
import { anthropicFor, createMessage, textOf } from "../providers/llm";
import { SKILLS, skill, toolDefs, type SkillCtx } from "../skills";
import { brandBrief } from "./specialist";
import { CORE_TEAM, rosterText } from "./registry";

const STABLE_SYSTEM = `You are the Account Director of "The Agency Power" – an AI marketing agency that small businesses talk to in one chat (web or WhatsApp).
You run a team of specialist agents from The Agency and a set of production skills (tools). The owner briefs you like a new hire; you research, plan, produce and publish.

How you work:
1. Understand the business. If there is no brand profile, ask 1-2 short questions or call analyze_business (a website URL is enough).
2. For anything non-trivial, show a short plan first: what you will make, for whom, the angle, and the cost if any. Then build.
3. Produce with skills: create_social_post, create_banner, build_landing_page, create_video, schedule_post, create_ad_campaign, generate_audiences, performance_report. Use consult_specialist / market_research to get expert input from the roster before producing important work.
4. Anything that costs money or goes public (videos, publishing, paid campaigns) runs only after the owner taps the approval card. Calling a gated tool creates that card; tell the owner what it contains and wait. Never claim it already ran.
5. Paid campaigns: prepare the landing page and creatives first, pick structure (CBO default), audiences, location radius and a daily budget the owner agreed to.
6. Be honest about demo mode: when a result says DEMO or not connected, say so plainly and point to the Connections screen.

Style: reply in the owner's language (Hebrew by default), short and warm, like a sharp marketing manager on WhatsApp. Use short paragraphs and bullet points, no long essays. Never invent facts, prices, reviews or testimonials about the business.

The Agency roster (★ = core marketing team). Use the slug with consult_specialist:
`;

let cachedSystem: string | null = null;
function systemBlocks(): Anthropic.TextBlockParam[] {
  cachedSystem ??= STABLE_SYSTEM + rosterText();
  return [{ type: "text", text: cachedSystem, cache_control: { type: "ephemeral" } }];
}

export type TurnResult = { reply: string; approvals: string[] };

/** Handles one user message end to end. Display messages are written to the conversation as the work happens. */
export async function handleUserMessage(userId: string, conversationId: string, text: string, appUrl: string): Promise<TurnResult> {
  addMessage(conversationId, { role: "user", text });
  const conv = get<{ brand_id: string | null }>("SELECT brand_id FROM conversations WHERE id = ?", conversationId);
  const ctx: SkillCtx = { userId, conversationId, brand: brandFor(userId, conv?.brand_id), client: anthropicFor(userId), appUrl };
  const result = ctx.client ? await claudeTurn(ctx, text) : await demoTurn(ctx, text);
  if (result.reply) addMessage(conversationId, { role: "assistant", text: result.reply });
  return result;
}

async function claudeTurn(ctx: SkillCtx, text: string): Promise<TurnResult> {
  const client = ctx.client!;
  const history = getHistory(ctx.conversationId);
  // Context rides along with the user's turn so history stays append-only.
  history.push({
    role: "user",
    content: [
      { type: "text", text: `<context>\nCurrent brand profile:\n${brandBrief(ctx.brand)}\nNow: ${new Date().toISOString()} (owner timezone Asia/Jerusalem). App URL: ${ctx.appUrl}\n</context>` },
      { type: "text", text },
    ],
  });
  const tools = toolDefs();
  const approvals: string[] = [];
  let replyParts: string[] = [];

  for (let step = 0; step < 12; step++) {
    const msg = await createMessage(client, { system: systemBlocks(), messages: history, tools, max_tokens: 16000 });
    history.push({ role: "assistant", content: msg.content as Anthropic.ContentBlockParam[] });

    if (msg.stop_reason === "refusal") {
      replyParts = ["אני לא יכול לעזור עם הבקשה הזו. אפשר לנסח אותה אחרת?"];
      break;
    }
    const said = textOf(msg);
    if (said) replyParts.push(said);
    if (msg.stop_reason === "pause_turn") continue;
    const uses = msg.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!uses.length) break;

    // Run independent tools in parallel; return all results in one user message.
    const results = await Promise.all(uses.map((u) => runTool(ctx, u, approvals)));
    history.push({ role: "user", content: results });
    if (said) addMessage(ctx.conversationId, { role: "assistant", text: said });
    if (said) replyParts = [];
  }
  saveHistory(ctx.conversationId, history);
  return { reply: replyParts.join("\n\n").trim(), approvals };
}

async function runTool(ctx: SkillCtx, u: Anthropic.ToolUseBlock, approvals: string[]): Promise<Anthropic.ToolResultBlockParam> {
  const s = skill(u.name);
  if (!s) return { type: "tool_result", tool_use_id: u.id, content: `Unknown tool ${u.name}`, is_error: true };
  const input = (u.input ?? {}) as Record<string, unknown>;
  try {
    if (s.gated) {
      const aid = createApproval(ctx, s.name, input);
      approvals.push(aid);
      return { type: "tool_result", tool_use_id: u.id, content: `Approval card ${aid} is now shown to the owner. It has NOT run yet. Tell the owner briefly what they are approving and wait.` };
    }
    const out = await s.run(input, ctx);
    return { type: "tool_result", tool_use_id: u.id, content: out.slice(0, 20000) };
  } catch (e) {
    return { type: "tool_result", tool_use_id: u.id, content: `Error: ${e instanceof Error ? e.message : e}`, is_error: true };
  }
}

function createApproval(ctx: SkillCtx, skillName: string, input: Record<string, unknown>) {
  const s = skill(skillName)!;
  const { summary, cost } = s.summarize?.(input, ctx) ?? { summary: s.label, cost: "" };
  const aid = id("ap_");
  insert("approvals", { id: aid, conversation_id: ctx.conversationId, user_id: ctx.userId, skill: skillName, input, summary, cost_label: cost });
  addMessage(ctx.conversationId, { role: "assistant", kind: "approval", text: summary, meta: { approvalId: aid, skill: skillName, label: s.label, cost, input } });
  return aid;
}

/** Called from the approval card (web) or the WhatsApp reply button. */
export async function resolveApproval(userId: string, approvalId: string, approve: boolean, appUrl: string) {
  const ap = get<{ id: string; conversation_id: string; skill: string; input: string; summary: string; status: string }>(
    "SELECT * FROM approvals WHERE id = ? AND user_id = ?", approvalId, userId,
  );
  if (!ap) return { ok: false, error: "not found" };
  if (ap.status !== "pending") return { ok: false, error: `already ${ap.status}` };
  if (!approve) {
    update("approvals", ap.id, { status: "rejected" });
    addMessage(ap.conversation_id, { role: "assistant", kind: "status", text: `בוטל: ${ap.summary}` });
    appendNote(ap.conversation_id, `I declined: ${ap.summary}`, "Got it, cancelled. Nothing was spent or published.");
    return { ok: true, status: "rejected" };
  }
  update("approvals", ap.id, { status: "approved" });
  const conv = get<{ brand_id: string | null }>("SELECT brand_id FROM conversations WHERE id = ?", ap.conversation_id);
  const ctx: SkillCtx = { userId, conversationId: ap.conversation_id, brand: brandFor(userId, conv?.brand_id), client: anthropicFor(userId), appUrl };
  try {
    const out = await skill(ap.skill)!.run(parse(ap.input, {}), ctx);
    update("approvals", ap.id, { status: "executed", result: { out } });
    addMessage(ap.conversation_id, { role: "assistant", kind: "status", text: `✅ אושר ובוצע: ${ap.summary}` });
    appendNote(ap.conversation_id, `I approved: ${ap.summary}`, `Done. Result: ${out.slice(0, 3000)}`);
    return { ok: true, status: "executed", result: out };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    update("approvals", ap.id, { status: "failed", result: { error: err } });
    addMessage(ap.conversation_id, { role: "assistant", kind: "status", text: `⚠️ הביצוע נכשל: ${err}` });
    return { ok: false, error: err };
  }
}

/** Keeps the director's memory in sync with what happened outside the model loop. */
function appendNote(conversationId: string, userNote: string, assistantNote: string) {
  const h = getHistory(conversationId);
  h.push({ role: "user", content: userNote }, { role: "assistant", content: assistantNote });
  saveHistory(conversationId, h);
}

// ------------------------------------------------------------------ demo director (no LLM key)

/** ISO time for `hour`:00 Israel time, `daysAhead` days from today. */
function israelTime(daysAhead: number, hour: number) {
  const day = new Date(Date.now() + daysAhead * 864e5).toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
  const naive = new Date(`${day}T${String(hour).padStart(2, "0")}:00:00Z`);
  // Israel is UTC+2 or UTC+3; read the actual offset for that day.
  const local = Number(naive.toLocaleString("en-GB", { timeZone: "Asia/Jerusalem", hour: "2-digit", hourCycle: "h23" }));
  const offset = (local - hour + 24) % 24;
  return new Date(naive.getTime() - offset * 36e5).toISOString();
}

type Intent = { skill: string; input: Record<string, unknown>; say: string };

function detectIntent(t: string, ctx: SkillCtx): Intent | null {
  const s = t.toLowerCase();
  const url = t.match(/https?:\/\/\S+|[\w-]+\.(?:co\.il|com|org|net|io|ai|co)\S*/i)?.[0];
  const topic = t.replace(/^(תכין|תעשה|צור|בנה|תבנה|make|create|build)\s+(לי\s+)?/i, "").slice(0, 120);
  if (url && !ctx.brand) return { skill: "analyze_business", input: { website: url, description: t }, say: "קורא את האתר ובונה פרופיל מותג…" };
  if (!ctx.brand && /(יש לי|אני מנהל|העסק שלי|i have|i run|my business)/i.test(t)) {
    const name = t.match(/(?:בשם|שנקרא|called|named)\s+["״']?([^,.\n"״']{2,40}?)(?=\s+(?:ב|in)\S|[,.\n"״']|$)/i)?.[1]?.trim();
    const location = t.match(/\s(?:ב|in\s)(תל אביב|ירושלים|חיפה|באר שבע|ראשון לציון|פתח תקווה|נתניה|אשדוד|הרצליה|רמת גן|[A-Z][a-z]+)/)?.[1];
    return { skill: "analyze_business", input: { description: t, name, location }, say: "שומר פרופיל מותג…" };
  }
  if (/קרוסל|carousel/.test(s)) return { skill: "create_social_post", input: { topic, post_type: "carousel", slides: 5 }, say: "מעצב קרוסלה של 5 שקפים…" };
  if (/דף נחיתה|landing|אתר/.test(s)) return { skill: "build_landing_page", input: { goal: topic.replace(/^(?:דף נחיתה|אתר|landing page)\s*(?:ל|עבור|for)?\s*/i, "").replace(/\s*(?:עם|with)\s+(?:השוואה|comparison).*$/i, "").trim() || topic, style: /השווא|compar/.test(s) ? "comparison" : /סיפור|story/.test(s) ? "story" : /מותג|brand/.test(s) ? "brand" : "lead" }, say: "כותב ובונה דף נחיתה…" };
  if (/סרטון|וידאו|video|reel|רילס|ugc/.test(s)) return { skill: "create_video", input: { topic, style: /ugc/.test(s) ? "ugc" : "presenter", seconds: "12" }, say: "מכין תסריט לסרטון. הרינדור דורש אישור:" };
  if (/באנר|banner|מודעה/.test(s)) return { skill: "create_banner", input: { headline: topic, cta: "לפרטים", format: /סטורי|story/.test(s) ? "story" : "feed" }, say: "מעצב באנר…" };
  if (/קמפיין|campaign|ממומן/.test(s)) {
    const budget = Number(t.match(/(\d{2,5})\s*(?:₪|ש"ח|שח|nis)/i)?.[1] || 100);
    const lp = get<{ slug: string }>("SELECT slug FROM landing_pages WHERE user_id = ? ORDER BY created_at DESC LIMIT 1", ctx.userId);
    return {
      skill: "create_ad_campaign",
      input: {
        platforms: /google|גוגל/.test(s) && !/meta|מטא|פייסבוק/.test(s) ? ["google"] : /google|גוגל/.test(s) ? ["meta", "google"] : ["meta"],
        name: `${ctx.brand?.name ?? "קמפיין"} – ${new Date().toLocaleDateString("he-IL")}`, objective: "leads", daily_budget: budget,
        location_label: ctx.brand?.location || "ישראל", landing_url: lp ? `/p/${lp.slug}` : ctx.brand?.website || "/",
        structure: "CBO", creatives: [{ headline: ctx.brand?.name ?? "הצעה מיוחדת", primaryText: topic }],
      },
      say: "הכנתי מבנה קמפיין. שום שקל לא יוצא בלי האישור שלך:",
    };
  }
  if (/תזמ|פרסם|schedule|publish|post it/.test(s)) {
    const last = get<{ id: string }>("SELECT id FROM assets WHERE user_id = ? AND type IN ('post','carousel','banner','video') ORDER BY created_at DESC LIMIT 1", ctx.userId);
    if (!last) return null;
    return { skill: "schedule_post", input: { asset_id: last.id, platforms: ["instagram", "facebook"], when: /עכשיו|now/.test(s) ? "now" : israelTime(1, 9) }, say: "מוכן לפרסום. רק לאשר:" };
  }
  if (/דוח|report|ביצועים/.test(s)) return { skill: "performance_report", input: {}, say: "הנה תמונת המצב:" };
  if (/מחקר|מתחר|research|competitor/.test(s)) return { skill: "market_research", input: { question: topic }, say: "שולח את חוקר השוק לעבודה…" };
  if (/פוסט|post|טיפ|tip|חג|holiday/.test(s)) return { skill: "create_social_post", input: { topic, post_type: /חג|holiday/.test(s) ? "holiday" : /מיתוס|myth/.test(s) ? "myth_buster" : "tip" }, say: "כותב ומעצב פוסט…" };
  return null;
}

async function demoTurn(ctx: SkillCtx, text: string): Promise<TurnResult> {
  const intent = detectIntent(text, ctx);
  if (!intent) {
    const team = CORE_TEAM.slice(0, 6).map((c) => `• ${c.role}`).join("\n");
    return {
      reply: `היי! אני מנהל/ת החשבון שלך ב-The Agency Power 👋\nאני עובד/ת כרגע במצב הדגמה (בלי מפתח Claude), אז אני מבין/ה בקשות פשוטות:\n• "תכין קרוסלה על 5 טעויות בפילאטיס"\n• "תבנה דף נחיתה לסדנת קרמיקה"\n• "תעשה סרטון עם מציג על המבצע"\n• "קמפיין ב-Meta ב-150 ₪ ליום"\n• "תפרסם את זה מחר"\n\nהצוות שלי כולל בין היתר:\n${team}\n\nכדי לקבל את המוח המלא – חברו Claude במסך החיבורים.`,
      approvals: [],
    };
  }
  addMessage(ctx.conversationId, { role: "assistant", kind: "status", text: intent.say });
  const s = skill(intent.skill)!;
  if (s.gated) {
    const aid = createApproval(ctx, s.name, intent.input);
    return { reply: "", approvals: [aid] };
  }
  const out = await s.run(intent.input, ctx);
  const reply = s.name === "analyze_business"
    ? `שמרתי פרופיל מותג ל-${ctx.brand?.name ?? "העסק"}. מה נכין קודם – פוסט, דף נחיתה או סרטון?`
    : s.name === "performance_report"
      ? formatReport(out)
      : s.name === "market_research" || s.name === "consult_specialist"
      ? out.slice(0, 1500)
      : "מוכן! אפשר לבקש שינויים או לכתוב \"תפרסם את זה מחר\".";
  return { reply, approvals: [] };
}

function formatReport(raw: string) {
  const d = JSON.parse(raw) as {
    assetsLast7Days: { type: string; n: number }[];
    landingPages: { title: string; views: number; leads: number; conversion: string }[];
    posts: { status: string; n: number }[];
    campaigns: { name: string; platform: string; status: string; daily_budget: number }[];
  };
  const names: Record<string, string> = { post: "פוסטים", carousel: "קרוסלות", banner: "באנרים", video: "סרטונים", landing_page: "דפי נחיתה", campaign: "קמפיינים", research: "מחקרים", report: "דוחות" };
  const lines = ["📊 דוח 7 ימים אחרונים", "", "נוצרו: " + (d.assetsLast7Days.map((a) => `${a.n} ${names[a.type] ?? a.type}`).join(", ") || "עדיין כלום")];
  if (d.landingPages.length) lines.push("", "דפי נחיתה:", ...d.landingPages.map((p) => `• ${p.title}: ${p.views} צפיות, ${p.leads} לידים (המרה ${p.conversion})`));
  if (d.posts.length) lines.push("", "פרסומים: " + d.posts.map((p) => `${p.n} ${p.status}`).join(", "));
  if (d.campaigns.length) lines.push("", "קמפיינים:", ...d.campaigns.map((c) => `• ${c.name} (${c.platform}) – ${c.status === "demo" ? "הדגמה" : c.status}, ₪${c.daily_budget} ליום`));
  return lines.join("\n");
}

export function ensureConversation(userId: string, channel: "web" | "whatsapp") {
  return getOrCreateConversation(userId, channel);
}

export { SKILLS };
