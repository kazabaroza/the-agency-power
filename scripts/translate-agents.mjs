// One-off: translate every specialist's name and description to Hebrew -> agents/he.json
// Usage: ANTHROPIC_API_KEY=... node scripts/translate-agents.mjs   (re-run safely; existing entries are kept)
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import Anthropic from "@anthropic-ai/sdk";

const ROOT = path.join(process.cwd(), "agents");
const OUT = path.join(ROOT, "he.json");
const key = (process.env.ANTHROPIC_API_KEY || process.env.AGENCY_ANTHROPIC_API_KEY || "").match(/sk-[A-Za-z0-9_-]{20,}/)?.[0];
if (!key) throw new Error("No Anthropic key");
const client = new Anthropic({ apiKey: key, baseURL: "https://api.anthropic.com" });

const divisions = JSON.parse(fs.readFileSync(path.join(ROOT, "divisions.json"), "utf8")).divisions;
const agents = [];
for (const d of Object.keys(divisions)) {
  const dir = path.join(ROOT, d);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".md")) continue;
    const { data } = matter(fs.readFileSync(path.join(dir, f), "utf8"));
    if (data.name) agents.push({ slug: f.replace(/\.md$/, ""), name: String(data.name), description: String(data.description || "") });
  }
}

const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : { agents: {}, divisions: {} };
const todo = agents.filter((a) => !out.agents[a.slug]);
console.log(`agents: ${agents.length}, to translate: ${todo.length}`);

async function translate(batch) {
  const msg = await client.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "low" },
    system:
      "You translate short professional role cards into natural, fluent Israeli Hebrew for a marketing-agency product UI. " +
      "Keep brand and platform names (TikTok, SEO, Meta, Google Ads, Shopify...) in Latin letters. " +
      "Role names: short and natural (e.g. 'Content Creator' -> 'יוצר/ת תוכן'). Descriptions: one or two clear sentences, max ~35 words. " +
      "Return ONLY a JSON object mapping each slug to {\"name\":\"...\",\"description\":\"...\"}.",
    messages: [{ role: "user", content: JSON.stringify(batch) }],
  });
  if (msg.stop_reason === "refusal") throw new Error("refusal");
  const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(json);
}

for (let i = 0; i < todo.length; i += 30) {
  const batch = todo.slice(i, i + 30);
  let res;
  for (let attempt = 1; attempt <= 3 && !res; attempt++) {
    try { res = await translate(batch); } catch (e) { console.log(`batch ${i} attempt ${attempt} failed: ${e.message}`); }
  }
  if (!res) continue;
  for (const a of batch) if (res[a.slug]?.name) out.agents[a.slug] = res[a.slug];
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
  console.log(`translated ${Math.min(i + 30, todo.length)}/${todo.length}`);
}

// Division labels (short, fixed list) - written by hand.
out.divisions = {
  academic: "אקדמיה", design: "עיצוב", engineering: "פיתוח", finance: "כספים", "game-development": "פיתוח משחקים",
  gis: "מיפוי וגיאוגרפיה", healthcare: "בריאות", marketing: "שיווק", "paid-media": "פרסום ממומן", product: "מוצר",
  "project-management": "ניהול פרויקטים", research: "מחקר", sales: "מכירות", security: "אבטחת מידע",
  "spatial-computing": "מחשוב מרחבי", specialized: "התמחויות מיוחדות", support: "תמיכה ושירות", testing: "בדיקות ואיכות",
  ...out.divisions,
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
console.log(`done: ${Object.keys(out.agents).length}/${agents.length} agents in agents/he.json`);
