import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

/**
 * Specialist agents come from "The Agency" (agency-agents, MIT licence, see agents/LICENSE).
 * Each markdown file is a full persona that we use as the system prompt of a sub-agent.
 */
export type AgencyAgent = {
  slug: string;
  division: string;
  divisionLabel: string;
  color: string;
  name: string;
  description: string;
  emoji: string;
  vibe: string;
  body: string;
  /** Hebrew name / description / division label (agents/he.json), falling back to English. */
  nameHe: string;
  descriptionHe: string;
  divisionLabelHe: string;
};

const ROOT = path.join(process.cwd(), "agents");

/** The marketing team the account director works with day to day. */
export const CORE_TEAM: { slug: string; role: string }[] = [
  { slug: "marketing-content-creator", role: "קופי ותוכן לרשתות" },
  { slug: "marketing-social-media-strategist", role: "אסטרטגיית סושיאל ולוח תוכן" },
  { slug: "marketing-carousel-growth-engine", role: "פוסטים בפורמט קרוסלה" },
  { slug: "marketing-instagram-curator", role: "אינסטגרם" },
  { slug: "marketing-tiktok-strategist", role: "טיקטוק ורילס" },
  { slug: "marketing-linkedin-content-creator", role: "לינקדאין" },
  { slug: "marketing-short-video-editing-coach", role: "תסריטי וידאו קצר" },
  { slug: "marketing-growth-hacker", role: "צמיחה וניסויים" },
  { slug: "marketing-seo-specialist", role: "SEO לדפי נחיתה" },
  { slug: "paid-media-paid-social-strategist", role: "קמפיינים ממומנים ב-Meta" },
  { slug: "paid-media-ppc-strategist", role: "Google Ads ומילות מפתח" },
  { slug: "paid-media-creative-strategist", role: "קריאייטיב למודעות" },
  { slug: "paid-media-tracking-specialist", role: "פיקסלים ומדידה" },
  { slug: "paid-media-auditor", role: "בקרת קמפיינים" },
  { slug: "design-brand-guardian", role: "שמירה על המותג" },
  { slug: "design-image-prompt-engineer", role: "פרומפטים לתמונות" },
  { slug: "design-visual-storyteller", role: "סיפור ויזואלי" },
  { slug: "design-ux-architect", role: "מבנה דפי נחיתה" },
  { slug: "sales-offer-lead-gen-strategist", role: "הצעות ולידים" },
  { slug: "product-trend-researcher", role: "מחקר שוק ומתחרים" },
];

let cache: AgencyAgent[] | null = null;

export function loadAgents(): AgencyAgent[] {
  if (cache) return cache;
  const divisions = JSON.parse(fs.readFileSync(path.join(ROOT, "divisions.json"), "utf8")).divisions as Record<
    string,
    { label: string; color: string }
  >;
  const he = fs.existsSync(path.join(ROOT, "he.json"))
    ? (JSON.parse(fs.readFileSync(path.join(ROOT, "he.json"), "utf8")) as { agents: Record<string, { name: string; description: string }>; divisions: Record<string, string> })
    : { agents: {}, divisions: {} };
  const out: AgencyAgent[] = [];
  for (const division of Object.keys(divisions)) {
    const dir = path.join(ROOT, division);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith(".md")) continue;
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const { data, content } = matter(raw);
      if (!data.name) continue;
      out.push({
        slug: file.replace(/\.md$/, ""),
        division,
        divisionLabel: divisions[division].label,
        color: String(data.color || divisions[division].color),
        name: String(data.name),
        description: String(data.description || ""),
        emoji: String(data.emoji || "🤖"),
        vibe: String(data.vibe || ""),
        body: content.trim(),
        nameHe: he.agents[file.replace(/\.md$/, "")]?.name || String(data.name),
        descriptionHe: he.agents[file.replace(/\.md$/, "")]?.description || String(data.description || ""),
        divisionLabelHe: he.divisions[division] || divisions[division].label,
      });
    }
  }
  out.sort((a, b) => a.division.localeCompare(b.division) || a.name.localeCompare(b.name));
  cache = out;
  return out;
}

export function getAgent(slug: string) {
  return loadAgents().find((a) => a.slug === slug);
}

export function coreTeam() {
  return CORE_TEAM.map((m) => ({ ...m, agent: getAgent(m.slug) })).filter((m) => m.agent);
}

/** Compact roster for the director's prompt: slug – name – one line. */
export function rosterText() {
  const core = new Set(CORE_TEAM.map((c) => c.slug));
  const lines = loadAgents().map(
    (a) => `${core.has(a.slug) ? "★ " : ""}${a.slug} — ${a.name}: ${a.description.slice(0, 110)}`,
  );
  return lines.join("\n");
}
