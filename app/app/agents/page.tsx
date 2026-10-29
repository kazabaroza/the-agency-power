import { CORE_TEAM, loadAgents } from "@/lib/agents/registry";
import { SKILLS } from "@/lib/skills";
import PageHead from "@/components/PageHead";
import Link from "next/link";

export default async function Agents({ searchParams }: { searchParams: Promise<{ d?: string; q?: string }> }) {
  const { d, q } = await searchParams;
  const all = loadAgents();
  const core = new Map(CORE_TEAM.map((c) => [c.slug, c.role]));
  const divisions = [...new Map(all.map((a) => [a.division, a.divisionLabel])).entries()];
  const list = all
    .filter((a) => (d === "core" ? core.has(a.slug) : !d || a.division === d))
    .filter((a) => !q || `${a.name} ${a.description}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="p-4 md:p-8">
      <PageHead title="הצוות" sub={`מנהל החשבון מנהל ${all.length} סוכנים מומחים מ-The Agency (MIT) ו-${SKILLS.length} כישורי ביצוע.`} />

      <h2 className="mb-3 text-lg font-bold">כישורי ביצוע (Skills)</h2>
      <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SKILLS.map((s) => (
          <div key={s.name} className="card p-4">
            <div className="flex items-center justify-between gap-2"><p className="font-bold">{s.label}</p>{s.gated && <span className="chip !bg-orange-100 !text-orange-800">דורש אישור</span>}</div>
            <p className="muted mt-1 font-mono text-xs" dir="ltr">{s.name}</p>
            <p className="muted mt-2 text-sm" dir="ltr">{s.description}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-lg font-bold">סוכנים מומחים</h2>
      <form className="mb-3"><input name="q" defaultValue={q} className="input max-w-sm" placeholder="חיפוש סוכן…" />{d && <input type="hidden" name="d" value={d} />}</form>
      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="?d=core" className={`chip ${d === "core" ? "!bg-brand !text-forest-900" : ""}`}>★ צוות השיווק</Link>
        <Link href="?" className={`chip ${!d ? "!bg-brand !text-forest-900" : ""}`}>כולם</Link>
        {divisions.map(([k, l]) => <Link key={k} href={`?d=${k}`} className={`chip ${d === k ? "!bg-brand !text-forest-900" : ""}`}>{l}</Link>)}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((a) => (
          <details key={a.slug} className="card p-4">
            <summary className="cursor-pointer list-none">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{a.emoji}</span>
                <div className="min-w-0">
                  <p className="font-bold">{a.name} {core.has(a.slug) && <span className="chip !bg-brand-soft !text-brand">★ {core.get(a.slug)}</span>}</p>
                  <p className="muted text-xs">{a.divisionLabel} · <span className="font-mono" dir="ltr">{a.slug}</span></p>
                  <p className="muted mt-1 line-clamp-3 text-sm" dir="ltr">{a.description}</p>
                </div>
              </div>
            </summary>
            <pre className="muted mt-3 max-h-80 overflow-auto whitespace-pre-wrap text-xs" dir="ltr">{a.body.slice(0, 4000)}</pre>
          </details>
        ))}
      </div>
      <p className="muted mt-8 text-xs" dir="ltr">Specialist personas © AgentLand Contributors, MIT License – github.com/msitarzewski/agency-agents</p>
    </div>
  );
}
