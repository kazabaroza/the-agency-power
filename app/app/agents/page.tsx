import { CORE_TEAM, loadAgents } from "@/lib/agents/registry";
import { SKILLS } from "@/lib/skills";
import PageHead from "@/components/PageHead";
import Link from "next/link";

export default async function Agents({ searchParams }: { searchParams: Promise<{ d?: string; q?: string }> }) {
  const { d, q } = await searchParams;
  const all = loadAgents();
  const core = new Map(CORE_TEAM.map((c) => [c.slug, c.role]));
  const divisions = [...new Map(all.map((a) => [a.division, a.divisionLabelHe])).entries()];
  const needle = (q || "").toLowerCase();
  const list = all
    .filter((a) => (d === "core" ? core.has(a.slug) : !d || a.division === d))
    .filter((a) => !needle || `${a.nameHe} ${a.descriptionHe} ${a.name} ${a.description}`.toLowerCase().includes(needle));

  return (
    <div className="p-4 md:p-8">
      <PageHead title="הצוות" sub={`מנהל החשבון עובד עם ${all.length} מומחים מספריית The Agency ועם ${SKILLS.length} כישורי ביצוע.`} />

      <h2 className="mb-1 text-lg font-bold">כישורי ביצוע</h2>
      <p className="muted mb-4 text-sm">הפעולות שמנהל החשבון יודע לבצע בעצמו. פעולות שעולות כסף או יוצאות לציבור מסומנות, והן מחכות לאישור שלך.</p>
      <div className="mb-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SKILLS.map((s) => (
          <div key={s.name} className="card p-5">
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold">{s.label}</p>
              {s.gated && <span className="chip shrink-0 !bg-brand/15 !text-brand">דורש אישור</span>}
            </div>
            <p className="muted mt-2 text-sm leading-relaxed">{s.descHe}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-1 text-lg font-bold">המומחים</h2>
      <p className="muted mb-4 text-sm">לכל משימה מנהל החשבון בוחר את המומחה המתאים. המסומנים בכוכב הם צוות השיווק שעובד איתך הכי הרבה.</p>
      <form className="mb-4">
        <input name="q" defaultValue={q} className="input max-w-sm" placeholder="חיפוש מומחה…" />
        {d && <input type="hidden" name="d" value={d} />}
      </form>
      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="?d=core" className={`chip ${d === "core" ? "!bg-brand !text-forest-900" : ""}`}>★ צוות השיווק</Link>
        <Link href="?" className={`chip ${!d ? "!bg-brand !text-forest-900" : ""}`}>כולם</Link>
        {divisions.map(([k, l]) => (
          <Link key={k} href={`?d=${k}`} className={`chip ${d === k ? "!bg-brand !text-forest-900" : ""}`}>{l}</Link>
        ))}
      </div>
      <p className="muted mb-3 text-xs">{list.length} מומחים</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((a) => (
          <div key={a.slug} className="card p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.06] text-lg">{a.emoji}</span>
              <div className="min-w-0">
                <p className="font-bold leading-snug">{a.nameHe}</p>
                <p className="muted text-xs">
                  {a.divisionLabelHe}
                  {core.has(a.slug) && <span className="text-brand"> · ★ {core.get(a.slug)}</span>}
                </p>
              </div>
            </div>
            <p className="muted mt-3 text-sm leading-relaxed">{a.descriptionHe}</p>
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-semibold text-brand">הנחיות העבודה המלאות (באנגלית)</summary>
              <p className="muted mt-2 text-xs">{a.name}</p>
              <pre className="muted mt-2 max-h-72 overflow-auto whitespace-pre-wrap text-xs" dir="ltr">{a.body.slice(0, 4000)}</pre>
            </details>
          </div>
        ))}
      </div>
      <p className="muted mt-8 text-xs">המומחים מבוססים על The Agency, ספריית קוד פתוח ברישיון MIT (© AgentLand Contributors). התרגום לעברית נעשה עבור המערכת.</p>
    </div>
  );
}
