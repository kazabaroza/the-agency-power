import { currentUser } from "@/lib/auth";
import { all } from "@/lib/db";
import PageHead from "@/components/PageHead";

export default async function Pages() {
  const user = (await currentUser())!;
  const rows = all<{ id: string; slug: string; title: string; style: string; views: number; leads: number; created_at: string }>(
    "SELECT lp.id, lp.slug, lp.title, lp.style, lp.views, lp.created_at, (SELECT COUNT(*) FROM leads l WHERE l.landing_page_id = lp.id) leads FROM landing_pages lp WHERE lp.user_id = ? ORDER BY lp.created_at DESC", user.id,
  );
  const STYLE: Record<string, string> = { lead: "לידים", brand: "אתר מותג", comparison: "השוואה", story: "סיפור" };
  return (
    <div className="p-4 md:p-8">
      <PageHead title="דפי נחיתה" sub="כל דף כולל טופס לידים, מדידת צפיות וכפתור וואטסאפ." />
      {rows.length === 0 ? <p className="muted">עוד אין דפים. כתבו בשיחה: "תבנה לי דף נחיתה ל…"</p> : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((p) => (
            <div key={p.id} className="card overflow-hidden">
              <iframe src={`/p/${p.slug}`} title={p.title} className="h-64 w-full border-0 bg-white" loading="lazy" />
              <div className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div>
                  <p className="font-bold">{p.title}</p>
                  <p className="muted text-sm">{STYLE[p.style] ?? p.style} · {p.views} צפיות · {p.leads} לידים · המרה {p.views ? ((p.leads / p.views) * 100).toFixed(1) : "0"}%</p>
                </div>
                <a className="btn !px-4 !py-2 text-sm" href={`/p/${p.slug}`} target="_blank">פתיחה</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
