"use client";
import { useEffect, useState } from "react";
import PageHead from "@/components/PageHead";

type Camp = { id: string; platform: string; name: string; objective: string; daily_budget: number; location: string; status: string; metrics: string; structure: string; created_at: string };
const ST: Record<string, string> = { active: "פעיל", paused: "מושהה", demo: "הדגמה", failed: "נכשל", draft: "טיוטה" };

export default function Campaigns() {
  const [rows, setRows] = useState<Camp[]>([]);
  const load = () => fetch("/api/campaigns").then((r) => r.json()).then((j) => setRows(j.campaigns));
  useEffect(() => { load(); }, []);
  async function act(id: string, action: "pause" | "resume") {
    if (action === "resume" && !confirm("להפעיל מחדש? הקמפיין יתחיל להוציא תקציב.")) return;
    await fetch("/api/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
    load();
  }
  return (
    <div className="p-4 md:p-8">
      <PageHead title="קמפיינים" sub="קמפיינים נבנים רק אחרי אישור בכרטיס. כאן אפשר לעקוב, להשהות ולהפעיל מחדש." />
      {rows.length === 0 ? <p className="muted">עוד אין קמפיינים. כתבו בשיחה: "תבנה קמפיין Meta ללידים ב-100 ₪ ליום".</p> : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((c) => {
            const m = JSON.parse(c.metrics || "{}");
            const loc = JSON.parse(c.location || "{}");
            return (
              <div key={c.id} className="card p-5">
                <div className="flex items-center justify-between gap-2"><span className="chip">{c.platform === "meta" ? "Meta" : "Google Ads"}</span><span className="chip">{ST[c.status] ?? c.status}</span></div>
                <p className="mt-3 text-lg font-bold">{c.name}</p>
                <p className="muted text-sm">₪{c.daily_budget} ליום · {c.objective} · {c.structure} · {loc.label}{loc.radiusKm ? ` (${loc.radiusKm} ק"מ)` : ""}</p>
                {m.error && <p className="mt-2 text-sm text-red-600">{m.error}</p>}
                {m.impressions && (
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center text-sm">
                    {[["חשיפות", m.impressions], ["קליקים", m.clicks], ["CTR", m.ctr ? `${Number(m.ctr).toFixed(2)}%` : "-"], ["הוצאה", m.spend ? `₪${m.spend}` : "-"]].map(([k, v]) => <div key={k} className="rounded-xl bg-white/[0.06] p-2"><p className="muted text-xs">{k}</p><p className="font-bold">{v}</p></div>)}
                  </div>
                )}
                <div className="mt-4 flex gap-2">
                  {c.status === "active" && <button className="btn-ghost !py-1.5 text-sm" onClick={() => act(c.id, "pause")}>השהיה</button>}
                  {c.status === "paused" && <button className="btn !py-1.5 text-sm" onClick={() => act(c.id, "resume")}>הפעלה מחדש</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
